/**
 * Tests for StoryValidation — specifically ValidationSection and the
 * "Fix with AI" panel rendered per INVEST principle row.
 *
 * Focus areas:
 *  1. Split-story fix UI: correct per-story labels ("This story — streamlined"
 *     / "New story — added to backlog") and the "Story 1 — field-level changes"
 *     header above the diffs — the targeted UI change from the last commit.
 *  2. Standard (non-split) fix: no "Story 1" header shown.
 *  3. Quality Score display and INVEST Breakdown table smoke test.
 *  4. Fix panel dismiss / toggle behaviour.
 *
 * Mock strategy:
 *  - Only callLLM is replaced (vi.fn). Everything else (parseJSON, isDemo, …)
 *    is imported from the real module via importOriginal so that parseFixProposal
 *    continues to work correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ValidationSection } from '../../components/StoryValidation'
import type { Story, APISettings, INVESTValidation } from '../../types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Keep all real exports; only replace callLLM so that parseJSON (used by
// parseFixProposal) and isDemo / isLiveMode remain functional.
vi.mock('../../services/llm/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/llm/client')>()
  return {
    ...actual,
    callLLM: vi.fn(),
    isDemo: vi.fn().mockReturnValue(false),
    isLiveMode: vi.fn().mockReturnValue(false),
  }
})

import * as llmClient from '../../services/llm/client'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const settings: APISettings = {
  provider: 'demo',
  anthropicKey: '', openaiKey: '', openaiModel: 'gpt-4o',
  azureKey: '', azureEndpoint: '', azureDeployment: '',
  googleKey: '', googleModel: 'gemini-1.5-pro',
  ollamaEndpoint: '', ollamaModel: '',
  assistanceLevel: 2,
}

const story: Story = {
  id: 'story-1',
  epicId: 'epic-1',
  title: 'Full-text product search with auto-suggest',
  asA: 'shopper',
  iWantTo: 'search for products by keyword',
  soThat: 'I can find what I need quickly',
  priority: 'High',
  storyPoints: 8,
  acceptanceCriteria: ['Results appear within 200ms', 'Zero-results page shown'],
  inScope: ['Keyword search', 'Results page'],
  outOfScope: ['Voice search'],
  assumptions: ['Elasticsearch is available'],
  crossFunctionalNeeds: ['Design: results layout'],
}

/** Validation where "small" fails — gives us exactly one "Fix with AI" button */
const makeValidation = (
  overrides: Partial<INVESTValidation> = {}
): INVESTValidation => ({
  independent: { adheres: true,  score: 85, feedback: 'Well scoped', suggestions: [] },
  negotiable:  { adheres: true,  score: 80, feedback: 'Flexible',    suggestions: [] },
  valuable:    { adheres: true,  score: 90, feedback: 'Clear value',  suggestions: [] },
  estimable:   { adheres: true,  score: 80, feedback: 'Estimable',   suggestions: [] },
  small:       { adheres: false, score: 40, feedback: 'Too large for one sprint', suggestions: ['Split into two stories'] },
  testable:    { adheres: true,  score: 85, feedback: 'Has ACs',     suggestions: [] },
  ...overrides,
})

// Valid FixProposal JSON strings returned by the mocked callLLM

// splitNewStory provides full Story 2 content (user sentence, ACs, points)
const splitNewStory = {
  epicId: 'epic-1',
  title: 'Auto-suggest dropdown overlay',
  asA: 'shopper',
  iWantTo: 'see product suggestions as I type',
  soThat: 'I can find items faster without completing my search',
  acceptanceCriteria: [
    'Suggestions appear within 150ms of each keystroke',
    'Dropdown shows top 5 suggestions with product name',
    'Keyboard navigation supported (arrow keys, Enter, Escape)',
    'Dismissed on click outside',
    'Graceful fallback if suggestion API is slow',
  ],
  inScope: ['Auto-suggest dropdown', 'Debounced API call'],
  outOfScope: ['Voice search', 'Search history'],
  assumptions: ['Depends on keyword search story being live'],
  crossFunctionalNeeds: ['UX: dropdown interaction spec'],
  priority: 'High' as const,
  storyPoints: 3,
}

const splitFixJSON = JSON.stringify({
  principleKey: 'small',
  summary: 'Story is too large. Recommend splitting into two independent stories.',
  isSplit: true,
  isSpike: false,
  splitStories: [
    { title: 'Keyword search with results page', description: 'Basic keyword search and results page.' },
    { title: 'Auto-suggest dropdown overlay',    description: 'Typeahead suggestions as a separate deliverable.' },
  ],
  splitNewStory,
  diffs: [
    { field: 'title', label: 'Story Title', before: 'Full-text product search with auto-suggest', after: 'Keyword search with results page' },
  ],
  patch: { title: 'Keyword search with results page' },
})

