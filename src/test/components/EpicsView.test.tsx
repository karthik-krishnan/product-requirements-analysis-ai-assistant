/**
 * Tests for EpicsView — especially the demo-vs-live mock data boundary.
 *
 * The critical invariant: MOCK_EPICS must NEVER appear in live mode when
 * no real epics have been generated. This was a bug that went undetected
 * because no test existed for EpicsView.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import EpicsView from '../../components/EpicsView'
import { MOCK_EPICS } from '../../data/mockData'
import type { Epic, APISettings } from '../../types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../services/llm/client', () => ({
  isDemo: (s: APISettings) => s.provider === 'demo',
  isLiveMode: (s: APISettings) => s.provider !== 'demo',
}))

vi.mock('./JiraPushModal', () => ({
  default: () => null,
}))

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const demoSettings: APISettings = {
  provider: 'demo',
  anthropicKey: '', openaiKey: '', openaiModel: '',
  azureKey: '', azureEndpoint: '', azureDeployment: '',
  googleKey: '', googleModel: '',
  ollamaEndpoint: '', ollamaModel: '',
  assistanceLevel: 1,
}

const liveSettings: APISettings = {
  ...demoSettings,
  provider: 'anthropic',
  anthropicKey: 'sk-ant-test-key',
}

const realEpic: Epic = {
  id: 'epic-real-1',
  title: 'Real Generated Epic',
  description: 'This epic came from a real LLM call.',
  priority: 'High',
  category: 'Core',
  tags: ['real'],
  stories: [],
}

function renderEpicsView(epics: Epic[], settings: APISettings) {
  const result = render(
    <EpicsView
      epics={epics}
      settings={settings}
      onEpicsChange={vi.fn()}
      onBreakIntoStories={vi.fn()}
    />,
  )
  // Advance all progressive-reveal timeouts so cards become visible
  act(() => { vi.runAllTimers() })
  return result
}

// ─── Demo mode ────────────────────────────────────────────────────────────────

describe('Demo mode — empty epics', () => {
  it('shows MOCK_EPICS when no epics are provided', () => {
    renderEpicsView([], demoSettings)
    // MOCK_EPICS[0] title must appear
    expect(screen.getByText(MOCK_EPICS[0].title)).toBeInTheDocument()
  })

  it('does NOT show the empty state in demo mode', () => {
    renderEpicsView([], demoSettings)
    expect(screen.queryByText(/no epics generated yet/i)).not.toBeInTheDocument()
  })
})

describe('Demo mode — with real epics', () => {
  it('shows the provided epics, not mock data', () => {
    renderEpicsView([realEpic], demoSettings)
    expect(screen.getByText('Real Generated Epic')).toBeInTheDocument()
    expect(screen.queryByText(MOCK_EPICS[0].title)).not.toBeInTheDocument()
  })
})

// ─── Live mode ────────────────────────────────────────────────────────────────

describe('Live mode — empty epics', () => {
  it('shows the empty state, not mock data', () => {
    renderEpicsView([], liveSettings)
    expect(screen.getByText(/no epics generated yet/i)).toBeInTheDocument()
  })

  it('does NOT show any MOCK_EPICS title in live mode with no epics', () => {
    renderEpicsView([], liveSettings)
    for (const epic of MOCK_EPICS) {
      expect(screen.queryByText(epic.title)).not.toBeInTheDocument()
    }
  })
})

describe('Live mode — with real epics', () => {
  it('shows the provided epics', () => {
    renderEpicsView([realEpic], liveSettings)
    expect(screen.getByText('Real Generated Epic')).toBeInTheDocument()
  })

  it('does NOT show mock data when real epics are present', () => {
    renderEpicsView([realEpic], liveSettings)
    expect(screen.queryByText(MOCK_EPICS[0].title)).not.toBeInTheDocument()
  })
})

// ─── Category filter tabs ─────────────────────────────────────────────────────

describe('Category filter tabs', () => {
  const epics: Epic[] = [
    { ...realEpic, id: 'e1', title: 'Auth Epic',    category: 'Security' },
    { ...realEpic, id: 'e2', title: 'Search Epic',  category: 'Core Product' },
    { ...realEpic, id: 'e3', title: 'Payment Epic', category: 'Commerce' },
  ]

  it('shows an "All" tab with the total count', () => {
    renderEpicsView(epics, liveSettings)
    expect(screen.getByRole('button', { name: /^all/i })).toBeInTheDocument()
  })

  it('shows one tab per category', () => {
    renderEpicsView(epics, liveSettings)
    expect(screen.getByRole('button', { name: /security/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /core product/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /commerce/i })).toBeInTheDocument()
  })

  it('shows all epics by default', () => {
    renderEpicsView(epics, liveSettings)
    expect(screen.getByText('Auth Epic')).toBeInTheDocument()
    expect(screen.getByText('Search Epic')).toBeInTheDocument()
    expect(screen.getByText('Payment Epic')).toBeInTheDocument()
  })
})
