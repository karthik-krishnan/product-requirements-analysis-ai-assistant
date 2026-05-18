import { useState } from 'react'
import {
  FileText, Layers,
  ChevronRight, Sparkles, Menu, X, Settings as SettingsIcon, Building2, ChevronDown,
} from 'lucide-react'
import type {
  AppStep, AppState, APISettings, EnterpriseConfig, Workspace, WorkspaceSession,
  ClarifyingQuestion, Epic, Story, INVESTValidation, ChatEntry,
} from './types'
import Settings from './components/Settings'
import RequirementsInput from './components/RequirementsInput'
import EpicsView from './components/EpicsView'
import StoryBreakdown from './components/StoryBreakdown'
import AllStoriesView from './components/AllStoriesView'
import WorkspaceManager from './components/WorkspaceManager'
import {
  loadEnterpriseConfig, saveEnterpriseConfig,
  loadWorkspaces, saveWorkspaces,
  loadActiveWorkspaceId, saveActiveWorkspaceId,
  makeWorkspaceId,
} from './services/enterprise'
import { DEMO_ENTERPRISE_CONFIG, DEMO_WORKSPACES } from './data/mockData'

// ─── Step config ──────────────────────────────────────────────────────────────

const NAV_STEPS: { id: AppStep; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'requirements', label: 'Requirements',    icon: FileText,   description: 'Intake & AI exploration' },
  { id: 'epics',        label: 'Epics & Stories', icon: Layers,     description: 'Generate · validate · export' },
]

const STEP_ORDER: AppStep[] = ['requirements', 'epics']

const PROVIDER_LABELS: Record<string, string> = {
  demo:           'Demo mode',
  anthropic:      'Anthropic Claude',
  openai:         'OpenAI',
  'azure-openai': 'Azure OpenAI',
  google:         'Google Gemini',
  ollama:         'Ollama (Local)',
}

// ─── Persistence ──────────────────────────────────────────────────────────────

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
  azureFoundryEndpoint: '',
  azureFoundryKey: '',
  azureFoundryModel: 'claude-sonnet-4-6',
  googleKey: '',
  googleModel: 'gemini-1.5-pro',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3',
  assistanceLevel: 2,
}

const EMPTY_SESSION: WorkspaceSession = {
  rawRequirements: '',
  clarifyingQuestions: [],
  clarifyingComplete: false,
  epics: [],
  storyValidations: {},
  storyAcceptedFixes: {},
  epicChats: {},
  storyChats: {},
}

