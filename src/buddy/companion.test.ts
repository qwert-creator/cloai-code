import { afterEach, describe, expect, it, mock } from 'bun:test'
import * as configModule from '../utils/config.js'
import type { StoredCompanion } from './types.js'

const storedCompanion: StoredCompanion = {
  name: 'Crumpet',
  personality: 'Chaotic good',
  hatchedAt: Date.parse('2026-04-07T12:34:56.000Z'),
}
const legendaryUserId =
  'e1ef3b3ee65985b5fd2b92bf63fc6fe196f127f6fa616cebb827cbe3030972eb'

async function loadCompanionModule(config: Record<string, unknown>) {
  mock.module('../utils/config.js', () => ({
    ...configModule,
    getGlobalConfig: () => config,
  }))

  return import(`./companion.js?test=${Math.random()}`)
}

afterEach(() => {
  mock.restore()
})

describe('getCompanion', () => {
  it('forces legendary rarity for the configured user', async () => {
    const { getCompanion } = await loadCompanionModule({
      companion: storedCompanion,
      userID: legendaryUserId,
    })

    const companion = getCompanion()

    expect(companion).toBeDefined()
    expect(companion?.rarity).toBe('legendary')
    expect(companion?.name).toBe('Crumpet')
    expect(companion?.personality).toBe('Chaotic good')
    expect(companion?.hatchedAt).toBe(storedCompanion.hatchedAt)
  })

  it('keeps the rolled rarity for non-matching users', async () => {
    const { getCompanion, roll } = await loadCompanionModule({
      companion: storedCompanion,
      userID: 'user-123',
    })

    const companion = getCompanion()
    const expected = roll('user-123').bones.rarity

    expect(companion).toBeDefined()
    expect(companion?.rarity).toBe(expected)
    expect(companion?.name).toBe('Crumpet')
    expect(companion?.personality).toBe('Chaotic good')
    expect(companion?.hatchedAt).toBe(storedCompanion.hatchedAt)
  })

  it('returns undefined when no stored companion exists', async () => {
    const { getCompanion } = await loadCompanionModule({})

    expect(getCompanion()).toBeUndefined()
  })
})
