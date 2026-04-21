import * as XLSX from 'xlsx'
import type { Epic, Story } from '../types'

// ── Markdown ──────────────────────────────────────────────────────────────────

export function storyToMarkdown(story: Story): string {
  const lines: string[] = []

  lines.push(`# ${story.title}`)
  lines.push('')
  lines.push(`**Priority:** ${story.priority}${story.storyPoints ? ` · **Story Points:** ${story.storyPoints}` : ''}`)
  lines.push('')
  lines.push(`**As a** ${story.asA}, **I want to** ${story.iWantTo}, **so that** ${story.soThat}.`)

  if (story.acceptanceCriteria.length) {
    lines.push('')
    lines.push('## Acceptance Criteria')
    story.acceptanceCriteria.forEach(ac => lines.push(`- ${ac}`))
  }

  if (story.inScope.length || story.outOfScope.length) {
    lines.push('')
    lines.push('## Scope')
    if (story.inScope.length) {
      lines.push('')
      lines.push('**In Scope**')
      story.inScope.forEach(i => lines.push(`- ${i}`))
    }
    if (story.outOfScope.length) {
      lines.push('')
      lines.push('**Out of Scope**')
      story.outOfScope.forEach(i => lines.push(`- ${i}`))
    }
  }

  if (story.assumptions.length) {
    lines.push('')
    lines.push('## Assumptions')
    story.assumptions.forEach(a => lines.push(`- ${a}`))
  }

  if (story.crossFunctionalNeeds.length) {
    lines.push('')
    lines.push('## Cross-functional Needs')
    story.crossFunctionalNeeds.forEach(n => lines.push(`- ${n}`))
  }

  return lines.join('\n')
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

// ── Excel ─────────────────────────────────────────────────────────────────────

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename)
}

export function exportEpicsToExcel(epics: Epic[]) {
  const rows = epics.map(e => ({
    'ID':          e.id,
    'Title':       e.title,
    'Description': e.description,
    'Priority':    e.priority,
    'Category':    e.category,
    'Tags':        e.tags.join(', '),
    'Stories':     (e.stories ?? []).length,
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 40 }, { wch: 60 }, { wch: 10 },
    { wch: 22 }, { wch: 30 }, { wch: 8 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Epics')
  download(wb, 'epics.xlsx')
}

export function exportStoriesToExcel(stories: Story[], epicTitle?: string) {
  const rows = stories.map(s => ({
    'ID':                    s.id,
    'Title':                 s.title,
    'Priority':              s.priority,
    'Story Points':          s.storyPoints ?? '',
    'Story Description':     `As a ${s.asA}, I want to ${s.iWantTo}, so that ${s.soThat}.`,
    'Acceptance Criteria':   s.acceptanceCriteria.join('\n'),
    'In Scope':              s.inScope.join('\n'),
    'Out of Scope':          s.outOfScope.join('\n'),
    'Assumptions':           s.assumptions.join('\n'),
    'Cross-functional Needs': s.crossFunctionalNeeds.join('\n'),
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 12 }, { wch: 40 }, { wch: 10 }, { wch: 12 },
    { wch: 60 },
    { wch: 50 }, { wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 35 },
  ]

  const sheetName = epicTitle ? epicTitle.slice(0, 31) : 'Stories'
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  download(wb, `${sheetName.toLowerCase().replace(/\s+/g, '-')}-stories.xlsx`)
}

export function exportAllToExcel(epics: Epic[]) {
  const wb = XLSX.utils.book_new()

  // Epics sheet
  const epicRows = epics.map(e => ({
    'ID':          e.id,
    'Title':       e.title,
    'Description': e.description,
    'Priority':    e.priority,
    'Category':    e.category,
    'Tags':        e.tags.join(', '),
    'Stories':     (e.stories ?? []).length,
  }))
  const wsEpics = XLSX.utils.json_to_sheet(epicRows)
  wsEpics['!cols'] = [
    { wch: 12 }, { wch: 40 }, { wch: 60 }, { wch: 10 },
    { wch: 22 }, { wch: 30 }, { wch: 8 },
  ]
  XLSX.utils.book_append_sheet(wb, wsEpics, 'Epics')

  // One sheet per epic that has stories
  epics.forEach(e => {
    if (!e.stories?.length) return
    const rows = e.stories.map(s => ({
      'Title':                 s.title,
      'Priority':              s.priority,
      'Story Points':          s.storyPoints ?? '',
      'Story Description':     `As a ${s.asA}, I want to ${s.iWantTo}, so that ${s.soThat}.`,
      'Acceptance Criteria':   s.acceptanceCriteria.join('\n'),
      'In Scope':              s.inScope.join('\n'),
      'Out of Scope':          s.outOfScope.join('\n'),
      'Assumptions':           s.assumptions.join('\n'),
      'Cross-functional Needs': s.crossFunctionalNeeds.join('\n'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 40 }, { wch: 10 }, { wch: 12 },
      { wch: 60 },
      { wch: 50 }, { wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 35 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, e.title.slice(0, 31))
  })

  download(wb, 'epics.xlsx')
}
