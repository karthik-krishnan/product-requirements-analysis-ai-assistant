import type { LLMMessage } from '../services/llm/client'
import type { ContextCapture, Epic, ClarifyingQuestion, Story } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'

export function buildGenerateStoriesPrompt(
  epic: Epic,
  context: ContextCapture,
  questions: ClarifyingQuestion[],
  existingStories: Story[] = [],
): LLMMessage[] {
  const qaBlock = questions.length > 0
    ? questions.map(q => `Q: ${q.question}\nA: ${q.answer || '(no answer provided)'}`).join('\n\n')
    : '(no discovery questions — generate based on epic details and context)'

  const existingBlock = existingStories.length > 0
    ? `\nALREADY GENERATED STORIES (do not duplicate these):\n${existingStories.map(s => `- ${s.title}`).join('\n')}\n`
    : ''

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Break down the following epic into detailed, INVEST-compliant user stories.${existingBlock ? '\n' + existingBlock : ''}

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
- Every story must be ≤ 8 story points. If a capability cannot fit in 8 points, split it into two or more stories — this is the only size constraint.
- Generate as many stories as the epic genuinely requires. Do not pad with trivial stories; do not omit real capabilities to hit a target count.${existingStories.length > 0 ? '\n- Only generate NEW stories not already listed above.' : ''}`,
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
