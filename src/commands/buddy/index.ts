import type { Command } from '../../commands.js'

export default {
  type: 'local',
  name: 'buddy',
  description: 'Hatch, pet, and manage your buddy',
  argumentHint: '[pet|info|mute|unmute]',
  supportsNonInteractive: true,
  load: () => import('./buddy.js'),
} satisfies Command
