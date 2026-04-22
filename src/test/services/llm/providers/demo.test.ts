import { describe, it, expect, vi } from 'vitest'
import { callDemo } from '../../../../services/llm/providers/demo'
import {
  MOCK_CLARIFYING_QUESTIONS,
  MOCK_EPIC_QUESTIONS,
  MOCK_EPICS,
  MOCK_STORY_LIST,
  MOCK_INVEST_VALIDATION,
  MOCK_INVEST_FIXES,
} from '../../../../data/mockData'

// Speed up the simulated delay for tests
vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0 })

describe('callDemo', () => {
  it('returns clarifying questions in { questions: [] } envelope', async () => {
    const raw = await callDemo('clarifying-questions')
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveProperty('questions')
    expect(parsed.questions).toEqual(MOCK_CLARIFYING_QUESTIONS)
  })

  it('returns epic clarifying questions for epic-clarifying-questions', async () => {
    const raw = await callDemo('epic-clarifying-questions')
    const parsed = JSON.parse(raw)
    expect(parsed.questions).toEqual(MOCK_EPIC_QUESTIONS)
  })

  it('returns epics in { epics: [] } envelope', async () => {
    const raw = await callDemo('generate-epics')
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveProperty('epics')
    expect(parsed.epics).toEqual(MOCK_EPICS)
  })

  it('returns stories in { stories: [] } envelope without id/epicId', async () => {
    const raw = await callDemo('generate-stories')
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveProperty('stories')
    // generate-stories returns the first batch (4 stories); generate-more-stories returns the rest
    expect(parsed.stories.length).toBeGreaterThan(0)
    expect(parsed.stories.length).toBeLessThanOrEqual(MOCK_STORY_LIST.length)
    // id and epicId must be stripped so parseStories can inject the real epicId
    for (const s of parsed.stories) {
      expect(s).not.toHaveProperty('id')
      expect(s).not.toHaveProperty('epicId')
    }
    // Core story fields must be present
    expect(parsed.stories[0]).toHaveProperty('title')
    expect(parsed.stories[0]).toHaveProperty('asA')
    expect(parsed.stories[0]).toHaveProperty('acceptanceCriteria')
  })

  it('returns additional stories for generate-more-stories', async () => {
    const raw = await callDemo('generate-more-stories')
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveProperty('stories')
    expect(parsed.stories.length).toBeGreaterThan(0)
    for (const s of parsed.stories) {
      expect(s).not.toHaveProperty('id')
      expect(s).not.toHaveProperty('epicId')
    }
  })

  it('returns INVEST validation object', async () => {
    const raw = await callDemo('validate-invest')
    const parsed = JSON.parse(raw)
    expect(parsed).toEqual(MOCK_INVEST_VALIDATION)
    for (const key of ['independent', 'negotiable', 'valuable', 'estimable', 'small', 'testable']) {
      expect(parsed[key]).toHaveProperty('adheres')
      expect(parsed[key]).toHaveProperty('score')
      expect(parsed[key]).toHaveProperty('feedback')
      expect(parsed[key]).toHaveProperty('suggestions')
    }
  })

  it('returns a fix proposal for a known principle', async () => {
    const raw = await callDemo('fix-invest:independent')
    const parsed = JSON.parse(raw)
    expect(parsed).toEqual(MOCK_INVEST_FIXES['independent'])
    expect(parsed.principleKey).toBe('independent')
    expect(parsed).toHaveProperty('summary')
    expect(parsed).toHaveProperty('patch')
  })

  it('returns a fix for negotiable principle', async () => {
    const raw = await callDemo('fix-invest:negotiable')
    const parsed = JSON.parse(raw)
    expect(parsed.principleKey).toBe('negotiable')
  })

  it('returns a fix for testable principle', async () => {
    const raw = await callDemo('fix-invest:testable')
    const parsed = JSON.parse(raw)
    expect(parsed.principleKey).toBe('testable')
  })

  it('falls back to independent fix for unknown principle key', async () => {
    const raw = await callDemo('fix-invest:unknown-principle')
    const parsed = JSON.parse(raw)
    expect(parsed).toEqual(MOCK_INVEST_FIXES['independent'])
  })

  it('returns empty object for unknown prompt type', async () => {
    const raw = await callDemo('something-unsupported')
    expect(JSON.parse(raw)).toEqual({})
  })

  it('returns empty object when promptType is undefined', async () => {
    const raw = await callDemo(undefined)
    expect(JSON.parse(raw)).toEqual({})
  })
})
