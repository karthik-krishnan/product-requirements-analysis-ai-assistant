import { describe, it, expect } from 'vitest'
import { parseClarifyingQuestions, buildClarifyingQuestionsPrompt } from './clarifyingQuestions'
import { parseEpics, buildGenerateEpicsPrompt } from './generateEpics'
import { parseStories } from './generateStories'
import { parseINVESTValidation, buildValidateINVESTPrompt } from './validateINVEST'
import { parseFixProposal } from './fixINVEST'
import type { ContextCapture, Story } from '../types'

const emptyContext: ContextCapture = {
  domainText: '',
  domainFiles: [],
  techText: '',
  techFiles: [],
}

const mockStory: Story = {
  id: 'story-1',
  epicId: 'epic-1',
  title: 'User login',
  asA: 'registered user',
  iWantTo: 'log in with my email and password',
  soThat: 'I can access my account',
  acceptanceCriteria: ['Login succeeds with valid credentials', 'Login fails with invalid credentials'],
  inScope: ['Email/password login'],
  outOfScope: ['SSO', 'Social login'],
  assumptions: ['Users have already registered'],
  crossFunctionalNeeds: ['Security: rate limiting'],
  priority: 'High',
  storyPoints: 3,
}

// ─── parseClarifyingQuestions ─────────────────────────────────────────────────

describe('parseClarifyingQuestions', () => {
  it('parses a valid questions JSON response', () => {
    const raw = JSON.stringify({
      questions: [
        { id: 'q1', question: 'Who are the users?', options: ['Internal', 'External'] },
        { id: 'q2', question: 'Any compliance requirements?', options: ['GDPR', 'None'] },
      ],
    })
    const result = parseClarifyingQuestions(raw)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('q1')
    expect(result[0].options).toEqual(['Internal', 'External'])
    expect(result[1].question).toBe('Any compliance requirements?')
  })

  it('handles json code-fenced response', () => {
    const raw = '```json\n{"questions":[{"id":"q1","question":"Q?","options":["A"]}]}\n```'
    const result = parseClarifyingQuestions(raw)
    expect(result).toHaveLength(1)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseClarifyingQuestions('not json')).toThrow()
  })
})

// ─── buildClarifyingQuestionsPrompt ───────────────────────────────────────────

describe('buildClarifyingQuestionsPrompt', () => {
  it('returns messages array with system and user roles', () => {
    const messages = buildClarifyingQuestionsPrompt('Build a marketplace', emptyContext, 3)
    expect(messages.some(m => m.role === 'system')).toBe(true)
    expect(messages.some(m => m.role === 'user')).toBe(true)
  })

  it('embeds the requirements in the user message', () => {
    const messages = buildClarifyingQuestionsPrompt('Build a marketplace', emptyContext, 3)
    const userMsg = messages.find(m => m.role === 'user')!
    expect(userMsg.content).toContain('Build a marketplace')
  })

  it('embeds the requested question count', () => {
    const messages = buildClarifyingQuestionsPrompt('Requirements', emptyContext, 2)
    const userMsg = messages.find(m => m.role === 'user')!
    expect(userMsg.content).toContain('2')
  })

  it('embeds domain context when provided', () => {
    const ctx: ContextCapture = { ...emptyContext, domainText: 'Healthcare domain' }
    const messages = buildClarifyingQuestionsPrompt('Req', ctx, 1)
    const userMsg = messages.find(m => m.role === 'user')!
    expect(userMsg.content).toContain('Healthcare domain')
  })
})

// ─── parseEpics ───────────────────────────────────────────────────────────────

describe('parseEpics', () => {
  const validEpicsJSON = JSON.stringify({
    epics: [
      { id: 'epic-1', title: 'User Management', description: 'Manage users', priority: 'High', category: 'Core Product', tags: ['auth'] },
      { id: 'epic-2', title: 'Product Catalog', description: 'Browse products', priority: 'Medium', category: 'Commerce', tags: ['catalog'] },
    ],
  })

  it('parses epics array correctly', () => {
    const result = parseEpics(validEpicsJSON)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('User Management')
    expect(result[1].id).toBe('epic-2')
  })

  it('initialises stories as empty array', () => {
    const result = parseEpics(validEpicsJSON)
    for (const epic of result) {
      expect(epic.stories).toEqual([])
    }
  })

  it('preserves all epic fields', () => {
    const result = parseEpics(validEpicsJSON)
    expect(result[0].priority).toBe('High')
    expect(result[0].category).toBe('Core Product')
    expect(result[0].tags).toEqual(['auth'])
  })

  it('throws on invalid JSON', () => {
    expect(() => parseEpics('bad')).toThrow()
  })
})

// ─── parseStories ─────────────────────────────────────────────────────────────

