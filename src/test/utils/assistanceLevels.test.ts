import { describe, it, expect } from 'vitest'
import { getQuestionCount, getLevelMeta, ASSISTANCE_LEVELS } from '../../utils/assistanceLevels'
import type { AssistanceLevel } from '../../types'

describe('ASSISTANCE_LEVELS', () => {
  it('has exactly 5 levels', () => {
    expect(ASSISTANCE_LEVELS).toHaveLength(5)
  })

  it('levels are indexed 0–4', () => {
    ASSISTANCE_LEVELS.forEach((l, i) => expect(l.id).toBe(i))
  })

  it('each level has required fields', () => {
    for (const level of ASSISTANCE_LEVELS) {
      expect(level).toHaveProperty('name')
      expect(level).toHaveProperty('tagline')
      expect(level).toHaveProperty('description')
      expect(level.range).toHaveLength(2)
    }
  })
})

describe('getQuestionCount', () => {
  it('returns 0 for Streamlined (level 0)', () => {
    expect(getQuestionCount(0)).toBe(0)
  })

  it('returns a value within range for Light Touch (level 1: 1–2)', () => {
    for (let i = 0; i < 20; i++) {
      const count = getQuestionCount(1)
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('returns a value within range for Collaborative (level 2: 2–3)', () => {
    for (let i = 0; i < 20; i++) {
      const count = getQuestionCount(2)
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(3)
    }
  })

  it('returns a value within range for Thorough (level 3: 3–4)', () => {
    for (let i = 0; i < 20; i++) {
      const count = getQuestionCount(3)
      expect(count).toBeGreaterThanOrEqual(3)
      expect(count).toBeLessThanOrEqual(4)
    }
  })

  it('returns a value within range for Deep Dive (level 4: 4–5)', () => {
    for (let i = 0; i < 20; i++) {
      const count = getQuestionCount(4)
      expect(count).toBeGreaterThanOrEqual(4)
      expect(count).toBeLessThanOrEqual(5)
    }
  })

  it('returns an integer', () => {
    for (const level of [0, 1, 2, 3, 4] as AssistanceLevel[]) {
      expect(Number.isInteger(getQuestionCount(level))).toBe(true)
    }
  })
})

describe('getLevelMeta', () => {
  it('returns the correct metadata for each level', () => {
    expect(getLevelMeta(0).name).toBe('Streamlined')
    expect(getLevelMeta(1).name).toBe('Light Touch')
    expect(getLevelMeta(2).name).toBe('Collaborative')
    expect(getLevelMeta(3).name).toBe('Thorough')
    expect(getLevelMeta(4).name).toBe('Deep Dive')
  })

  it('returned object is the same reference as in ASSISTANCE_LEVELS', () => {
    expect(getLevelMeta(2)).toBe(ASSISTANCE_LEVELS[2])
  })
})
