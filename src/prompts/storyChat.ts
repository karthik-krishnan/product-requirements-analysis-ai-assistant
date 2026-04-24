import type { LLMMessage } from '../services/llm/client'
import type { Epic, Story, ContextCapture, ChatEntry } from '../types'

/**
 * Builds the full message array for a multi-turn story discussion.
 *
 * Context injected:
 *  - Domain & tech context
 *  - Parent epic (for scope anchoring)
 *  - The full story (all fields: ACs, scope, assumptions, cross-functional needs)
 *  - Conversation history so far
 *  - The new user message
 */
export function buildStoryChatMessages(
  story: Story,
  epic: Epic,
  context: ContextCapture,
  history: ChatEntry[],
  userMessage: string,
): LLMMessage[] {
  const acList = story.acceptanceCriteria.length > 0
    ? story.acceptanceCriteria.map((ac, i) => `  ${i + 1}. ${ac}`).join('\n')
    : '  (none defined)'

  const systemPrompt = `You are a product advisor helping a team refine a specific user story.

Your job is to help the team sharpen this story so it is ready for sprint planning. Keep all responses anchored to the story and its parent epic — do not give generic agile advice.

Focus areas:
- Whether acceptance criteria are specific, measurable, and testable (flag vague language)
- Scope gaps: things a user would reasonably expect that aren't captured in the story
- Edge cases and failure states within this story's scope that need an explicit AC or a separate story
- Whether the story is correctly sized — flag anything that feels like more than 8 points
- Assumptions that should be documented because they could change scope if wrong
- Cross-functional needs (analytics events, security review, design handoff) that haven't been called out

Do NOT give generic process advice or talk about other stories. Be specific and reference the story fields directly.
Respond in plain conversational prose — no JSON, no markdown headers.`

  const storyBlock = `PARENT EPIC:
${epic.title} — ${epic.description}

STORY BEING DISCUSSED:
Title: ${story.title}
User story: As a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.
Priority: ${story.priority} | Story Points: ${story.storyPoints ?? 'unestimated'}

Acceptance Criteria:
${acList}

In Scope: ${story.inScope.length > 0 ? story.inScope.join('; ') : '(not specified)'}
Out of Scope: ${story.outOfScope.length > 0 ? story.outOfScope.join('; ') : '(not specified)'}
Assumptions: ${story.assumptions.length > 0 ? story.assumptions.join('; ') : '(none)'}
Cross-functional Needs: ${story.crossFunctionalNeeds.length > 0 ? story.crossFunctionalNeeds.join('; ') : '(none)'}

DOMAIN CONTEXT:
${context.domainText || '(none)'}

TECHNICAL CONTEXT:
${context.techText || '(none)'}`

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: storyBlock },
    ...history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  return messages
}
