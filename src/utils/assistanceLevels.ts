import type { AssistanceLevel } from '../types'

export interface LevelMeta {
  id: AssistanceLevel
  name: string
  tagline: string
  description: string
  range: [number, number]   // [min, max] questions inclusive; [0,0] = skip entirely
  color: string
  trackColor: string
}

export const ASSISTANCE_LEVELS: LevelMeta[] = [
  {
    id: 0,
    name: 'Streamlined',
    tagline: 'Just generate',
    description: 'Skip AI exploration entirely — ideal for experienced BAs who know exactly what they need.',
    range: [0, 0],
    color: 'text-gray-600',
    trackColor: 'bg-gray-400',
  },
  {
    id: 1,
    name: 'Light Touch',
    tagline: 'Quick sense-check',
    description: 'Two or three targeted questions to catch the most obvious scope and persona gaps.',
    range: [2, 3],
    color: 'text-emerald-600',
    trackColor: 'bg-emerald-400',
  },
  {
    id: 2,
    name: 'Collaborative',
    tagline: 'Balanced dialog',
    description: 'Four to five questions covering scope boundaries, user roles, integrations, and MVP definition.',
    range: [4, 5],
    color: 'text-brand-600',
    trackColor: 'bg-brand-500',
  },
  {
    id: 3,
    name: 'Thorough',
    tagline: 'Deep alignment',
    description: 'Six to seven questions — structured exploration of edge cases, dependencies, and constraints.',
    range: [6, 7],
    color: 'text-amber-600',
    trackColor: 'bg-amber-400',
  },
  {
    id: 4,
    name: 'Deep Dive',
    tagline: 'Full discovery',
    description: 'Eight to ten questions — comprehensive discovery ideal for junior BAs or complex, high-risk features.',
    range: [8, 10],
    color: 'text-violet-600',
    trackColor: 'bg-violet-500',
  },
]

export function getQuestionCount(level: AssistanceLevel): number {
  const { range } = ASSISTANCE_LEVELS[level]
  const [min, max] = range
  if (min === max) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getLevelMeta(level: AssistanceLevel): LevelMeta {
  return ASSISTANCE_LEVELS[level]
}
