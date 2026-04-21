import type { APISettings, UploadedFile } from '../../types'
import { injectTextFiles } from '../../utils/files'

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

export async function callLLM(
  messages: LLMMessage[],
  settings: APISettings,
  files: UploadedFile[] = [],
): Promise<string> {
  switch (settings.provider) {
    case 'anthropic':    return callAnthropic(messages, settings, files)
    case 'openai':       return callOpenAI(messages, settings, files)
    case 'azure-openai': return callAzureOpenAI(messages, settings, files)
    case 'google':       return callGoogle(messages, settings, files)
    case 'ollama':       return callOllama(messages, settings, files)
  }
}

function buildAnthropicContent(text: string, files: UploadedFile[]): string | object[] {
  const supportedFiles = files.filter(f => f.content && (f.contentType === 'pdf' || f.contentType === 'text'))
  if (!supportedFiles.length) return text

  const blocks: object[] = supportedFiles.map(f => ({
    type: 'document',
    title: f.name,
    source: f.contentType === 'pdf'
      ? { type: 'base64', media_type: 'application/pdf', data: f.content }
      : { type: 'text', data: f.content },
  }))
  blocks.push({ type: 'text', text })
  return blocks
}

async function callAnthropic(messages: LLMMessage[], s: APISettings, files: UploadedFile[]): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content
  const chat = messages.filter(m => m.role !== 'system')

  // Attach files to the last user message as native document blocks
  const anthropicMessages = chat.map((m, i) => {
    if (m.role === 'user' && i === chat.length - 1 && files.length) {
      return { role: m.role, content: buildAnthropicContent(m.content, files) }
    }
    return m
  })

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
      messages: anthropicMessages,
    }),
  })
  if (!res.ok) throw new LLMError('Anthropic', res.status, await res.text())
  const data = await res.json()
  return data.content[0].text
}

function injectFilesIntoMessages(messages: LLMMessage[], files: UploadedFile[]): LLMMessage[] {
  const textContent = injectTextFiles(files)
  if (!textContent) return messages
  return messages.map((m, i) =>
    m.role === 'user' && i === messages.length - 1
      ? { ...m, content: m.content + textContent }
      : m,
  )
}

async function callOpenAI(messages: LLMMessage[], s: APISettings, files: UploadedFile[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${s.openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: s.openaiModel,
      messages: injectFilesIntoMessages(messages, files),
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    }),
  })
  if (!res.ok) throw new LLMError('OpenAI', res.status, await res.text())
  const data = await res.json()
  return data.choices[0].message.content
}

async function callAzureOpenAI(messages: LLMMessage[], s: APISettings, files: UploadedFile[]): Promise<string> {
  const url = `${s.azureEndpoint}/openai/deployments/${s.azureDeployment}/chat/completions?api-version=2024-02-15-preview`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': s.azureKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: injectFilesIntoMessages(messages, files),
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    }),
  })
  if (!res.ok) throw new LLMError('Azure OpenAI', res.status, await res.text())
  const data = await res.json()
  return data.choices[0].message.content
}

async function callGoogle(messages: LLMMessage[], s: APISettings, files: UploadedFile[]): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content
  const chat = messages.filter(m => m.role !== 'system')

  const supportedFiles = files.filter(f => f.content && (f.contentType === 'pdf' || f.contentType === 'text'))

  const contents = chat.map((m, i) => {
    const parts: object[] = []
    // Attach files to last user message as inlineData
    if (m.role === 'user' && i === chat.length - 1 && supportedFiles.length) {
      supportedFiles.forEach(f => {
        if (f.contentType === 'pdf') {
          parts.push({ inlineData: { mimeType: 'application/pdf', data: f.content } })
        } else {
          parts.push({ text: `--- Attached: ${f.name} ---\n${f.content}` })
        }
      })
    }
    parts.push({ text: m.content })
    return { role: m.role === 'assistant' ? 'model' : 'user', parts }
  })

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

async function callOllama(messages: LLMMessage[], s: APISettings, files: UploadedFile[]): Promise<string> {
  const res = await fetch(`${s.ollamaEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: s.ollamaModel,
      messages: injectFilesIntoMessages(messages, files),
      stream: false,
      format: 'json',
    }),
  })
  if (!res.ok) throw new LLMError('Ollama', res.status, await res.text())
  const data = await res.json()
  return data.message.content
}
