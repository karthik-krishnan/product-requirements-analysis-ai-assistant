/**
 * Tests for the story card grid + detail modal in StoryBreakdown.
 *
 * Strategy: pass an epic with pre-existing stories so the component
 * starts in 'done' phase (no LLM call needed). Stories are shown as
 * cards; clicking a card opens a modal with View / Edit / Discuss
 * / Validate tabs.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StoryBreakdown from '../../components/StoryBreakdown'
import type { Epic, Story, APISettings, ContextCapture } from '../../types'

// ─── Mock heavy dependencies ──────────────────────────────────────────────────

vi.mock('../services/llm/client', () => ({
  callLLM: vi.fn().mockResolvedValue('{}'),
  isLiveMode: vi.fn().mockReturnValue(false),
  isDemo: vi.fn().mockReturnValue(true),
}))

vi.mock('../../components/StoryValidation', () => ({
  ValidationSection: () => <div data-testid="validation-section" />,
}))

vi.mock('../../components/JiraPushModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="jira-modal"><button onClick={onClose}>Close</button></div>
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  epicId: 'epic-1',
  title: 'Book a GP appointment',
  asA: 'registered patient',
  iWantTo: 'book a GP appointment online',
  soThat: 'I can avoid calling the surgery',
  priority: 'High',
  storyPoints: 5,
  acceptanceCriteria: [
    'Available slots fetched from Epic via FHIR R4',
    'Patient cannot hold more than 3 future bookings',
  ],
  inScope: ['GP appointment booking only', 'Email confirmation'],
  outOfScope: ['Specialist referral booking'],
  assumptions: ['Patient already has an active account'],
  crossFunctionalNeeds: ['FHIR Adapter must support Appointment resource'],
  ...overrides,
})

const makeEpic = (stories: Story[] = []): Epic => ({
  id: 'epic-1',
  title: 'Appointment Management',
  description: 'Book and manage appointments',
  priority: 'High',
  category: 'Core',
  tags: [],
  stories,
})

const settings: APISettings = {
  provider: 'demo',
  anthropicKey: '', openaiKey: '', openaiModel: 'gpt-4o',
  azureKey: '', azureEndpoint: '', azureDeployment: '',
  googleKey: '', googleModel: 'gemini-1.5-pro',
  ollamaEndpoint: '', ollamaModel: '',
  assistanceLevel: 2,
}

const context: ContextCapture = {
  domainText: '', domainFiles: [], techText: '', techFiles: [],
}

function renderBreakdown(story: Story = makeStory()) {
  const epic = makeEpic([story])
  return render(
    <StoryBreakdown
      epicId="epic-1"
      epics={[epic]}
      settings={settings}
      context={context}
      storyValidations={{}}
      storyAcceptedFixes={{}}
      onStoriesGenerated={vi.fn()}
      onStoryValidated={vi.fn()}
      onFixAccepted={vi.fn()}
      onAddStory={vi.fn()}
    />
  )
}

/** Opens the detail modal for the first story card by clicking the card title */
async function openModal() {
  await userEvent.click(screen.getByText('Book a GP appointment'))
}

/** Opens modal then switches to the Edit tab */
async function openEditTab() {
  await openModal()
  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
}

// ─── Card grid — default state ────────────────────────────────────────────────

describe('Card grid — default state', () => {
  it('renders the story title as a card heading', () => {
    renderBreakdown()
    expect(screen.getByText('Book a GP appointment')).toBeInTheDocument()
  })

  it('shows the priority badge on the card', () => {
    renderBreakdown()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('shows story points on the card', () => {
    renderBreakdown()
    expect(screen.getByText('5pts')).toBeInTheDocument()
  })

  it('shows "As a..." snippet on the card', () => {
    renderBreakdown()
    expect(screen.getByText(/registered patient/i)).toBeInTheDocument()
  })

  it('shows Validate button on each card', () => {
    renderBreakdown()
    expect(screen.getByRole('button', { name: /validate/i })).toBeInTheDocument()
  })

  it('does not show Save or Discard before modal is opened', () => {
    renderBreakdown()
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /discard/i })).not.toBeInTheDocument()
  })
})