// Variant with no splitNewStory — Story 2 falls back to splitStories[1] description
const splitFixNoNewStoryJSON = JSON.stringify({
  principleKey: 'small',
  summary: 'Story is too large — split it.',
  isSplit: true,
  isSpike: false,
  splitStories: [
    { title: 'Keyword search with results page', description: 'Basic keyword search and results page.' },
    { title: 'Auto-suggest dropdown overlay',    description: 'Typeahead suggestions as a separate deliverable.' },
  ],
  splitNewStory: undefined,
  diffs: [],
  patch: { title: 'Keyword search with results page' },
})

const standardFixJSON = JSON.stringify({
  principleKey: 'small',
  summary: 'Reduce scope by removing auto-suggest from this story.',
  isSplit: false,
  isSpike: false,
  splitStories: undefined,
  splitNewStory: undefined,
  diffs: [
    { field: 'title', label: 'Story Title', before: 'Full-text product search with auto-suggest', after: 'Keyword search only' },
  ],
  patch: { title: 'Keyword search only' },
})

function renderSection(validation: INVESTValidation | null = makeValidation()) {
  return render(
    <ValidationSection
      story={story}
      settings={settings}
      validation={validation}
      acceptedKeys={new Set()}
      onValidated={vi.fn()}
      onFixAccepted={vi.fn()}
      onStoryChange={vi.fn()}
      onAddStory={vi.fn()}
    />
  )
}

/** Click the single "Fix with AI" button (only "small" fails in our fixture) */
async function clickFixWithAI() {
  const btn = await screen.findByRole('button', { name: /fix with ai/i })
  await userEvent.click(btn)
}

// ─── Quality Score display ────────────────────────────────────────────────────

describe('Quality Score display', () => {
  beforeEach(() => {
    vi.mocked(llmClient.callLLM).mockResolvedValue('{}')
  })

  it('shows the Quality Score label', () => {
    renderSection()
    expect(screen.getByText('Quality Score')).toBeInTheDocument()
  })

  it('shows Adhered count of 5 for our fixture (5 of 6 pass)', () => {
    renderSection()
    expect(screen.getByText('Adhered')).toBeInTheDocument()
    // The number "5" appears inside the Adhered card
    const adheredCard = screen.getByText('Adhered').closest('div')!
    expect(adheredCard).toHaveTextContent('5')
  })

  it('shows Need Work count of 1 for our fixture (small fails)', () => {
    renderSection()
    const needWorkCard = screen.getByText('Need Work').closest('div')!
    expect(needWorkCard).toHaveTextContent('1')
  })
})

// ─── INVEST Breakdown table ───────────────────────────────────────────────────

describe('INVEST Breakdown table', () => {
  beforeEach(() => {
    vi.mocked(llmClient.callLLM).mockResolvedValue('{}')
  })

  it('renders the INVEST Breakdown heading', () => {
    renderSection()
    expect(screen.getByText('INVEST Breakdown')).toBeInTheDocument()
  })

  it('renders all six principle labels in the table', () => {
    renderSection()
    for (const label of ['Independent', 'Negotiable', 'Valuable', 'Small', 'Testable']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // "Estimable" can appear more than once (e.g. in fixture feedback 'Estimable')
    expect(screen.getAllByText(/estimable/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows feedback text for a failing principle', () => {
    renderSection()
    expect(screen.getByText('Too large for one sprint')).toBeInTheDocument()
  })

  it('shows "Fix with AI" button only for failing principles', () => {
    renderSection()
    // Only "small" fails → exactly one Fix with AI button
    expect(screen.getAllByRole('button', { name: /fix with ai/i })).toHaveLength(1)
  })
})

// ─── Split-story fix UI ───────────────────────────────────────────────────────

describe('Fix with AI — split story', () => {
  beforeEach(() => {
    vi.mocked(llmClient.callLLM).mockResolvedValue(splitFixJSON)
  })

  it('shows the split banner after clicking Fix with AI', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('Story will be split into 2')).toBeInTheDocument()
    })
  })

  it('labels Story 1 as "This story — streamlined"', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('This story — streamlined')).toBeInTheDocument()
    })
  })

  it('labels Story 2 as "New story — added to backlog"', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('New story — added to backlog')).toBeInTheDocument()
    })
  })

  it('shows both story titles inside the split preview', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      // Story 1 title appears in both the split preview card and the diff "After" block
      expect(screen.getAllByText('Keyword search with results page').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Auto-suggest dropdown overlay')).toBeInTheDocument()
    })
  })

  it('shows the "Story 1 — field-level changes" header above the diffs', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('Story 1 — field-level changes to this story')).toBeInTheDocument()
    })
  })

  it('shows before/after diff sections for Story 1 fields', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('Story Title')).toBeInTheDocument()
      // Both "Before" and "After" column headers
      expect(screen.getByText('Before')).toBeInTheDocument()
      expect(screen.getByText('After')).toBeInTheDocument()
    })
  })

  it('shows Accept & Apply and Dismiss buttons', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })
  })

  it('shows the Story 2 user story sentence in the preview', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText(/see product suggestions as I type/i)).toBeInTheDocument()
    })
  })

  it('shows Story 2 acceptance criteria in the preview', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText(/Suggestions appear within 150ms/i)).toBeInTheDocument()
      expect(screen.getByText(/Dropdown shows top 5 suggestions/i)).toBeInTheDocument()
    })
  })

  it('shows "+N more" when Story 2 has more than 3 ACs', async () => {
    renderSection()
    await clickFixWithAI()
    // splitNewStory has 5 ACs → only 3 shown + "+2 more"
    await waitFor(() => {
      expect(screen.getByText('+2 more')).toBeInTheDocument()
    })
  })

  it('shows Story 2 in-scope items', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      // "Auto-suggest dropdown" also appears in the title, so use the unique sibling
      expect(screen.getByText('In Scope')).toBeInTheDocument()
      expect(screen.getByText(/Debounced API call/i)).toBeInTheDocument()
    })
  })

  it('shows Story 2 out-of-scope items', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText(/Voice search/i)).toBeInTheDocument()
      expect(screen.getByText(/Search history/i)).toBeInTheDocument()
    })
  })

  it('shows Story 2 assumptions', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText(/Depends on keyword search story being live/i)).toBeInTheDocument()
    })
  })

  it('shows Story 2 cross-functional needs', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText(/UX: dropdown interaction spec/i)).toBeInTheDocument()
    })
  })

  it('shows Story 2 story points', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('3 pts')).toBeInTheDocument()
    })
  })

  it('shows the "Field-level changes shown below" hint on Story 1', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText(/Field-level changes shown below/i)).toBeInTheDocument()
    })
  })
})

