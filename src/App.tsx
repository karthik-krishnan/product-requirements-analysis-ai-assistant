import { useState } from 'react'
import {
  BookOpen, FileText, Layers, BookMarked,
  ChevronRight, Sparkles, Menu, X, Settings as SettingsIcon
} from 'lucide-react'
import type { AppStep, AppState, APISettings, ContextCapture as ContextCaptureType, ClarifyingQuestion, Epic, Story, INVESTValidation } from './types'
import Settings from './components/Settings'
import ContextCaptureComponent from './components/ContextCapture'
import RequirementsInput from './components/RequirementsInput'
import EpicsView from './components/EpicsView'
import StoryBreakdown from './components/StoryBreakdown'

const NAV_STEPS: { id: AppStep; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'context',      label: 'Context',      icon: BookOpen,   description: 'Domain & tech context' },
  { id: 'requirements', label: 'Requirements', icon: FileText,   description: 'Intake & AI exploration' },
  { id: 'epics',        label: 'Epics',        icon: Layers,     description: 'Columnar epic view' },
  { id: 'stories',      label: 'Stories',      icon: BookMarked, description: 'Breakdown & validation' },
]

const STEP_ORDER: AppStep[] = ['context', 'requirements', 'epics', 'stories']

const PROVIDER_LABELS: Record<string, string> = {
  demo:           'Demo mode',
  anthropic:      'Anthropic Claude',
  openai:         'OpenAI',
  'azure-openai': 'Azure OpenAI',
  google:         'Google Gemini',
  ollama:         'Ollama (Local)',
}

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

