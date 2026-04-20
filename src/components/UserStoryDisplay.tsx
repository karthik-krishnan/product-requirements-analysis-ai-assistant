import { useState } from 'react'
import { FileText, CheckCircle, XCircle, AlertTriangle, Zap, ChevronLeft, Edit3, Download, Copy, Check } from 'lucide-react'
import type { Story } from '../types'
import { MOCK_STORY_LIST } from '../data/mockData'

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`card p-5 border-l-4 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function BulletList({ items, color = 'text-gray-600' }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 text-sm ${color}`}>
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
          {item}
        </li>
      ))}
    </ul>
  )
}

interface Props {
  storyId: string
  stories: Story[]
  onBack: () => void
}

export default function UserStoryDisplay({ storyId, stories, onBack }: Props) {
  const allStories = stories.length > 0 ? stories : MOCK_STORY_LIST
  const story = allStories.find(s => s.id === storyId) || allStories[0]
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedStory, setEditedStory] = useState(story)

  const storyText = `# ${story.title}

**As a** ${story.asA},
**I want to** ${story.iWantTo},
**So that** ${story.soThat}.

## Acceptance Criteria
${story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## In Scope
${story.inScope.map(s => `- ${s}`).join('\n')}

## Out of Scope
${story.outOfScope.map(s => `- ${s}`).join('\n')}

## Assumptions
${story.assumptions.map(a => `- ${a}`).join('\n')}

## Cross-Functional Needs
${story.crossFunctionalNeeds.map(c => `- ${c}`).join('\n')}

Priority: ${story.priority} | Story Points: ${story.storyPoints || 'TBD'}
`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(storyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayStory = editing ? editedStory : story

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3">
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to stories
          </button>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-brand-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{displayStory.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge border ${PRIORITY_COLORS[displayStory.priority]}`}>{displayStory.priority} Priority</span>
            {displayStory.storyPoints && (
              <span className="badge bg-gray-100 text-gray-600 border border-gray-200">{displayStory.storyPoints} Story Points</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(!editing)} className={`btn-secondary flex items-center gap-1.5 ${editing ? 'bg-brand-50 border-brand-300 text-brand-700' : ''}`}>
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy MD'}
          </button>
          <button className="btn-secondary flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Story Header Card */}
      <div className="card p-6 mb-5 bg-gradient-to-br from-brand-50 to-white border-brand-200">
        <div className="flex items-start gap-3 mb-1">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide mt-0.5 shrink-0">As a</span>
          {editing ? (
            <input className="input-field text-base font-semibold text-brand-700 bg-white" value={editedStory.asA} onChange={e => setEditedStory(p => ({ ...p, asA: e.target.value }))} />
          ) : (
            <span className="text-base font-semibold text-brand-700">{displayStory.asA}</span>
          )}
        </div>
        <div className="flex items-start gap-3 mb-1">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide mt-0.5 shrink-0">I want to</span>
          {editing ? (
            <textarea className="textarea-field text-sm text-gray-800" rows={2} value={editedStory.iWantTo} onChange={e => setEditedStory(p => ({ ...p, iWantTo: e.target.value }))} />
          ) : (
            <span className="text-sm text-gray-800">{displayStory.iWantTo}</span>
          )}
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide mt-0.5 shrink-0">So that</span>
          {editing ? (
            <textarea className="textarea-field text-sm text-gray-800" rows={2} value={editedStory.soThat} onChange={e => setEditedStory(p => ({ ...p, soThat: e.target.value }))} />
          ) : (
            <span className="text-sm text-gray-800">{displayStory.soThat}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Acceptance Criteria */}
        <div className="md:col-span-2">
          <Section
            icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
            title="Acceptance Criteria"
            color="border-l-emerald-400"
          >
            <ol className="space-y-2">
              {displayStory.acceptanceCriteria.map((ac, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {editing ? (
                    <input
                      className="input-field flex-1"
                      value={editedStory.acceptanceCriteria[i]}
                      onChange={e => {
                        const updated = [...editedStory.acceptanceCriteria]
                        updated[i] = e.target.value
                        setEditedStory(p => ({ ...p, acceptanceCriteria: updated }))
                      }}
                    />
                  ) : (
                    <span>{ac}</span>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        {/* In Scope */}
        <Section
          icon={<CheckCircle className="w-4 h-4 text-blue-500" />}
          title="In Scope"
          color="border-l-blue-400"
        >
          <BulletList items={displayStory.inScope} color="text-gray-700" />
        </Section>

        {/* Out of Scope */}
        <Section
          icon={<XCircle className="w-4 h-4 text-red-400" />}
          title="Out of Scope"
          color="border-l-red-300"
        >
          <BulletList items={displayStory.outOfScope} color="text-gray-500" />
        </Section>

        {/* Assumptions */}
        <Section
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          title="Assumptions"
          color="border-l-amber-400"
        >
          <BulletList items={displayStory.assumptions} color="text-gray-600" />
        </Section>

        {/* Cross-Functional Needs */}
        <Section
          icon={<Zap className="w-4 h-4 text-violet-500" />}
          title="Cross-Functional Needs"
          color="border-l-violet-400"
        >
          <BulletList items={displayStory.crossFunctionalNeeds} color="text-gray-600" />
        </Section>
      </div>

      {/* Story selector */}
      {allStories.length > 1 && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 mb-2">Other stories in this epic</p>
          <div className="flex flex-wrap gap-2">
            {allStories.filter(s => s.id !== story.id).map(s => (
              <button key={s.id} className="text-xs text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 font-medium transition-colors">
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditing(false)} className="btn-secondary">Discard Changes</button>
          <button onClick={() => setEditing(false)} className="btn-primary flex items-center gap-2">
            <Check className="w-4 h-4" />
            Save Story
          </button>
        </div>
      )}
    </div>
  )
}
