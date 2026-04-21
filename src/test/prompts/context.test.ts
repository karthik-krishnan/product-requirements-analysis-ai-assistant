/**
 * Tests that domain/tech context (text and files) is correctly threaded through
 * prompt builders and the callLLM factory so it reaches the LLM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildClarifyingQuestionsPrompt } from '../../prompts/clarifyingQuestions'
import { buildGenerateEpicsPrompt } from '../../prompts/generateEpics'
import { buildGenerateStoriesPrompt } from '../../prompts/generateStories'
import { callLLM } from '../../services/llm/client'
import { injectFilesIntoMessages } from '../../services/llm/shared'
import type { ContextCapture, Epic, ClarifyingQuestion, UploadedFile } from '../../types'
import type { LLMMessage } from '../../services/llm/shared'

// ─── Mock the provider so no real HTTP calls are made ─────────────────────────

vi.mock('../../services/llm/providers/anthropic', () => ({
  callAnthropic: vi.fn().mockResolvedValue('{}'),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeContext = (overrides: Partial<ContextCapture> = {}): ContextCapture => ({
  domainText: '',
  domainFiles: [],
  techText: '',
  techFiles: [],
  ...overrides,
})

const makeTextFile = (name: string, content: string): UploadedFile => ({
  id: name, name, size: content.length, type: 'text/plain', content, contentType: 'text',
})

const makeEpic = (): Epic => ({
  id: 'epic-1',
  title: 'Product Search',
  description: 'Full-text search across catalog',
  priority: 'High',
  category: 'Core Product',
  tags: ['search'],
  stories: [],
})

const answeredQuestion = (q: string, a: string): ClarifyingQuestion => ({
  id: 'q1', question: q, options: [], answer: a,
})

const getUserMessage = (messages: LLMMessage[]) => messages.find(m => m.role === 'user')!.content

// ─── buildClarifyingQuestionsPrompt — context injection ───────────────────────

describe('buildClarifyingQuestionsPrompt — context injection', () => {
  it('embeds domainText in the user message', () => {
    const ctx = makeContext({ domainText: 'B2C retail platform with SAP backend' })
    const content = getUserMessage(buildClarifyingQuestionsPrompt('Build a checkout', ctx, 2))
    expect(content).toContain('B2C retail platform with SAP backend')
  })

  it('embeds techText in the user message', () => {
    const ctx = makeContext({ techText: 'React frontend, Node.js API, PostgreSQL' })
    const content = getUserMessage(buildClarifyingQuestionsPrompt('Build a checkout', ctx, 2))
    expect(content).toContain('React frontend, Node.js API, PostgreSQL')
  })

  it('shows (none provided) placeholder when context is empty', () => {
    const content = getUserMessage(buildClarifyingQuestionsPrompt('Requirements', makeContext(), 1))
    expect(content).toContain('(none provided)')
  })

  it('includes both domain and tech context in the same message', () => {
    const ctx = makeContext({ domainText: 'Healthcare SaaS', techText: 'AWS Lambda, DynamoDB' })
    const content = getUserMessage(buildClarifyingQuestionsPrompt('Build it', ctx, 3))
    expect(content).toContain('Healthcare SaaS')
    expect(content).toContain('AWS Lambda, DynamoDB')
  })
})

// ─── buildGenerateEpicsPrompt — context injection ─────────────────────────────

describe('buildGenerateEpicsPrompt — context injection', () => {
  const questions = [answeredQuestion('Who are users?', 'External customers')]

  it('embeds domainText in the user message', () => {
    const ctx = makeContext({ domainText: 'Logistics SaaS with fleet management' })
    const content = getUserMessage(buildGenerateEpicsPrompt('Build a TMS', ctx, questions))
    expect(content).toContain('Logistics SaaS with fleet management')
  })

  it('embeds techText in the user message', () => {
    const ctx = makeContext({ techText: 'Microservices on Kubernetes, Kafka event bus' })
    const content = getUserMessage(buildGenerateEpicsPrompt('Build a TMS', ctx, questions))
    expect(content).toContain('Microservices on Kubernetes, Kafka event bus')
  })

  it('includes Q&A answers in the user message', () => {
    const content = getUserMessage(buildGenerateEpicsPrompt('Build a TMS', makeContext(), questions))
    expect(content).toContain('Who are users?')
    expect(content).toContain('External customers')
  })

  it('shows no-questions placeholder when questions array is empty', () => {
    const content = getUserMessage(buildGenerateEpicsPrompt('Build it', makeContext(), []))
    expect(content).toContain('no clarifying questions')
  })

  it('includes Q&A label even with unanswered questions', () => {
    const unanswered: ClarifyingQuestion = { id: 'q1', question: 'Scale?', options: [] }
    const content = getUserMessage(buildGenerateEpicsPrompt('Req', makeContext(), [unanswered]))
    expect(content).toContain('Scale?')
    expect(content).toContain('(no answer provided)')
  })
})

// ─── buildGenerateStoriesPrompt — context injection ───────────────────────────

describe('buildGenerateStoriesPrompt — context injection', () => {
  const epic = makeEpic()
  const questions = [answeredQuestion('Offline support?', 'Online-only is acceptable')]

  it('embeds domainText in the user message', () => {
    const ctx = makeContext({ domainText: 'E-commerce with loyalty program' })
    const content = getUserMessage(buildGenerateStoriesPrompt(epic, ctx, []))
    expect(content).toContain('E-commerce with loyalty program')
  })

  it('embeds techText in the user message', () => {
    const ctx = makeContext({ techText: 'Elasticsearch 8, Next.js SSR' })
    const content = getUserMessage(buildGenerateStoriesPrompt(epic, ctx, []))
    expect(content).toContain('Elasticsearch 8, Next.js SSR')
  })

  it('embeds epic title and description in the user message', () => {
    const content = getUserMessage(buildGenerateStoriesPrompt(epic, makeContext(), []))
    expect(content).toContain('Product Search')
    expect(content).toContain('Full-text search across catalog')
  })

  it('includes discovery Q&A answers', () => {
    const content = getUserMessage(buildGenerateStoriesPrompt(epic, makeContext(), questions))
    expect(content).toContain('Offline support?')
    expect(content).toContain('Online-only is acceptable')
  })

  it('shows no-questions placeholder when discovery is skipped', () => {
    const content = getUserMessage(buildGenerateStoriesPrompt(epic, makeContext(), []))
    expect(content).toContain('no discovery questions')
  })
})

// ─── File context flows through callLLM to the provider ──────────────────────

describe('context files flow through callLLM', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes domainFiles and techFiles to the provider', async () => {
    const { callAnthropic } = await import('../../services/llm/providers/anthropic')
    const domainFile = makeTextFile('domain.md', 'Business rules here')
    const techFile   = makeTextFile('tech.txt',  'Architecture decisions')
    const messages: LLMMessage[] = [{ role: 'user', content: 'generate epics' }]
    const settings = {
      provider: 'anthropic' as const,
      anthropicKey: 'sk-test', openaiKey: '', openaiModel: 'gpt-4o',
      azureKey: '', azureEndpoint: '', azureDeployment: '',
      googleKey: '', googleModel: 'gemini-1.5-pro',
      ollamaEndpoint: '', ollamaModel: '', assistanceLevel: 2 as const,
    }

    await callLLM(messages, settings, [domainFile, techFile], 'generate-epics')

    expect(callAnthropic).toHaveBeenCalledWith(
      messages,
      settings,
      [domainFile, techFile],
    )
  })

  it('passes empty files array when no context files are uploaded', async () => {
    const { callAnthropic } = await import('../../services/llm/providers/anthropic')
    const messages: LLMMessage[] = [{ role: 'user', content: 'generate epics' }]
    const settings = {
      provider: 'anthropic' as const,
      anthropicKey: 'sk-test', openaiKey: '', openaiModel: 'gpt-4o',
      azureKey: '', azureEndpoint: '', azureDeployment: '',
      googleKey: '', googleModel: 'gemini-1.5-pro',
      ollamaEndpoint: '', ollamaModel: '', assistanceLevel: 2 as const,
    }

    await callLLM(messages, settings)

    expect(callAnthropic).toHaveBeenCalledWith(messages, settings, [])
  })
})

// ─── injectFilesIntoMessages — text file content in prompt ───────────────────

describe('text file content injection into prompt messages', () => {
  it('domain text file content is appended to the last user message', () => {
    const domainFile = makeTextFile('domain-rules.md', 'All prices exclude VAT.')
    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a BA assistant.' },
      { role: 'user', content: 'Generate epics for this system.' },
    ]
    const result = injectFilesIntoMessages(messages, [domainFile])
    expect(result[1].content).toContain('domain-rules.md')
    expect(result[1].content).toContain('All prices exclude VAT.')
  })

  it('tech file content is appended to the last user message', () => {
    const techFile = makeTextFile('architecture.md', 'Use PostgreSQL for transactional data.')
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Generate stories.' },
    ]
    const result = injectFilesIntoMessages(messages, [techFile])
    expect(result[0].content).toContain('architecture.md')
    expect(result[0].content).toContain('Use PostgreSQL for transactional data.')
  })

  it('multiple context files all appear in the injected message', () => {
    const files = [
      makeTextFile('domain.md', 'Domain: healthcare'),
      makeTextFile('tech.txt',  'Stack: FastAPI + React'),
    ]
    const messages: LLMMessage[] = [{ role: 'user', content: 'Generate.' }]
    const result = injectFilesIntoMessages(messages, files)
    expect(result[0].content).toContain('Domain: healthcare')
    expect(result[0].content).toContain('Stack: FastAPI + React')
  })

  it('PDF files are NOT injected as text (they use native document blocks for Anthropic/Google)', () => {
    const pdfFile: UploadedFile = {
      id: 'f1', name: 'spec.pdf', size: 100, type: 'application/pdf',
      content: 'base64encodedcontent', contentType: 'pdf',
    }
    const messages: LLMMessage[] = [{ role: 'user', content: 'Generate.' }]
    const result = injectFilesIntoMessages(messages, [pdfFile])
    // Original message unchanged — PDF is not injected as text
    expect(result[0].content).toBe('Generate.')
    expect(result[0].content).not.toContain('base64encodedcontent')
  })

  it('unsupported file types are silently skipped', () => {
    const unsupportedFile: UploadedFile = {
      id: 'f1', name: 'image.png', size: 200, type: 'image/png',
      contentType: 'unsupported',
    }
    const messages: LLMMessage[] = [{ role: 'user', content: 'Generate.' }]
    const result = injectFilesIntoMessages(messages, [unsupportedFile])
    expect(result[0].content).toBe('Generate.')
  })
})
