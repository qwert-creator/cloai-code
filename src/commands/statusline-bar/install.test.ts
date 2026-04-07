import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { installStatuslineBar } from './install.js'

let tempDir = ''

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'statusline-bar-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

async function writeSourceFiles(
  settingsContent: string,
  statuslineContent = 'console.log("ok")\n',
) {
  const sourceDir = join(tempDir, 'source')
  await mkdir(sourceDir, { recursive: true })

  const settingsPath = join(sourceDir, 'settings.json')
  const statuslinePath = join(sourceDir, 'statusline.js')

  await writeFile(settingsPath, settingsContent, 'utf8')
  await writeFile(statuslinePath, statuslineContent, 'utf8')

  return {
    settingsUrl: pathToFileURL(settingsPath),
    statuslineUrl: pathToFileURL(statuslinePath),
  }
}

describe('installStatuslineBar', () => {
  it('creates the config dir on first install and writes both files', async () => {
    const configDir = join(tempDir, 'config')
    const { settingsUrl, statuslineUrl } = await writeSourceFiles(
      JSON.stringify(
        {
          statusLine: {
            type: 'command',
            command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
            padding: 1,
          },
        },
        null,
        2,
      ) + '\n',
    )

    const result = await installStatuslineBar({
      configDir,
      settingsTemplateUrl: settingsUrl,
      statuslineScriptUrl: statuslineUrl,
    })

    const settingsPath = join(configDir, 'settings.json')
    const statuslinePath = join(configDir, 'statusline.js')
    const settings = JSON.parse(await readFile(settingsPath, 'utf8'))

    expect(result).toEqual({
      statuslinePath,
      settingsPath,
      settingsAction: 'created',
    })
    expect(await readFile(statuslinePath, 'utf8')).toBe('console.log("ok")\n')
    expect(settings).toEqual({
      statusLine: {
        type: 'command',
        command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
        padding: 1,
      },
    })
  })

  it('preserves unrelated settings and overwrites statusLine', async () => {
    const configDir = join(tempDir, 'config')
    await mkdir(configDir, { recursive: true })
    await writeFile(
      join(configDir, 'settings.json'),
      JSON.stringify(
        {
          theme: 'dark',
          outputStyle: 'compact',
          statusLine: {
            type: 'command',
            command: 'old command',
            padding: 9,
          },
        },
        null,
        2,
      ) + '\n',
      'utf8',
    )

    const { settingsUrl, statuslineUrl } = await writeSourceFiles(
      JSON.stringify(
        {
          statusLine: {
            type: 'command',
            command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
            padding: 1,
          },
        },
        null,
        2,
      ) + '\n',
      'new statusline\n',
    )

    const result = await installStatuslineBar({
      configDir,
      settingsTemplateUrl: settingsUrl,
      statuslineScriptUrl: statuslineUrl,
    })

    const settings = JSON.parse(
      await readFile(join(configDir, 'settings.json'), 'utf8'),
    )

    expect(result.settingsAction).toBe('updated')
    expect(settings).toEqual({
      theme: 'dark',
      outputStyle: 'compact',
      statusLine: {
        type: 'command',
        command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
        padding: 1,
      },
    })
  })

  it('overwrites an existing statusline.js file', async () => {
    const configDir = join(tempDir, 'config')
    await mkdir(configDir, { recursive: true })
    await writeFile(join(configDir, 'statusline.js'), 'old statusline\n', 'utf8')

    const { settingsUrl, statuslineUrl } = await writeSourceFiles(
      JSON.stringify(
        {
          statusLine: {
            type: 'command',
            command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
            padding: 1,
          },
        },
        null,
        2,
      ) + '\n',
      'new statusline\n',
    )

    await installStatuslineBar({
      configDir,
      settingsTemplateUrl: settingsUrl,
      statuslineScriptUrl: statuslineUrl,
    })

    expect(await readFile(join(configDir, 'statusline.js'), 'utf8')).toBe(
      'new statusline\n',
    )
  })

  it('fails when existing settings.json is not valid JSON', async () => {
    const configDir = join(tempDir, 'config')
    await mkdir(configDir, { recursive: true })
    await writeFile(join(configDir, 'settings.json'), '{not-json', 'utf8')

    const { settingsUrl, statuslineUrl } = await writeSourceFiles(
      JSON.stringify(
        {
          statusLine: {
            type: 'command',
            command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
            padding: 1,
          },
        },
        null,
        2,
      ) + '\n',
    )

    await expect(
      installStatuslineBar({
        configDir,
        settingsTemplateUrl: settingsUrl,
        statuslineScriptUrl: statuslineUrl,
      }),
    ).rejects.toThrow(
      `Existing settings at ${join(configDir, 'settings.json')} is not valid JSON object`,
    )
  })

  it('fails when a required source file is missing', async () => {
    const configDir = join(tempDir, 'config')
    const missingSettingsUrl = pathToFileURL(join(tempDir, 'missing-settings.json'))
    const { statuslineUrl } = await writeSourceFiles(
      JSON.stringify(
        {
          statusLine: {
            type: 'command',
            command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
            padding: 1,
          },
        },
        null,
        2,
      ) + '\n',
    )

    await expect(
      installStatuslineBar({
        configDir,
        settingsTemplateUrl: missingSettingsUrl,
        statuslineScriptUrl: statuslineUrl,
      }),
    ).rejects.toThrow(
      `Failed to read settings template at ${missingSettingsUrl.toString()}`,
    )
  })

  it('fails when writing settings.json throws', async () => {
    const configDir = join(tempDir, 'config')
    const { settingsUrl, statuslineUrl } = await writeSourceFiles(
      JSON.stringify(
        {
          statusLine: {
            type: 'command',
            command: `bash -lc 'node "$HOME/.cloai/statusline.js"'`,
            padding: 1,
          },
        },
        null,
        2,
      ) + '\n',
      'new statusline\n',
    )

    const deps = {
      mkdir,
      readFile,
      writeFile: async (...args: Parameters<typeof writeFile>) => {
        if (String(args[0]).endsWith('settings.json')) {
          throw new Error('disk full')
        }
        return writeFile(...args)
      },
    }

    await expect(
      installStatuslineBar({
        configDir,
        settingsTemplateUrl: settingsUrl,
        statuslineScriptUrl: statuslineUrl,
        deps,
      }),
    ).rejects.toThrow(
      `Failed to write settings file to ${join(configDir, 'settings.json')}: disk full`,
    )
  })
})
