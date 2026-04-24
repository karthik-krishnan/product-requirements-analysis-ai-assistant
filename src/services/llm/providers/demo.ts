import {
  MOCK_CLARIFYING_QUESTIONS,
  MOCK_EPIC_QUESTIONS,
  MOCK_EPICS,
  MOCK_STORY_LIST,
  MOCK_INVEST_VALIDATION,
  MOCK_INVEST_FIXES,
} from '../../../data/mockData'

export async function callDemo(promptType: string | undefined): Promise<string> {
  await new Promise(r => setTimeout(r, 700 + Math.random() * 600))

  if (promptType === 'clarifying-questions') {
    return JSON.stringify({ questions: MOCK_CLARIFYING_QUESTIONS })
  }
  if (promptType === 'epic-clarifying-questions') {
    return JSON.stringify({ questions: MOCK_EPIC_QUESTIONS })
  }
  if (promptType === 'generate-epics') {
    return JSON.stringify({ epics: MOCK_EPICS })
  }
  if (promptType === 'generate-stories') {
    const stories = MOCK_STORY_LIST.map(({ id: _id, epicId: _epicId, ...rest }) => rest)
    return JSON.stringify({ stories })
  }
  if (promptType === 'validate-invest') {
    return JSON.stringify(MOCK_INVEST_VALIDATION)
  }
  if (promptType?.startsWith('fix-invest:')) {
    const key = promptType.split(':')[1]
    const fix = MOCK_INVEST_FIXES[key] ?? MOCK_INVEST_FIXES['independent']
    return JSON.stringify(fix)
  }
  if (promptType === 'epic-chat') {
    return `Good question. A few things worth resolving before stories are written for this epic:

The scope boundary is the most important call here — specifically, does this epic cover the end-user-facing capability only, or does it include the admin configuration and reporting surfaces too? Keeping those separate is often worth it because they typically involve different user roles and delivery timelines.

There's also a cross-epic dependency worth flagging: if another epic in the portfolio handles authentication or permissions, this epic needs to be explicit about what roles can access what. That decision will cascade into almost every story.

What's your current thinking on the MVP scope boundary for this epic?`
  }
  if (promptType === 'story-chat') {
    return `Looking at this story, a couple of things stand out:

The acceptance criteria are functional but some could be tightened. For example, any criterion that says "should work correctly" or "displays properly" isn't testable as written — it needs a specific measurable threshold (a time, a count, an exact state).

Also worth checking: the out-of-scope list doesn't mention what happens when the user's session expires mid-flow, or when a required upstream service is unavailable. Are those covered in a separate story, or do they need an explicit AC here to avoid ambiguity during QA?

Which of these would you like to work through first?`
  }

  return JSON.stringify({})
}
