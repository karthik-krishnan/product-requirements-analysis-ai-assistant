import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  BookMarked, Send, SkipForward, Sparkles,
  CheckCircle, AlertCircle, Loader2, ShieldCheck, Tag, RefreshCw,
  MessageSquare, FileText, X, Copy, Download, Check as CheckIcon, Upload, Edit3, Save,
} from 'lucide-react'
import type { APISettings, ContextCapture, Epic, Story, ClarifyingQuestion, INVESTValidation } from '../types'
import { ValidationSection } from './StoryValidation'
import { storyToMarkdown, copyToClipboard, exportStoriesToExcel } from '../utils/export'
import JiraPushModal from './JiraPushModal'
import { getQuestionCount } from '../utils/assistanceLevels'
import { callLLM, isLiveMode } from '../services/llm/client'
import { buildClarifyingQuestionsPrompt, parseClarifyingQuestions } from '../prompts/clarifyingQuestions'
import { buildGenerateStoriesPrompt, parseStories } from '../prompts/generateStories'

interface Props {
  epicId: string
  epics: Epic[]
  settings: APISettings
  context: ContextCapture
  storyValidations: Record<string, INVESTValidation>
  storyAcceptedFixes: Record<string, string[]>
  onSelectEpic: (epicId: string | null) => void
  onStoriesGenerated: (epicId: string, stories: Story[]) => void
  onStoryValidated: (storyId: string, v: INVESTValidation) => void
  onFixAccepted: (storyId: string, key: string) => void
  onAddStory?: (epicId: string, story: Story) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-green-100 text-green-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Security & Access': 'bg-purple-50 border-purple-200',
  'Core Product':      'bg-blue-50 border-blue-200',
  'Commerce':          'bg-orange-50 border-orange-200',
  'Operations':        'bg-cyan-50 border-cyan-200',
  'Customer Experience': 'bg-pink-50 border-pink-200',
  'Engagement':        'bg-yellow-50 border-yellow-200',
}

// ─── EpicHeader ───────────────────────────────────────────────────────────────

