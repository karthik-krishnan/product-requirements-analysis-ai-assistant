import type { LLMMessage } from '../services/llm/client'
import type { Story, INVESTValidation } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'

export function buildValidateINVESTPrompt(story: Story): LLMMessage[] {
  const fmt = (items: string[]) => items.map(x => `  - ${x}`).join('\n')

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Evaluate the following user story rigorously against each INVEST principle. Be honest and specific — not every story will score well.

USER STORY:
Title: ${story.title}
As a: ${story.asA}
I want to: ${story.iWantTo}
So that: ${story.soThat}
Story Points: ${story.storyPoints ?? 'not estimated'}

Acceptance Criteria:
${fmt(story.acceptanceCriteria)}

In Scope:
${fmt(story.inScope)}

Out of Scope:
${fmt(story.outOfScope)}

Assumptions:
${fmt(story.assumptions)}

Cross-Functional Needs:
${fmt(story.crossFunctionalNeeds)}

Return this exact JSON schema:
{
  "independent": {
    "adheres": <true if deliverable without coordinating with another story or team dependency>,
    "score": <0–100 integer>,
    "feedback": "<1–2 sentences explaining the assessment>",
    "suggestions": ["<specific, actionable improvement — 0–3 items>"]
  },
  "negotiable": {
    "adheres": <true if implementation details are open to discussion, not over-specified>,
    "score": <0–100>,
    "feedback": "<1–2 sentences>",
    "suggestions": []
  },
  "valuable": {
    "adheres": <true if delivers clear, measurable value to users or the business>,
    "score": <0–100>,
    "feedback": "<1–2 sentences>",
    "suggestions": []
  },
  "estimable": {
    "adheres": <true if team can commit to an estimate with reasonable confidence>,
    "score": <0–100>,
    "feedback": "<1–2 sentences>",
    "suggestions": []
  },
  "small": {
    "adheres": <true if fits comfortably within one sprint — typically ≤ 8 story points>,
    "score": <0–100>,
    "feedback": "<1–2 sentences>",
    "suggestions": []
  },
  "testable": {
    "adheres": <true if all acceptance criteria are specific and objectively verifiable>,
    "score": <0–100>,
    "feedback": "<1–2 sentences>",
    "suggestions": []
  }
}

Scoring guide:
- 85–100: Excellent, principle is clearly satisfied.
- 65–84:  Good, with minor gaps — set adheres: true.
- 45–64:  Needs work — set adheres: false.
- 0–44:   Significant problem — set adheres: false.
Provide 1–3 suggestions only when score < 85. Empty array otherwise.`,
    },
  ]
}

export function parseINVESTValidation(raw: string): INVESTValidation {
  return parseJSON<INVESTValidation>(raw)
}
