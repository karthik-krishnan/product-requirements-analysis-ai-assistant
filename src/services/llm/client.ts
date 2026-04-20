import type { APISettings } from '../../types'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class LLMError extends Error {
  constructor(
    public provider: string,
    public status: number,
    message: string,
  ) {
    super(`[${provider}] ${status}: ${message}`)
    this.name = 'LLMError'
  }
}

export function hasValidKey(settings: APISettings): boolean {
  switch (settings.provider) {
    case 'anthropic':    return !!settings.anthropicKey.trim()
    case 'openai':       return !!settings.openaiKey.trim()
    case 'azure-openai': return !!settings.azureKey.trim() && !!settings.azureEndpoint.trim() && !!settings.azureDeployment.trim()
    case 'google':       return !!settings.googleKey.trim()
    case 'ollama':       return !!settings.ollamaEndpoint.trim() && !!settings.ollamaModel.trim()
  }
}

export function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  return JSON.parse(cleaned) as T
}

export async function callLLM(messages: LLMMessage[], settings: APISettings): Promise<string> {
  switch (settings.provider) {
    case 'anthropic':    return callAnthropic(messages, settings)
    case 'openai':       return callOpenAI(messages, settings)
    case 'azure-openai': return callAzureOpenAI(messages, settings)
    case 'google':       return callGoogle(messages, settings)
    case 'ollama':       return callOllama(messages, settings)
  }
}

async function callAnthropic(messages: LLMMessage[], s: APISettings): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content
  const chat = messages.filter(m => m.role !== 'system')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': s.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: chat,
    }),
  })
  if (!res.ok) throw new LLMError('Anthropic', res.status, await res.text())
  const data = await res.json()
  return data.content[0].text
}

async function callOpenAI(messages: LLMMessage[], s: APISettings): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${s.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: s.openaiModel,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    }),
  })
  if (!res.ok) throw new LLMError('OpenAI', res.status, await res.text())
  const data = await res.json()
  return data.choices[0].message.content
}

async function callAzureOpenAI(messages: LLMMessage[], s: APISettings): Promise<string> {
  const url = `${s.azureEndpoint}/openai/deployments/${s.azureDeployment}/chat/completions?api-version=2024-02-15-preview`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': s.azureKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    }),
  })
  if (!res.ok) throw new LLMError('Azure OpenAI', res.status, await res.text())
  const data = await res.json()
  return data.choices[0].message.content
}

async function callGoogle(messages: LLMMessage[], s: APISettings): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content
  const chat = messages.filter(m => m.role !== 'system')

  const contents = chat.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${s.googleModel}:generateContent?key=${s.googleKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4096,
        },
      }),
    },
  )
  if (!res.ok) throw new LLMError('Google', res.status, await res.text())
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}

async function callOllama(messages: LLMMessage[], s: APISettings): Promise<string> {
  const res = await fetch(`${s.ollamaEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: s.ollamaModel,
      messages,
      stream: false,
      format: 'json',
    }),
  })
  if (!res.ok) throw new LLMError('Ollama', res.status, await res.text())
  const data = await res.json()
  return data.message.content
}
