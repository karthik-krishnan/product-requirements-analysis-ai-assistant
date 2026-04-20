import { Bot, User } from 'lucide-react'
import type { ChatMessage } from '../types'

interface Props {
  message: ChatMessage
  onSelectOption?: (option: string) => void
}

export default function ChatBubble({ message, onSelectOption }: Props) {
  const isAI = message.role === 'assistant'

  return (
    <div className={`flex gap-3 animate-fade-in-up ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isAI ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
      }`}>
        {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      <div className={`max-w-[80%] flex flex-col gap-2 ${isAI ? '' : 'items-end'}`}>
        <div className={isAI ? 'ai-bubble' : 'user-bubble'}>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Option chips */}
        {isAI && message.options && message.options.length > 0 && !message.selectedOption && onSelectOption && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.options.map(opt => (
              <button
                key={opt}
                onClick={() => onSelectOption(opt)}
                className="text-xs border border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-full px-3 py-1.5 transition-colors font-medium"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {message.selectedOption && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="badge bg-brand-100 text-brand-600">Selected: {message.selectedOption}</span>
          </div>
        )}

        <span className="text-xs text-gray-300">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="ai-bubble flex items-center gap-1 px-4 py-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}
