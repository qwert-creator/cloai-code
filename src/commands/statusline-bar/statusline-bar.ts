import type { LocalCommandCall } from '../../types/command.js'
import { errorMessage } from '../../utils/errors.js'
import { installStatuslineBar, type InstallResult } from './install.js'

type InstallFn = () => Promise<InstallResult>

export function createCall(
  install: InstallFn = installStatuslineBar,
): LocalCommandCall {
  return async (args, _context) => {
    if (args.trim()) {
      return {
        type: 'text',
        value: '/statusline-bar does not accept arguments.',
      }
    }

    try {
      const result = await install()
      return {
        type: 'text',
        value: [
          'Installed statusline bar preset.',
          `Wrote ${result.statuslinePath}.`,
          `${result.settingsAction === 'created' ? 'Created' : 'Updated'} ${result.settingsPath}.`,
        ].join('\n'),
      }
    } catch (e) {
      return {
        type: 'text',
        value: `Failed to install statusline bar: ${errorMessage(e)}`,
      }
    }
  }
}

export const call = createCall()
