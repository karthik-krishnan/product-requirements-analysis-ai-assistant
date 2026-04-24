import { describe, it, expect, vi } from 'vitest'
import { callDemo } from '../../../../services/llm/providers/demo'
import type { LLMMessage } from '../../../../services/llm/shared'
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

// Helper to build a minimal messages array with a user question at the end
const msgs = (question: string): LLMMessage[] => [
  { role: 'system',    content: 'system' },
  { role: 'user',      content: 'context block' },
  { role: 'assistant', content: 'initial greeting' },
  { role: 'user',      content: question },
]

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

  it('returns all stories in { stories: [] } envelope without id/epicId', async () => {
    const raw = await callDemo('generate-stories')
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveProperty('stories')
    expect(parsed.stories.length).toBe(MOCK_STORY_LIST.length)
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

  it('returns empty object for generate-more-stories (removed feature)', async () => {
    const raw = await callDemo('generate-more-stories')
    expect(JSON.parse(raw)).toEqual({})
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

// ─── Demo chat responses — question-aware ─────────────────────────────────────

describe('callDemo — epic-chat uses the user question to tailor the response', () => {
  it('returns a non-empty string (not JSON)', async () => {
    const result = await callDemo('epic-chat', msgs('what do we need here?'))
    expect(result.length).toBeGreaterThan(0)
    expect(() => JSON.parse(result)).toThrow() // plain prose, not JSON
  })

  it('addresses social login topics when asked about social login', async () => {
    const result = await callDemo('epic-chat', msgs('what kind of social logins should we support?'))
    expect(result.toLowerCase()).toMatch(/google|apple|oauth|provider|identity/)
  })

  it('addresses performance topics when asked about response times', async () => {
    const result = await callDemo('epic-chat', msgs('what are the expected response times?'))
    expect(result.toLowerCase()).toMatch(/latency|ms|performance|benchmark|target/)
  })

  it('addresses integration topics when asked about third-party APIs', async () => {
    const result = await callDemo('epic-chat', msgs('how do we handle third-party integrations?'))
    expect(result.toLowerCase()).toMatch(/integrat|api|contract|webhook|external/)
  })

  it('returns a different response for different question topics', async () => {
    const authResponse = await callDemo('epic-chat', msgs('what social login providers do we need?'))
    const perfResponse = await callDemo('epic-chat', msgs('what are the response time requirements?'))
    expect(authResponse).not.toBe(perfResponse)
  })

  it('returns a sensible default for generic questions', async () => {
    const result = await callDemo('epic-chat', msgs('can you help me understand this epic?'))
    expect(result.length).toBeGreaterThan(0)
    expect(() => JSON.parse(result)).toThrow()
  })

  it('still returns a response when no messages are passed (backward compat)', async () => {
    const result = await callDemo('epic-chat')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('callDemo — story-chat uses the user question to tailor the response', () => {
  it('returns a non-empty string (not JSON)', async () => {
    const result = await callDemo('story-chat', msgs('what should the AC look like?'))
    expect(result.length).toBeGreaterThan(0)
    expect(() => JSON.parse(result)).toThrow()
  })

  it('addresses performance when asked about response times', async () => {
    const result = await callDemo('story-chat', msgs('what is the industry benchmark for search response time?'))
    expect(result.toLowerCase()).toMatch(/ms|millisecond|benchmark|threshold|200|300/)
  })

  it('addresses error handling when asked about failures', async () => {
    const result = await callDemo('story-chat', msgs('what happens when the service is unavailable?'))
    expect(result.toLowerCase()).toMatch(/error|fail|timeout|fallback|unavailab/)
  })

  it('addresses AC quality when asked about acceptance criteria', async () => {
    const result = await callDemo('story-chat', msgs('are the acceptance criteria specific enough?'))
    expect(result.toLowerCase()).toMatch(/criteria|ac|testable|measurable|specific/)
  })

  it('returns different responses for different question topics', async () => {
    const perfResp = await callDemo('story-chat', msgs('what is the typical response time for search?'))
    const acResp   = await callDemo('story-chat', msgs('are these acceptance criteria testable?'))
    expect(perfResp).not.toBe(acResp)
  })

  it('still returns a response when no messages are passed (backward compat)', async () => {
    const result = await callDemo('story-chat')
    expect(result.length).toBeGreaterThan(0)
  })
})
