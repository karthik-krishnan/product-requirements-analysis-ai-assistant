import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Layers, ChevronRight, Edit3, MessageSquare, X, Tag, ArrowRight, Sparkles, Check, Download } from 'lucide-react'
import type { Epic, APISettings } from '../types'
import { MOCK_EPICS } from '../data/mockData'
import { exportAllToExcel } from '../utils/export'
import JiraPushModal from './JiraPushModal'
import { isDemo } from '../services/llm/client'

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Security & Access': 'bg-purple-50 border-purple-200',
  'Core Product': 'bg-blue-50 border-blue-200',
  'Commerce': 'bg-orange-50 border-orange-200',
  'Operations': 'bg-cyan-50 border-cyan-200',
  'Customer Experience': 'bg-pink-50 border-pink-200',
  'Engagement': 'bg-yellow-50 border-yellow-200',
}

const MOCK_AI_EPIC_FEEDBACK: Record<string, string> = {
  'epic-1': 'This epic is well-scoped. Consider splitting MFA setup into a separate child epic if it involves hardware key support. Ensure RBAC roles align with existing AD groups.',
  'epic-2': 'Strong scope. Recommend adding a spike story for Elasticsearch query performance under load. AI recommendations should be gated by a feature flag for incremental rollout.',
  'epic-3': 'Well defined. Watch for payment PCI-DSS compliance scope — it may expand checkout significantly. Confirm whether guest checkout is in scope.',
  'epic-4': 'Good. Clarify which WMS version is being integrated — v2 has a different event schema. Refund flow may need a dedicated sub-epic for complex cases.',
  'epic-5': 'Solid. Consider adding account deletion (GDPR right-to-erasure) as an explicit story. Wishlist sharing could be a Phase 2 item.',
  'epic-6': 'This epic is broad. Consider separating transactional vs. marketing notifications — they have different consent and compliance implications.',
}

interface EpicDialogProps {
  epic: Epic
  onClose: () => void
  onSave: (epic: Epic) => void
  onBreakIntoStories: (epic: Epic) => void
}

