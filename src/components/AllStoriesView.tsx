import { useState } from 'react'
import { BookMarked, ShieldCheck, ChevronRight } from 'lucide-react'
import type { Epic, Story, INVESTValidation } from '../types'

interface Props {
  epics: Epic[]
  storyValidations: Record<string, INVESTValidation>
  storyAcceptedFixes: Record<string, string[]>
  onSelectEpic: (epicId: string) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  High:     'bg-red-100 text-red-700',
  Medium:   'bg-amber-100 text-amber-700',
  Low:      'bg-green-100 text-green-700',
  Critical: 'bg-purple-100 text-purple-700',
}

const INVEST_KEYS = ['independent','negotiable','valuable','estimable','small','testable'] as const

function investScore(v: INVESTValidation, accepted: Set<string>) {
  return Math.round(
    INVEST_KEYS.reduce((sum, k) => sum + (accepted.has(k) ? Math.min(v[k].score + 35, 95) : v[k].score), 0)
    / INVEST_KEYS.length
  )
}

export default function AllStoriesView({ epics, storyValidations, storyAcceptedFixes, onSelectEpic }: Props) {
  const [filterEpicId, setFilterEpicId] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const allStories: { story: Story; epic: Epic }[] = epics.flatMap(epic =>
    (epic.stories ?? []).map(story => ({ story, epic }))
  )

  const epicsWithStories = epics.filter(e => (e.stories?.length ?? 0) > 0)
  const priorities = [...new Set(allStories.map(s => s.story.priority))]

  const filtered = allStories
    .filter(s => filterEpicId === 'all' || s.epic.id === filterEpicId)
    .filter(s => filterPriority === 'all' || s.story.priority === filterPriority)

  const totalStories = allStories.length
  const validated = allStories.filter(s => storyValidations[s.story.id]).length

  if (totalStories === 0) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-6">
        <div className="card p-12 flex flex-col items-center gap-3 text-center mt-4">
          <BookMarked className="w-10 h-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No stories generated yet</p>
          <p className="text-xs text-gray-400">Go to an epic and generate stories first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-6">
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-5">
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{totalStories}</span> stories across{' '}
          <span className="font-semibold text-gray-900">{epicsWithStories.length}</span> epics
        </div>
        {validated > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            {validated} validated
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={filterEpicId}
          onChange={e => setFilterEpicId(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">All epics</option>
          {epicsWithStories.map(e => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">All priorities</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {(filterEpicId !== 'all' || filterPriority !== 'all') && (
          <button
            onClick={() => { setFilterEpicId('all'); setFilterPriority('all') }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{filtered.length} stories</span>
      </div>

      {/* Story cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ story, epic }) => {
          const validation = storyValidations[story.id] ?? null
          const accepted = new Set(storyAcceptedFixes[story.id] ?? [])
          const score = validation ? investScore(validation, accepted) : null

          return (
            <div
              key={story.id}
              className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectEpic(epic.id)}
            >
              {/* Epic label */}
              <button
                onClick={e => { e.stopPropagation(); onSelectEpic(epic.id) }}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium w-fit"
              >
                <BookMarked className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[180px]">{epic.title}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
              </button>

              <div className="flex items-center justify-between gap-2">
                <span className={`badge ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
                <div className="flex items-center gap-1.5">
                  {story.storyPoints != null && (
                    <span className="badge bg-gray-100 text-gray-600">{story.storyPoints}pts</span>
                  )}
                  {score !== null && (
                    <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                      {score}%
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{story.title}</h3>

              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                As a <span className="font-medium text-gray-700">{story.asA}</span>, {story.iWantTo}
              </p>

              {story.acceptanceCriteria.length > 0 && (
                <p className="text-xs text-gray-400 mt-auto">{story.acceptanceCriteria.length} acceptance criteria</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
