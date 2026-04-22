import { useState } from 'react'
import { BookMarked, ShieldCheck, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
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

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

const INVEST_KEYS = ['independent','negotiable','valuable','estimable','small','testable'] as const

function investScore(v: INVESTValidation, accepted: Set<string>) {
  return Math.round(
    INVEST_KEYS.reduce((sum, k) => sum + (accepted.has(k) ? Math.min(v[k].score + 35, 95) : v[k].score), 0)
    / INVEST_KEYS.length
  )
}

type SortKey = 'title' | 'epic' | 'category' | 'priority' | 'points' | 'score' | 'acs'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-brand-500 ml-1 inline" />
    : <ChevronDown className="w-3 h-3 text-brand-500 ml-1 inline" />
}

export default function AllStoriesView({ epics, storyValidations, storyAcceptedFixes, onSelectEpic }: Props) {
  const [filterEpicId, setFilterEpicId]       = useState('all')
  const [filterCategory, setFilterCategory]   = useState('all')
  const [filterPriority, setFilterPriority]   = useState('all')
  const [sortKey, setSortKey]                 = useState<SortKey>('priority')
  const [sortDir, setSortDir]                 = useState<SortDir>('asc')

  const rows: { story: Story; epic: Epic; score: number | null }[] = epics.flatMap(epic =>
    (epic.stories ?? []).map(story => {
      const v = storyValidations[story.id]
      const accepted = new Set(storyAcceptedFixes[story.id] ?? [])
      return { story, epic, score: v ? investScore(v, accepted) : null }
    })
  )

  const epicsWithStories  = epics.filter(e => (e.stories?.length ?? 0) > 0)
  const categories        = [...new Set(epicsWithStories.map(e => e.category).filter(Boolean))]
  const priorities        = [...new Set(rows.map(r => r.story.priority))]
  const validatedCount    = rows.filter(r => r.score !== null).length

  const filtered = rows
    .filter(r => filterEpicId   === 'all' || r.epic.id            === filterEpicId)
    .filter(r => filterCategory === 'all' || r.epic.category      === filterCategory)
    .filter(r => filterPriority === 'all' || r.story.priority     === filterPriority)

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'title':    cmp = a.story.title.localeCompare(b.story.title); break
      case 'epic':     cmp = a.epic.title.localeCompare(b.epic.title); break
      case 'category': cmp = (a.epic.category ?? '').localeCompare(b.epic.category ?? ''); break
      case 'priority': cmp = (PRIORITY_ORDER[a.story.priority] ?? 9) - (PRIORITY_ORDER[b.story.priority] ?? 9); break
      case 'points':   cmp = (a.story.storyPoints ?? 0) - (b.story.storyPoints ?? 0); break
      case 'score':    cmp = (a.score ?? -1) - (b.score ?? -1); break
      case 'acs':      cmp = a.story.acceptanceCriteria.length - b.story.acceptanceCriteria.length; break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-gray-800 transition-colors"
      onClick={() => toggleSort(col)}
    >
      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  )

  if (rows.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-6">
        <div className="card p-12 flex flex-col items-center gap-3 text-center mt-4">
          <BookMarked className="w-10 h-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No stories generated yet</p>
          <p className="text-xs text-gray-400">Go to an epic and generate stories first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-6">
      {/* Summary */}
      <div className="flex items-center gap-6 mb-4">
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{rows.length}</span> stories across{' '}
          <span className="font-semibold text-gray-900">{epicsWithStories.length}</span> epics
        </div>
        {validatedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            {validatedCount} validated
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={filterEpicId} onChange={e => setFilterEpicId(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All epics</option>
          {epicsWithStories.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>

        {categories.length > 0 && (
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All priorities</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {(filterEpicId !== 'all' || filterCategory !== 'all' || filterPriority !== 'all') && (
          <button onClick={() => { setFilterEpicId('all'); setFilterCategory('all'); setFilterPriority('all') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2">
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{sorted.length} of {rows.length} stories</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th col="title"    label="Story" />
                <Th col="epic"     label="Epic" />
                <Th col="category" label="Category" />
                <Th col="priority" label="Priority" />
                <Th col="points"   label="Pts" />
                <Th col="score"    label="Quality" />
                <Th col="acs"      label="ACs" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(({ story, epic, score }) => (
                <tr
                  key={story.id}
                  onClick={() => onSelectEpic(epic.id)}
                  className="hover:bg-brand-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-900 truncate group-hover:text-brand-700 transition-colors">{story.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">As a {story.asA}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                    <span className="truncate block">{epic.title}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {epic.category}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`badge ${PRIORITY_COLORS[story.priority]}`}>{story.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center whitespace-nowrap">
                    {story.storyPoints != null ? `${story.storyPoints}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {score !== null
                      ? <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{score}%</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 text-center whitespace-nowrap">
                    {story.acceptanceCriteria.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
