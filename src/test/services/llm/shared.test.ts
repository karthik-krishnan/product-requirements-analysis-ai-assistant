import { describe, it, expect } from 'vitest'
import { parseJSON, LLMError, injectFilesIntoMessages } from '../../../services/llm/shared'
import type { LLMMessage } from '../../../services/llm/shared'
import type { UploadedFile } from '../../../types'

// ─── parseJSON ────────────────────────────────────────────────────────────────

describe('parseJSON', () => {
  it('parses plain JSON objects', () => {
    expect(parseJSON<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips ```json fences', () => {
    const raw = '```json\n{"key":"value"}\n```'
    expect(parseJSON<{ key: string }>(raw)).toEqual({ key: 'value' })
  })

  it('strips plain ``` fences', () => {
    const raw = '```\n{"key":"value"}\n```'
    expect(parseJSON<{ key: string }>(raw)).toEqual({ key: 'value' })
  })

  it('handles leading/trailing whitespace', () => {
    expect(parseJSON<{ x: boolean }>('  \n{"x":true}\n  ')).toEqual({ x: true })
  })

  it('throws SyntaxError on malformed JSON', () => {
    expect(() => parseJSON('{bad}')).toThrow(SyntaxError)
  })

  it('handles nested objects and arrays', () => {
    const raw = '{"questions":[{"id":"q1","options":["A","B"]}]}'
    const result = parseJSON<{ questions: { id: string; options: string[] }[] }>(raw)
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].options).toEqual(['A', 'B'])
  })
})

// ─── LLMError ─────────────────────────────────────────────────────────────────

describe('LLMError', () => {
  it('formats message with provider and status', () => {
    const err = new LLMError('Anthropic', 401, 'Unauthorized')
    expect(err.message).toBe('[Anthropic] 401: Unauthorized')
    expect(err.provider).toBe('Anthropic')
    expect(err.status).toBe(401)
    expect(err.name).toBe('LLMError')
  })

  it('is instanceof Error', () => {
    const err = new LLMError('OpenAI', 500, 'Server error')
    expect(err).toBeInstanceOf(Error)
  })
})

// ─── injectFilesIntoMessages ──────────────────────────────────────────────────

describe('injectFilesIntoMessages', () => {
  const makeMessages = (): LLMMessage[] => [
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: 'generate epics' },
  ]

  const makeTextFile = (name: string, content: string): UploadedFile => ({
    id: name,
    name,
    size: content.length,
    type: 'text/plain',
    content,
    contentType: 'text',
  })

  it('returns messages unchanged when no files', () => {
    const msgs = makeMessages()
    expect(injectFilesIntoMessages(msgs, [])).toStrictEqual(msgs)
  })

  it('appends text file content to the last user message', () => {
    const msgs = makeMessages()
    const file = makeTextFile('spec.md', '# Spec content')
    const result = injectFilesIntoMessages(msgs, [file])
    const lastUser = result.find(m => m.role === 'user')!
    expect(lastUser.content).toContain('spec.md')
    expect(lastUser.content).toContain('# Spec content')
  })

  it('does not modify system message', () => {
    const msgs = makeMessages()
    const file = makeTextFile('doc.txt', 'content')
    const result = injectFilesIntoMessages(msgs, [file])
    expect(result[0].content).toBe('system prompt')
  })

  it('skips files without text contentType', () => {
    const msgs = makeMessages()
    const pdfFile: UploadedFile = {
      id: 'f1', name: 'file.pdf', size: 100, type: 'application/pdf',
      content: 'base64data', contentType: 'pdf',
    }
    const result = injectFilesIntoMessages(msgs, [pdfFile])
    // PDF files have no text to inject — message unchanged
    expect(result[1].content).toBe('generate epics')
  })

  it('injects multiple text files', () => {
    const msgs = makeMessages()
    const files = [
      makeTextFile('a.md', 'content A'),
      makeTextFile('b.txt', 'content B'),
    ]
    const result = injectFilesIntoMessages(msgs, files)
    const lastUser = result.find(m => m.role === 'user')!
    expect(lastUser.content).toContain('a.md')
    expect(lastUser.content).toContain('b.txt')
  })
})
