import { describe, it, expect } from 'vitest'
import { supportsNativePDF, injectTextFiles } from './files'
import type { UploadedFile } from '../types'

// ─── supportsNativePDF ────────────────────────────────────────────────────────

describe('supportsNativePDF', () => {
  it('returns true for anthropic', () => {
    expect(supportsNativePDF('anthropic')).toBe(true)
  })

  it('returns true for google', () => {
    expect(supportsNativePDF('google')).toBe(true)
  })

  it('returns false for openai', () => {
    expect(supportsNativePDF('openai')).toBe(false)
  })

  it('returns false for azure-openai', () => {
    expect(supportsNativePDF('azure-openai')).toBe(false)
  })

  it('returns false for ollama', () => {
    expect(supportsNativePDF('ollama')).toBe(false)
  })

  it('returns false for demo', () => {
    expect(supportsNativePDF('demo')).toBe(false)
  })
})

// ─── injectTextFiles ──────────────────────────────────────────────────────────

const makeFile = (name: string, content: string, contentType: UploadedFile['contentType'] = 'text'): UploadedFile => ({
  id: name, name, size: content.length, type: 'text/plain', content, contentType,
})

describe('injectTextFiles', () => {
  it('returns empty string when no files', () => {
    expect(injectTextFiles([])).toBe('')
  })

  it('returns empty string when all files are PDFs', () => {
    const pdfFile = makeFile('doc.pdf', 'base64data', 'pdf')
    expect(injectTextFiles([pdfFile])).toBe('')
  })

  it('returns empty string when all files are unsupported type', () => {
    const unsupported = makeFile('doc.xlsx', '', 'unsupported')
    expect(injectTextFiles([unsupported])).toBe('')
  })

  it('injects a single text file with correct format', () => {
    const file = makeFile('spec.md', '# My spec')
    const result = injectTextFiles([file])
    expect(result).toContain('spec.md')
    expect(result).toContain('# My spec')
    expect(result).toContain('--- Attached file:')
  })

  it('injects multiple text files', () => {
    const files = [
      makeFile('domain.md', 'domain content'),
      makeFile('tech.txt', 'tech content'),
    ]
    const result = injectTextFiles(files)
    expect(result).toContain('domain.md')
    expect(result).toContain('domain content')
    expect(result).toContain('tech.txt')
    expect(result).toContain('tech content')
  })

  it('skips text files without content', () => {
    const emptyFile: UploadedFile = { id: 'f', name: 'empty.txt', size: 0, type: 'text/plain', contentType: 'text' }
    expect(injectTextFiles([emptyFile])).toBe('')
  })

  it('filters out PDF files while keeping text files', () => {
    const files = [
      makeFile('doc.pdf', 'base64', 'pdf'),
      makeFile('notes.md', 'notes content', 'text'),
    ]
    const result = injectTextFiles(files)
    expect(result).not.toContain('doc.pdf')
    expect(result).toContain('notes.md')
    expect(result).toContain('notes content')
  })
})
