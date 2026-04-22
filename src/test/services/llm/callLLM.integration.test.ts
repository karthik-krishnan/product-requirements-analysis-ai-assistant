/**
 * Integration tests for the callLLM factory.
 * Verifies routing logic: correct provider is called for each settings.provider value.
 * Real HTTP calls are NOT made — providers are mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callLLM } from '../../../services/llm/client'
import type { APISettings } from '../../../types'
import type { LLMMessage } from '../../../services/llm/shared'

// ─── Mock each provider module ─────────────────────────────────────────────────

vi.mock('../../../services/llm/providers/anthropic', () => ({
  callAnthropic: vi.fn().mockResolvedValue('{"anthropic":true}'),
}))
vi.mock('../../../services/llm/providers/openai', () => ({
  callOpenAI: vi.fn().mockResolvedValue('{"openai":true}'),
}))
vi.mock('../../../services/llm/providers/azure', () => ({
  callAzureOpenAI: vi.fn().mockResolvedValue('{"azure":true}'),
}))
vi.mock('../../../services/llm/providers/google', () => ({
  callGoogle: vi.fn().mockResolvedValue('{"google":true}'),
}))
vi.mock('../../../services/llm/providers/ollama', () => ({
  callOllama: vi.fn().mockResolvedValue('{"ollama":true}'),
}))
vi.mock('../../../services/llm/providers/demo', () => ({
  callDemo: vi.fn().mockResolvedValue('{"demo":true}'),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const base: APISettings = {
  provider: 'demo',
  anthropicKey: 'sk-ant-key',
  openaiKey: 'sk-key',
  openaiModel: 'gpt-4o',
  azureKey: 'az-key',
  azureEndpoint: 'https://x.openai.azure.com',
  azureDeployment: 'gpt4',
  googleKey: 'AIza-key',
  googleModel: 'gemini-1.5-pro',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3',
  assistanceLevel: 2,
}

const messages: LLMMessage[] = [{ role: 'user', content: 'hello' }]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('callLLM factory routing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes demo provider to callDemo', async () => {
    const { callDemo } = await import('../../../services/llm/providers/demo')
    const result = await callLLM(messages, { ...base, provider: 'demo' }, [], 'generate-epics')
    expect(callDemo).toHaveBeenCalledWith('generate-epics')
    expect(result).toBe('{"demo":true}')
  })

  it('routes anthropic provider to callAnthropic', async () => {
    const { callAnthropic } = await import('../../../services/llm/providers/anthropic')
    const result = await callLLM(messages, { ...base, provider: 'anthropic' })
    expect(callAnthropic).toHaveBeenCalledWith(messages, { ...base, provider: 'anthropic' }, [])
    expect(result).toBe('{"anthropic":true}')
  })

  it('routes openai provider to callOpenAI', async () => {
    const { callOpenAI } = await import('../../../services/llm/providers/openai')
    await callLLM(messages, { ...base, provider: 'openai' })
    expect(callOpenAI).toHaveBeenCalled()
  })

  it('routes azure-openai provider to callAzureOpenAI', async () => {
    const { callAzureOpenAI } = await import('../../../services/llm/providers/azure')
    await callLLM(messages, { ...base, provider: 'azure-openai' })
    expect(callAzureOpenAI).toHaveBeenCalled()
  })

  it('routes google provider to callGoogle', async () => {
    const { callGoogle } = await import('../../../services/llm/providers/google')
    await callLLM(messages, { ...base, provider: 'google' })
    expect(callGoogle).toHaveBeenCalled()
  })

  it('routes ollama provider to callOllama', async () => {
    const { callOllama } = await import('../../../services/llm/providers/ollama')
    await callLLM(messages, { ...base, provider: 'ollama' })
    expect(callOllama).toHaveBeenCalled()
  })

  it('passes files array to real providers', async () => {
    const { callAnthropic } = await import('../../../services/llm/providers/anthropic')
    const files = [{ id: 'f1', name: 'doc.txt', size: 10, type: 'text/plain', content: 'hello', contentType: 'text' as const }]
    await callLLM(messages, { ...base, provider: 'anthropic' }, files)
    expect(callAnthropic).toHaveBeenCalledWith(messages, expect.anything(), files)
  })

  it('does NOT pass promptType to real providers', async () => {
    const { callAnthropic } = await import('../../../services/llm/providers/anthropic')
    await callLLM(messages, { ...base, provider: 'anthropic' }, [], 'generate-epics')
    // callAnthropic should only receive (messages, settings, files) — no promptType
    expect(callAnthropic).toHaveBeenCalledWith(messages, expect.anything(), [])
    expect((callAnthropic as ReturnType<typeof vi.fn>).mock.calls[0]).toHaveLength(3)
  })

  it('passes promptType only to demo provider', async () => {
    const { callDemo } = await import('../../../services/llm/providers/demo')
    await callLLM(messages, { ...base, provider: 'demo' }, [], 'validate-invest')
    expect(callDemo).toHaveBeenCalledWith('validate-invest')
    expect((callDemo as ReturnType<typeof vi.fn>).mock.calls[0]).toHaveLength(1)
  })

  it('defaults files to empty array when not provided', async () => {
    const { callAnthropic } = await import('../../../services/llm/providers/anthropic')
    await callLLM(messages, { ...base, provider: 'anthropic' })
    expect(callAnthropic).toHaveBeenCalledWith(messages, expect.anything(), [])
  })
})