describe('parseStories', () => {
  const storiesJSON = JSON.stringify({
    stories: [
      { title: 'Login', asA: 'user', iWantTo: 'log in', soThat: 'access my account',
        acceptanceCriteria: ['AC1'], inScope: ['Email login'], outOfScope: ['SSO'],
        assumptions: [], crossFunctionalNeeds: [], priority: 'High', storyPoints: 3 },
      { title: 'Register', asA: 'visitor', iWantTo: 'sign up', soThat: 'create account',
        acceptanceCriteria: ['Email required'], inScope: ['Registration'], outOfScope: [],
        assumptions: [], crossFunctionalNeeds: [], priority: 'Medium', storyPoints: 2 },
    ],
  })

  it('parses stories and injects epicId', () => {
    const result = parseStories(storiesJSON, 'epic-1')
    expect(result).toHaveLength(2)
    for (const s of result) {
      expect(s.epicId).toBe('epic-1')
    }
  })

  it('generates unique ids for each story', () => {
    const result = parseStories(storiesJSON, 'epic-1')
    const ids = result.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes id with epicId prefix', () => {
    const result = parseStories(storiesJSON, 'epic-2')
    expect(result[0].id).toContain('epic-2')
    expect(result[1].id).toContain('epic-2')
  })

  it('preserves story fields', () => {
    const result = parseStories(storiesJSON, 'epic-1')
    expect(result[0].title).toBe('Login')
    expect(result[0].storyPoints).toBe(3)
    expect(result[1].priority).toBe('Medium')
  })
})

// ─── parseINVESTValidation ────────────────────────────────────────────────────

describe('parseINVESTValidation', () => {
  const validINVEST = {
    independent: { adheres: true,  score: 90, feedback: 'Good', suggestions: [] },
    negotiable:  { adheres: true,  score: 85, feedback: 'Good', suggestions: [] },
    valuable:    { adheres: true,  score: 95, feedback: 'Great', suggestions: [] },
    estimable:   { adheres: false, score: 55, feedback: 'Unclear', suggestions: ['Add spike'] },
    small:       { adheres: false, score: 40, feedback: 'Too big', suggestions: ['Split it'] },
    testable:    { adheres: true,  score: 80, feedback: 'OK', suggestions: ['Clarify 300ms'] },
  }

  it('parses a full INVEST validation response', () => {
    const result = parseINVESTValidation(JSON.stringify(validINVEST))
    expect(result.independent.adheres).toBe(true)
    expect(result.independent.score).toBe(90)
    expect(result.estimable.adheres).toBe(false)
    expect(result.estimable.suggestions).toEqual(['Add spike'])
    expect(result.testable.suggestions).toEqual(['Clarify 300ms'])
  })

  it('throws on invalid JSON', () => {
    expect(() => parseINVESTValidation('not json')).toThrow()
  })
})

// ─── buildValidateINVESTPrompt ────────────────────────────────────────────────

describe('buildValidateINVESTPrompt', () => {
  it('includes the story title in the user message', () => {
    const msgs = buildValidateINVESTPrompt(mockStory)
    const userMsg = msgs.find(m => m.role === 'user')!
    expect(userMsg.content).toContain('User login')
  })

  it('includes all INVEST principles', () => {
    const msgs = buildValidateINVESTPrompt(mockStory)
    const userMsg = msgs.find(m => m.role === 'user')!
    for (const key of ['independent', 'negotiable', 'valuable', 'estimable', 'small', 'testable']) {
      expect(userMsg.content.toLowerCase()).toContain(key)
    }
  })

  it('includes acceptance criteria in the message', () => {
    const msgs = buildValidateINVESTPrompt(mockStory)
    const userMsg = msgs.find(m => m.role === 'user')!
    expect(userMsg.content).toContain('Login succeeds with valid credentials')
  })

  it('includes story points when set', () => {
    const msgs = buildValidateINVESTPrompt(mockStory)
    const userMsg = msgs.find(m => m.role === 'user')!
    expect(userMsg.content).toContain('3')
  })
})

// ─── parseFixProposal ─────────────────────────────────────────────────────────

describe('parseFixProposal', () => {
  const standardFix = {
    principleKey: 'negotiable',
    summary: 'Make debounce configurable',
    isSplit: false,
    isSpike: false,
    diffs: [{ field: 'assumptions', label: 'Assumptions', before: ['Old assumption'], after: ['New assumption'] }],
    patch: { assumptions: ['New assumption'] },
  }

  it('parses a standard fix proposal', () => {
    const result = parseFixProposal(JSON.stringify(standardFix))
    expect(result.principleKey).toBe('negotiable')
    expect(result.summary).toBe('Make debounce configurable')
    expect(result.patch).toEqual({ assumptions: ['New assumption'] })
  })

  it('parses a split fix with splitStories', () => {
    const splitFix = {
      principleKey: 'small',
      summary: 'Story is too large — split it',
      isSplit: true,
      isSpike: false,
      splitStories: [
        { title: 'Part 1', description: 'Description 1' },
        { title: 'Part 2', description: 'Description 2' },
      ],
      diffs: [],
      patch: { title: 'Part 1' },
    }
    const result = parseFixProposal(JSON.stringify(splitFix))
    expect(result.isSplit).toBe(true)
    expect(result.splitStories).toHaveLength(2)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseFixProposal('bad input')).toThrow()
  })
})
