import { describe, expect, it } from 'bun:test'
import { createCall } from './statusline-bar.js'

describe('/statusline-bar command', () => {
  it('rejects unexpected arguments', async () => {
    const call = createCall(async () => {
      throw new Error('installer should not run')
    })

    await expect(call('extra', {} as never)).resolves.toEqual({
      type: 'text',
      value: '/statusline-bar does not accept arguments.',
    })
  })

  it('formats a successful install message', async () => {
    const call = createCall(async () => ({
      statuslinePath: '/tmp/.cloai/statusline.js',
      settingsPath: '/tmp/.cloai/settings.json',
      settingsAction: 'updated',
    }))

    await expect(call('', {} as never)).resolves.toEqual({
      type: 'text',
      value: [
        'Installed statusline bar preset.',
        'Wrote /tmp/.cloai/statusline.js.',
        'Updated /tmp/.cloai/settings.json.',
      ].join('\n'),
    })
  })

  it('surfaces installer failures', async () => {
    const call = createCall(async () => {
      throw new Error('permission denied')
    })

    await expect(call('', {} as never)).resolves.toEqual({
      type: 'text',
      value: 'Failed to install statusline bar: permission denied',
    })
  })
})
