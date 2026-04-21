import type { LLMMessage } from '../services/llm/client'
import type { ContextCapture, ClarifyingQuestion } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'

export function buildClarifyingQuestionsPrompt(
  requirements: string,
  context: ContextCapture,
  count: number,
): LLMMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `You are helping a BA clarify requirements before writing epics. Generate exactly ${count} clarifying question(s) that surface gaps, ambiguities, or key decisions in the requirements below.

DOMAIN CONTEXT:
${context.domainText || '(none provided)'}

TECHNICAL CONTEXT:
${context.techText || '(none provided)'}

RAW REQUIREMENTS:
${requirements}

Return this exact JSON schema:
{
  "questions": [
    {
      "id": "q1",
      "question": "<specific, actionable question addressing a gap>",
      "options": ["<concrete option A>", "<concrete option B>", "<concrete option C>"]
    }
  ]
}

Rules:
- Generate exactly ${count} question(s).
- Each question must address a distinct ambiguity: user types, business rules, integrations, edge cases, constraints, or success metrics.
- Provide 3–4 concrete, mutually exclusive options per question.
- Do not ask about things already clearly stated in the requirements.
- Questions should be decision-forcing — each answer should meaningfully change what gets built.`,
    },
  ]
}

export function parseClarifyingQuestions(raw: string): ClarifyingQuestion[] {
  const data = parseJSON<{ questions: ClarifyingQuestion[] }>(raw)
  return data.questions
}
