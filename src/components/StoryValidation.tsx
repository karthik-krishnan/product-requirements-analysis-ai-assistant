import { useState } from 'react'
import {
  ShieldCheck, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Lightbulb, ArrowRight, ChevronRight, FileText, Sparkles, Check, X,
  GitBranch, Loader2, Wand2, Zap
} from 'lucide-react'
import type { APISettings, Story, INVESTValidation, FixProposal, FieldDiff } from '../types'
import { MOCK_INVEST_VALIDATION, MOCK_STORY_LIST, MOCK_INVEST_FIXES } from '../data/mockData'
import { callLLM, hasValidKey } from '../services/llm/client'
import { buildValidateINVESTPrompt, parseINVESTValidation } from '../prompts/validateINVEST'
import { buildFixINVESTPrompt, parseFixProposal } from '../prompts/fixINVEST'

const INVEST_META = {
  independent: { label: 'Independent', letter: 'I', color: 'text-blue-600',   bg: 'bg-blue-50',   description: 'Can be developed and released independently of other stories' },
  negotiable:  { label: 'Negotiable',  letter: 'N', color: 'text-violet-600', bg: 'bg-violet-50', description: 'Details are open to discussion, not fixed contracts' },
  valuable:    { label: 'Valuable',    letter: 'V', color: 'text-emerald-600',bg: 'bg-emerald-50',description: 'Delivers clear value to the customer or business' },
  estimable:   { label: 'Estimable',   letter: 'E', color: 'text-amber-600',  bg: 'bg-amber-50',  description: 'The team can estimate the effort required' },
  small:       { label: 'Small',       letter: 'S', color: 'text-orange-600', bg: 'bg-orange-50', description: 'Fits within a single sprint or iteration' },
  testable:    { label: 'Testable',    letter: 'T', color: 'text-pink-600',   bg: 'bg-pink-50',   description: 'Has clear, verifiable acceptance criteria' },
} as const

type INVESTKey = keyof typeof INVEST_META

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