// ─── Modal — View tab ─────────────────────────────────────────────────────────

describe('Modal — View tab', () => {
  it('opens the modal when the card is clicked', async () => {
    renderBreakdown()
    await openModal()
    // soThat text is only in the modal view, not on the card
    expect(screen.getByText(/I can avoid calling the surgery/i)).toBeInTheDocument()
  })

  it('shows story content in the View tab', async () => {
    renderBreakdown()
    await openModal()
    expect(screen.getByText(/I can avoid calling the surgery/i)).toBeInTheDocument()
    expect(screen.getByText(/Available slots fetched from Epic/i)).toBeInTheDocument()
  })

  it('shows Edit, Discuss, Validate tabs in the modal', async () => {
    renderBreakdown()
    await openModal()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discuss/i })).toBeInTheDocument()
    // Both the modal tab and the card button say "Validate" — at least 2 present
    expect(screen.getAllByRole('button', { name: /validate/i }).length).toBeGreaterThanOrEqual(2)
  })

  it('shows Copy MD and Push to Jira in the modal footer', async () => {
    renderBreakdown()
    await openModal()
    expect(screen.getByRole('button', { name: /copy md/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /push to jira/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('closes the modal when Close is clicked', async () => {
    renderBreakdown()
    await openModal()
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    // soThat text is only in the modal; after close it should be gone
    expect(screen.queryByText(/I can avoid calling the surgery/i)).not.toBeInTheDocument()
  })
})

// ─── Modal — Edit tab ─────────────────────────────────────────────────────────

describe('Modal — Edit tab', () => {
  it('shows title input after switching to Edit tab', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  })

  it('pre-populates title with current value', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByLabelText(/title/i)).toHaveValue('Book a GP appointment')
  })

  it('pre-populates story sentence fields', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByLabelText(/as a/i)).toHaveValue('registered patient')
    expect(screen.getByLabelText(/i want to/i)).toHaveValue('book a GP appointment online')
    expect(screen.getByLabelText(/so that/i)).toHaveValue('I can avoid calling the surgery')
  })

  it('pre-populates story points', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByLabelText(/points/i)).toHaveValue(5)
  })

  it('shows Save and Discard buttons while in Edit tab', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument()
  })

  it('shows existing acceptance criteria as textareas', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByDisplayValue(/Available slots fetched/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Patient cannot hold/i)).toBeInTheDocument()
  })

  it('shows in scope, out of scope, assumptions, cross-functional needs as textareas', async () => {
    renderBreakdown()
    await openEditTab()
    expect(screen.getByDisplayValue(/GP appointment booking only/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Specialist referral booking/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Patient already has an active account/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/FHIR Adapter must support/i)).toBeInTheDocument()
  })
})

// ─── Saving edits ─────────────────────────────────────────────────────────────

describe('Saving edits', () => {
  it('updates the modal header title after save', async () => {
    renderBreakdown()
    await openEditTab()
    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Reschedule a GP appointment')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    // Title appears in both modal header and card — at least one instance is enough
    expect(screen.getAllByText('Reschedule a GP appointment').length).toBeGreaterThanOrEqual(1)
  })

  it('returns to View tab after save', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /discard/i })).not.toBeInTheDocument()
  })

  it('persists edited "As a" value after save', async () => {
    renderBreakdown()
    await openEditTab()
    const asAInput = screen.getByLabelText(/as a/i)
    await userEvent.clear(asAInput)
    await userEvent.type(asAInput, 'carer or guardian')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    // Appears in modal view + card snippet — at least one is enough
    expect(screen.getAllByText(/carer or guardian/i).length).toBeGreaterThanOrEqual(1)
  })

  it('updates the priority badge after changing priority and saving', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'Critical')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    // Appears in modal header badge + card badge
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1)
  })
})

// ─── Discarding edits ─────────────────────────────────────────────────────────

