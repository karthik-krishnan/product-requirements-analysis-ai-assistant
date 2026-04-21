import type { LLMMessage } from '../services/llm/client'
import type { ContextCapture, Epic, ClarifyingQuestion, Story } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'

export function buildGenerateStoriesPrompt(
  epic: Epic,
  context: ContextCapture,
  questions: ClarifyingQuestion[],
): LLMMessage[] {
  const qaBlock = questions.length > 0
    ? questions.map(q => `Q: ${q.question}\nA: ${q.answer || '(no answer provided)'}`).join('\n\n')
    : '(no discovery questions — generate based on epic details and context)'

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Break down the following epic into detailed, INVEST-compliant user stories.

DOMAIN CONTEXT:
${context.domainText || '(none provided)'}

TECHNICAL CONTEXT:
${context.techText || '(none provided)'}

EPIC:
Title: ${epic.title}
Description: ${epic.description}
Category: ${epic.category}
Tags: ${epic.tags.join(', ')}

STORY DISCOVERY Q&A:
${qaBlock}

Return this exact JSON schema:
{
  "stories": [
    {
      "title": "<concise story title>",
      "asA": "<user role, e.g. 'registered shopper', 'admin', 'guest user'>",
      "iWantTo": "<concrete action the user wants to perform>",
      "soThat": "<business value or user outcome>",
      "acceptanceCriteria": [
        "<specific, testable criterion — include measurable thresholds where relevant>"
      ],
      "inScope": ["<what is explicitly included in this story>"],
      "outOfScope": ["<what is explicitly excluded — things users might assume are included>"],
      "assumptions": ["<assumption the team is making that could affect delivery>"],
      "crossFunctionalNeeds": ["<dependency on another team or system, e.g. 'Analytics: track X event to data lake'>"],
      "priority": "High" | "Medium" | "Low",
      "storyPoints": <fibonacci: 1, 2, 3, 5, 8, 13>
    }
  ]
}

Rules:
- Every story must satisfy all INVEST principles: Independent, Negotiable, Valuable, Estimable, Small, Testable.
- Acceptance criteria must be specific and verifiable — avoid vague terms like "should work" or "must be fast".
- outOfScope must explicitly name things a user might reasonably expect but that aren't included.
- crossFunctionalNeeds should reference specific teams or systems (Analytics, Infrastructure, UX, Platform, Security).
- Prefer stories of ≤ 8 story points. Split larger work into multiple stories.
- Generate 2–6 stories per epic, calibrated to the epic's complexity.`,
    },
  ]
}

export function parseStories(raw: string, epicId: string): Story[] {
  const data = parseJSON<{ stories: Omit<Story, 'id' | 'epicId'>[] }>(raw)
  return data.stories.map((s, i) => ({
    ...s,
    id: `story-${epicId}-${i + 1}`,
    epicId,
  }))
}
