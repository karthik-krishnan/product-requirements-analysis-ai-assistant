import { useState, useRef, useEffect } from 'react'
import { Send, SkipForward, Sparkles, MessageSquare, AlertCircle, Loader2 } from 'lucide-react'
import type { APISettings, EnterpriseConfig, Workspace, ClarifyingQuestion, ChatMessage, Epic } from '../types'
import { getAllContextFiles } from '../utils/contextUtils'
import ChatBubble, { TypingIndicator } from './ChatBubble'
import { getLevelMeta } from '../utils/assistanceLevels'
import { callLLM, isLiveMode } from '../services/llm/client'
import { buildClarifyingQuestionsPrompt, parseClarifyingQuestions } from '../prompts/clarifyingQuestions'
import { buildGenerateEpicsPrompt, parseEpics } from '../prompts/generateEpics'

interface Props {
  rawRequirements: string
  clarifyingQuestions: ClarifyingQuestion[]
  clarifyingComplete: boolean
  settings: APISettings
  enterprise: EnterpriseConfig | null
  workspace: Workspace | null
  onRequirementsChange: (r: string) => void
  onClarifyingComplete: (questions: ClarifyingQuestion[]) => void
  onGenerateEpics: (epics: Epic[]) => void
}

type Phase = 'input' | 'clarifying' | 'done'

