import { useState } from 'react'
import { ShieldCheck, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Lightbulb, ArrowRight, ChevronRight, FileText } from 'lucide-react'
import type { Story, INVESTValidation } from '../types'
import { MOCK_INVEST_VALIDATION, MOCK_STORY_LIST } from '../data/mockData'

const INVEST_META = {
  independent: { label: 'Independent', letter: 'I', color: 'text-blue-600', bg: 'bg-blue-50', description: 'Can be developed and released independently of other stories' },
  negotiable:  { label: 'Negotiable',  letter: 'N', color: 'text-violet-600', bg: 'bg-violet-50', description: 'Details are open to discussion, not fixed contracts' },
  valuable:    { label: 'Valuable',    letter: 'V', color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'Delivers clear value to the customer or business' },
  estimable:   { label: 'Estimable',   letter: 'E', color: 'text-amber-600', bg: 'bg-amber-50', description: 'The team can estimate the effort required' },
  small:       { label: 'Small',       letter: 'S', color: 'text-orange-600', bg: 'bg-orange-50', description: 'Fits within a single sprint or iteration' },
  testable:    { label: 'Testable',    letter: 'T', color: 'text-pink-600', bg: 'bg-pink-50', description: 'Has clear, verifiable acceptance criteria' },
} as const

type INVESTKey = keyof typeof INVEST_META

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

function INVESTRow({ principleKey, item }: { principleKey: INVESTKey; item: INVESTValidation[INVESTKey] }) {
  const [expanded, setExpanded] = useState(false)
  const meta = INVEST_META[principleKey]

  return (
    <tr className="border-b border-gray-100 last:border-0">
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
        {item.adheres ? (
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
            <div className={`h-full rounded-full ${item.score >= 80 ? 'bg-emerald-400' : item.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${item.score}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-600">{item.score}%</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="text-xs text-gray-600 line-clamp-1">{item.feedback}</p>
        {item.suggestions.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1 font-medium">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {item.suggestions.length} suggestion{item.suggestions.length > 1 ? 's' : ''}
          </button>
        )}
        {expanded && (
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
  )
}

function ValidationDetail({ story, onViewStory }: { story: Story; onViewStory: (id: string) => void }) {
  const validation = story.investValidation || MOCK_INVEST_VALIDATION
  const keys = Object.keys(INVEST_META) as INVESTKey[]
  const adheringCount = keys.filter(k => validation[k].adheres).length
  const overallScore = Math.round(keys.reduce((sum, k) => sum + validation[k].score, 0) / keys.length)

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up">
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

      {/* Score strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-600">{overallScore}%</p>
          <p className="text-xs text-gray-400 mt-0.5">INVEST Score</p>
        </div>
        <div className="card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">{adheringCount}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Adhered</p>
        </div>
        <div className="card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4 text-orange-400" />
            <p className="text-2xl font-bold text-orange-500">{keys.length - adheringCount}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Need Work</p>
        </div>
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
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2">Feedback & Suggestions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <INVESTRow key={key} principleKey={key} item={validation[key]} />
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
  onViewStory: (storyId: string) => void
}

export default function StoryValidation({ storyId, stories, onViewStory }: Props) {
  const allStories = stories.length > 0 ? stories : MOCK_STORY_LIST
  const initial = allStories.find(s => s.id === storyId) || allStories[0]
  const [selectedStory, setSelectedStory] = useState<Story>(initial)

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col py-6 px-4 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4.5 h-4.5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Story Validation</h1>
          <p className="text-xs text-gray-500">Select a story to validate against INVEST principles</p>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left — story list */}
        <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">
            {allStories.length} {allStories.length === 1 ? 'Story' : 'Stories'}
          </p>
          {allStories.map(s => {
            const isSelected = s.id === selectedStory.id
            const v = s.investValidation || MOCK_INVEST_VALIDATION
            const keys = Object.keys(INVEST_META) as INVESTKey[]
            const score = Math.round(keys.reduce((sum, k) => sum + v[k].score, 0) / keys.length)
            const issues = keys.filter(k => !v[k].adheres).length

            return (
              <button
                key={s.id}
                onClick={() => setSelectedStory(s)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-brand-400 bg-brand-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-brand-600' : 'bg-gray-100'}`}>
                  <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-brand-800' : 'text-gray-700'}`}>
                    {s.title}
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
                    <span className={`badge text-xs ml-auto ${PRIORITY_COLORS[s.priority]}`}>{s.priority}</span>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-2 ${isSelected ? 'text-brand-400' : 'text-gray-300'}`} />
              </button>
            )
          })}
        </div>

        {/* Right — validation detail */}
        <div className="flex-1 overflow-y-auto">
          <ValidationDetail key={selectedStory.id} story={selectedStory} onViewStory={onViewStory} />
        </div>
      </div>
    </div>
  )
}