function DiffBlock({ diff }: { diff: FieldDiff }) {
  const isArray = Array.isArray(diff.before)

  if (isArray) {
    const beforeArr = diff.before as string[]
    const afterArr = diff.after as string[]
    const beforeSet = new Set(beforeArr)
    const afterSet = new Set(afterArr)
    const removed = beforeArr.filter(x => !afterSet.has(x))
    const added = afterArr.filter(x => !beforeSet.has(x))
    const unchanged = beforeArr.filter(x => afterSet.has(x))
    return (
      <div className="mb-3 last:mb-0">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{diff.label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
            <p className="text-xs text-red-400 font-medium mb-1">Before</p>
            {unchanged.map((item, i) => <p key={`u${i}`} className="text-xs text-gray-400 leading-relaxed">• {item}</p>)}
            {removed.map((item, i) => <p key={`r${i}`} className="text-xs text-red-600 line-through font-medium leading-relaxed">• {item}</p>)}
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
            <p className="text-xs text-emerald-500 font-medium mb-1">After</p>
            {unchanged.map((item, i) => <p key={`u${i}`} className="text-xs text-gray-400 leading-relaxed">• {item}</p>)}
            {added.map((item, i) => <p key={`a${i}`} className="text-xs text-emerald-700 font-medium leading-relaxed">• {item}</p>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">{diff.label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
          <p className="text-xs text-red-400 font-medium mb-1">Before</p>
          <p className="text-xs text-red-600 line-through font-medium leading-relaxed">{diff.before as string}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
          <p className="text-xs text-emerald-500 font-medium mb-1">After</p>
          <p className="text-xs text-emerald-700 font-medium leading-relaxed">{diff.after as string}</p>
        </div>
      </div>
    </div>
  )
}

interface INVESTRowProps {
  principleKey: INVESTKey
  item: INVESTValidation[INVESTKey]
  fix?: FixProposal
  accepted: boolean
  settings: APISettings
  story: Story
  onAcceptFix: (patch: Partial<Story>, newStory?: Omit<Story, 'id'>) => void
}

function INVESTRow({ principleKey, item, fix: initialFix, accepted, settings, story, onAcceptFix }: INVESTRowProps) {
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false)
  const [fixOpen, setFixOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [liveFix, setLiveFix] = useState<FixProposal | undefined>(initialFix)
  const [fixError, setFixError] = useState<string | null>(null)
  const meta = INVEST_META[principleKey]

  const fix = liveFix

  const handleFixClick = async () => {
    if (fixOpen) { setFixOpen(false); return }
    setLoading(true)
    setFixError(null)
    if (hasValidKey(settings)) {
      try {
        const raw = await callLLM(
          buildFixINVESTPrompt(story, principleKey, meta.label, item),
          settings,
        )
        setLiveFix(parseFixProposal(raw))
        setFixOpen(true)
      } catch (err) {
        setFixError((err as Error).message)
        if (initialFix) { setLiveFix(initialFix); setFixOpen(true) }
      }
    } else {
      await new Promise(r => setTimeout(r, 1000))
      setFixOpen(true)
    }
    setLoading(false)
  }

  const displayScore = accepted ? Math.min(item.score + 35, 95) : item.score
  const displayAdheres = accepted || item.adheres

  return (
    <>
      <tr className={`border-b border-gray-100 last:border-0 transition-colors ${accepted ? 'bg-emerald-50/30' : ''}`}>
        {/* Principle */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
              <span className={`text-xs font-bold ${meta.color}`}>{meta.letter}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{meta.label}</p>
              <p className="text-xs text-gray-400 hidden md:block">{meta.description}</p>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          {displayAdheres ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 w-fit">
              <CheckCircle className="w-3.5 h-3.5" />Adheres
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1 w-fit">
              <AlertCircle className="w-3.5 h-3.5" />Needs Work
            </span>
          )}
        </td>

        {/* Score */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${displayScore >= 80 ? 'bg-emerald-400' : displayScore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${displayScore}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-600">{displayScore}%</span>
          </div>
        </td>

        {/* Feedback + Fix */}
        <td className="py-3 px-4">
          <p className="text-xs text-gray-600 line-clamp-1">{item.feedback}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {item.suggestions.length > 0 && (
              <button onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                {suggestionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {item.suggestions.length} suggestion{item.suggestions.length > 1 ? 's' : ''}
              </button>
            )}
            {!item.adheres && fix && !accepted && (
              <button
                onClick={handleFixClick}
                disabled={loading}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-all ${
                  fixOpen
                    ? 'bg-brand-100 text-brand-700 border-brand-300'
                    : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-50'
                }`}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {loading ? 'Thinking…' : fixOpen ? 'Hide fix' : 'Fix with AI'}
              </button>
            )}
            {accepted && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle className="w-3 h-3" />Fix applied
              </span>
            )}
          </div>

          {suggestionsExpanded && (
            <div className="mt-2 space-y-1 animate-fade-in-up">
              {item.suggestions.map((s, i) => (
                <div key={i} className="flex gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{s}</p>
                </div>
              ))}
            </div>
          )}
        </td>
      </tr>

      {/* Fix proposal row */}
      {fixOpen && fix && !accepted && (
        <tr className="border-b border-gray-100">
          <td colSpan={4} className="px-4 pb-4 pt-0">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-700 mb-0.5">AI Suggested Fix</p>
                  <p className="text-xs text-brand-600 leading-relaxed">{fix.summary}</p>
                </div>
              </div>
              {fixError && (
                <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">AI fix failed — showing mock proposal. {fixError}</p>
                </div>
              )}

              {/* Split notice */}
              {fix.isSplit && fix.splitStories && (
                <div className="mb-3 border border-brand-200 rounded-lg overflow-hidden">
                  <div className="bg-brand-100 px-3 py-2 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-brand-600" />
                    <p className="text-xs font-semibold text-brand-700">Story will be split into 2</p>
                    <span className="ml-auto text-xs text-brand-500 italic">Story 2 added to backlog on accept</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-brand-100">
                    {fix.splitStories.map((s, i) => (
                      <div key={i} className="p-3 bg-white">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Story {i + 1}</p>
                        <p className="text-xs font-medium text-brand-700">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spike card */}
              {fix.isSpike && fix.spikeStory && (
                <div className="mb-3 border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-3 py-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700">Spike story recommended before delivery</p>
                    <span className="ml-auto text-xs text-amber-500 italic">Added to backlog on accept</span>
                  </div>
                  <div className="p-3 bg-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">⚡ Spike</span>
                      <p className="text-xs font-semibold text-gray-700">{fix.spikeStory.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{fix.spikeStory.description}</p>
                  </div>
                </div>
              )}

              {/* Diffs */}
              <div className="mb-3">
                {fix.diffs.map((diff, i) => <DiffBlock key={i} diff={diff} />)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onAcceptFix(fix.patch, fix.splitNewStory ?? fix.spikeNewStory); setFixOpen(false) }}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept & Apply
                </button>
                <button
                  onClick={() => setFixOpen(false)}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Dismiss
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ValidationDetail({ story, settings, onStoryChange, onAddStory, onViewStory }: {
  story: Story
  settings: APISettings
  onStoryChange: (s: Story) => void
  onAddStory: (s: Omit<Story, 'id'>) => void
  onViewStory: (id: string) => void
}) {
  const [validation, setValidation] = useState<INVESTValidation>(story.investValidation || MOCK_INVEST_VALIDATION)
  const [isMockValidation, setIsMockValidation] = useState(!story.investValidation)
  const [validating, setValidating] = useState(false)
  const [validateError, setValidateError] = useState<string | null>(null)
  const keys = Object.keys(INVEST_META) as INVESTKey[]
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set())
  const [fixAllLoading, setFixAllLoading] = useState(false)

  const runValidation = async () => {
    setValidating(true)
    setValidateError(null)
    try {
      const raw = await callLLM(buildValidateINVESTPrompt(story), settings)
      setValidation(parseINVESTValidation(raw))
      setIsMockValidation(false)
    } catch (err) {
      setValidateError((err as Error).message)
    } finally {
      setValidating(false)
    }
  }

  const failingKeys = keys.filter(k => !validation[k].adheres && MOCK_INVEST_FIXES[k])
  const pendingFixes = failingKeys.filter(k => !acceptedKeys.has(k))

  const acceptFix = (key: string, patch: Partial<Story>, newStory?: Omit<Story, 'id'>) => {
    onStoryChange({ ...story, ...patch })
    if (newStory) onAddStory(newStory)
    setAcceptedKeys(prev => new Set([...prev, key]))
  }

  const fixAll = () => {
    setFixAllLoading(true)
    setTimeout(() => {
      const merged = pendingFixes.reduce((acc, k) => {
        const fix = MOCK_INVEST_FIXES[k]
        return fix ? { ...acc, ...fix.patch } : acc
      }, {} as Partial<Story>)
      onStoryChange({ ...story, ...merged })
      setAcceptedKeys(new Set(keys.filter(k => !validation[k].adheres && MOCK_INVEST_FIXES[k])))
      setFixAllLoading(false)
    }, 1500)
  }

  const adheringCount = keys.filter(k => validation[k].adheres || acceptedKeys.has(k)).length
  const overallScore = Math.round(keys.reduce((sum, k) => {
    const base = validation[k].score
    return sum + (acceptedKeys.has(k) ? Math.min(base + 35, 95) : base)
  }, 0) / keys.length)

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* AI validate bar */}
      {hasValidKey(settings) && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
          isMockValidation ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          {validating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500 shrink-0" />
              <p className="text-xs text-brand-600 flex-1">Validating against INVEST principles with AI…</p>
            </>
          ) : isMockValidation ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 flex-1">Showing sample validation — click to run real AI analysis.</p>
              <button onClick={runValidation} className="btn-primary flex items-center gap-1.5 text-xs py-1 px-3 shrink-0">
                <Sparkles className="w-3 h-3" />
                Validate with AI
              </button>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-700 flex-1">Validated by AI · {settings.provider}</p>
              <button onClick={runValidation} className="text-xs text-emerald-600 hover:text-emerald-800 underline shrink-0">
                Re-validate
              </button>
            </>
          )}
        </div>
      )}
      {validateError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700">Validation failed</p>
            <p className="text-xs text-red-600 mt-0.5 break-words">{validateError}</p>
          </div>
          <button onClick={() => setValidateError(null)} className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
        </div>
      )}
      {/* Story summary */}
      <div className="card p-4 bg-gray-50">
        <div className="flex items-start gap-2 mb-2">
          <span className={`badge ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
          {story.storyPoints && <span className="badge bg-gray-100 text-gray-600">{story.storyPoints} pts</span>}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{story.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          As a <em>{story.asA}</em>, I want to {story.iWantTo}, so that {story.soThat}.
        </p>
      </div>

      {/* Score strip + Fix All */}
      <div className="flex gap-3 items-stretch">
        <div className="card p-3 text-center flex-1">
          <p className="text-2xl font-bold text-brand-600 transition-all duration-700">{overallScore}%</p>
          <p className="text-xs text-gray-400 mt-0.5">INVEST Score</p>
        </div>
        <div className="card p-3 text-center flex-1">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">{adheringCount}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Adhered</p>
        </div>
        <div className="card p-3 text-center flex-1">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4 text-orange-400" />
            <p className="text-2xl font-bold text-orange-500">{keys.length - adheringCount}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Need Work</p>
        </div>

        {pendingFixes.length > 1 && (
          <button
            onClick={fixAll}
            disabled={fixAllLoading}
            className="btn-primary flex flex-col items-center justify-center gap-1 px-4 rounded-xl text-xs font-semibold min-w-[88px]"
          >
            {fixAllLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Wand2 className="w-4 h-4" />}
            <span>{fixAllLoading ? 'Fixing…' : `Fix All (${pendingFixes.length})`}</span>
          </button>
        )}
      </div>

      {/* INVEST table */}
      <div className="card overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">INVEST Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2 w-40">Principle</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2 w-32">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2 w-24">Score</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2">Feedback & Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <INVESTRow
                  key={key}
                  principleKey={key}
                  item={validation[key]}
                  fix={MOCK_INVEST_FIXES[key]}
                  accepted={acceptedKeys.has(key)}
                  settings={settings}
                  story={story}
                  onAcceptFix={(patch, newStory) => acceptFix(key, patch, newStory)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => onViewStory(story.id)} className="btn-primary flex items-center gap-2">
          View Full User Story
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface Props {
  storyId: string
  stories: Story[]
  settings: APISettings
  onViewStory: (storyId: string) => void
  onAddStory?: (epicId: string, story: Story) => void
}

export default function StoryValidation({ storyId, stories, settings, onViewStory, onAddStory }: Props) {
  const allStories = stories.length > 0 ? stories : MOCK_STORY_LIST
  const initial = allStories.find(s => s.id === storyId) || allStories[0]
  const [selectedStory, setSelectedStory] = useState<Story>(initial)
  const [storyVersions, setStoryVersions] = useState<Record<string, Story>>({})
  const [localStories, setLocalStories] = useState<Story[]>(allStories)

  const handleAddStory = (partial: Omit<Story, 'id'>) => {
    const newStory: Story = { ...partial, id: `story-split-${Date.now()}` }
    setLocalStories(prev => [...prev, newStory])
    onAddStory?.(partial.epicId, newStory)
  }

  const getStory = (s: Story) => storyVersions[s.id] || s

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col py-6 px-4 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Story Validation</h1>
          <p className="text-xs text-gray-500">Select a story · validate against INVEST · let AI fix issues</p>
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left — story list */}
        <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">
            {localStories.length} {localStories.length === 1 ? 'Story' : 'Stories'}
          </p>
          {localStories.map(s => {
            const story = getStory(s)
            const isSelected = s.id === selectedStory.id
            const v = story.investValidation || MOCK_INVEST_VALIDATION
            const keys = Object.keys(INVEST_META) as INVESTKey[]
            const score = Math.round(keys.reduce((sum, k) => sum + v[k].score, 0) / keys.length)
            const issues = keys.filter(k => !v[k].adheres).length

            return (
              <button
                key={s.id}
                onClick={() => setSelectedStory(s)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                  isSelected ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-brand-600' : 'bg-gray-100'}`}>
                  <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-brand-800' : 'text-gray-700'}`}>
                    {story.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                      {score}%
                    </span>
                    {issues > 0 && (
                      <span className="text-xs text-orange-500 bg-orange-50 border border-orange-100 rounded-full px-1.5 py-0.5">
                        {issues} issue{issues > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`badge text-xs ml-auto ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-2 ${isSelected ? 'text-brand-400' : 'text-gray-300'}`} />
              </button>
            )
          })}
        </div>

        {/* Right — validation detail */}
        <div className="flex-1 overflow-y-auto">
          <ValidationDetail
            key={selectedStory.id}
            story={getStory(selectedStory)}
            settings={settings}
            onStoryChange={updated => setStoryVersions(prev => ({ ...prev, [selectedStory.id]: updated }))}
            onAddStory={handleAddStory}
            onViewStory={onViewStory}
          />
        </div>
      </div>
    </div>
  )
}
