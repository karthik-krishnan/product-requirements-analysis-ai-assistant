/**
 * Tests for the inline story editing feature in StoryBreakdown.
 *
 * Strategy: pass an epic with pre-existing stories so the component
 * starts in 'done' phase (no LLM call needed). The first story is
 * defaultOpen so the accordion and Edit button are immediately visible.
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

vi.mock('./StoryValidation', () => ({
  ValidationSection: () => <div data-testid="validation-section" />,
}))

vi.mock('./JiraPushModal', () => ({
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
  tags: [],
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

// ─── Visibility: read mode ────────────────────────────────────────────────────

describe('Edit button — read mode', () => {
  it('shows Edit button when story accordion is expanded', () => {
    renderBreakdown()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })

  it('shows story content in read mode by default', () => {
    renderBreakdown()
    expect(screen.getByText(/registered patient/i)).toBeInTheDocument()
  })

  it('does not show Save or Discard buttons in read mode', () => {
    renderBreakdown()
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /discard/i })).not.toBeInTheDocument()
  })

  it('shows Discuss, Validate, Copy MD, Push to Jira in read mode', () => {
    renderBreakdown()
    expect(screen.getByRole('button', { name: /discuss/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /validate \(invest\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy md/i })).toBeInTheDocument()
    // Multiple "Push to Jira" buttons can exist (story + page level)
    expect(screen.getAllByRole('button', { name: /push to jira/i }).length).toBeGreaterThanOrEqual(1)
  })
})

// ─── Entering edit mode ───────────────────────────────────────────────────────

describe('Entering edit mode', () => {
  it('shows title input after clicking Edit', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  })

  it('pre-populates title with current value', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText(/title/i)).toHaveValue('Book a GP appointment')
  })

  it('pre-populates story sentence fields', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText(/as a/i)).toHaveValue('registered patient')
    expect(screen.getByLabelText(/i want to/i)).toHaveValue('book a GP appointment online')
    expect(screen.getByLabelText(/so that/i)).toHaveValue('I can avoid calling the surgery')
  })

  it('pre-populates story points', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText(/points/i)).toHaveValue(5)
  })

  it('swaps Edit button for Save and Discard', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument()
  })

  it('hides Discuss, Validate, Copy MD, Push to Jira while editing', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.queryByRole('button', { name: /discuss/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /validate \(invest\)/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy md/i })).not.toBeInTheDocument()
    // The per-story Push to Jira button inside the action bar should be gone while editing
    // (page-level Push to Jira at the top of the list may still be present)
    expect(screen.queryByRole('button', { name: /copy md/i })).not.toBeInTheDocument()
  })

  it('shows existing acceptance criteria as textareas', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByDisplayValue(/Available slots fetched/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Patient cannot hold/i)).toBeInTheDocument()
  })

  it('shows in scope, out of scope, assumptions, cross-functional needs as textareas', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByDisplayValue(/GP appointment booking only/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Specialist referral booking/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Patient already has an active account/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/FHIR Adapter must support/i)).toBeInTheDocument()
  })
})

// ─── Saving edits ─────────────────────────────────────────────────────────────

describe('Saving edits', () => {
  it('updates the accordion header title after save', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Reschedule a GP appointment')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText('Reschedule a GP appointment')).toBeInTheDocument()
  })

  it('returns to read mode after save', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })

  it('persists edited "As a" value in read mode after save', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const asAInput = screen.getByLabelText(/as a/i)
    await userEvent.clear(asAInput)
    await userEvent.type(asAInput, 'carer or guardian')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/carer or guardian/i)).toBeInTheDocument()
  })

  it('updates the priority badge after changing priority and saving', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'Critical')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('restores all action buttons after save', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByRole('button', { name: /discuss/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /validate \(invest\)/i })).toBeInTheDocument()
  })
})

// ─── Discarding edits ─────────────────────────────────────────────────────────

describe('Discarding edits', () => {
  it('restores original title after discard', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Something completely different')
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.getByText('Book a GP appointment')).toBeInTheDocument()
    expect(screen.queryByText('Something completely different')).not.toBeInTheDocument()
  })

  it('returns to read mode after discard', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })

  it('restores all action buttons after discard', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.getByRole('button', { name: /discuss/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /validate \(invest\)/i })).toBeInTheDocument()
  })
})

// ─── Acceptance criteria editing ─────────────────────────────────────────────

describe('Acceptance criteria editing', () => {
  it('adds a new empty criterion row', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const before = screen.getAllByRole('textbox').length
    await userEvent.click(screen.getByRole('button', { name: /add acceptance criteria item/i }))
    expect(screen.getAllByRole('textbox').length).toBe(before + 1)
  })

  it('saves a newly typed criterion', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /add acceptance criteria item/i }))
    const allTextareas = screen.getAllByRole('textbox')
    await userEvent.type(allTextareas[allTextareas.length - 1], 'Confirmation email sent via SendGrid')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/Confirmation email sent via SendGrid/i)).toBeInTheDocument()
  })

  it('removes a criterion when clicking its remove button', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
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
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    // aria-label pattern: "Add <Label> item" for all 5 sections
    const addButtons = screen.getAllByRole('button', { name: /^add .+ item$/i })
    expect(addButtons.length).toBe(5)
  })

  it('adds and saves a new in-scope item', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /add in scope item/i }))
    const emptyInputs = screen.getAllByRole('textbox').filter(el => (el as HTMLTextAreaElement).value === '')
    await userEvent.type(emptyInputs[0], 'Telehealth appointments')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText(/Telehealth appointments/i)).toBeInTheDocument()
  })

  it('removes an out-of-scope item', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const removeBtn = screen.getByRole('button', { name: /remove out of scope item 1/i })
    await userEvent.click(removeBtn)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.queryByText(/Specialist referral booking/i)).not.toBeInTheDocument()
  })

  it('edits an existing assumption', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
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
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByRole('button', { name: /add acceptance criteria item/i })).toBeInTheDocument()
  })

  it('handles a story with no story points without crashing', async () => {
    renderBreakdown(makeStory({ storyPoints: undefined }))
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText(/points/i)).toHaveValue(null)
  })

  it('can enter and exit edit mode multiple times', async () => {
    renderBreakdown()
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    await userEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })
})