export default function RequirementsInput({
  rawRequirements,
  settings,
  enterprise,
  workspace,
  onRequirementsChange,
  onClarifyingComplete,
  onGenerateEpics,
}: Props) {
  const [phase, setPhase] = useState<Phase>('input')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState<ClarifyingQuestion[]>([])
  const [localReqs, setLocalReqs] = useState(rawRequirements)
  const [llmLoading, setLlmLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const questionsRef = useRef<ClarifyingQuestion[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }])
  }

  const simulateTyping = (cb: () => void, delay = 1000) => {
    setIsTyping(true)
    setTimeout(() => { setIsTyping(false); cb() }, delay)
  }

  const startClarifying = async () => {
    const { range } = getLevelMeta(settings.assistanceLevel)
    onRequirementsChange(localReqs)
    setPhase('clarifying')
    setError(null)
    setLlmLoading(true)
    addMessage({
      role: 'assistant',
      content: `Thanks — I've reviewed your requirements. Let me ask a few clarifying questions before writing your epics…`,
    })
    try {
      const raw = await callLLM(
        buildClarifyingQuestionsPrompt(localReqs, enterprise, workspace, range),
        settings,
        getAllContextFiles(enterprise, workspace),
        'clarifying-questions',
      )
      const qs = parseClarifyingQuestions(raw)
      questionsRef.current = qs.slice(0, range[1])
      setLlmLoading(false)
      simulateTyping(() => {
        addMessage({ role: 'assistant', content: qs[0].question, options: qs[0].options })
      }, 400)
    } catch (err) {
      setLlmLoading(false)
      setError((err as Error).message)
      setPhase('input')
    }
  }

  const handleOptionSelect = (option: string) => {
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, selectedOption: option, options: [] } : m))
    addMessage({ role: 'user', content: option })
    advanceQuestion(option)
  }

  const handleSend = () => {
    if (!userInput.trim()) return
    const text = userInput.trim()
    setUserInput('')
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, options: [] } : m))
    addMessage({ role: 'user', content: text })
    advanceQuestion(text)
  }

  const advanceQuestion = (answer: string) => {
    const qs = questionsRef.current
    const q = qs[currentQIndex]
    const updated = [...answeredQuestions, { ...q, answer }]
    setAnsweredQuestions(updated)
    const next = currentQIndex + 1

    if (next >= qs.length) {
      simulateTyping(() => {
        addMessage({
          role: 'assistant',
          content: `Great — that's all I need! I now have a clear picture of your requirements and constraints. Ready to generate your epics?`,
        })
        setPhase('done')
        onClarifyingComplete(updated)
      })
    } else {
      setCurrentQIndex(next)
      simulateTyping(() => {
        const nextQ = qs[next]
        addMessage({ role: 'assistant', content: nextQ.question, options: nextQ.options })
      })
    }
  }

  const handleSkip = () => {
    onRequirementsChange(localReqs)
    onClarifyingComplete([])
    handleGenerateEpics([])
  }

  const handleGenerateEpics = async (questions: ClarifyingQuestion[]) => {
    setLlmLoading(true)
    setError(null)
    try {
      const raw = await callLLM(
        buildGenerateEpicsPrompt(localReqs, enterprise, workspace, questions),
        settings,
        getAllContextFiles(enterprise, workspace),
        'generate-epics',
      )
      onGenerateEpics(parseEpics(raw))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLlmLoading(false)
    }
  }

  const questions = questionsRef.current

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Requirements Intake</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe your high-level requirements. The AI will ask a few targeted questions before generating epics.
        </p>
        {isLiveMode(settings) ? (
          <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live AI — {settings.provider}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Demo mode — sample data only, not reading your input
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in-up">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 mb-0.5">AI call failed</p>
            <p className="text-xs text-red-600 break-words">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0 text-xs">✕</button>
        </div>
      )}

      {/* Requirements input phase */}
      {phase === 'input' && (
        <div className="card p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            <label className="text-sm font-medium text-gray-700">High-Level Requirements</label>
          </div>
          <textarea
            className="textarea-field mb-4"
            rows={10}
            placeholder={`Describe what you want to build. Be as high-level or detailed as you like.\n\nExample:\n"We need a B2C e-commerce platform for our retail brand. Customers should be able to browse products, add them to a cart, checkout with multiple payment methods, track their orders, and manage their account. We also need an admin portal for the operations team to manage orders, inventory, and promotions. The platform should integrate with our existing SAP inventory system and Salesforce CRM."`}
            value={localReqs}
            onChange={e => setLocalReqs(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              disabled={llmLoading || (isLiveMode(settings) && !localReqs.trim())}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title={isLiveMode(settings) && !localReqs.trim() ? 'Enter requirements first in live AI mode' : undefined}
            >
              {llmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
              {llmLoading ? 'Generating Epics…' : 'Generate Epics Directly'}
            </button>
            {settings.assistanceLevel > 0 && (
              <button
                onClick={startClarifying}
                disabled={!localReqs.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Explore & Brainstorm
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat phase */}
      {phase !== 'input' && (
        <div className="card overflow-hidden mb-6 animate-fade-in-up">
          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
            <p className="text-xs font-medium text-gray-500 mb-0.5">Your Requirements</p>
            <p className="text-sm text-gray-700 line-clamp-2">{localReqs}</p>
          </div>

          {phase === 'clarifying' && questions.length > 0 && (
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Clarification progress</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: questions.length ? `${(answeredQuestions.length / questions.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          <div className="p-5 flex flex-col gap-5 min-h-[300px] max-h-[420px] overflow-y-auto">
            {messages.map(msg => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onSelectOption={phase === 'clarifying' ? handleOptionSelect : undefined}
              />
            ))}
            {(isTyping || llmLoading) && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {phase === 'clarifying' && (
            <div className="border-t border-gray-100 p-4 flex gap-3 items-center">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Type your own answer…"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} disabled={!userInput.trim()} className="btn-primary px-3">
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={() => advanceQuestion('(skipped)')}
                className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate epics button */}
      {phase === 'done' && (
        <div className="flex justify-end animate-fade-in-up">
          <button
            onClick={() => handleGenerateEpics(answeredQuestions)}
            disabled={llmLoading}
            className="btn-primary flex items-center gap-2"
          >
            {llmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {llmLoading ? 'Generating Epics…' : 'Generate Epics'}
          </button>
        </div>
      )}
    </div>
  )
}
