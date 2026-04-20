import { useState, useEffect } from 'react'
import {
  ShieldCheck, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Lightbulb, ArrowRight, FileText, Sparkles, Check, X,
  GitBranch, Loader2, Wand2, Zap
} from 'lucide-react'
import type { APISettings, Story, INVESTValidation, FixProposal, FieldDiff } from '../types'
import { MOCK_INVEST_VALIDATION, MOCK_STORY_LIST, MOCK_INVEST_FIXES } from '../data/mockData'
import { callLLM, hasValidKey } from '../services/llm/client'
import { buildValidateINVESTPrompt, parseINVESTValidation } from '../prompts/validateINVEST'
import { buildFixINVESTPrompt, parseFixProposal } from '../prompts/fixINVEST'

const INVEST_META = {
  independent: { label: 'Independent', letter: 'I', color: 'text-blue-600',    bg: 'bg-blue-50',    description: 'Can be developed and released independently of other stories' },
  negotiable:  { label: 'Negotiable',  letter: 'N', color: 'text-violet-600',  bg: 'bg-violet-50',  description: 'Details are open to discussion, not fixed contracts' },
  valuable:    { label: 'Valuable',    letter: 'V', color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Delivers clear value to the customer or business' },
  estimable:   { label: 'Estimable',   letter: 'E', color: 'text-amber-600',   bg: 'bg-amber-50',   description: 'The team can estimate the effort required' },
  small:       { label: 'Small',       letter: 'S', color: 'text-orange-600',  bg: 'bg-orange-50',  description: 'Fits within a single sprint or iteration' },
  testable:    { label: 'Testable',    letter: 'T', color: 'text-pink-600',    bg: 'bg-pink-50',    description: 'Has clear, verifiable acceptance criteria' },
} as const

type INVESTKey = keyof typeof INVEST_META
const INVEST_KEYS = Object.keys(INVEST_META) as INVESTKey[]

const PRIORITY_COLORS: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-green-100 text-green-700',
}

// ─── DiffBlock ────────────────────────────────────────────────────────────────

