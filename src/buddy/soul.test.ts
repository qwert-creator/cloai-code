import { describe, expect, it } from 'bun:test'
import type { Companion } from './types.js'
import { formatCompanionInfo, generateCompanionSoul } from './soul.js'

const companion: Companion = {
  name: 'Crumpet',
  personality: 'Curious and slightly smug',
  species: 'penguin',
  rarity: 'epic',
  shiny: false,
  hat: 'halo',
  eye: '@',
  hatchedAt: Date.parse('2026-01-02T03:04:05.000Z'),
  stats: {
    DEBUGGING: 88,
    PATIENCE: 77,
    CHAOS: 21,
    WISDOM: 66,
    SNARK: 55,
  },
}

describe('generateCompanionSoul', () => {
  it('returns the same soul for the same userId', () => {
    expect(generateCompanionSoul('user-123')).toEqual(
      generateCompanionSoul('user-123'),
    )
  })

  it('returns name and personality strings', () => {
    const soul = generateCompanionSoul('user-456')

    expect(typeof soul.name).toBe('string')
    expect(typeof soul.personality).toBe('string')
  })

  it('changes at least one field for different userIds', () => {
    const first = generateCompanionSoul('user-alpha')
    const second = generateCompanionSoul('user-beta')

    expect(
      first.name !== second.name ||
        first.personality !== second.personality,
    ).toBe(true)
  })
})

describe('formatCompanionInfo', () => {
  it('includes the expected companion details', () => {
    const info = formatCompanionInfo(companion, false)

    expect(info).toContain('Name: Crumpet')
    expect(info).toContain('Personality: Curious and slightly smug')
    expect(info).toContain('Species: penguin')
    expect(info).toContain('Rarity: epic')
    expect(info).toContain('Muted: no')
    expect(info).toContain('DEBUGGING: 88')
    expect(info).toContain('SNARK: 55')
  })
})
