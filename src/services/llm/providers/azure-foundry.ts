import type { APISettings, UploadedFile } from '../../../types'
import { LLMMessage, LLMError, injectFilesIntoMessages } from '../shared'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isClaudeModel(model: string): boolean {
  return model.toLowerCase().startsWith('claude')
}

/**
 * Build the Anthropic-style content array (documents + text block) for the
 * last user message when files are attached.
 */
function buildAnthropicContent(text: string, files: UploadedFile[]): string | object[] {
  const supported = files.filter(f => f.content && (f.contentType === 'pdf' || f.contentType === 'text'))
  if (!supported.length) return text
  const blocks: object[] = supported.map(f => ({
    type: 'document',
    title: f.name,
    source: f.contentType === 'pdf'
      ? { type: 'base64', media_type: 'application/pdf', data: f.content }
      : { type: 'text', data: f.content },
  }))
  blocks.push({ type: 'text', text })
  return blocks
}

// ─── Claude via Azure AI Foundry Anthropic endpoint ───────────────────────────

async function callFoundryClaude(
  messages: LLMMessage[],
  s: APISettings,
  files: UploadedFile[],
): Promise<string> {
  const base = s.azureFoundryEndpoint.replace(/\/$/, '')
  const system = messages.find(m => m.role === 'system')?.content
  const chat   = messages.filter(m => m.role !== 'system')

  const anthropicMessages = chat.map((m, i) => {
    if (m.role === 'user' && i === chat.length - 1 && files.length) {
      return { role: m.role, content: buildAnthropicContent(m.content, files) }
    }
    return m
  })

  // Azure AI Foundry routes Anthropic models under {endpoint}/anthropic/v1/messages
  // Auth: Bearer token (not 'api-key' which is Azure OpenAI-only)
  const url = `${base}/anthropic/v1/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${s.azureFoundryKey}`,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: s.azureFoundryModel,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: anthropicMessages,
    }),
  })
  if (!res.ok) throw new LLMError('Azure AI Foundry (Anthropic)', res.status, await res.text())
  const data = await res.json()
  // content[] may include thinking blocks — find the text block explicitly
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
  return textBlock?.text ?? ''
}

// ─── OpenAI-compatible model via Azure AI Foundry ────────────────────────────

async function callFoundryOpenAI(
  messages: LLMMessage[],
  s: APISettings,
  files: UploadedFile[],
  jsonMode: boolean,
): Promise<string> {
  const base = s.azureFoundryEndpoint.replace(/\/$/, '')

  // Azure AI Foundry exposes OpenAI models under {endpoint}/openai/v1
  const url = `${base}/openai/v1/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': s.azureFoundryKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: s.azureFoundryModel,
      messages: injectFilesIntoMessages(messages, files),
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      max_completion_tokens: 4096,
    }),
  })
  if (!res.ok) throw new LLMError('Azure AI Foundry (OpenAI)', res.status, await res.text())
  const data = await res.json()
  return data.choices[0].message.content
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Route to the correct Azure AI Foundry sub-endpoint based on the model name:
 *   - claude-*  → Anthropic Messages API  ({endpoint}/anthropic/v1/messages)
 *   - everything else → OpenAI-compatible  ({endpoint}/openai/v1/chat/completions)
 */
export async function callAzureFoundry(
  messages: LLMMessage[],
  s: APISettings,
  files: UploadedFile[],
  jsonMode = true,
): Promise<string> {
  return isClaudeModel(s.azureFoundryModel)
    ? callFoundryClaude(messages, s, files)
    : callFoundryOpenAI(messages, s, files, jsonMode)
}