// ─── Split story: fallback when splitNewStory is absent ───────────────────────

describe('Fix with AI — split story without splitNewStory', () => {
  beforeEach(() => {
    vi.mocked(llmClient.callLLM).mockResolvedValue(splitFixNoNewStoryJSON)
  })

  it('falls back to splitStories[1] description for Story 2', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('Typeahead suggestions as a separate deliverable.')).toBeInTheDocument()
    })
  })

  it('does NOT render the AC section when splitNewStory is absent', async () => {
    renderSection()
    await clickFixWithAI()
    await new Promise(r => setTimeout(r, 200))
    expect(screen.queryByText('Acceptance Criteria')).not.toBeInTheDocument()
  })
})

// ─── Standard (non-split) fix UI ─────────────────────────────────────────────

describe('Fix with AI — standard fix (no split)', () => {
  beforeEach(() => {
    vi.mocked(llmClient.callLLM).mockResolvedValue(standardFixJSON)
  })

  it('does NOT show the split banner', async () => {
    renderSection()
    await clickFixWithAI()
    // Give time for fix panel to appear (if it was going to)
    await new Promise(r => setTimeout(r, 200))
    expect(screen.queryByText('Story will be split into 2')).not.toBeInTheDocument()
  })

  it('does NOT show the "Story 1 — field-level changes" header', async () => {
    renderSection()
    await clickFixWithAI()
    await new Promise(r => setTimeout(r, 200))
    expect(screen.queryByText(/Story 1 — field-level changes/i)).not.toBeInTheDocument()
  })

  it('shows diff blocks for the changed field', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => {
      expect(screen.getByText('Story Title')).toBeInTheDocument()
      expect(screen.getByText('Keyword search only')).toBeInTheDocument()
    })
  })
})

// ─── Fix panel dismiss / toggle ───────────────────────────────────────────────

describe('Fix panel dismiss and toggle', () => {
  beforeEach(() => {
    vi.mocked(llmClient.callLLM).mockResolvedValue(splitFixJSON)
  })

  it('closes the fix panel when Dismiss is clicked', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => screen.getByRole('button', { name: /dismiss/i }))
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText('Story will be split into 2')).not.toBeInTheDocument()
  })

  it('toggles to "Hide fix" while the fix panel is open', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => screen.getByRole('button', { name: /hide fix/i }))
    expect(screen.getByRole('button', { name: /hide fix/i })).toBeInTheDocument()
  })

  it('closes the fix panel when "Hide fix" is clicked', async () => {
    renderSection()
    await clickFixWithAI()
    await waitFor(() => screen.getByRole('button', { name: /hide fix/i }))
    await userEvent.click(screen.getByRole('button', { name: /hide fix/i }))
    expect(screen.queryByText('Story will be split into 2')).not.toBeInTheDocument()
  })
})
