import { useState, useRef, useEffect } from 'react'
import { Send, SkipForward, Sparkles, MessageSquare } from 'lucide-react'
import type { ClarifyingQuestion, ChatMessage } from '../types'
import ChatBubble, { TypingIndicator } from './ChatBubble'
import { MOCK_CLARIFYING_QUESTIONS } from '../data/mockData'

interface Props {
  rawRequirements: string
  clarifyingQuestions: ClarifyingQuestion[]
  clarifyingComplete: boolean
  questionCount: number
  onRequirementsChange: (r: string) => void
  onClarifyingComplete: (questions: ClarifyingQuestion[]) => void
  onGenerateEpics: () => void
}

type Phase = 'input' | 'clarifying' | 'done'

export default function RequirementsInput({
  rawRequirements,
  questionCount,
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
  const bottomRef = useRef<HTMLDivElement>(null)

  const questions = MOCK_CLARIFYING_QUESTIONS.slice(0, questionCount)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }])
  }

  const simulateTyping = (callback: () => void, delay = 1200) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      callback()
    }, delay)
  }

  const startClarifying = () => {
    onRequirementsChange(localReqs)
    setPhase('clarifying')
    addMessage({
      role: 'assistant',
      content: `Thanks — I've reviewed your requirements. Before generating epics, I have ${questions.length} clarifying question${questions.length > 1 ? 's' : ''} to make sure the output is as precise as possible.`,
    })
    simulateTyping(() => {
      const q = questions[0]
      addMessage({
        role: 'assistant',
        content: `**Question 1 of ${questions.length}:** ${q.question}`,
        options: q.options,
      })
    }, 800)
  }

  const handleOptionSelect = (option: string) => {
    setMessages(prev =>
      prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, selectedOption: option, options: [] } : m
      )
    )
    addMessage({ role: 'user', content: option })
    advanceQuestion(option)
  }

  const handleSend = () => {
    if (!userInput.trim()) return
    const text = userInput.trim()
    setUserInput('')

    if (phase === 'clarifying') {
      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, options: [] } : m
        )
      )
      addMessage({ role: 'user', content: text })
      advanceQuestion(text)
    }
  }

  const advanceQuestion = (answer: string) => {
    const q = questions[currentQIndex]
    const updated = [...answeredQuestions, { ...q, answer }]
    setAnsweredQuestions(updated)
    const next = currentQIndex + 1

    if (next >= questions.length) {
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
        const nextQ = questions[next]
        addMessage({
          role: 'assistant',
          content: `**Question ${next + 1} of ${questions.length}:** ${nextQ.question}`,
          options: nextQ.options,
        })
      })
    }
  }

  const handleSkip = () => {
    onRequirementsChange(localReqs)
    onClarifyingComplete([])
    onGenerateEpics()
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Requirements Intake</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe your high-level requirements. The AI will ask a few targeted questions before generating epics.
        </p>
      </div>

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
            <button onClick={handleSkip} className="btn-secondary flex items-center gap-2">
              <SkipForward className="w-4 h-4" />
              Skip Questions & Generate Epics
            </button>
            <button
              onClick={startClarifying}
              disabled={!localReqs.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Explore & Brainstorm ({questions.length} questions)
            </button>
          </div>
        </div>
      )}

      {/* Chat phase */}
      {phase !== 'input' && (
        <div className="card overflow-hidden mb-6 animate-fade-in-up">
          {/* Requirements summary bar */}
          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
            <p className="text-xs font-medium text-gray-500 mb-0.5">Your Requirements</p>
            <p className="text-sm text-gray-700 line-clamp-2">{localReqs}</p>
          </div>

          {/* Progress */}
          {phase === 'clarifying' && (
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Clarification progress</span>
                <span className="text-xs font-medium text-brand-600">
                  {answeredQuestions.length} / {questions.length}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${(answeredQuestions.length / questions.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="p-5 flex flex-col gap-5 min-h-[300px] max-h-[420px] overflow-y-auto">
            {messages.map(msg => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onSelectOption={phase === 'clarifying' ? handleOptionSelect : undefined}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          {phase === 'clarifying' && (
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Or type your own answer…"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} disabled={!userInput.trim()} className="btn-primary px-3">
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      {phase === 'done' && (
        <div className="flex justify-end animate-fade-in-up">
          <button onClick={onGenerateEpics} className="btn-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Generate Epics
          </button>
        </div>
      )}
    </div>
  )
}