function EpicDialog({ epic, onClose, onSave, onBreakIntoStories }: EpicDialogProps) {
  const [editedEpic, setEditedEpic] = useState(epic)
  const [activeTab, setActiveTab] = useState<'edit' | 'chat'>('edit')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'assistant' | 'user'; content: string }[]>([
    {
      id: '1',
      role: 'assistant',
      content: MOCK_AI_EPIC_FEEDBACK[epic.id] || `I've reviewed this epic. It looks well-structured. What aspects would you like to refine?`,
    },
  ])
  const [isTyping, setIsTyping] = useState(false)

  const sendChat = () => {
    if (!chatInput.trim()) return
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: chatInput.trim() }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: `Good point. Based on your input, I'd recommend also capturing the edge case around ${chatInput.toLowerCase().includes('user') ? 'user session expiry during checkout' : 'concurrent modification conflicts'}. This could surface as a cross-functional requirement with the security team.`,
        },
      ])
    }, 1200)
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge ${PRIORITY_COLORS[epic.priority]}`}>{epic.priority}</span>
              <span className="text-xs text-gray-400">{epic.category}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{epic.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'edit' as const, label: 'Edit Epic', icon: Edit3 },
            { id: 'chat' as const, label: 'AI Chat', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'edit' && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Epic Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={editedEpic.title}
                  onChange={e => setEditedEpic(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  className="textarea-field"
                  rows={4}
                  value={editedEpic.description}
                  onChange={e => setEditedEpic(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <select
                    className="input-field"
                    value={editedEpic.priority}
                    onChange={e => setEditedEpic(p => ({ ...p, priority: e.target.value as Epic['priority'] }))}
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editedEpic.category}
                    onChange={e => setEditedEpic(p => ({ ...p, category: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="input-field"
                  value={editedEpic.tags.join(', ')}
                  onChange={e => setEditedEpic(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                />
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === 'assistant' ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {msg.role === 'assistant' ? 'AI' : 'Me'}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-brand-50 border border-brand-100 rounded-tl-sm' : 'bg-gray-100 rounded-tr-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
                    <div className="bg-brand-50 border border-brand-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 p-4 flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Ask about this epic or suggest changes…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                />
                <button onClick={sendChat} disabled={!chatInput.trim()} className="btn-primary px-3">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => onBreakIntoStories(editedEpic)}
            className="btn-ghost flex items-center gap-2 text-brand-600"
          >
            <Sparkles className="w-4 h-4" />
            Break into Stories
          </button>
          <button
            onClick={() => { onSave(editedEpic); onClose() }}
            className="btn-primary flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save Epic
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface EpicCardProps {
  epic: Epic
  index: number
  onOpen: () => void
  onBreakIntoStories: () => void
}

function EpicCard({ epic, index, onOpen, onBreakIntoStories }: EpicCardProps) {
  const bgClass = CATEGORY_COLORS[epic.category] || 'bg-gray-50 border-gray-200'
  return (
    <div
      className={`epic-card border ${bgClass} animate-fade-in-up`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`badge ${PRIORITY_COLORS[epic.priority]}`}>{epic.priority}</span>
        <span className="text-xs text-gray-400 font-medium">{epic.category}</span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 leading-snug">{epic.title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{epic.description}</p>

      <div className="flex flex-wrap gap-1 mt-auto">
        {epic.tags.slice(0, 3).map(tag => (
          <span key={tag} className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5">
            <Tag className="w-2.5 h-2.5" />
            {tag}
          </span>
        ))}
        {epic.tags.length > 3 && (
          <span className="text-xs text-gray-400">+{epic.tags.length - 3}</span>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onOpen}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit / Chat
        </button>
        <button
          onClick={onBreakIntoStories}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-brand-600 border border-brand-200 bg-brand-50 rounded-lg py-1.5 hover:bg-brand-100 transition-colors font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Stories
        </button>
      </div>
    </div>
  )
}


// ─── Main EpicsView ───────────────────────────────────────────────────────────

interface Props {
  epics: Epic[]
  settings: APISettings
  onEpicsChange: (epics: Epic[]) => void
  onBreakIntoStories: (epicId: string) => void
}

export default function EpicsView({ epics: propEpics, settings, onEpicsChange, onBreakIntoStories }: Props) {
  const epics = propEpics.length > 0 ? propEpics : (isDemo(settings) ? MOCK_EPICS : [])
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null)
  const [showJira, setShowJira] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Progressive reveal — epics appear one by one, 120ms apart
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const revealedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const toReveal = epics.filter(e => !revealedRef.current.has(e.id))
    toReveal.forEach((epic, i) => {
      setTimeout(() => {
        revealedRef.current.add(epic.id)
        setVisibleIds(prev => new Set([...prev, epic.id]))
      }, i * 120)
    })
  }, [epics])

  const categories = epics.reduce<string[]>((acc, e) => {
    if (!acc.includes(e.category)) acc.push(e.category)
    return acc
  }, [])

  const handleSave = (updated: Epic) => {
    onEpicsChange(epics.map(e => e.id === updated.id ? updated : e))
  }

  const visibleEpics = epics
    .filter(e => visibleIds.has(e.id))
    .filter(e => activeCategory === null || e.category === activeCategory)

  return (
    <div className="py-10 px-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-brand-600" />
            <h1 className="text-xl font-semibold text-gray-900">Generated Epics</h1>
          </div>
          <p className="text-sm text-gray-500">
            {epics.length} epics · {categories.length} categories · Review, refine, then break into stories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            {epics.filter(e => e.priority === 'High').length} High · {epics.filter(e => e.priority === 'Medium').length} Med · {epics.filter(e => e.priority === 'Low').length} Low
          </span>
          <button
            onClick={() => exportAllToExcel(epics)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            onClick={() => setShowJira(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Push to Jira
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCategory === null
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          All <span className="ml-1 opacity-70">{epics.length}</span>
        </button>
        {categories.map(cat => {
          const count = epics.filter(e => e.category === cat).length
          const active = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(active ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat} <span className="ml-1 opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Empty state for live mode with no epics */}
      {epics.length === 0 && (
        <div className="card p-12 flex flex-col items-center gap-3 text-center mt-4">
          <Layers className="w-10 h-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No epics generated yet</p>
          <p className="text-xs text-gray-400">Go back to Requirements and generate epics from your requirements.</p>
        </div>
      )}

      {/* Flat grid — all visible cards flow together */}
      {epics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleEpics.map((epic, i) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              index={i}
              onOpen={() => setSelectedEpic(epic)}
              onBreakIntoStories={() => onBreakIntoStories(epic.id)}
            />
          ))}
        </div>
      )}

      <div className="card p-4 flex items-center gap-3 bg-brand-50 border-brand-200 mt-2">
        <ChevronRight className="w-4 h-4 text-brand-500 shrink-0" />
        <p className="text-sm text-brand-700">
          <strong>Next:</strong> Click <em>Stories</em> on any epic to break it down into user stories, or <em>Edit / Chat</em> to refine an epic with AI assistance.
        </p>
      </div>

      {selectedEpic && (
        <EpicDialog
          epic={selectedEpic}
          onClose={() => setSelectedEpic(null)}
          onSave={handleSave}
          onBreakIntoStories={epic => { handleSave(epic); setSelectedEpic(null); onBreakIntoStories(epic.id) }}
        />
      )}

      {showJira && (
        <JiraPushModal
          items={epics.map(e => ({ id: e.id, title: e.title, type: 'Epic' as const }))}
          onClose={() => setShowJira(false)}
        />
      )}
    </div>
  )
}
