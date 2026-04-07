import { RARITY_STARS, type Companion } from './types.js'

function hashString(value: string): number {
  let hash = 2166136261

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function pick<T>(seed: number, values: readonly T[], offset: number): T {
  return values[(seed + offset) % values.length]!
}

const NAME_PREFIXES = [
  'Captain',
  'Crumb',
  'Gizmo',
  'Mochi',
  'Pebble',
  'Pixel',
  'Puffin',
  'Tinsel',
] as const

const NAME_SUFFIXES = [
  'Biscuit',
  'Comet',
  'Noodle',
  'Pip',
  'Spark',
  'Sprout',
  'Whistle',
  'Wobble',
] as const

const PERSONALITY_OPENERS = [
  'Brave but distractible',
  'Calm under pressure',
  'Curious and slightly smug',
  'Fiercely loyal',
  'Soft-spoken but scheming',
  'Suspicious of shortcuts',
] as const

const PERSONALITY_QUIRKS = [
  'collects lucky pebbles',
  'debugs by staring intensely',
  'hums during code review',
  'keeps tiny backup plans',
  'naps between breakthroughs',
  'speaks in dramatic sighs',
] as const

const PERSONALITY_MOODS = [
  'around mysterious terminals',
  'before breakfast',
  'during late-night fixes',
  'when tests finally pass',
  'while guarding the keyboard',
  'with impeccable timing',
] as const

export function generateCompanionSoul(
  userId: string,
): { name: string; personality: string } {
  const seed = hashString(userId)

  return {
    name: `${pick(seed, NAME_PREFIXES, 0)} ${pick(seed, NAME_SUFFIXES, 3)}`,
    personality: `${pick(seed, PERSONALITY_OPENERS, 5)}, ${pick(seed, PERSONALITY_QUIRKS, 11)}, ${pick(seed, PERSONALITY_MOODS, 17)}.`,
  }
}

export function formatCompanionInfo(
  companion: Companion,
  muted: boolean,
): string {
  return [
    `Name: ${companion.name}`,
    `Personality: ${companion.personality}`,
    `Species: ${companion.species}`,
    `Rarity: ${companion.rarity} ${RARITY_STARS[companion.rarity]}`,
    `Shiny: ${companion.shiny ? 'yes' : 'no'}`,
    `Hat: ${companion.hat}`,
    `Eye: ${companion.eye}`,
    `Muted: ${muted ? 'yes' : 'no'}`,
    `Hatched: ${new Date(companion.hatchedAt).toISOString()}`,
    'Stats:',
    ...Object.entries(companion.stats).map(([stat, value]) => `${stat}: ${value}`),
  ].join('\n')
}
