import type { Command } from '../../commands.js'

const statuslineBar = {
  name: 'statusline-bar',
  description: 'Install the bundled statusline bar preset into your Cloai config',
  type: 'local',
  supportsNonInteractive: true,
  load: () => import('./statusline-bar.js'),
} satisfies Command

export default statuslineBar