function DiffBlock({ diff }: { diff: FieldDiff }) {
  const isArray = Array.isArray(diff.before)
  if (isArray) {
    const beforeArr = diff.before as string[]
    const afterArr  = diff.after  as string[]
    const beforeSet = new Set(beforeArr)
    const afterSet  = new Set(afterArr)
    const removed   = beforeArr.filter(x => !afterSet.has(x))
    const added     = afterArr.filter(x => !beforeSet.has(x))
    const unchanged = beforeArr.filter(x => afterSet.has(x))
    return (
      <div className="mb-3 last:mb-0">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">{diff.label}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
            <p className="text-xs text-red-400 font-medium mb-1">Before</p>
            {unchanged.map((item, i) => <p key={`u${i}`} className="text-xs text-gray-400 leading-relaxed">• {item}</p>)}
            {removed.map((item, i)    => <p key={`r${i}`} className="text-xs text-red-600 line-through font-medium leading-relaxed">• {item}</p>)}
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
            <p className="text-xs text-emerald-500 font-medium mb-1">After</p>
            {unchanged.map((item, i) => <p key={`u${i}`} className="text-xs text-gray-400 leading-relaxed">• {item}</p>)}
            {added.map((item, i)     => <p key={`a${i}`} className="text-xs text-emerald-700 font-medium leading-relaxed">• {item}</p>)}
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

// ─── INVESTRow ────────────────────────────────────────────────────────────────

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
  const [fixOpen, setFixOpen]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [liveFix, setLiveFix]   = useState<FixProposal | undefined>(initialFix)
  const [fixError, setFixError] = useState<string | null>(null)
  const meta = INVEST_META[principleKey]
  const fix  = liveFix

  const handleFixClick = async () => {
    if (fixOpen) { setFixOpen(false); return }
    setLoading(true)
    setFixError(null)
    if (hasValidKey(settings)) {
      try {
        const raw = await callLLM(buildFixINVESTPrompt(story, principleKey, meta.label, item), settings)
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

  const displayScore  = accepted ? Math.min(item.score + 35, 95) : item.score
  const displayAdheres = accepted || item.adheres

  return (
    <>
      <tr className={`border-b border-gray-100 last:border-0 transition-colors ${accepted ? 'bg-emerald-50/30' : ''}`}>
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
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${displayScore >= 80 ? 'bg-emerald-400' : displayScore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${displayScore}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">{displayScore}%</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <p className="text-xs text-gray-600 line-clamp-1">{item.feedback}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {item.suggestions.length > 0 && (
              <button
                onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
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

      {fixOpen && fix && !accepted && (
        <tr className="border-b border-gray-100">
          <td colSpan={4} className="px-4 pb-4 pt-0">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 animate-fade-in-up">
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
              <div className="mb-3">
                {fix.diffs.map((diff, i) => <DiffBlock key={i} diff={diff} />)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onAcceptFix(fix.patch, fix.splitNewStory ?? fix.spikeNewStory); setFixOpen(false) }}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
                >
                  <Check className="w-3.5 h-3.5" />Accept & Apply
                </button>
                <button
                  onClick={() => setFixOpen(false)}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
                >
                  <X className="w-3.5 h-3.5" />Dismiss
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── StoryContent ─────────────────────────────────────────────────────────────

function StoryContent({ story }: { story: Story }) {
  return (
    <div className="space-y-5 py-4">
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          As a <strong className="text-brand-700">{story.asA}</strong>, I want to{' '}
          <strong className="text-brand-700">{story.iWantTo}</strong>, so that{' '}
          <strong className="text-brand-700">{story.soThat}</strong>.
        </p>
      </div>

      {story.acceptanceCriteria.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Acceptance Criteria</h4>
          <ul className="space-y-1.5">
            {story.acceptanceCriteria.map((ac, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700 leading-relaxed">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {ac}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(story.inScope.length > 0 || story.outOfScope.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">In Scope</h4>
            <ul className="space-y-1">
              {story.inScope.map((item, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                  <span className="text-emerald-500 shrink-0 font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Out of Scope</h4>
            <ul className="space-y-1">
              {story.outOfScope.map((item, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                  <span className="text-red-400 shrink-0 font-bold">✗</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {story.assumptions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assumptions</h4>
          <ul className="space-y-1">
            {story.assumptions.map((a, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                <span className="text-amber-400 shrink-0">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {story.crossFunctionalNeeds.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cross-functional Needs</h4>
          <ul className="space-y-1">
            {story.crossFunctionalNeeds.map((n, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-gray-600">
                <span className="text-brand-400 shrink-0">→</span>{n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── ValidationSection ────────────────────────────────────────────────────────

function ValidationSection({
  story, settings, validation, acceptedKeys,
  onValidated, onFixAccepted, onStoryChange, onAddStory, onViewStory,
}: {
  story: Story
  settings: APISettings
  validation: INVESTValidation | null
  acceptedKeys: Set<string>
  onValidated: (v: INVESTValidation) => void
  onFixAccepted: (key: string) => void
  onStoryChange: (s: Story) => void
  onAddStory: (s: Omit<Story, 'id'>) => void
  onViewStory: (id: string) => void
}) {
  const [validating, setValidating]     = useState(false)
  const [validateError, setValidateError] = useState<string | null>(null)
  const [fixAllLoading, setFixAllLoading] = useState(false)

  const runValidation = async () => {
    setValidating(true)
    setValidateError(null)
    try {
      const raw = await callLLM(buildValidateINVESTPrompt(story), settings)
      onValidated(parseINVESTValidation(raw))
    } catch (err) {
      setValidateError((err as Error).message)
    } finally {
      setValidating(false)
    }
  }

  // Auto-validate on first mount if not yet validated and key is present
  useEffect(() => {
    if (validation === null && hasValidKey(settings)) {
      runValidation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayValidation = validation ?? MOCK_INVEST_VALIDATION
  const isReal = validation !== null

  const failingKeys   = INVEST_KEYS.filter(k => !displayValidation[k].adheres && MOCK_INVEST_FIXES[k])
  const pendingFixes  = failingKeys.filter(k => !acceptedKeys.has(k))
  const adheringCount = INVEST_KEYS.filter(k => displayValidation[k].adheres || acceptedKeys.has(k)).length
  const overallScore  = Math.round(
    INVEST_KEYS.reduce((sum, k) => {
      const base = displayValidation[k].score
      return sum + (acceptedKeys.has(k) ? Math.min(base + 35, 95) : base)
    }, 0) / INVEST_KEYS.length
  )

  const acceptFix = (key: string, patch: Partial<Story>, newStory?: Omit<Story, 'id'>) => {
    onStoryChange({ ...story, ...patch })
    if (newStory) onAddStory(newStory)
    onFixAccepted(key)
  }

  const fixAll = () => {
    setFixAllLoading(true)
    setTimeout(() => {
      const merged = pendingFixes.reduce((acc, k) => {
        const fix = MOCK_INVEST_FIXES[k]
        return fix ? { ...acc, ...fix.patch } : acc
      }, {} as Partial<Story>)
      onStoryChange({ ...story, ...merged })
      pendingFixes.forEach(k => onFixAccepted(k))
      setFixAllLoading(false)
    }, 1500)
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
      {/* Status bar */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        validating          ? 'bg-brand-50 border-brand-200'
        : isReal            ? 'bg-emerald-50 border-emerald-200'
        : hasValidKey(settings) ? 'bg-brand-50 border-brand-200'
        :                     'bg-gray-50 border-gray-200'
      }`}>
        {validating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500 shrink-0" />
            <p className="text-xs text-brand-600 flex-1">Validating against INVEST principles with AI…</p>
          </>
        ) : isReal ? (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 flex-1">Validated by AI · {settings.provider}</p>
            <button onClick={runValidation} className="text-xs text-emerald-600 hover:text-emerald-800 underline shrink-0">
              Re-validate
            </button>
          </>
        ) : hasValidKey(settings) ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400 shrink-0" />
            <p className="text-xs text-brand-600 flex-1">Connecting to AI…</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <p className="text-xs text-gray-500 flex-1">
              Demo mode — showing sample data. Add an API key in <strong>Settings</strong> to validate with AI.
            </p>
          </>
        )}
      </div>

      {validateError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 flex-1 break-words">{validateError}</p>
          <button onClick={() => setValidateError(null)} className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* Score strip */}
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
            <p className="text-2xl font-bold text-orange-500">{INVEST_KEYS.length - adheringCount}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Need Work</p>
        </div>
        {pendingFixes.length > 1 && (
          <button
            onClick={fixAll}
            disabled={fixAllLoading}
            className="btn-primary flex flex-col items-center justify-center gap-1 px-4 rounded-xl text-xs font-semibold min-w-[88px]"
          >
            {fixAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
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
              {INVEST_KEYS.map(key => (
                <INVESTRow
                  key={key}
                  principleKey={key}
                  item={displayValidation[key]}
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

// ─── StoryAccordionItem ───────────────────────────────────────────────────────

function StoryAccordionItem({
  story, defaultOpen, settings, validation, acceptedKeys,
  onValidated, onFixAccepted, onStoryChange, onAddStory, onViewStory,
}: {
  story: Story
  defaultOpen: boolean
  settings: APISettings
  validation: INVESTValidation | null
  acceptedKeys: Set<string>
  onValidated: (v: INVESTValidation) => void
  onFixAccepted: (key: string) => void
  onStoryChange: (s: Story) => void
  onAddStory: (s: Omit<Story, 'id'>) => void
  onViewStory: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(defaultOpen)

  const score = validation
    ? Math.round(INVEST_KEYS.reduce((sum, k) => {
        const base = validation[k].score
        return sum + (acceptedKeys.has(k) ? Math.min(base + 35, 95) : base)
      }, 0) / INVEST_KEYS.length)
    : null
  const issues = validation
    ? INVEST_KEYS.filter(k => !validation[k].adheres && !acceptedKeys.has(k)).length
    : null

  return (
    <div className={`card overflow-hidden transition-all ${expanded ? 'border-brand-200 shadow-sm' : ''}`}>
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${expanded ? 'bg-brand-600' : 'bg-gray-100'}`}>
          <FileText className={`w-3.5 h-3.5 ${expanded ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{story.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`badge ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
            {story.storyPoints && (
              <span className="badge bg-gray-100 text-gray-600">{story.storyPoints}pts</span>
            )}
            {score !== null ? (
              <>
                <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                  {score}%
                </span>
                {issues !== null && issues > 0 && (
                  <span className="text-xs text-orange-500 bg-orange-50 border border-orange-100 rounded-full px-1.5 py-0.5">
                    {issues} issue{issues > 1 ? 's' : ''}
                  </span>
                )}
                {issues === 0 && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
                    All clear
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400 italic">not validated</span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-5 border-t border-gray-100 animate-fade-in-up">
          <StoryContent story={story} />
          <ValidationSection
            key={`${story.id}-${hasValidKey(settings)}`}
            story={story}
            settings={settings}
            validation={validation}
            acceptedKeys={acceptedKeys}
            onValidated={onValidated}
            onFixAccepted={onFixAccepted}
            onStoryChange={onStoryChange}
            onAddStory={onAddStory}
            onViewStory={onViewStory}
          />
        </div>
      )}
    </div>
  )
}

// ─── StoryValidation (main export) ───────────────────────────────────────────

interface Props {
  storyId: string
  stories: Story[]
  settings: APISettings
  storyValidations: Record<string, INVESTValidation>
  storyAcceptedFixes: Record<string, string[]>
  onStoryValidated: (storyId: string, v: INVESTValidation) => void
  onFixAccepted: (storyId: string, key: string) => void
  onViewStory: (storyId: string) => void
  onAddStory?: (epicId: string, story: Story) => void
}

export default function StoryValidation({
  storyId, stories, settings,
  storyValidations, storyAcceptedFixes,
  onStoryValidated, onFixAccepted,
  onViewStory, onAddStory,
}: Props) {
  const allStories = stories.length > 0 ? stories : MOCK_STORY_LIST
  const [storyVersions, setStoryVersions] = useState<Record<string, Story>>({})
  const [localStories, setLocalStories]   = useState<Story[]>(allStories)

  const getStory = (s: Story) => storyVersions[s.id] || s

  const handleAddStory = (partial: Omit<Story, 'id'>) => {
    const newStory: Story = { ...partial, id: `story-split-${Date.now()}` }
    setLocalStories(prev => [...prev, newStory])
    onAddStory?.(partial.epicId, newStory)
  }

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Story Validation</h1>
          <p className="text-xs text-gray-500">
            Expand a story to read it in full and validate against INVEST principles
          </p>
        </div>
        {hasValidKey(settings) && (
          <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">Live AI · {settings.provider}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {localStories.map(s => (
          <StoryAccordionItem
            key={s.id}
            story={getStory(s)}
            defaultOpen={s.id === storyId}
            settings={settings}
            validation={storyValidations[s.id] ?? null}
            acceptedKeys={new Set(storyAcceptedFixes[s.id] ?? [])}
            onValidated={v => onStoryValidated(s.id, v)}
            onFixAccepted={key => onFixAccepted(s.id, key)}
            onStoryChange={updated => setStoryVersions(prev => ({ ...prev, [s.id]: updated }))}
            onAddStory={handleAddStory}
            onViewStory={onViewStory}
          />
        ))}
      </div>
    </div>
  )
}
