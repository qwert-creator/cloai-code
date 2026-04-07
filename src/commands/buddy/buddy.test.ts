import { describe, expect, it } from 'bun:test'
import type { StoredCompanion, Companion } from '../../buddy/types.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig } from '../../utils/config.js'
import { createCall } from './buddy.js'

const hatchedAt = Date.UTC(2026, 3, 7, 12, 34, 56)
const now = hatchedAt + 60_000

type TestContext = Pick<Parameters<LocalCommandCall>[1], 'getAppState' | 'setAppState'>
type TestConfig = ReturnType<typeof getGlobalConfig>

const storedCompanion: StoredCompanion = {
  name: 'Crumpet',
  personality: 'Chaotic good',
  hatchedAt,
}

const companion: Companion = {
  ...storedCompanion,
  rarity: 'epic',
  species: 'penguin',
  eye: '·',
  hat: 'beanie',
  shiny: false,
  stats: {
    DEBUGGING: 88,
    PATIENCE: 66,
    CHAOS: 42,
    WISDOM: 73,
    SNARK: 51,
  },
}

function config(partial: Partial<TestConfig>): TestConfig {
  return partial as TestConfig
}

function createContext(): TestContext {
  const appState = { companionPetAt: undefined as number | undefined }
  return {
    getAppState: () => appState as ReturnType<TestContext['getAppState']>,
    setAppState: updater => {
      const next = updater(appState as ReturnType<TestContext['getAppState']>)
      appState.companionPetAt = next.companionPetAt
    },
  }
}

describe('/buddy command dispatch', () => {
  it('hatches on first /buddy with the required call chain and message', async () => {
    const calls: string[] = []
    const saved: Array<(current: Record<string, unknown>) => Record<string, unknown>> = []
    const call = createCall({
      getGlobalConfig: () => config({}),
      companionUserId: () => {
        calls.push('companionUserId')
        return 'user-123'
      },
      generateCompanionSoul: userId => {
        calls.push(`generateCompanionSoul:${userId}`)
        return {
          name: 'Crumpet',
          personality: 'Chaotic good',
        }
      },
      now: () => hatchedAt,
      saveGlobalConfig: update => {
        calls.push('saveGlobalConfig')
        saved.push(update)
      },
      getCompanion: () => companion,
    })

    await expect(call('', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'Hatched Crumpet the penguin. Rarity: epic.',
    })

    expect(calls).toEqual([
      'companionUserId',
      'generateCompanionSoul:user-123',
      'saveGlobalConfig',
    ])
    expect(saved).toHaveLength(1)
    expect(saved[0]!({ existing: true })).toEqual({
      existing: true,
      companion: storedCompanion,
    })
  })

  it('pets on bare /buddy when a buddy already exists', async () => {
    const call = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion }),
      getCompanion: () => companion,
      now: () => now,
    })

    const context = createContext()
    await expect(call('', context as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'You pet Crumpet.',
    })
    expect(context.getAppState().companionPetAt).toBe(now)
  })

  it('uses formatCompanionInfo for info', async () => {
    const formatted = 'formatted buddy info'
    const call = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion, companionMuted: true }),
      getCompanion: () => companion,
      formatCompanionInfo: (receivedCompanion, muted) => {
        expect(receivedCompanion).toEqual(companion)
        expect(muted).toBe(true)
        return formatted
      },
    })

    await expect(call('info', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: formatted,
    })
  })

  it('updates companionPetAt when petting explicitly', async () => {
    const call = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion }),
      getCompanion: () => companion,
      now: () => now,
    })

    const context = createContext()
    await expect(call('pet', context as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'You pet Crumpet.',
    })
    expect(context.getAppState().companionPetAt).toBe(now)
  })

  it('returns no buddy message for explicit subcommands before hatch', async () => {
    const call = createCall({
      getGlobalConfig: () => config({}),
    })

    await expect(call('pet', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'No buddy yet. Run /buddy to hatch one first.',
    })
    await expect(call('info', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'No buddy yet. Run /buddy to hatch one first.',
    })
    await expect(call('mute', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'No buddy yet. Run /buddy to hatch one first.',
    })
    await expect(call('unmute', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'No buddy yet. Run /buddy to hatch one first.',
    })
  })

  it('returns usage for unknown subcommands', async () => {
    const call = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion }),
    })

    await expect(call('dance', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'Usage: /buddy [pet|info|mute|unmute]',
    })
  })
})

describe('/buddy command mute state handling', () => {
  it('persists mute and unmute when state changes', async () => {
    const saved: Array<(current: Record<string, unknown>) => Record<string, unknown>> = []

    const muteCall = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion, companionMuted: false }),
      saveGlobalConfig: update => void saved.push(update),
    })
    await expect(muteCall('mute', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'Buddy muted.',
    })

    const unmuteCall = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion, companionMuted: true }),
      saveGlobalConfig: update => void saved.push(update),
    })
    await expect(unmuteCall('unmute', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'Buddy unmuted.',
    })

    expect(saved).toHaveLength(2)
    expect(saved[0]!({ companion: storedCompanion })).toEqual({
      companion: storedCompanion,
      companionMuted: true,
    })
    expect(saved[1]!({ companion: storedCompanion, companionMuted: true })).toEqual({
      companion: storedCompanion,
      companionMuted: false,
    })
  })

  it('does not write config when already muted', async () => {
    let writes = 0
    const call = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion, companionMuted: true }),
      saveGlobalConfig: () => {
        writes += 1
      },
    })

    await expect(call('mute', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'Buddy is already muted.',
    })
    expect(writes).toBe(0)
  })

  it('does not write config when already unmuted', async () => {
    let writes = 0
    const call = createCall({
      getGlobalConfig: () => config({ companion: storedCompanion, companionMuted: false }),
      saveGlobalConfig: () => {
        writes += 1
      },
    })

    await expect(call('unmute', createContext() as Parameters<LocalCommandCall>[1])).resolves.toEqual({
      type: 'text',
      value: 'Buddy is already unmuted.',
    })
    expect(writes).toBe(0)
  })
})
