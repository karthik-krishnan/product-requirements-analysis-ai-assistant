import { useState, useRef, useEffect } from 'react'
import {
  BookMarked, ChevronRight, Send, SkipForward, Sparkles,
  CheckCircle, ArrowRight, MessageSquare, AlertCircle, Loader2,
} from 'lucide-react'
import type { APISettings, ContextCapture, Epic, Story, ChatMessage, ClarifyingQuestion } from '../types'
import { MOCK_EPIC_QUESTIONS, MOCK_STORY_LIST } from '../data/mockData'
import { getQuestionCount } from '../utils/assistanceLevels'
import { callLLM, hasValidKey } from '../services/llm/client'
import { buildClarifyingQuestionsPrompt, parseClarifyingQuestions } from '../prompts/clarifyingQuestions'
import { buildGenerateStoriesPrompt, parseStories } from '../prompts/generateStories'

interface Props {
  epicId: string
  epics: Epic[]
  settings: APISettings
  context: ContextCapture
  onStoriesGenerated: (epicId: string, stories: Story[]) => void
  onViewStory: (storyId: string) => void
}

type Phase = 'input' | 'clarifying' | 'done'

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

export default function StoryBreakdown({ epicId, epics, settings, context, onStoriesGenerated, onViewStory }: Props) {
  const epic = epics.find(e => e.id === epicId) || epics[0]

  const [phase, setPhase] = useState<Phase>('input')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState<ClarifyingQuestion[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [llmLoading, setLlmLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const questionsRef = useRef<ClarifyingQuestion[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const useLLM = hasValidKey(settings)
  const questionCount = useRef(getQuestionCount(settings.assistanceLevel)).current

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addMsg = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }])
  }

  const simulateTyping = (cb: () => void, delay = 1000) => {
    setIsTyping(true)
    setTimeout(() => { setIsTyping(false); cb() }, delay)
  }

  const startDiscovery = async () => {
    setPhase('clarifying')
    setError(null)

    if (useLLM && settings.assistanceLevel > 0) {
      setLlmLoading(true)
      addMsg({
        role: 'assistant',
        content: `Let's dig into the **"${epic.title}"** epic. Let me generate ${questionCount} targeted question${questionCount > 1 ? 's' : ''} to help define precise stories…`,
      })
      try {
        const epicContext = `Epic: ${epic.title}\n${epic.description}`
        const raw = await callLLM(
          buildClarifyingQuestionsPrompt(epicContext, context, questionCount),
          settings,
        )
        const qs = parseClarifyingQuestions(raw)
        questionsRef.current = qs
        setLlmLoading(false)
        simulateTyping(() => {
          addMsg({
            role: 'assistant',
            content: `**Question 1 of ${qs.length}:** ${qs[0].question}`,
            options: qs[0].options,
          })
        }, 400)
      } catch (err) {
        setLlmLoading(false)
        setError((err as Error).message)
        questionsRef.current = MOCK_EPIC_QUESTIONS.slice(0, questionCount)
        simulateTyping(() => {
          const q = questionsRef.current[0]
          addMsg({
            role: 'assistant',
            content: `**Question 1 of ${questionsRef.current.length}:** ${q.question}`,
            options: q.options,
          })
        }, 400)
      }
    } else {
      questionsRef.current = MOCK_EPIC_QUESTIONS.slice(0, questionCount)
      const qs = questionsRef.current
      addMsg({
        role: 'assistant',
        content: `Let's dig into the **"${epic.title}"** epic. I have ${qs.length} focused question${qs.length > 1 ? 's' : ''} to help me generate precise, well-defined stories.`,
      })
      setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          addMsg({
            role: 'assistant',
            content: `**Question 1 of ${qs.length}:** ${qs[0].question}`,
            options: qs[0].options,
          })
        }, 1000)
      }, 400)
    }
  }

  const advance = async (answer: string) => {
    const qs = questionsRef.current
    const q = qs[currentQIndex]
    const updatedQs = [...answeredQuestions, { ...q, answer }]
    setAnsweredQuestions(updatedQs)
    setAnsweredCount(prev => prev + 1)
    const next = currentQIndex + 1

    if (next >= qs.length) {
      simulateTyping(() => {
        addMsg({ role: 'assistant', content: `Excellent! I have everything I need. Generating stories for this epic now…` })
        generateStories(updatedQs)
      })
    } else {
      setCurrentQIndex(next)
      simulateTyping(() => {
        const nextQ = qs[next]
        addMsg({
          role: 'assistant',
          content: `**Question ${next + 1} of ${qs.length}:** ${nextQ.question}`,
          options: nextQ.options,
        })
      })
    }
  }

  const generateStories = async (questions: ClarifyingQuestion[]) => {
    setLlmLoading(true)
    setError(null)
    try {
      if (useLLM) {
        const raw = await callLLM(buildGenerateStoriesPrompt(epic, context, questions), settings)
        const generated = parseStories(raw, epic.id)
        setStories(generated)
        setPhase('done')
        onStoriesGenerated(epic.id, generated)
      } else {
        await new Promise(r => setTimeout(r, 1500))
        const generated = MOCK_STORY_LIST.map(s => ({ ...s, epicId: epic.id }))
        setStories(generated)
        setPhase('done')
        onStoriesGenerated(epic.id, generated)
      }
    } catch (err) {
      setError((err as Error).message)
      const fallback = MOCK_STORY_LIST.map(s => ({ ...s, epicId: epic.id }))
      setStories(fallback)
      setPhase('done')
      onStoriesGenerated(epic.id, fallback)
    } finally {
      setLlmLoading(false)
    }
  }

  const handleOptionSelect = (option: string) => {
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, selectedOption: option, options: [] } : m))
    addMsg({ role: 'user', content: option })
    advance(option)
  }

  const handleSend = () => {
    if (!userInput.trim()) return
    const text = userInput.trim()
    setUserInput('')
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, options: [] } : m))
    addMsg({ role: 'user', content: text })
    advance(text)
  }

  const handleSkip = () => generateStories([])

  const questions = questionsRef.current

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-in-up">
      {/* Epic context bar */}
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 flex items-center gap-3">
        <BookMarked className="w-4 h-4 text-brand-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-brand-500 font-medium mb-0.5">Breaking down Epic</p>
          <p className="text-sm font-semibold text-brand-800 truncate">{epic.title}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {useLLM && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Live AI</span>
          )}
          <span className="text-xs text-brand-400">{epic.category}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in-up">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 mb-0.5">AI call failed — using mock data</p>
            <p className="text-xs text-red-600 break-words">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0 text-xs">✕</button>
        </div>
      )}

      {/* Input phase */}
      {phase === 'input' && (
        <div className="card p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-gray-700">How would you like to proceed?</span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            You can explore the epic further with a few targeted questions before generating stories, or go straight to generating them now.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={handleSkip} disabled={llmLoading} className="btn-secondary flex items-center gap-2">
              {llmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
              {llmLoading ? 'Generating…' : 'Generate Stories Directly'}
            </button>
            {settings.assistanceLevel > 0 && (
              <button onClick={startDiscovery} className="btn-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Explore & Brainstorm
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${phase === 'input' && stories.length === 0 ? 'hidden' : ''}`}>
        {/* Left: Chat */}
        <div className="card overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Story Discovery</span>
            {phase === 'clarifying' && questions.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < answeredCount ? 'bg-brand-500' : i === answeredCount ? 'bg-brand-300' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <SkipForward className="w-3 h-3" />
                  Skip
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto min-h-[300px] max-h-[380px]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${msg.role === 'assistant' ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {msg.role === 'assistant' ? 'AI' : 'Me'}
                </div>
                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-brand-50 border border-brand-100 rounded-tl-sm' : 'bg-gray-100 rounded-tr-sm'}`}>
                    {msg.content}
                  </div>
                  {msg.options && msg.options.length > 0 && !msg.selectedOption && phase === 'clarifying' && (
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

          {phase === 'clarifying' && (
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

        {/* Right: Generated Stories */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-semibold text-gray-700">Generated Stories</span>
            {stories.length > 0 && <span className="badge bg-brand-100 text-brand-600">{stories.length}</span>}
          </div>

          {stories.length === 0 ? (
            <div className="card p-8 flex flex-col items-center justify-center text-center gap-3 border-dashed">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">
                {llmLoading ? 'AI is generating stories…' : 'Stories will appear here after generation is complete'}
              </p>
              {llmLoading && <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {stories.map((story, i) => (
                <div
                  key={story.id}
                  className="story-card animate-fade-in-up cursor-pointer hover:shadow-md transition-shadow"
                  style={{ animationDelay: `${i * 100}ms` }}
                  onClick={() => onViewStory(story.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`badge text-xs ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
                    {story.storyPoints && (
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{story.storyPoints} pts</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{story.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    As a <em>{story.asA}</em>, I want to {story.iWantTo}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-gray-400">{story.acceptanceCriteria.length} acceptance criteria</span>
                    <ChevronRight className="w-3.5 h-3.5 text-brand-400 ml-auto" />
                  </div>
                </div>
              ))}
              <button onClick={() => onViewStory(stories[0].id)} className="btn-primary flex items-center justify-center gap-2 mt-1">
                <ArrowRight className="w-4 h-4" />
                Validate & View Stories
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