function initEnterpriseState(provider: string): {
  enterpriseConfig: EnterpriseConfig | null
  workspaces: Workspace[]
  activeWorkspaceId: string | null
} {
  if (provider === 'demo') {
    return {
      enterpriseConfig: DEMO_ENTERPRISE_CONFIG,
      workspaces: DEMO_WORKSPACES,
      activeWorkspaceId: DEMO_WORKSPACES[0]?.id ?? null,
    }
  }
  const workspaces = loadWorkspaces()
  const activeId = loadActiveWorkspaceId()
  return {
    enterpriseConfig: loadEnterpriseConfig(),
    workspaces,
    activeWorkspaceId: activeId && workspaces.some(w => w.id === activeId) ? activeId : workspaces[0]?.id ?? null,
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const settings = loadSettings()
  const { enterpriseConfig: initEnterprise, workspaces: initWorkspaces, activeWorkspaceId: initActiveId } = initEnterpriseState(settings.provider)

  const [state, setState] = useState<AppState>({
    currentStep: 'requirements',
    settings,
    enterpriseConfig: initEnterprise,
    workspaces: initWorkspaces,
    activeWorkspaceId: initActiveId,
    workspaceSessions: {},
    rawRequirements: '',
    clarifyingQuestions: [],
    clarifyingComplete: false,
    epics: [],
    selectedEpicId: null,
    selectedStoryId: null,
    storyValidations: {},
    storyAcceptedFixes: {},
    epicChats: {},
    storyChats: {},
  })
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [settingsOpen, setSettingsOpen]       = useState(false)
  const [settingsTab, setSettingsTab]         = useState<'ai' | 'enterprise'>('ai')
  const [workspaceMgrOpen, setWorkspaceMgrOpen] = useState(false)
  const [epicView, setEpicView]               = useState<'grid' | 'all-stories'>('grid')
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false)

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const activeWorkspace = state.workspaces.find(w => w.id === state.activeWorkspaceId) ?? null
  const isDemo = state.settings.provider === 'demo'

  // ─── Helpers — snapshot & restore session ─────────────────────────────────────

  function snapshotSession(s: AppState): WorkspaceSession {
    return {
      rawRequirements:     s.rawRequirements,
      clarifyingQuestions: s.clarifyingQuestions,
      clarifyingComplete:  s.clarifyingComplete,
      epics:               s.epics,
      storyValidations:    s.storyValidations,
      storyAcceptedFixes:  s.storyAcceptedFixes,
      epicChats:           s.epicChats,
      storyChats:          s.storyChats,
    }
  }

  function applySession(s: AppState, session: WorkspaceSession): AppState {
    return {
      ...s,
      rawRequirements:     session.rawRequirements,
      clarifyingQuestions: session.clarifyingQuestions,
      clarifyingComplete:  session.clarifyingComplete,
      epics:               session.epics,
      selectedEpicId:      null,
      storyValidations:    session.storyValidations,
      storyAcceptedFixes:  session.storyAcceptedFixes,
      epicChats:           session.epicChats,
      storyChats:          session.storyChats,
      currentStep:         session.epics.length > 0 ? 'epics' : 'requirements',
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const goTo = (step: AppStep) => {
    setState(p => ({
      ...p,
      currentStep: step,
      ...(step === 'epics' ? { selectedEpicId: null } : {}),
    }))
    if (step === 'epics') setEpicView('grid')
    setSidebarOpen(false)
  }

  const isUnlocked = (step: AppStep) => {
    switch (step) {
      case 'requirements': return true
      case 'epics':        return state.epics.length > 0
    }
  }
  const isCompleted = (step: AppStep) => {
    switch (step) {
      case 'requirements': return state.epics.length > 0
      case 'epics':        return state.epics.some(e => (e.stories?.length ?? 0) > 0)
    }
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  const handleSettingsSave = (newSettings: APISettings, enterprise: EnterpriseConfig) => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings)) } catch { /* ignore */ }
    if (!isDemo) saveEnterpriseConfig(enterprise)
    // Re-init enterprise state when provider changes (demo ↔ real)
    const { enterpriseConfig, workspaces, activeWorkspaceId } = initEnterpriseState(newSettings.provider)
    setState(p => ({ ...p, settings: newSettings, enterpriseConfig, workspaces, activeWorkspaceId }))
  }

  const openSettings = (tab: 'ai' | 'enterprise' = 'ai') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  // ─── Enterprise ───────────────────────────────────────────────────────────────

  const handleEnterpriseChange = (config: EnterpriseConfig) => {
    if (!isDemo) saveEnterpriseConfig(config)
    setState(p => ({ ...p, enterpriseConfig: config }))
  }

  // ─── Workspace ────────────────────────────────────────────────────────────────

  const handleWorkspacesChange = (workspaces: Workspace[]) => {
    if (!isDemo) saveWorkspaces(workspaces)
    setState(p => ({ ...p, workspaces }))
  }

  const handleActiveWorkspaceChange = (id: string) => {
    if (!isDemo) saveActiveWorkspaceId(id)
    setState(p => {
      // 1. Save current session keyed by current workspace id
      const currentId = p.activeWorkspaceId
      const savedSessions = currentId
        ? { ...p.workspaceSessions, [currentId]: snapshotSession(p) }
        : p.workspaceSessions

      // 2. Restore session for the new workspace (or start fresh)
      const restoredSession = savedSessions[id] ?? EMPTY_SESSION

      return applySession(
        { ...p, activeWorkspaceId: id, workspaceSessions: savedSessions },
        restoredSession,
      )
    })
    setEpicView('grid')
    setWorkspacePickerOpen(false)
  }

  // ─── Workflow callbacks ───────────────────────────────────────────────────────

  const handleClarifyingComplete = (questions: ClarifyingQuestion[]) => {
    setState(p => ({ ...p, clarifyingQuestions: questions, clarifyingComplete: true }))
  }

  const handleGenerateEpics = (epics: Epic[]) => {
    setState(p => ({ ...p, currentStep: 'epics', epics }))
    setEpicView('grid')
  }

  const handleEpicsChange = (epics: Epic[]) => setState(p => ({ ...p, epics }))

  const handleBreakIntoStories = (epicId: string) => {
    setState(p => ({ ...p, selectedEpicId: epicId, currentStep: 'epics' }))
  }

  const handleStoriesGenerated = (epicId: string, stories: Story[]) => {
    setState(p => ({
      ...p,
      epics: p.epics.map(e => e.id === epicId ? { ...e, stories } : e),
    }))
  }

  const handleStoryValidated = (storyId: string, validation: INVESTValidation) =>
    setState(p => ({ ...p, storyValidations: { ...p.storyValidations, [storyId]: validation } }))

  const handleEpicChatUpdate = (epicId: string, messages: ChatEntry[]) =>
    setState(p => ({ ...p, epicChats: { ...p.epicChats, [epicId]: messages } }))

  const handleStoryChatUpdate = (storyId: string, messages: ChatEntry[]) =>
    setState(p => ({ ...p, storyChats: { ...p.storyChats, [storyId]: messages } }))

  const handleFixAccepted = (storyId: string, key: string) =>
    setState(p => ({
      ...p,
      storyAcceptedFixes: {
        ...p.storyAcceptedFixes,
        [storyId]: [...(p.storyAcceptedFixes[storyId] ?? []), key],
      },
    }))

  const handleQuickCreateWorkspace = () => {
    const ws: Workspace = {
      id: makeWorkspaceId(), name: 'My Team',
      domainText: '', domainFiles: [], techText: '', techFiles: [],
    }
    const updated = [...state.workspaces, ws]
    handleWorkspacesChange(updated)
    handleActiveWorkspaceChange(ws.id)
    setWorkspaceMgrOpen(true)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

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

        {/* Workspace picker */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Workspace</p>
          <div className="relative">
            <button
              onClick={() => setWorkspacePickerOpen(p => !p)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all text-left"
            >
              <div className="w-6 h-6 rounded-md bg-brand-100 flex items-center justify-center shrink-0">
                <Layers className="w-3 h-3 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                {activeWorkspace
                  ? <p className="text-xs font-semibold text-gray-800 truncate">{activeWorkspace.name}</p>
                  : <p className="text-xs font-medium text-gray-400 italic">No workspace selected</p>
                }
                {state.enterpriseConfig?.name && (
                  <p className="text-xs text-gray-400 truncate">{state.enterpriseConfig.name}</p>
                )}
              </div>
              <ChevronDown className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${workspacePickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {workspacePickerOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {state.workspaces.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-400 text-center">No workspaces yet</div>
                ) : (
                  state.workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => handleActiveWorkspaceChange(ws.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${ws.id === state.activeWorkspaceId ? 'bg-brand-50' : ''}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ws.id === state.activeWorkspaceId ? 'bg-brand-500' : 'bg-gray-200'}`} />
                      <span className={`text-xs font-medium truncate ${ws.id === state.activeWorkspaceId ? 'text-brand-700' : 'text-gray-700'}`}>{ws.name}</span>
                      {ws.id === state.activeWorkspaceId && <span className="ml-auto text-xs text-brand-500">✓</span>}
                    </button>
                  ))
                )}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => { setWorkspaceMgrOpen(true); setWorkspacePickerOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Building2 className="w-3 h-3" /> Manage workspaces
                  </button>
                </div>
              </div>
            )}
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
                  <p className={`text-xs leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{step.description}</p>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 text-white/70 ml-auto shrink-0" />}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 flex flex-col gap-1">
          <button
            onClick={() => setWorkspaceMgrOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="w-6 h-6 rounded-md bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <p className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors">Workspaces</p>
          </button>
          <button
            onClick={() => openSettings('ai')}
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
      <main className="flex-1 overflow-y-auto min-w-0" onClick={() => workspacePickerOpen && setWorkspacePickerOpen(false)}>
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
          <button onClick={() => openSettings('ai')} className="ml-auto text-gray-400 hover:text-gray-600">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>

        {/* No workspace banner */}
        {!activeWorkspace && (
          <div className="mx-4 mt-6 flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">No workspace selected</p>
              <p className="text-xs text-amber-700 mt-0.5">Create a workspace for your team to load the right domain and tech context into every AI call.</p>
            </div>
            <button onClick={handleQuickCreateWorkspace} className="btn-primary text-xs shrink-0 px-4 py-2">
              Create workspace
            </button>
          </div>
        )}

        <div className="px-2 lg:px-4">
          {state.currentStep === 'requirements' && (
            <RequirementsInput
              rawRequirements={state.rawRequirements}
              clarifyingQuestions={state.clarifyingQuestions}
              clarifyingComplete={state.clarifyingComplete}
              settings={state.settings}
              enterprise={state.enterpriseConfig}
              workspace={activeWorkspace}
              onRequirementsChange={r => setState(p => ({ ...p, rawRequirements: r }))}
              onClarifyingComplete={handleClarifyingComplete}
              onGenerateEpics={handleGenerateEpics}
            />
          )}
          {state.currentStep === 'epics' && !state.selectedEpicId && (
            <>
              <div className="flex items-center gap-1 px-6 pt-6 pb-0">
                <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-medium">
                  {(['grid', 'all-stories'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setEpicView(v)}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        epicView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {v === 'grid' ? 'Epics' : 'All Stories'}
                    </button>
                  ))}
                </div>
              </div>
              {epicView === 'grid'
                ? <EpicsView
                    epics={state.epics}
                    settings={state.settings}
                    enterprise={state.enterpriseConfig}
                    workspace={activeWorkspace}
                    rawRequirements={state.rawRequirements}
                    epicChats={state.epicChats}
                    onEpicsChange={handleEpicsChange}
                    onBreakIntoStories={handleBreakIntoStories}
                    onEpicChatUpdate={handleEpicChatUpdate}
                  />
                : <AllStoriesView
                    epics={state.epics}
                    storyValidations={state.storyValidations}
                    storyAcceptedFixes={state.storyAcceptedFixes}
                    onSelectEpic={handleBreakIntoStories}
                  />
              }
            </>
          )}
          {state.currentStep === 'epics' && state.selectedEpicId && (
            <StoryBreakdown
              key={state.selectedEpicId}
              epicId={state.selectedEpicId}
              epics={state.epics}
              settings={state.settings}
              enterprise={state.enterpriseConfig}
              workspace={activeWorkspace}
              storyValidations={state.storyValidations}
              storyAcceptedFixes={state.storyAcceptedFixes}
              storyChats={state.storyChats}
              onSelectEpic={epicId => setState(p => ({ ...p, selectedEpicId: epicId ?? null }))}
              onStoryChatUpdate={handleStoryChatUpdate}
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
          )}
        </div>
      </main>

      {/* Settings modal */}
      {settingsOpen && (
        <Settings
          settings={state.settings}
          enterpriseConfig={state.enterpriseConfig}
          initialTab={settingsTab}
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Workspace manager modal */}
      {workspaceMgrOpen && (
        <WorkspaceManager
          workspaces={state.workspaces}
          activeWorkspaceId={state.activeWorkspaceId}
          settings={state.settings}
          onWorkspacesChange={handleWorkspacesChange}
          onActiveWorkspaceChange={handleActiveWorkspaceChange}
          onOpenEnterpriseSettings={() => { setWorkspaceMgrOpen(false); openSettings('enterprise') }}
          onClose={() => setWorkspaceMgrOpen(false)}
        />
      )}
    </div>
  )
}
