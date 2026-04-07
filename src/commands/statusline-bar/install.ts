import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { errorMessage, getErrnoCode } from '../../utils/errors.js'
import { safeParseJSON } from '../../utils/json.js'
import { jsonStringify } from '../../utils/slowOperations.js'

type InstallDeps = Pick<typeof import('fs/promises'), 'mkdir' | 'readFile' | 'writeFile'>

type InstallOptions = {
  configDir?: string
  settingsTemplateUrl?: URL
  statuslineScriptUrl?: URL
  deps?: InstallDeps
}

export type InstallResult = {
  statuslinePath: string
  settingsPath: string
  settingsAction: 'created' | 'updated'
}

const defaultDeps: InstallDeps = {
  mkdir,
  readFile,
  writeFile,
}

const defaultSettingsTemplateUrl = new URL(
  '../../../statusline-bar/settings.json',
  import.meta.url,
)
const defaultStatuslineScriptUrl = new URL(
  '../../../statusline-bar/statusline.js',
  import.meta.url,
)

export async function installStatuslineBar(
  options: InstallOptions = {},
): Promise<InstallResult> {
  const configDir = options.configDir ?? getClaudeConfigHomeDir()
  const settingsTemplateUrl =
    options.settingsTemplateUrl ?? defaultSettingsTemplateUrl
  const statuslineScriptUrl =
    options.statuslineScriptUrl ?? defaultStatuslineScriptUrl
  const deps = options.deps ?? defaultDeps

  const statuslinePath = join(configDir, 'statusline.js')
  const settingsPath = join(configDir, 'settings.json')

  try {
    await deps.mkdir(configDir, { recursive: true })
  } catch (e) {
    throw new Error(
      `Failed to create config directory at ${configDir}: ${errorMessage(e)}`,
    )
  }

  const [templateSettingsRaw, statuslineSourceRaw] = await Promise.all([
    readRequiredTextFile(deps, settingsTemplateUrl, 'settings template'),
    readRequiredTextFile(deps, statuslineScriptUrl, 'statusline script'),
  ])

  const templateSettings = parseSettingsObject(
    templateSettingsRaw,
    settingsTemplateUrl.toString(),
    'Settings template',
  )

  if (!Object.hasOwn(templateSettings, 'statusLine')) {
    throw new Error(
      `Settings template at ${settingsTemplateUrl.toString()} is missing statusLine`,
    )
  }

  const existingSettingsRaw = await readExistingSettings(deps, settingsPath)
  const existingSettings =
    existingSettingsRaw === null
      ? {}
      : parseSettingsObject(existingSettingsRaw, settingsPath, 'Existing settings')

  try {
    await deps.writeFile(statuslinePath, statuslineSourceRaw, 'utf8')
  } catch (e) {
    throw new Error(
      `Failed to write statusline script to ${statuslinePath}: ${errorMessage(e)}`,
    )
  }

  const mergedSettings = {
    ...existingSettings,
    statusLine: templateSettings.statusLine,
  }

  try {
    await deps.writeFile(
      settingsPath,
      jsonStringify(mergedSettings, null, 2) + '\n',
      'utf8',
    )
  } catch (e) {
    throw new Error(
      `Failed to write settings file to ${settingsPath}: ${errorMessage(e)}`,
    )
  }

  return {
    statuslinePath,
    settingsPath,
    settingsAction: existingSettingsRaw === null ? 'created' : 'updated',
  }
}

async function readRequiredTextFile(
  deps: InstallDeps,
  fileUrl: URL,
  label: string,
): Promise<string> {
  try {
    return await deps.readFile(fileUrl, 'utf8')
  } catch (e) {
    throw new Error(
      `Failed to read ${label} at ${fileUrl.toString()}: ${errorMessage(e)}`,
    )
  }
}

async function readExistingSettings(
  deps: InstallDeps,
  settingsPath: string,
): Promise<string | null> {
  try {
    return await deps.readFile(settingsPath, 'utf8')
  } catch (e) {
    if (getErrnoCode(e) === 'ENOENT') {
      return null
    }
    throw new Error(
      `Failed to read existing settings at ${settingsPath}: ${errorMessage(e)}`,
    )
  }
}

function parseSettingsObject(
  raw: string,
  source: string,
  label: string,
): Record<string, unknown> {
  const parsed = safeParseJSON(raw, false)
  if (!isRecord(parsed)) {
    throw new Error(`${label} at ${source} is not valid JSON object`)
  }
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
