import { useState } from 'react'
import { FileText, CheckCircle, XCircle, AlertTriangle, Zap, ChevronLeft, Edit3, Download, Copy, Check, Plus, Trash2 } from 'lucide-react'
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

interface EditableListProps {
  items: string[]
  editing: boolean
  numbered?: boolean
  bulletColor?: string
  onChange: (items: string[]) => void
}

function EditableList({ items, editing, numbered = false, bulletColor = 'text-gray-500', onChange }: EditableListProps) {
  const updateItem = (i: number, value: string) => {
    const updated = [...items]
    updated[i] = value
    onChange(updated)
  }
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const addItem = () => onChange([...items, ''])

  if (!editing) {
    return (
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`flex gap-2.5 text-sm ${bulletColor}`}>
            {numbered ? (
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
            ) : (
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
            )}
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          {numbered ? (
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-2">
              {i + 1}
            </span>
          ) : (
            <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
          )}
          <input
            className="input-field flex-1 text-sm"
            value={item}
            onChange={e => updateItem(i, e.target.value)}
            placeholder="Enter item…"
          />
          <button
            onClick={() => removeItem(i)}
            className="mt-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add item
      </button>
    </div>
  )
}

interface Props {
  storyId: string
  stories: Story[]
  onBack: () => void
}

export default function UserStoryDisplay({ storyId, stories, onBack }: Props) {
  const allStories = stories
  const story = allStories.find(s => s.id === storyId) || allStories[0]
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedStory, setEditedStory] = useState<Story>(story)

  const displayStory = editing ? editedStory : story

  const update = (patch: Partial<Story>) => setEditedStory(p => ({ ...p, ...patch }))

  const storyText = `# ${displayStory.title}

**As a** ${displayStory.asA},
**I want to** ${displayStory.iWantTo},
**So that** ${displayStory.soThat}.

## Acceptance Criteria
${displayStory.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## In Scope
${displayStory.inScope.map(s => `- ${s}`).join('\n')}

## Out of Scope
${displayStory.outOfScope.map(s => `- ${s}`).join('\n')}

## Assumptions
${displayStory.assumptions.map(a => `- ${a}`).join('\n')}

## Cross-Functional Needs
${displayStory.crossFunctionalNeeds.map(c => `- ${c}`).join('\n')}

Priority: ${displayStory.priority} | Story Points: ${displayStory.storyPoints || 'TBD'}
`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(storyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => setEditing(false)
  const handleDiscard = () => { setEditedStory(story); setEditing(false) }

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
            {editing ? (
              <input
                className="input-field text-lg font-semibold"
                value={editedStory.title}
                onChange={e => update({ title: e.target.value })}
              />
            ) : (
              <h1 className="text-xl font-semibold text-gray-900">{displayStory.title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <>
                <select
                  className="input-field text-xs w-32"
                  value={editedStory.priority}
                  onChange={e => update({ priority: e.target.value as Story['priority'] })}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Points:</span>
                  <input
                    type="number"
                    className="input-field text-xs w-16"
                    value={editedStory.storyPoints ?? ''}
                    onChange={e => update({ storyPoints: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="—"
                  />
                </div>
              </>
            ) : (
              <>
                <span className={`badge border ${PRIORITY_COLORS[displayStory.priority]}`}>{displayStory.priority} Priority</span>
                {displayStory.storyPoints && (
                  <span className="badge bg-gray-100 text-gray-600 border border-gray-200">{displayStory.storyPoints} Story Points</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => editing ? handleDiscard() : setEditing(true)}
            className={`btn-secondary flex items-center gap-1.5 ${editing ? 'text-red-500 border-red-200 hover:bg-red-50' : ''}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? 'Discard' : 'Edit'}
          </button>
          {editing && (
            <button onClick={handleSave} className="btn-primary flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
          )}
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
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide mt-0.5 shrink-0 w-16">As a</span>
          {editing ? (
            <input className="input-field text-sm font-semibold text-brand-700" value={editedStory.asA} onChange={e => update({ asA: e.target.value })} />
          ) : (
            <span className="text-sm font-semibold text-brand-700">{displayStory.asA}</span>
          )}
        </div>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide mt-2 shrink-0 w-16">I want to</span>
          {editing ? (
            <textarea className="textarea-field text-sm" rows={2} value={editedStory.iWantTo} onChange={e => update({ iWantTo: e.target.value })} />
          ) : (
            <span className="text-sm text-gray-800 leading-relaxed">{displayStory.iWantTo}</span>
          )}
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wide mt-2 shrink-0 w-16">So that</span>
          {editing ? (
            <textarea className="textarea-field text-sm" rows={2} value={editedStory.soThat} onChange={e => update({ soThat: e.target.value })} />
          ) : (
            <span className="text-sm text-gray-800 leading-relaxed">{displayStory.soThat}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Acceptance Criteria — full width */}
        <div className="md:col-span-2">
          <Section icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} title="Acceptance Criteria" color="border-l-emerald-400">
            <EditableList
              items={displayStory.acceptanceCriteria}
              editing={editing}
              numbered
              bulletColor="text-gray-700"
              onChange={acceptanceCriteria => update({ acceptanceCriteria })}
            />
          </Section>
        </div>

        {/* In Scope */}
        <Section icon={<CheckCircle className="w-4 h-4 text-blue-500" />} title="In Scope" color="border-l-blue-400">
          <EditableList
            items={displayStory.inScope}
            editing={editing}
            bulletColor="text-gray-700"
            onChange={inScope => update({ inScope })}
          />
        </Section>

        {/* Out of Scope */}
        <Section icon={<XCircle className="w-4 h-4 text-red-400" />} title="Out of Scope" color="border-l-red-300">
          <EditableList
            items={displayStory.outOfScope}
            editing={editing}
            bulletColor="text-gray-500"
            onChange={outOfScope => update({ outOfScope })}
          />
        </Section>

        {/* Assumptions */}
        <Section icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Assumptions" color="border-l-amber-400">
          <EditableList
            items={displayStory.assumptions}
            editing={editing}
            bulletColor="text-gray-600"
            onChange={assumptions => update({ assumptions })}
          />
        </Section>

        {/* Cross-Functional Needs */}
        <Section icon={<Zap className="w-4 h-4 text-violet-500" />} title="Cross-Functional Needs" color="border-l-violet-400">
          <EditableList
            items={displayStory.crossFunctionalNeeds}
            editing={editing}
            bulletColor="text-gray-600"
            onChange={crossFunctionalNeeds => update({ crossFunctionalNeeds })}
          />
        </Section>
      </div>

      {/* Other stories in epic */}
      {allStories.length > 1 && (
        <div className="card p-4">
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
    </div>
  )
}