describe('Discarding edits', () => {
  it('restores original title after discard', async () => {
    renderBreakdown()
    await openEditTab()
    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Something completely different')
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    // Original title appears on both modal header and card — at least one is enough
    expect(screen.getAllByText('Book a GP appointment').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Something completely different')).not.toBeInTheDocument()
  })

  it('returns to View tab after discard', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })

  it('can re-enter edit mode after discarding', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
  })
})

// ─── Acceptance criteria editing ─────────────────────────────────────────────

describe('Acceptance criteria editing', () => {
  it('adds a new empty criterion row', async () => {
    renderBreakdown()
    await openEditTab()
    const before = screen.getAllByRole('textbox').length
    await userEvent.click(screen.getByRole('button', { name: /add acceptance criteria item/i }))
    expect(screen.getAllByRole('textbox').length).toBe(before + 1)
  })

  it('saves a newly typed criterion', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.click(screen.getByRole('button', { name: /add acceptance criteria item/i }))
    const allTextareas = screen.getAllByRole('textbox')
    await userEvent.type(allTextareas[allTextareas.length - 1], 'Confirmation email sent via SendGrid')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/Confirmation email sent via SendGrid/i)).toBeInTheDocument()
  })

  it('removes a criterion when clicking its remove button', async () => {
    renderBreakdown()
    await openEditTab()
    const removeBtn = screen.getByRole('button', { name: /remove acceptance criteria item 1/i })
    await userEvent.click(removeBtn)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.queryByText(/Available slots fetched/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Patient cannot hold/i)).toBeInTheDocument()
  })
})

// ─── In Scope / Out of Scope / Assumptions / Cross-Functional editing ─────────

describe('In Scope / Out of Scope / Assumptions / Cross-Functional editing', () => {
  it('shows add buttons for all five list sections', async () => {
    renderBreakdown()
    await openEditTab()
    const addButtons = screen.getAllByRole('button', { name: /^add .+ item$/i })
    expect(addButtons.length).toBe(5)
  })

  it('adds and saves a new in-scope item', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.click(screen.getByRole('button', { name: /add in scope item/i }))
    const emptyInputs = screen.getAllByRole('textbox').filter(el => (el as HTMLTextAreaElement).value === '')
    await userEvent.type(emptyInputs[0], 'Telehealth appointments')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/Telehealth appointments/i)).toBeInTheDocument()
  })

  it('removes an out-of-scope item', async () => {
    renderBreakdown()
    await openEditTab()
    const removeBtn = screen.getByRole('button', { name: /remove out of scope item 1/i })
    await userEvent.click(removeBtn)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.queryByText(/Specialist referral booking/i)).not.toBeInTheDocument()
  })

  it('edits an existing assumption', async () => {
    renderBreakdown()
    await openEditTab()
    const assumptionInput = screen.getByDisplayValue(/Patient already has an active account/i)
    await userEvent.clear(assumptionInput)
    await userEvent.type(assumptionInput, 'Patient is registered with an MRN')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/Patient is registered with an MRN/i)).toBeInTheDocument()
    expect(screen.queryByText(/Patient already has an active account/i)).not.toBeInTheDocument()
  })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles a story with empty lists without crashing', async () => {
    const story = makeStory({ acceptanceCriteria: [], inScope: [], outOfScope: [], assumptions: [], crossFunctionalNeeds: [] })
    renderBreakdown(story)
    await openEditTab()
    expect(screen.getByRole('button', { name: /add acceptance criteria item/i })).toBeInTheDocument()
  })

  it('handles a story with no story points without crashing', async () => {
    renderBreakdown(makeStory({ storyPoints: undefined }))
    await openEditTab()
    expect(screen.getByLabelText(/points/i)).toHaveValue(null)
  })

  it('Validate button opens modal on the Validate tab directly', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /validate/i }))
    // validation-section is rendered only on the Validate tab
    expect(screen.getByTestId('validation-section')).toBeInTheDocument()
  })

  it('can open and close the modal multiple times', async () => {
    renderBreakdown()
    await openModal()
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    await openModal()
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.getByText('Book a GP appointment')).toBeInTheDocument()
  })

  it('can enter and exit edit mode multiple times within the modal', async () => {
    renderBreakdown()
    await openEditTab()
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })
})
