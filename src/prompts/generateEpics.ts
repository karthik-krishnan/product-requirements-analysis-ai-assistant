import type { LLMMessage } from '../services/llm/client'
import type { ContextCapture, ClarifyingQuestion, Epic } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'

export function buildGenerateEpicsPrompt(
  requirements: string,
  context: ContextCapture,
  questions: ClarifyingQuestion[],
): LLMMessage[] {
  const qaBlock = questions.length > 0
    ? questions.map(q => `Q: ${q.question}\nA: ${q.answer || '(no answer provided)'}`).join('\n\n')
    : '(no clarifying questions — generate based on requirements and context alone)'

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Generate a comprehensive set of epics from the requirements below. Each epic should represent a coherent business capability.

DOMAIN CONTEXT:
${context.domainText || '(none provided)'}

TECHNICAL CONTEXT:
${context.techText || '(none provided)'}

RAW REQUIREMENTS:
${requirements}

CLARIFYING Q&A:
${qaBlock}

Return this exact JSON schema:
{
  "epics": [
    {
      "id": "epic-1",
      "title": "<concise epic name, e.g. 'Product Search & Discovery'>",
      "description": "<2–3 sentences covering what this epic encompasses and why it matters to the business>",
      "priority": "High" | "Medium" | "Low",
      "category": "<functional area, e.g. 'Search', 'User Management', 'Payments', 'Admin'>",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Rules:
- Cover all major functional areas implied by requirements and Q&A answers.
- Each epic must be a business capability — not a technical task or sprint.
- Priorities should reflect business value and dependencies (what must come first).
- Include 2–5 short, lowercase tags per epic.
- Aim for 4–8 epics; adjust based on scope of requirements.
- Use sequential IDs: epic-1, epic-2, etc.`,
    },
  ]
}

export function parseEpics(raw: string): Epic[] {
  const data = parseJSON<{ epics: Epic[] }>(raw)
  return data.epics.map(e => ({ ...e, stories: [] }))
}
