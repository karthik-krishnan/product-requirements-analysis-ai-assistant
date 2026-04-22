import { describe, it, expect } from 'vitest'
import { isDemo, hasValidKey, isLiveMode } from '../../../services/llm/client'
import type { APISettings } from '../../../types'

const base: APISettings = {
  provider: 'demo',
  anthropicKey: '',
  openaiKey: '',
  openaiModel: 'gpt-4o',
  azureKey: '',
  azureEndpoint: '',
  azureDeployment: '',
  googleKey: '',
  googleModel: 'gemini-1.5-pro',
  ollamaEndpoint: '',
  ollamaModel: '',
  assistanceLevel: 2,
}

const withProvider = (provider: APISettings['provider'], overrides: Partial<APISettings> = {}): APISettings => ({
  ...base,
  provider,
  ...overrides,
})

// ─── isDemo ───────────────────────────────────────────────────────────────────

describe('isDemo', () => {
  it('returns true for demo provider', () => {
    expect(isDemo(withProvider('demo'))).toBe(true)
  })

  it('returns false for all real providers', () => {
    const providers: APISettings['provider'][] = ['anthropic', 'openai', 'azure-openai', 'google', 'ollama']
    for (const p of providers) {
      expect(isDemo(withProvider(p))).toBe(false)
    }
  })
})

// ─── hasValidKey ──────────────────────────────────────────────────────────────

describe('hasValidKey', () => {
  it('returns false for demo provider', () => {
    expect(hasValidKey(withProvider('demo'))).toBe(false)
  })

  it('returns true when anthropicKey is set', () => {
    expect(hasValidKey(withProvider('anthropic', { anthropicKey: 'sk-ant-123' }))).toBe(true)
  })

  it('returns false when anthropicKey is empty string', () => {
    expect(hasValidKey(withProvider('anthropic', { anthropicKey: '' }))).toBe(false)
  })

  it('returns false when anthropicKey is whitespace', () => {
    expect(hasValidKey(withProvider('anthropic', { anthropicKey: '   ' }))).toBe(false)
  })

  it('returns true for openai with key', () => {
    expect(hasValidKey(withProvider('openai', { openaiKey: 'sk-123' }))).toBe(true)
  })

  it('returns false for openai without key', () => {
    expect(hasValidKey(withProvider('openai', { openaiKey: '' }))).toBe(false)
  })

  it('returns true for azure-openai with all three fields', () => {
    expect(hasValidKey(withProvider('azure-openai', {
      azureKey: 'key', azureEndpoint: 'https://x.openai.azure.com', azureDeployment: 'gpt4',
    }))).toBe(true)
  })

  it('returns false for azure-openai missing endpoint', () => {
    expect(hasValidKey(withProvider('azure-openai', {
      azureKey: 'key', azureEndpoint: '', azureDeployment: 'gpt4',
    }))).toBe(false)
  })

  it('returns false for azure-openai missing deployment', () => {
    expect(hasValidKey(withProvider('azure-openai', {
      azureKey: 'key', azureEndpoint: 'https://x.openai.azure.com', azureDeployment: '',
    }))).toBe(false)
  })

  it('returns true for google with key', () => {
    expect(hasValidKey(withProvider('google', { googleKey: 'AIza123' }))).toBe(true)
  })

  it('returns true for ollama with endpoint and model', () => {
    expect(hasValidKey(withProvider('ollama', {
      ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3',
    }))).toBe(true)
  })

  it('returns false for ollama missing model', () => {
    expect(hasValidKey(withProvider('ollama', {
      ollamaEndpoint: 'http://localhost:11434', ollamaModel: '',
    }))).toBe(false)
  })
})

// ─── isLiveMode ───────────────────────────────────────────────────────────────

describe('isLiveMode', () => {
  it('returns false for demo provider regardless of keys', () => {
    expect(isLiveMode(withProvider('demo'))).toBe(false)
  })

  it('returns false when provider is real but key is missing', () => {
    expect(isLiveMode(withProvider('anthropic', { anthropicKey: '' }))).toBe(false)
  })

  it('returns true when provider is real and key is present', () => {
    expect(isLiveMode(withProvider('anthropic', { anthropicKey: 'sk-ant-123' }))).toBe(true)
  })

  it('treats openai the same way', () => {
    expect(isLiveMode(withProvider('openai', { openaiKey: 'sk-abc' }))).toBe(true)
    expect(isLiveMode(withProvider('openai', { openaiKey: '' }))).toBe(false)
  })
})
