import type { LLMMessage } from '../services/llm/client'
import type { EnterpriseConfig, Workspace, ClarifyingQuestion } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'
import { buildContextBlock } from '../utils/contextUtils'

export function buildClarifyingQuestionsPrompt(
  requirements: string,
  enterprise: EnterpriseConfig | null,
  workspace: Workspace | null,
  count: number,
): LLMMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `You are helping a BA clarify requirements before writing epics. Your job is to generate exactly ${count} clarifying questions that surface the highest-impact ambiguities — ones where the answer will materially change the scope, architecture, or delivery approach.

CONTEXT:
${buildContextBlock(enterprise, workspace)}

RAW REQUIREMENTS:
${requirements}

Return this exact JSON schema — the "questions" array MUST contain exactly ${count} items:
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
- You MUST produce exactly ${count} questions — no more, no fewer. Fill all ${count} slots even if some feel less critical than others.
- Prioritise questions about: scope boundaries, user roles & permissions model, critical business rules, integration strategy, scale/compliance constraints, and definition of MVP vs later phases.
- Avoid questions about: UI layout preferences, error message wording, minor field validations, or implementation details that can be decided during delivery.
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
