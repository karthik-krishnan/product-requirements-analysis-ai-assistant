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
      content: `You are helping a BA clarify requirements before writing epics. Generate exactly ${count} clarifying question(s) that resolve the highest-impact ambiguities — ones where the answer will materially change the scope, architecture, or delivery approach of what gets built.

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
      "question": "<specific, decision-forcing question>",
      "options": ["<concrete option A>", "<concrete option B>", "<concrete option C>"]
    }
  ]
}

Rules:
- Generate exactly ${count} question(s).
- ONLY ask questions whose answer fundamentally changes what gets built — scope boundaries, user roles & permissions model, critical business rules, integration strategy, scale/compliance constraints, or definition of MVP vs later phases.
- DO NOT ask about: UI layout preferences, error message wording, minor field validations, technology choices, or implementation details that can be decided during delivery.
- Do not ask about things already clearly stated in the requirements.
- Provide 3–4 concrete, mutually exclusive options per question that represent meaningfully different product directions.
- Each option should imply a different set of epics, integrations, or constraints — not just stylistic variations.`,
    },
  ]
}

export function parseClarifyingQuestions(raw: string): ClarifyingQuestion[] {
  const data = parseJSON<{ questions: ClarifyingQuestion[] }>(raw)
  return data.questions
}
