import type { LLMMessage } from '../services/llm/client'
import type { Story, INVESTItem, FixProposal } from '../types'
import { parseJSON } from '../services/llm/client'
import { SYSTEM_PROMPT } from './system'

export function buildFixINVESTPrompt(
  story: Story,
  principleKey: string,
  principleLabel: string,
  item: INVESTItem,
): LLMMessage[] {
  const fmt = (items: string[]) => items.map(x => `  - ${x}`).join('\n')

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `A user story is failing the "${principleLabel}" INVEST principle. Propose the minimal concrete fix that resolves the issue.

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

FAILING PRINCIPLE: ${principleLabel} (score: ${item.score}/100)
FEEDBACK: ${item.feedback}
SUGGESTIONS:
${item.suggestions.map(s => `  - ${s}`).join('\n')}

Choose the most appropriate fix type and return one of the following schemas:

──── STANDARD FIX (modify the story in place) ────
Use this for Independent, Negotiable, Valuable, Testable issues — or any fix that doesn't require splitting.
{
  "principleKey": "${principleKey}",
  "summary": "<1–2 sentences explaining what the fix does and why it resolves the issue>",
  "isSplit": false,
  "isSpike": false,
  "diffs": [
    {
      "field": "<one of: title | asA | iWantTo | soThat | acceptanceCriteria | inScope | outOfScope | assumptions | crossFunctionalNeeds>",
      "label": "<human-readable label, e.g. 'Acceptance Criteria'>",
      "before": <current value — string or string[] exactly matching the story above>,
      "after": <improved value — string or string[]>
    }
  ],
  "patch": { "<field>": <new value — only fields that change> }
}

──── SPLIT FIX (story is too large) ────
Use this when the Small principle fails and the best fix is decomposing the story.
{
  "principleKey": "${principleKey}",
  "summary": "<explanation of why splitting resolves the size issue>",
  "isSplit": true,
  "isSpike": false,
  "splitStories": [
    { "title": "<Story 1 title>", "description": "<As a… I want to… so that…>" },
    { "title": "<Story 2 title>", "description": "<As a… I want to… so that…>" }
  ],
  "splitNewStory": {
    "epicId": "${story.epicId}",
    "title": "<Story 2 full title>",
    "asA": "<role>", "iWantTo": "<action>", "soThat": "<value>",
    "acceptanceCriteria": ["<criterion>"],
    "inScope": ["<item>"], "outOfScope": ["<item>"],
    "assumptions": ["<assumption>"], "crossFunctionalNeeds": ["<need>"],
    "priority": "${story.priority}", "storyPoints": <number>
  },
  "diffs": [ <diffs for Story 1 changes only> ],
  "patch": { <Story 1 fields only — the trimmed version> }
}

──── SPIKE FIX (team needs investigation before estimating) ────
Use this when the Estimable principle fails due to unknown complexity.
{
  "principleKey": "${principleKey}",
  "summary": "<explanation of what needs investigating and why it improves estimability>",
  "isSplit": false,
  "isSpike": true,
  "spikeStory": {
    "title": "Spike: <investigation topic>",
    "description": "<what to investigate, time-box, and expected output>"
  },
  "spikeNewStory": {
    "epicId": "${story.epicId}",
    "title": "Spike: <investigation topic>",
    "asA": "development team",
    "iWantTo": "<investigation action>", "soThat": "<decision or output>",
    "acceptanceCriteria": ["<verifiable output of spike>"],
    "inScope": ["<what the spike covers>"], "outOfScope": ["Full implementation"],
    "assumptions": ["<relevant assumption>"], "crossFunctionalNeeds": [],
    "priority": "High", "storyPoints": 1
  },
  "diffs": [ <diffs to clarify the story AC or assumptions> ],
  "patch": { <minimal patch to clarify the original story> }
}

Critical rules:
- "before" values in diffs must EXACTLY match the current story field values above.
- "patch" must contain ONLY the fields that actually change.
- Keep fixes minimal — don't change fields that don't need to change.
- For splits: patch applies to Story 1 (the streamlined version); splitNewStory is the new Story 2.`,
    },
  ]
}

export function parseFixProposal(raw: string): FixProposal {
  return parseJSON<FixProposal>(raw)
}
