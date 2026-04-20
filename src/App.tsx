import { useState } from 'react'
import {
  Settings as SettingsIcon, BookOpen, FileText, Layers, BookMarked,
  ShieldCheck, ScrollText, ChevronRight, Sparkles, Menu, X
} from 'lucide-react'
import type { AppStep, AppState, APISettings, ContextCapture as ContextCaptureType, ClarifyingQuestion, Epic, Story } from './types'
import Settings from './components/Settings'
import ContextCaptureComponent from './components/ContextCapture'
import RequirementsInput from './components/RequirementsInput'
import EpicsView from './components/EpicsView'
import StoryBreakdown from './components/StoryBreakdown'
import StoryValidation from './components/StoryValidation'
import UserStoryDisplay from './components/UserStoryDisplay'
import { MOCK_EPICS, MOCK_STORY_LIST } from './data/mockData'

const NAV_STEPS: { id: AppStep; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'settings', label: 'Settings', icon: SettingsIcon, description: 'AI provider & preferences' },
  { id: 'context', label: 'Context', icon: BookOpen, description: 'Domain & tech context' },
  { id: 'requirements', label: 'Requirements', icon: FileText, description: 'Intake & AI clarification' },
  { id: 'epics', label: 'Epics', icon: Layers, description: 'Columnar epic view' },
  { id: 'stories', label: 'Stories', icon: BookMarked, description: 'Story breakdown' },
  { id: 'validation', label: 'Validation', icon: ShieldCheck, description: 'INVEST analysis' },
  { id: 'story-display', label: 'User Story', icon: ScrollText, description: 'Agile story card' },
]

const STEP_ORDER: AppStep[] = ['settings', 'context', 'requirements', 'epics', 'stories', 'validation', 'story-display']

const DEFAULT_SETTINGS: APISettings = {
  provider: 'anthropic',
  anthropicKey: '',
  azureEndpoint: '',
  azureKey: '',
  azureDeployment: '',
  clarifyingQuestionsCount: 3,
}

const DEFAULT_CONTEXT: ContextCaptureType = {
  domainText: '',
  domainFiles: [],
  techText: '',
  techFiles: [],
}

export default function App() {
  const [state, setState] = useState<AppState>({
    currentStep: 'settings',
    settings: DEFAULT_SETTINGS,
    context: DEFAULT_CONTEXT,
    rawRequirements: '',
    clarifyingQuestions: [],
    clarifyingComplete: false,
    epics: [],
    selectedEpicId: null,
    selectedStoryId: null,
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const goTo = (step: AppStep) => {
    setState(p => ({ ...p, currentStep: step }))
    setSidebarOpen(false)
  }

  const currentIdx = STEP_ORDER.indexOf(state.currentStep)
  const isUnlocked = (step: AppStep) => STEP_ORDER.indexOf(step) <= currentIdx

  const handleSettingsSave = (settings: APISettings) => {
    setState(p => ({ ...p, settings, currentStep: 'context' }))
  }

  const handleContextSave = (context: ContextCaptureType) => {
    setState(p => ({ ...p, context, currentStep: 'requirements' }))
  }

  const handleClarifyingComplete = (questions: ClarifyingQuestion[]) => {
    setState(p => ({ ...p, clarifyingQuestions: questions, clarifyingComplete: true }))
  }

  const handleGenerateEpics = () => {
    setState(p => ({ ...p, currentStep: 'epics', epics: MOCK_EPICS }))
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

  const handleViewStory = (storyId: string) => {
    setState(p => ({ ...p, selectedStoryId: storyId, currentStep: 'validation' }))
  }

  const handleViewFullStory = (storyId: string) => {
    setState(p => ({ ...p, selectedStoryId: storyId, currentStep: 'story-display' }))
  }

  const getStoriesForEpic = () => {
    const epic = state.epics.find(e => e.id === state.selectedEpicId)
    return epic?.stories || MOCK_STORY_LIST
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">RequireAI</p>
              <p className="text-xs text-gray-400">Requirements Studio</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider badge */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
            state.settings.provider === 'anthropic'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-blue-50 text-blue-700'
          }`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {state.settings.provider === 'anthropic' ? 'Anthropic Claude' : 'Azure OpenAI'}
          </div>
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
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : unlocked
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  active ? 'bg-white/20 text-white' : unlocked ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-200'
                }`}>
                  {currentIdx > i ? '✓' : i + 1}
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            {state.settings.clarifyingQuestionsCount} questions per interaction
          </p>
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
            <span className="text-sm font-semibold text-gray-800">RequireAI</span>
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {NAV_STEPS.find(s => s.id === state.currentStep)?.label}
          </span>
        </div>

        {/* Page content */}
        <div className="px-2 lg:px-4">
          {state.currentStep === 'settings' && (
            <Settings settings={state.settings} onSave={handleSettingsSave} />
          )}
          {state.currentStep === 'context' && (
            <ContextCaptureComponent context={state.context} onSave={handleContextSave} />
          )}
          {state.currentStep === 'requirements' && (
            <RequirementsInput
              rawRequirements={state.rawRequirements}
              clarifyingQuestions={state.clarifyingQuestions}
              clarifyingComplete={state.clarifyingComplete}
              questionCount={state.settings.clarifyingQuestionsCount}
              onRequirementsChange={r => setState(p => ({ ...p, rawRequirements: r }))}
              onClarifyingComplete={handleClarifyingComplete}
              onGenerateEpics={handleGenerateEpics}
            />
          )}
          {state.currentStep === 'epics' && (
            <EpicsView
              epics={state.epics}
              onEpicsChange={handleEpicsChange}
              onBreakIntoStories={handleBreakIntoStories}
            />
          )}
          {state.currentStep === 'stories' && state.selectedEpicId && (
            <StoryBreakdown
              epicId={state.selectedEpicId}
              epics={state.epics}
              questionCount={state.settings.clarifyingQuestionsCount}
              onStoriesGenerated={handleStoriesGenerated}
              onViewStory={handleViewStory}
            />
          )}
          {state.currentStep === 'validation' && (
            <StoryValidation
              storyId={state.selectedStoryId || ''}
              stories={getStoriesForEpic()}
              onViewStory={handleViewFullStory}
            />
          )}
          {state.currentStep === 'story-display' && (
            <UserStoryDisplay
              storyId={state.selectedStoryId || ''}
              stories={getStoriesForEpic()}
              onBack={() => setState(p => ({ ...p, currentStep: 'validation' }))}
            />
          )}
        </div>
      </main>
    </div>
  )
}