function EpicHeader({ epic, isLive }: { epic: Epic; isLive: boolean }) {
  const catClass = CATEGORY_COLORS[epic.category] || 'bg-gray-50 border-gray-200'
  return (
    <div className={`card p-5 border ${catClass}`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <BookMarked className="w-5 h-5 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${PRIORITY_COLORS[epic.priority]}`}>{epic.priority} Priority</span>
            <span className="text-xs text-gray-500 font-medium">{epic.category}</span>
            {isLive && (
              <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />Live AI
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1.5">{epic.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{epic.description}</p>
          {epic.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {epic.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DiscoveryChat ────────────────────────────────────────────────────────────

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; options?: string[]; selectedOption?: string }

function DiscoveryChat({ epic, settings, context, onComplete, onDismiss }: {
  epic: Epic
  settings: APISettings
  context: ContextCapture
  onComplete: (questions: ClarifyingQuestion[]) => void
  onDismiss: () => void
}) {
  const [messages, setMessages]             = useState<ChatMsg[]>([])
  const [userInput, setUserInput]           = useState('')
  const [isTyping, setIsTyping]             = useState(false)
  const [llmLoading, setLlmLoading]         = useState(false)
  const [currentQIdx, setCurrentQIdx]       = useState(0)
  const [answeredCount, setAnsweredCount]   = useState(0)
  const [answered, setAnswered]             = useState<ClarifyingQuestion[]>([])
  const questionsRef  = useRef<ClarifyingQuestion[]>([])
  const bottomRef     = useRef<HTMLDivElement>(null)
  const startedRef    = useRef(false)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    startDiscovery()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMsg = (msg: Omit<ChatMsg, 'id'>) =>
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2) }])

  const simulateTyping = (cb: () => void, delay = 800) => {
    setIsTyping(true)
    setTimeout(() => { setIsTyping(false); cb() }, delay)
  }

  const startDiscovery = async () => {
    const questionCount = getQuestionCount(settings.assistanceLevel)
    setLlmLoading(true)
    addMsg({ role: 'assistant', content: `Let me ask a few focused questions to help define precise stories for **"${epic.title}"**…` })
    try {
      const raw = await callLLM(
        buildClarifyingQuestionsPrompt(`Epic: ${epic.title}\n${epic.description}`, context, questionCount),
        settings,
        [],
        'epic-clarifying-questions',
      )
      const qs = parseClarifyingQuestions(raw)
      questionsRef.current = qs.slice(0, questionCount)
      setLlmLoading(false)
      simulateTyping(() => addMsg({ role: 'assistant', content: qs[0].question, options: qs[0].options }), 300)
    } catch (err) {
      setLlmLoading(false)
      addMsg({ role: 'assistant', content: `Sorry, I couldn't connect to the AI. Check your API key in Settings, then try again.` })
    }
  }

  const advance = (answer: string) => {
    const qs = questionsRef.current
    const q  = qs[currentQIdx]
    const updatedAnswered = [...answered, { ...q, answer }]
    setAnswered(updatedAnswered)
    setAnsweredCount(prev => prev + 1)
    const next = currentQIdx + 1
    if (next >= qs.length) {
      simulateTyping(() => {
        addMsg({ role: 'assistant', content: 'Great, I have everything I need. Generating stories now…' })
        onComplete(updatedAnswered)
      })
    } else {
      setCurrentQIdx(next)
      const nextQ = qs[next]
      simulateTyping(() => addMsg({ role: 'assistant', content: nextQ.question, options: nextQ.options }))
    }
  }

  const handleOptionSelect = (opt: string) => {
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, selectedOption: opt, options: [] } : m))
    addMsg({ role: 'user', content: opt })
    advance(opt)
  }

  const handleSend = () => {
    if (!userInput.trim()) return
    const text = userInput.trim()
    setUserInput('')
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, options: [] } : m))
    addMsg({ role: 'user', content: text })
    advance(text)
  }

  const qs = questionsRef.current
  const isDone = answered.length >= qs.length && qs.length > 0

  return (
    <div className="card overflow-hidden mt-4">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Story Discovery</span>
        <div className="flex items-center gap-3">
          {qs.length > 0 && (
            <div className="flex items-center gap-1.5">
              {qs.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < answeredCount ? 'bg-brand-500' : i === answeredCount ? 'bg-brand-300' : 'bg-gray-200'}`} />
              ))}
            </div>
          )}
          <button onClick={() => onComplete(answered)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <SkipForward className="w-3 h-3" />Skip
          </button>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-72">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${msg.role === 'assistant' ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {msg.role === 'assistant' ? 'AI' : 'Me'}
            </div>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-brand-50 border border-brand-100 rounded-tl-sm' : 'bg-gray-100 rounded-tr-sm'}`}>
                {msg.content}
              </div>
              {msg.options && msg.options.length > 0 && !msg.selectedOption && !isDone && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.options.map(opt => (
                    <button key={opt} onClick={() => handleOptionSelect(opt)}
                      className="text-xs border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-full px-2.5 py-1 transition-colors">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {msg.selectedOption && <span className="badge bg-brand-100 text-brand-600 text-xs">{msg.selectedOption}</span>}
            </div>
          </div>
        ))}
        {(isTyping || llmLoading) && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
            <div className="bg-brand-50 border border-brand-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!isDone && (
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <input
            type="text"
            className="input-field flex-1 text-xs"
            placeholder="Or type your own answer…"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={!userInput.trim()} className="btn-primary px-3 py-1.5">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── StoryContent (inline, no import dependency) ──────────────────────────────

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
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{ac}
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

// ─── StoryDiscussPanel ────────────────────────────────────────────────────────

function StoryDiscussPanel({ story }: { story: Story }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '0', role: 'assistant', content: `What would you like to discuss about "${story.title}"? I can help clarify scope, refine acceptance criteria, or explore edge cases.` },
  ])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  const MOCK_REPLIES = [
    `Good point. For the "${story.title}" story, I'd recommend also considering the edge case where the user has incomplete profile data — it could affect the acceptance criteria around data validation.`,
    `That's worth exploring. The scope boundary here is important: we should confirm with the team whether this scenario falls under this story or would be better tracked as a separate dependency.`,
    `Agreed. I'd suggest adding an explicit acceptance criterion that covers the error state — for example, what the user sees when the action fails. This keeps the story testable.`,
    `The assumption you raised is valid. I'd recommend documenting it explicitly in the story assumptions so the team is aligned before sprint planning.`,
  ]
  const replyIdx = useRef(0)

  const send = () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: MOCK_REPLIES[replyIdx.current % MOCK_REPLIES.length],
      }])
      replyIdx.current++
    }, 1200)
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Discuss Story</p>
      </div>
      <div className="p-3 flex flex-col gap-3 overflow-y-auto max-h-56">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === 'assistant' ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {msg.role === 'assistant' ? 'AI' : 'Me'}
            </div>
            <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] ${msg.role === 'assistant' ? 'bg-brand-50 border border-brand-100 rounded-tl-sm' : 'bg-gray-100 rounded-tr-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
            <div className="bg-brand-50 border border-brand-100 rounded-xl rounded-tl-sm px-3 py-2 flex gap-1 items-center">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-100 p-2 flex gap-2">
        <input
          type="text"
          className="input-field flex-1 text-xs"
          placeholder="Ask about scope, edge cases, or acceptance criteria…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send} disabled={!input.trim()} className="btn-primary px-2.5 py-1.5">
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── EditableList ─────────────────────────────────────────────────────────────

type ListField = 'acceptanceCriteria' | 'inScope' | 'outOfScope' | 'assumptions' | 'crossFunctionalNeeds'

function EditableList({ label, field, draft, setDraft, storyId }: {
  label: string
  field: ListField
  draft: Story
  setDraft: React.Dispatch<React.SetStateAction<Story>>
  storyId: string
}) {
  const items = draft[field] as string[]
  const fieldId = `${storyId}-${field}`
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs text-gray-400 pt-2 w-5 shrink-0">{i + 1}.</span>
            <textarea
              aria-label={`${label} item ${i + 1}`}
              rows={2}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              value={item}
              onChange={e => setDraft(d => ({ ...d, [field]: (d[field] as string[]).map((x, j) => j === i ? e.target.value : x) }))}
            />
            <button
              aria-label={`Remove ${label} item ${i + 1}`}
              onClick={() => setDraft(d => ({ ...d, [field]: (d[field] as string[]).filter((_, j) => j !== i) }))}
              className="text-gray-300 hover:text-red-400 pt-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          id={`${fieldId}-add`}
          aria-label={`Add ${label} item`}
          onClick={() => setDraft(d => ({ ...d, [field]: [...(d[field] as string[]), ''] }))}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          + Add {label === 'Acceptance Criteria' ? 'criterion' : 'item'}
        </button>
      </div>
    </div>
  )
}

