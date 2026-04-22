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
    // Return first 4 stories so demo shows a realistic initial set
    const stories = MOCK_STORY_LIST.slice(0, 4).map(({ id: _id, epicId: _epicId, ...rest }) => rest)
    return JSON.stringify({ stories })
  }
  if (promptType === 'generate-more-stories') {
    // Return remaining stories to simulate "generate more"
    const stories = MOCK_STORY_LIST.slice(4).map(({ id: _id, epicId: _epicId, ...rest }) => rest)
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

  return JSON.stringify({})
}