function EpicPicker({ epics, onSelect }: { epics: Epic[]; onSelect: (id: string) => void }) {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Story Breakdown</h1>
        <p className="text-sm text-gray-500 mt-1">Select an epic to generate or review its user stories.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {epics.map(epic => {
          const storyCount = epic.stories?.length ?? 0
          return (
            <button
              key={epic.id}
              onClick={() => onSelect(epic.id)}
              className="card p-4 text-left flex flex-col gap-3 hover:shadow-md hover:border-brand-200 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`badge ${PRIORITY_COLORS[epic.priority]}`}>{epic.priority}</span>
                {storyCount > 0
                  ? <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">{storyCount} stories</span>
                  : <span className="text-xs text-gray-400">No stories yet</span>
                }
              </div>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{epic.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{epic.description}</p>
              <span className="text-xs text-brand-600 font-medium mt-auto">
                {storyCount > 0 ? 'View / Edit stories →' : 'Generate stories →'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SETTINGS_KEY = 'productpilot_settings'

function loadSettings(): APISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

const DEFAULT_SETTINGS: APISettings = {
  provider: 'demo',
  anthropicKey: '',
  openaiKey: '',
  openaiModel: 'gpt-4o',
  azureEndpoint: '',
  azureKey: '',
  azureDeployment: '',
  googleKey: '',
  googleModel: 'gemini-1.5-pro',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3',
  assistanceLevel: 2,
}

const DEFAULT_CONTEXT: ContextCaptureType = {
  domainText: '',
  domainFiles: [],
  techText: '',
  techFiles: [],
}

export default function App() {
  const [state, setState] = useState<AppState>({
    currentStep: 'context',
    settings: loadSettings(),
    context: DEFAULT_CONTEXT,
    rawRequirements: '',
    clarifyingQuestions: [],
    clarifyingComplete: false,
    epics: [],
    selectedEpicId: null,
    selectedStoryId: null,
    storyValidations: {},
    storyAcceptedFixes: {},
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const goTo = (step: AppStep) => {
    setState(p => ({
      ...p,
      currentStep: step,
      // Always show the epic picker when navigating to Stories via the sidebar
      ...(step === 'stories' ? { selectedEpicId: null } : {}),
    }))
    setSidebarOpen(false)
  }

  const currentIdx = STEP_ORDER.indexOf(state.currentStep)
  const isUnlocked = (step: AppStep) => {
    switch (step) {
      case 'context':      return true
      case 'requirements': return true
      case 'epics':        return state.epics.length > 0
      case 'stories':      return state.epics.length > 0
    }
  }
  const isCompleted = (step: AppStep) => {
    switch (step) {
      case 'context':      return state.currentStep !== 'context'
      case 'requirements': return state.epics.length > 0
      case 'epics':        return state.epics.length > 0
      case 'stories':      return state.epics.some(e => (e.stories?.length ?? 0) > 0)
    }
  }

  const handleSettingsSave = (settings: APISettings) => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
    setState(p => ({ ...p, settings }))
  }

  const handleContextSave = (context: ContextCaptureType) => {
    setState(p => ({ ...p, context, currentStep: 'requirements' }))
  }

  const handleClarifyingComplete = (questions: ClarifyingQuestion[]) => {
    setState(p => ({ ...p, clarifyingQuestions: questions, clarifyingComplete: true }))
  }

  const handleGenerateEpics = (epics: Epic[]) => {
    setState(p => ({ ...p, currentStep: 'epics', epics }))
  }

  const handleEpicsChange = (epics: Epic[]) => {
    setState(p => ({ ...p, epics }))
  }

  const handleBreakIntoStories = (epicId: string) => {
    setState(p => ({ ...p, selectedEpicId: epicId, currentStep: 'stories' }))
  }

  const handleStoriesGenerated = (epicId: string, stories: Story[]) => {
    setState(p => ({
      ...p,
      epics: p.epics.map(e => e.id === epicId ? { ...e, stories } : e),
    }))
  }

  const handleStoryValidated = (storyId: string, validation: INVESTValidation) =>
    setState(p => ({ ...p, storyValidations: { ...p.storyValidations, [storyId]: validation } }))

  const handleFixAccepted = (storyId: string, key: string) =>
    setState(p => ({
      ...p,
      storyAcceptedFixes: {
        ...p.storyAcceptedFixes,
        [storyId]: [...(p.storyAcceptedFixes[storyId] ?? []), key],
      },
    }))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">ProductPilot</p>
              <p className="text-xs text-gray-400">Product Backlog Assistant</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Workflow</p>
          {NAV_STEPS.map((step, i) => {
            const unlocked = isUnlocked(step.id)
            const active = state.currentStep === step.id
            return (
              <button
                key={step.id}
                onClick={() => unlocked && goTo(step.id)}
                disabled={!unlocked}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-1 transition-all ${
                  active ? 'bg-brand-600 text-white shadow-sm'
                  : unlocked ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  active ? 'bg-white/20 text-white' : unlocked ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-200'
                }`}>
                  {!active && isCompleted(step.id) ? '✓' : i + 1}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${active ? 'text-white' : ''}`}>{step.label}</p>
                  <p className={`text-xs truncate ${active ? 'text-white/70' : 'text-gray-400'}`}>{step.description}</p>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 text-white/70 ml-auto shrink-0" />}
              </button>
            )
          })}
        </nav>

        {/* Footer — settings */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="w-6 h-6 rounded-md bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
              <SettingsIcon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="min-w-0 text-left flex-1">
              <p className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors">Settings</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${state.settings.provider === 'demo' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-xs text-gray-400 truncate">{PROVIDER_LABELS[state.settings.provider]}</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">ProductPilot</span>
          </div>
          <button onClick={() => setSettingsOpen(true)} className="ml-auto text-gray-400 hover:text-gray-600">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-2 lg:px-4">
          {state.currentStep === 'context' && (
            <ContextCaptureComponent context={state.context} settings={state.settings} onSave={handleContextSave} />
          )}
          {state.currentStep === 'requirements' && (
            <RequirementsInput
              rawRequirements={state.rawRequirements}
              clarifyingQuestions={state.clarifyingQuestions}
              clarifyingComplete={state.clarifyingComplete}
              settings={state.settings}
              context={state.context}
              onRequirementsChange={r => setState(p => ({ ...p, rawRequirements: r }))}
              onClarifyingComplete={handleClarifyingComplete}
              onGenerateEpics={handleGenerateEpics}
            />
          )}
          {state.currentStep === 'epics' && (
            <EpicsView
              epics={state.epics}
              settings={state.settings}
              onEpicsChange={handleEpicsChange}
              onBreakIntoStories={handleBreakIntoStories}
            />
          )}
          {state.currentStep === 'stories' && (
            state.selectedEpicId
              ? <StoryBreakdown
                  epicId={state.selectedEpicId}
                  epics={state.epics}
                  settings={state.settings}
                  context={state.context}
                  storyValidations={state.storyValidations}
                  storyAcceptedFixes={state.storyAcceptedFixes}
                  onSelectEpic={epicId => setState(p => ({ ...p, selectedEpicId: epicId }))}

                  onStoriesGenerated={handleStoriesGenerated}
                  onStoryValidated={handleStoryValidated}
                  onFixAccepted={handleFixAccepted}
                  onAddStory={(epicId, story) => {
                    setState(p => ({
                      ...p,
                      epics: p.epics.map(e =>
                        e.id === epicId ? { ...e, stories: [...(e.stories || []), story] } : e
                      ),
                    }))
                  }}
                />
              : <EpicPicker epics={state.epics} onSelect={epicId => setState(p => ({ ...p, selectedEpicId: epicId }))} />
          )}
        </div>
      </main>

      {/* Settings modal */}
      {settingsOpen && (
        <Settings
          settings={state.settings}
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