// ─── StoryCard ────────────────────────────────────────────────────────────────

const INVEST_KEYS = ['independent','negotiable','valuable','estimable','small','testable'] as const

function investScore(validation: INVESTValidation, acceptedKeys: Set<string>) {
  return Math.round(INVEST_KEYS.reduce((sum, k) => {
    const base = validation[k].score
    return sum + (acceptedKeys.has(k) ? Math.min(base + 35, 95) : base)
  }, 0) / INVEST_KEYS.length)
}

function StoryCard({ story, index, validation, acceptedKeys, onView, onValidate }: {
  story: Story
  index: number
  validation: INVESTValidation | null
  acceptedKeys: Set<string>
  onView: () => void
  onValidate: () => void
}) {
  const score = validation ? investScore(validation, acceptedKeys) : null
  const issues = validation ? INVEST_KEYS.filter(k => !validation[k].adheres && !acceptedKeys.has(k)).length : 0

  const dotColor = score === null ? 'bg-gray-200'
    : score >= 80 ? 'bg-emerald-400'
    : score >= 60 ? 'bg-amber-400'
    : 'bg-red-400'
  const dotTitle = score === null ? 'Not yet validated'
    : `Quality Score: ${score}% · ${issues === 0 ? 'All clear' : `${issues} issue${issues > 1 ? 's' : ''}`}`

  return (
    <div
      className="relative card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onView}
    >
      <span
        className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`}
        title={dotTitle}
      />
      <div className="flex items-start gap-2">
        <span className={`badge ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
        {story.storyPoints != null && (
          <span className="badge bg-gray-100 text-gray-600">{story.storyPoints}pts</span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{story.title}</h3>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
        As a <span className="font-medium text-gray-700">{story.asA}</span>, {story.iWantTo}
      </p>

      {story.acceptanceCriteria.length > 0 && (
        <p className="text-xs text-gray-400 mt-auto">{story.acceptanceCriteria.length} acceptance criteria</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={e => { e.stopPropagation(); onValidate() }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand-600 border border-brand-200 bg-brand-50 rounded-lg py-1.5 hover:bg-brand-100 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {score === null ? 'Validate' : 'Re-validate'}
        </button>
      </div>
    </div>
  )
}

// ─── StoryDetailModal ─────────────────────────────────────────────────────────

type StoryTab = 'view' | 'edit' | 'discuss' | 'validate'

function CopyMarkdownButton({ story }: { story: Story }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    copyToClipboard(storyToMarkdown(story))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
    >
      {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy MD'}
    </button>
  )
}

function StoryDetailModal({ story, settings, validation, acceptedKeys, onValidated, onFixAccepted, onStoryChange, onAddStory, onClose, initialTab = 'view' }: {
  story: Story
  settings: APISettings
  validation: INVESTValidation | null
  acceptedKeys: Set<string>
  onValidated: (v: INVESTValidation) => void
  onFixAccepted: (key: string) => void
  onStoryChange: (s: Story) => void
  onAddStory: (s: Omit<Story, 'id'>) => void
  onClose: () => void
  initialTab?: StoryTab
}) {
  const [tab, setTab] = useState<StoryTab>(initialTab)
  const [draft, setDraft] = useState(story)
  const [showJira, setShowJira] = useState(false)

  useEffect(() => { setDraft(story) }, [story])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => { onStoryChange(draft) }

  const TABS: { id: StoryTab; label: string; icon: React.ElementType }[] = [
    { id: 'view',     label: 'View',     icon: FileText },
    { id: 'edit',     label: 'Edit',     icon: Edit3 },
    { id: 'discuss',  label: 'Discuss',  icon: MessageSquare },
    { id: 'validate', label: 'Validate', icon: ShieldCheck },
  ]

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`badge ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
              {story.storyPoints != null && (
                <span className="badge bg-gray-100 text-gray-600">{story.storyPoints} pts</span>
              )}
              {validation && (
                <span className={`text-xs font-bold ${investScore(validation, acceptedKeys) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  Quality Score {investScore(validation, acceptedKeys)}%
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{tab === 'edit' ? draft.title : story.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'view' && (
            <div className="px-5">
              <StoryContent story={story} />
            </div>
          )}

          {tab === 'edit' && (
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor={`modal-${story.id}-title`} className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
                <input
                  id={`modal-${story.id}-title`}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor={`modal-${story.id}-priority`} className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
                  <select
                    id={`modal-${story.id}-priority`}
                    className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    value={draft.priority}
                    onChange={e => setDraft(d => ({ ...d, priority: e.target.value as Story['priority'] }))}
                  >
                    {(['Critical','High','Medium','Low'] as const).map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <label htmlFor={`modal-${story.id}-points`} className="text-xs font-medium text-gray-500 uppercase tracking-wide">Points</label>
                  <input
                    id={`modal-${story.id}-points`}
                    type="number" min={1} max={13}
                    className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    value={draft.storyPoints ?? ''}
                    onChange={e => setDraft(d => ({ ...d, storyPoints: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Story sentence</p>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden text-sm">
                  {[
                    { label: 'As a',     field: 'asA'     as const, rows: 1 },
                    { label: 'I want to', field: 'iWantTo' as const, rows: 2 },
                    { label: 'so that',  field: 'soThat'  as const, rows: 2 },
                  ].map(({ label, field, rows }) => (
                    <div key={field} className="flex items-start gap-2 px-3 py-2">
                      <span className="text-gray-400 shrink-0 pt-0.5 w-16 text-right text-xs">{label}</span>
                      <textarea
                        aria-label={label}
                        rows={rows}
                        className="flex-1 resize-none focus:outline-none focus:ring-0 bg-transparent text-sm"
                        value={draft[field]}
                        onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <EditableList label="Acceptance Criteria"    field="acceptanceCriteria"    draft={draft} setDraft={setDraft} storyId={`modal-${story.id}`} />
              <EditableList label="In Scope"               field="inScope"               draft={draft} setDraft={setDraft} storyId={`modal-${story.id}`} />
              <EditableList label="Out of Scope"           field="outOfScope"            draft={draft} setDraft={setDraft} storyId={`modal-${story.id}`} />
              <EditableList label="Assumptions"            field="assumptions"           draft={draft} setDraft={setDraft} storyId={`modal-${story.id}`} />
              <EditableList label="Cross-Functional Needs" field="crossFunctionalNeeds"  draft={draft} setDraft={setDraft} storyId={`modal-${story.id}`} />
            </div>
          )}

          {tab === 'discuss' && (
            <div className="p-5">
              <StoryDiscussPanel story={story} />
            </div>
          )}

          {tab === 'validate' && (
            <div className="p-5">
              <ValidationSection
                key={`${story.id}-${settings.provider}`}
                story={story}
                settings={settings}
                validation={validation}
                acceptedKeys={acceptedKeys}
                onValidated={onValidated}
                onFixAccepted={onFixAccepted}
                onStoryChange={onStoryChange}
                onAddStory={onAddStory}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2">
            <CopyMarkdownButton story={tab === 'edit' ? draft : story} />
            <button
              onClick={() => setShowJira(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Push to Jira
            </button>
          </div>
          {tab === 'edit' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setDraft(story); setTab('view') }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Discard
              </button>
              <button
                onClick={() => { handleSave(); setTab('view') }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
              Close
            </button>
          )}
        </div>
      </div>

      {showJira && (
        <JiraPushModal
          items={[{ id: story.id, title: story.title, type: 'Story' }]}
          onClose={() => setShowJira(false)}
        />
      )}
    </div>,
    document.body,
  )
}

// ─── StoryBreakdown (main export) ─────────────────────────────────────────────

type Phase = 'input' | 'discovering' | 'generating' | 'done'

export default function StoryBreakdown({ epicId, epics, settings, context, storyValidations, storyAcceptedFixes, onSelectEpic, onStoriesGenerated, onStoryValidated, onFixAccepted, onAddStory }: Props) {
  const epic = epics.find(e => e.id === epicId) || epics[0]

  // Restore persisted stories from App state so navigation away/back keeps them
  const existingStories = epic?.stories || []
  const [phase, setPhase]   = useState<Phase>(existingStories.length > 0 ? 'done' : 'input')
  const [stories, setStories] = useState<Story[]>(existingStories)
  const [storyVersions, setStoryVersions] = useState<Record<string, Story>>({})
  const [localStories, setLocalStories]   = useState<Story[]>(existingStories)
  const [error, setError]   = useState<string | null>(null)
  const [showJira, setShowJira] = useState(false)

  const [visibleStoryIds, setVisibleStoryIds] = useState<Set<string>>(
    new Set(existingStories.map(s => s.id)),
  )
  const revealedStoriesRef = useRef<Set<string>>(new Set(existingStories.map(s => s.id)))
  const [selectedStory, setSelectedStory] = useState<{ story: Story; tab: StoryTab } | null>(null)
  const [activePriority, setActivePriority] = useState<string | null>(null)

  useEffect(() => {
    const toReveal = localStories.filter(s => !revealedStoriesRef.current.has(s.id))
    toReveal.forEach((s, i) => {
      setTimeout(() => {
        revealedStoriesRef.current.add(s.id)
        setVisibleStoryIds(prev => new Set([...prev, s.id]))
      }, i * 120)
    })
  }, [localStories])

  const getStory = (s: Story) => storyVersions[s.id] || s

  const handleAddStory = (partial: Omit<Story, 'id'>) => {
    const newStory: Story = { ...partial, id: `story-split-${Date.now()}` }
    setStories(prev => [...prev, newStory])
    setLocalStories(prev => [...prev, newStory])
    onAddStory?.(partial.epicId, newStory)
  }

  const generateStories = async (questions: ClarifyingQuestion[]) => {
    setPhase('generating')
    setError(null)
    try {
      const raw = await callLLM(
        buildGenerateStoriesPrompt(epic, context, questions),
        settings,
        [...context.domainFiles, ...context.techFiles],
        'generate-stories',
      )
      const generated = parseStories(raw, epic.id)
      setStories(generated)
      setLocalStories(generated)
      setPhase('done')
      onStoriesGenerated(epic.id, generated)
    } catch (err) {
      setError((err as Error).message)
      setPhase('input')
    }
  }

  return (
    <div className="py-6 px-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectEpic(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 hover:border-brand-300 transition-colors"
          >
            ← Epics
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Story Breakdown</h1>
            <p className="text-xs text-gray-500">Review the epic, then generate and refine user stories</p>
          </div>
        </div>
        {epics.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">Switch epic</span>
            <select
              value={epicId}
              onChange={e => onSelectEpic(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 max-w-[200px] truncate"
            >
              {epics.map(e => (
                <option key={e.id} value={e.id}>{e.title}{(e.stories?.length ?? 0) > 0 ? ` (${e.stories!.length})` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Epic */}
      <EpicHeader epic={epic} isLive={isLiveMode(settings)} />

      {/* Error banner */}
      {error && (
        <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in-up">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 mb-0.5">AI call failed</p>
            <p className="text-xs text-red-600 break-words">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0 text-xs">✕</button>
        </div>
      )}

      {/* Input phase: choose how to generate */}
      {phase === 'input' && (
        <div className="card p-6 mt-4 animate-fade-in-up">
          <p className="text-sm font-medium text-gray-700 mb-1">How would you like to generate stories?</p>
          <p className="text-xs text-gray-500 mb-5">
            Generate directly from the epic, or explore with a few targeted questions first for more precise output.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => generateStories([])}
              className="btn-secondary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Stories Now
            </button>
            {settings.assistanceLevel > 0 && (
              <button
                onClick={() => setPhase('discovering')}
                className="btn-ghost flex items-center gap-2 text-brand-600 border border-brand-200 hover:bg-brand-50"
              >
                <MessageSquare className="w-4 h-4" />
                Explore First
              </button>
            )}
          </div>
        </div>
      )}

      {/* Discovery chat phase */}
      {phase === 'discovering' && (
        <DiscoveryChat
          epic={epic}
          settings={settings}
          context={context}
          onComplete={generateStories}
          onDismiss={() => setPhase('input')}
        />
      )}

      {/* Generating spinner */}
      {phase === 'generating' && (
        <div className="card p-10 mt-4 flex flex-col items-center gap-3 animate-fade-in-up">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-sm text-gray-500">AI is generating stories…</p>
        </div>
      )}

      {/* Done: story card grid */}
      {phase === 'done' && (() => {
        const priorities = ['High', 'Medium', 'Low', 'Critical'].filter(p =>
          localStories.some(s => getStory(s).priority === p),
        )
        const displayStories = localStories
          .filter(s => visibleStoryIds.has(s.id))
          .filter(s => activePriority === null || getStory(s).priority === activePriority)

        return (
          <div className="mt-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-semibold text-gray-700">
                  {stories.length} {stories.length === 1 ? 'Story' : 'Stories'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportStoriesToExcel(localStories.map(s => getStory(s)), epic?.title)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
                <button
                  onClick={() => setShowJira(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Push to Jira
                </button>
                <button
                  onClick={() => { setStories([]); setPhase('input') }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              </div>
            </div>

            {/* Priority filter tabs */}
            {priorities.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setActivePriority(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activePriority === null
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All <span className="ml-1 opacity-70">{stories.length}</span>
                </button>
                {priorities.map(p => {
                  const count = localStories.filter(s => getStory(s).priority === p).length
                  return (
                    <button
                      key={p}
                      onClick={() => setActivePriority(activePriority === p ? null : p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        activePriority === p
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p} <span className="ml-1 opacity-70">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayStories.map((s, i) => (
                <StoryCard
                  key={s.id}
                  story={getStory(s)}
                  index={i}
                  validation={storyValidations[s.id] ?? null}
                  acceptedKeys={new Set(storyAcceptedFixes[s.id] ?? [])}
                  onView={() => setSelectedStory({ story: getStory(s), tab: 'view' })}
                  onValidate={() => setSelectedStory({ story: getStory(s), tab: 'validate' })}
                />
              ))}
            </div>
          </div>
        )
      })()}

      {showJira && (
        <JiraPushModal
          items={localStories.map(s => ({ id: s.id, title: getStory(s).title, type: 'Story' as const }))}
          onClose={() => setShowJira(false)}
        />
      )}

      {selectedStory && (
        <StoryDetailModal
          story={selectedStory.story}
          settings={settings}
          initialTab={selectedStory.tab}
          validation={storyValidations[selectedStory.story.id] ?? null}
          acceptedKeys={new Set(storyAcceptedFixes[selectedStory.story.id] ?? [])}
          onValidated={v => onStoryValidated(selectedStory.story.id, v)}
          onFixAccepted={key => onFixAccepted(selectedStory.story.id, key)}
          onStoryChange={updated => {
            setStoryVersions(prev => ({ ...prev, [selectedStory.story.id]: updated }))
            setSelectedStory({ story: updated, tab: selectedStory.tab })
          }}
          onAddStory={handleAddStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </div>
  )
}
