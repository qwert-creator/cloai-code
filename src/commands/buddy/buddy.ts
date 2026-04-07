import { companionUserId, getCompanion } from '../../buddy/companion.js'
import { formatCompanionInfo, generateCompanionSoul } from '../../buddy/soul.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

type BuddyDeps = {
  companionUserId: typeof companionUserId
  formatCompanionInfo: typeof formatCompanionInfo
  generateCompanionSoul: typeof generateCompanionSoul
  getCompanion: typeof getCompanion
  getGlobalConfig: typeof getGlobalConfig
  saveGlobalConfig: typeof saveGlobalConfig
  now: () => number
}

const NO_BUDDY_MESSAGE = 'No buddy yet. Run /buddy to hatch one first.'
const USAGE_MESSAGE = 'Usage: /buddy [pet|info|mute|unmute]'

function hasStoredBuddy(config: ReturnType<typeof getGlobalConfig>): boolean {
  return !!config.companion
}

function petBuddy(
  name: string,
  context: Parameters<LocalCommandCall>[1],
  now: () => number,
) {
  context.setAppState(prev => ({
    ...prev,
    companionPetAt: now(),
  }))
  return {
    type: 'text' as const,
    value: `You pet ${name}.`,
  }
}

export function createCall(overrides: Partial<BuddyDeps> = {}): LocalCommandCall {
  const deps: BuddyDeps = {
    companionUserId,
    formatCompanionInfo,
    generateCompanionSoul,
    getCompanion,
    getGlobalConfig,
    saveGlobalConfig,
    now: Date.now,
    ...overrides,
  }

  return async (args, context) => {
    const subcommand = args.trim().toLowerCase()
    const config = deps.getGlobalConfig()

    if (!subcommand) {
      if (!hasStoredBuddy(config)) {
        const userId = deps.companionUserId()
        const soul = deps.generateCompanionSoul(userId)
        const hatchedAt = deps.now()
        deps.saveGlobalConfig(current => ({
          ...current,
          companion: {
            name: soul.name,
            personality: soul.personality,
            hatchedAt,
          },
        }))
        const companion = deps.getCompanion()
        if (!companion) {
          return { type: 'text', value: NO_BUDDY_MESSAGE }
        }
        return {
          type: 'text',
          value: `Hatched ${companion.name} the ${companion.species}. Rarity: ${companion.rarity}.`,
        }
      }

      const companion = deps.getCompanion()
      if (!companion) {
        return { type: 'text', value: NO_BUDDY_MESSAGE }
      }
      return petBuddy(companion.name, context, deps.now)
    }

    if (!['pet', 'info', 'mute', 'unmute'].includes(subcommand)) {
      return { type: 'text', value: USAGE_MESSAGE }
    }

    if (!hasStoredBuddy(config)) {
      return { type: 'text', value: NO_BUDDY_MESSAGE }
    }

    if (subcommand === 'mute') {
      if (config.companionMuted) {
        return { type: 'text', value: 'Buddy is already muted.' }
      }
      deps.saveGlobalConfig(current => ({
        ...current,
        companionMuted: true,
      }))
      return { type: 'text', value: 'Buddy muted.' }
    }

    if (subcommand === 'unmute') {
      if (!config.companionMuted) {
        return { type: 'text', value: 'Buddy is already unmuted.' }
      }
      deps.saveGlobalConfig(current => ({
        ...current,
        companionMuted: false,
      }))
      return { type: 'text', value: 'Buddy unmuted.' }
    }

    const companion = deps.getCompanion()
    if (!companion) {
      return { type: 'text', value: NO_BUDDY_MESSAGE }
    }

    if (subcommand === 'pet') {
      return petBuddy(companion.name, context, deps.now)
    }

    return {
      type: 'text',
      value: deps.formatCompanionInfo(companion, !!config.companionMuted),
    }
  }
}

export const call = createCall()
