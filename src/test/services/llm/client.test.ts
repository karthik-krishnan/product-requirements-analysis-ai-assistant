import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isDemo, hasValidKey, isLiveMode, callLLM } from '../../../services/llm/client'
import type { APISettings, LLMMessage } from '../../../types'

// ─── Provider isolation mocks ─────────────────────────────────────────────────
// Each real provider module is mocked so we can assert which one callLLM invokes
// without making network calls. The demo provider is imported via the real module
// so its actual canned-response logic is exercised (not mocked away).

vi.mock('../../../services/llm/providers/anthropic',  () => ({ callAnthropic:  vi.fn().mockResolvedValue('anthropic-response')  }))
vi.mock('../../../services/llm/providers/openai',     () => ({ callOpenAI:     vi.fn().mockResolvedValue('openai-response')     }))
vi.mock('../../../services/llm/providers/azure',      () => ({ callAzureOpenAI:vi.fn().mockResolvedValue('azure-response')      }))
vi.mock('../../../services/llm/providers/google',     () => ({ callGoogle:     vi.fn().mockResolvedValue('google-response')     }))
vi.mock('../../../services/llm/providers/ollama',     () => ({ callOllama:     vi.fn().mockResolvedValue('ollama-response')     }))

import { callAnthropic  } from '../../../services/llm/providers/anthropic'
import { callOpenAI     } from '../../../services/llm/providers/openai'
import { callAzureOpenAI} from '../../../services/llm/providers/azure'
import { callGoogle     } from '../../../services/llm/providers/google'
import { callOllama     } from '../../../services/llm/providers/ollama'

const MESSAGES: LLMMessage[] = [{ role: 'user', content: 'hello' }]

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

// ─── callLLM — provider routing isolation ────────────────────────────────────
//
// These tests enforce the invariant that:
//   • demo provider → callDemo only (no real provider ever called)
//   • real providers → their specific adapter called, callDemo never called
//
// This guards against accidentally wiring a chat panel to demo data in live
// mode or calling live LLMs during demo walkthroughs.

describe('callLLM — demo mode never calls live providers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(callAnthropic).mockClear()
    vi.mocked(callOpenAI).mockClear()
    vi.mocked(callAzureOpenAI).mockClear()
    vi.mocked(callGoogle).mockClear()
    vi.mocked(callOllama).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a non-empty string in demo mode without calling any live provider', async () => {
    const promise = callLLM(MESSAGES, withProvider('demo'), [], 'generate-epics')
    vi.runAllTimers()
    const result = await promise
    expect(result.length).toBeGreaterThan(0)
    expect(callAnthropic).not.toHaveBeenCalled()
    expect(callOpenAI).not.toHaveBeenCalled()
    expect(callAzureOpenAI).not.toHaveBeenCalled()
    expect(callGoogle).not.toHaveBeenCalled()
    expect(callOllama).not.toHaveBeenCalled()
  })

  it('returns demo response for every known task type without hitting live providers', async () => {
    const taskTypes = [
      'clarifying-questions',
      'epic-clarifying-questions',
      'generate-epics',
      'generate-stories',
      'validate-invest',
      'fix-invest:small',
      'epic-chat',
      'story-chat',
    ]
    // Fire all calls concurrently, then flush all timers at once so the
    // simulated demo delay doesn't make the test time out.
    const promises = taskTypes.map(taskType =>
      callLLM(MESSAGES, withProvider('demo'), [], taskType)
    )
    vi.runAllTimers()
    const results = await Promise.all(promises)
    results.forEach((result, i) => {
      expect(result.length, `task '${taskTypes[i]}' should return non-empty demo response`).toBeGreaterThan(0)
    })
    expect(callAnthropic).not.toHaveBeenCalled()
    expect(callOpenAI).not.toHaveBeenCalled()
    expect(callAzureOpenAI).not.toHaveBeenCalled()
    expect(callGoogle).not.toHaveBeenCalled()
    expect(callOllama).not.toHaveBeenCalled()
  })
})

describe('callLLM — live mode routes to the correct provider only', () => {
  beforeEach(() => {
    vi.mocked(callAnthropic).mockClear()
    vi.mocked(callOpenAI).mockClear()
    vi.mocked(callAzureOpenAI).mockClear()
    vi.mocked(callGoogle).mockClear()
    vi.mocked(callOllama).mockClear()
  })

  it('routes anthropic → callAnthropic only', async () => {
    await callLLM(MESSAGES, withProvider('anthropic', { anthropicKey: 'sk-ant-test' }), [])
    expect(callAnthropic).toHaveBeenCalledOnce()
    expect(callOpenAI).not.toHaveBeenCalled()
    expect(callAzureOpenAI).not.toHaveBeenCalled()
    expect(callGoogle).not.toHaveBeenCalled()
    expect(callOllama).not.toHaveBeenCalled()
  })

  it('routes openai → callOpenAI only', async () => {
    await callLLM(MESSAGES, withProvider('openai', { openaiKey: 'sk-test' }), [])
    expect(callOpenAI).toHaveBeenCalledOnce()
    expect(callAnthropic).not.toHaveBeenCalled()
    expect(callAzureOpenAI).not.toHaveBeenCalled()
    expect(callGoogle).not.toHaveBeenCalled()
    expect(callOllama).not.toHaveBeenCalled()
  })

  it('routes azure-openai → callAzureOpenAI only', async () => {
    await callLLM(MESSAGES, withProvider('azure-openai', {
      azureKey: 'key', azureEndpoint: 'https://x.openai.azure.com', azureDeployment: 'gpt4',
    }), [])
    expect(callAzureOpenAI).toHaveBeenCalledOnce()
    expect(callAnthropic).not.toHaveBeenCalled()
    expect(callOpenAI).not.toHaveBeenCalled()
    expect(callGoogle).not.toHaveBeenCalled()
    expect(callOllama).not.toHaveBeenCalled()
  })

  it('routes google → callGoogle only', async () => {
    await callLLM(MESSAGES, withProvider('google', { googleKey: 'AIza-test' }), [])
    expect(callGoogle).toHaveBeenCalledOnce()
    expect(callAnthropic).not.toHaveBeenCalled()
    expect(callOpenAI).not.toHaveBeenCalled()
    expect(callAzureOpenAI).not.toHaveBeenCalled()
    expect(callOllama).not.toHaveBeenCalled()
  })

  it('routes ollama → callOllama only', async () => {
    await callLLM(MESSAGES, withProvider('ollama', {
      ollamaEndpoint: 'http://localhost:11434', ollamaModel: 'llama3',
    }), [])
    expect(callOllama).toHaveBeenCalledOnce()
    expect(callAnthropic).not.toHaveBeenCalled()
    expect(callOpenAI).not.toHaveBeenCalled()
    expect(callAzureOpenAI).not.toHaveBeenCalled()
    expect(callGoogle).not.toHaveBeenCalled()
  })
})
