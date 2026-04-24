import type { LLMMessage } from '../services/llm/client'
import type { Epic, ContextCapture, ChatEntry } from '../types'

/**
 * Builds the full message array for a multi-turn epic chat.
 *
 * Context injected:
 *  - Domain & tech context
 *  - Raw product requirements
 *  - Full epic portfolio (so the AI can reason about dependencies & overlap)
 *  - The specific epic being discussed
 *  - Conversation history so far
 *  - The new user message
 */
export function buildEpicChatMessages(
  epic: Epic,
  allEpics: Epic[],
  context: ContextCapture,
  rawRequirements: string,
  history: ChatEntry[],
  userMessage: string,
): LLMMessage[] {
  const otherEpics = allEpics.filter(e => e.id !== epic.id)
  const portfolioSummary = otherEpics.length > 0
    ? otherEpics.map(e => `• [${e.priority}] ${e.title} — ${e.description}`).join('\n')
    : '(no other epics yet)'

  const systemPrompt = `You are a strategic product advisor helping a product team explore and refine an epic.

Your job is to ask probing questions and surface insights that will meaningfully shape how this epic is scoped, sequenced, and built. Keep every response grounded in the product requirements and the epic portfolio provided.

Focus areas:
- Scope boundaries: what is genuinely in this epic vs what should be a separate epic or deferred to a later phase
- Cross-epic dependencies and sequencing risks visible from the portfolio
- Business rules and edge cases that would materially change the stories or architecture
- Integration points, data flows, or non-functional requirements with real delivery impact
- Assumptions baked into the epic description that, if wrong, would change scope significantly
- Trade-offs worth making explicit before stories are written (e.g. MVP vs full scope, build vs buy)

Do NOT discuss: UI layout preferences, coding conventions, minor UX polish, or implementation technology choices.

Be concise and direct. Ask one focused question at a time when probing. Respond in plain conversational prose — no JSON, no bullet walls.`

  const contextBlock = `PRODUCT REQUIREMENTS:
${rawRequirements || '(not provided)'}

DOMAIN CONTEXT:
${context.domainText || '(none)'}

TECHNICAL CONTEXT:
${context.techText || '(none)'}

EPIC PORTFOLIO — other epics for this product:
${portfolioSummary}

THE EPIC BEING DISCUSSED:
Title: ${epic.title}
Priority: ${epic.priority} | Category: ${epic.category}
Description: ${epic.description}${epic.tags.length > 0 ? `\nTags: ${epic.tags.join(', ')}` : ''}`

  // Build the message array: system + context setup + conversation history + new message
  const messages: LLMMessage[] = [
    { role: 'system',    content: systemPrompt },
    { role: 'user',      content: contextBlock },
    // Seed the assistant's opening so history has proper alternation
    ...history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  return messages
}
