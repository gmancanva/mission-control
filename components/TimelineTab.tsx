'use client'

import { useState } from 'react'
import type { JiraEpic, JiraSprint } from '@/lib/jira'

type Props = {
  epics: JiraEpic[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VISIBLE_DAYS = 120
const TOTAL_DAYS = VISIBLE_DAYS * 2

function getWindowStart(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - VISIBLE_DAYS)
  return d
}

function dayOffset(date: Date, windowStart: Date): number {
  return Math.round((date.getTime() - windowStart.getTime()) / 86400000)
}

function toPercent(days: number): string {
  return `${Math.max(0, Math.min(100, (days / TOTAL_DAYS) * 100)).toFixed(2)}%`
}

function fmt(d: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', opts ?? { day: 'numeric', month: 'short' })
}

function getMonthMarkers(windowStart: Date): { label: string; left: string }[] {
  const markers: { label: string; left: string }[] = []
  const cur = new Date(windowStart); cur.setDate(1)
  const end = windowStart.getTime() + TOTAL_DAYS * 86400000
  while (cur.getTime() < end) {
    const offset = dayOffset(cur, windowStart)
    if (offset >= 0)
      markers.push({ label: cur.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }), left: toPercent(offset) })
    cur.setMonth(cur.getMonth() + 1)
  }
  return markers
}

// Collect unique sprints from all epics, sorted by date
function collectSprints(epics: JiraEpic[]): JiraSprint[] {
  const map = new Map<number, JiraSprint>()
  for (const e of epics)
    for (const s of e.sprints)
      if (!map.has(s.id)) map.set(s.id, s)
  return [...map.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// ─── Sprint card ─────────────────────────────────────────────────────────────

function SprintCard({ sprint, epics }: { sprint: JiraSprint; epics: JiraEpic[] }) {
  const inSprint = epics.filter(e => e.sprints.some(s => s.id === sprint.id))
  const byProject = inSprint.reduce<Record<string, JiraEpic[]>>((acc, e) => {
    ;(acc[e.project] = acc[e.project] ?? []).push(e)
    return acc
  }, {})

  const isActive = sprint.state === 'active'
  const isFuture = sprint.state === 'future'

  return (
    <div className={`rounded-xl border p-4 ${
      isActive
        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/20'
        : isFuture
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
          isActive ? 'bg-blue-500' : isFuture ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-300 dark:bg-gray-700'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${
              isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}>{sprint.name}</span>
            {isActive && <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">Active</span>}
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
            </span>
          </div>
          {sprint.goal && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{sprint.goal}</p>
          )}
          {Object.entries(byProject).length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2.5">
              {Object.entries(byProject).map(([proj, epicList]) => (
                <div key={proj} className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{proj}</span>
                  <div className="flex flex-wrap gap-1">
                    {epicList.slice(0, 4).map(e => (
                      <span key={e.id} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded truncate max-w-[140px]" title={e.summary}>
                        {e.summary.length > 28 ? e.summary.slice(0, 28) + '…' : e.summary}
                      </span>
                    ))}
                    {epicList.length > 4 && (
                      <span className="text-xs text-gray-400">+{epicList.length - 4}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Gantt chart ──────────────────────────────────────────────────────────────

function GanttChart({ epics, sprints }: { epics: JiraEpic[]; sprints: JiraSprint[] }) {
  const windowStart = getWindowStart()
  const monthMarkers = getMonthMarkers(windowStart)
  const todayLeft = toPercent(VISIBLE_DAYS)

  // Only epics with at least a due date
  const datedEpics = epics.filter(e => e.dueDate || e.handoverDate)

  // Group by project
  const byProject = datedEpics.reduce<Record<string, JiraEpic[]>>((acc, e) => {
    ;(acc[e.project] = acc[e.project] ?? []).push(e)
    return acc
  }, {})

  if (datedEpics.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">
        No epics have dates set in Jira. Add start/due dates to epics to see them here.
      </p>
    )
  }

  const sprintBands = sprints.filter(s => s.startDate && s.endDate).map(s => {
    const start = dayOffset(new Date(s.startDate), windowStart)
    const end = dayOffset(new Date(s.endDate), windowStart)
    return { ...s, left: toPercent(start), width: toPercent(end - start) }
  })

  const epicColor = (e: JiraEpic): string => {
    const isShipped = ['done', 'ship', 'released', 'closed', 'cancelled'].some(x => e.status.toLowerCase().includes(x))
    const end = e.dueDate ?? e.handoverDate
    if (isShipped) return 'bg-green-500 dark:bg-green-600'
    if (!end) return 'bg-gray-300 dark:bg-gray-600'
    const daysLeft = dayOffset(new Date(end), new Date())
    if (daysLeft < 0) return 'bg-red-500 dark:bg-red-600'
    if (daysLeft <= 14) return 'bg-amber-400 dark:bg-amber-500'
    return 'bg-blue-500 dark:bg-blue-600'
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Month header */}
      <div className="relative h-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 select-none">
        {/* Sprint bands in header */}
        {sprintBands.map(s => (
          <div
            key={s.id}
            className={`absolute top-0 h-full ${s.state === 'active' ? 'bg-blue-100/60 dark:bg-blue-900/20' : 'bg-gray-100/40 dark:bg-gray-800/20'}`}
            style={{ left: s.left, width: s.width }}
          />
        ))}
        {monthMarkers.map(m => (
          <div key={m.label} className="absolute top-0 h-full flex items-center" style={{ left: m.left }}>
            <div className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 dark:text-gray-500 pl-1.5 whitespace-nowrap relative z-10">{m.label}</span>
          </div>
        ))}
        <div className="absolute top-0 h-full w-0.5 bg-blue-400/50" style={{ left: todayLeft }} />
      </div>

      {/* Project groups */}
      {Object.entries(byProject).map(([proj, projEpics]) => (
        <div key={proj}>
          {/* Project header */}
          <div className="relative flex items-center h-8 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/60">
            <div className="w-52 shrink-0 px-4">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{proj}</span>
            </div>
            <div className="flex-1 relative h-full">
              {sprintBands.map(s => (
                <div key={s.id} className={`absolute top-0 h-full ${s.state === 'active' ? 'bg-blue-50/80 dark:bg-blue-900/10' : ''}`} style={{ left: s.left, width: s.width }} />
              ))}
            </div>
          </div>

          {/* Epic rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {projEpics.map(epic => {
              const end = epic.dueDate ?? epic.handoverDate
              const startD = epic.startDate ? new Date(epic.startDate) : (end ? new Date(new Date(end).getTime() - 14 * 86400000) : null)
              const endD = end ? new Date(end) : null
              const barLeft = startD ? toPercent(dayOffset(startD, windowStart)) : '48%'
              const barWidth = (startD && endD) ? toPercent(Math.max(1, dayOffset(endD, windowStart) - dayOffset(startD, windowStart))) : '2%'

              return (
                <div key={epic.id} className="relative flex items-center h-11 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                  <div className="absolute top-0 bottom-0 w-px bg-blue-400/20 z-10 pointer-events-none" style={{ left: todayLeft }} />
                  {sprintBands.map(s => (
                    <div key={s.id} className={`absolute top-0 h-full pointer-events-none ${s.state === 'active' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`} style={{ left: s.left, width: s.width }} />
                  ))}
                  {monthMarkers.map(m => (
                    <div key={m.label} className="absolute top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-800/40 pointer-events-none" style={{ left: m.left }} />
                  ))}

                  {/* Epic label */}
                  <div className="w-52 shrink-0 px-4 z-20 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/30 transition-colors">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{epic.key}</span>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{epic.summary}</p>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 relative h-full overflow-hidden">
                    <div
                      className={`absolute top-2.5 h-6 rounded-md ${epicColor(epic)} opacity-85 flex items-center px-2 min-w-[4px]`}
                      style={{ left: barLeft, width: barWidth }}
                      title={`${epic.startDate ? fmt(epic.startDate) + ' → ' : ''}${fmt(end)}`}
                    >
                      <span className="text-xs text-white font-medium truncate whitespace-nowrap">
                        {epic.startDate ? `${fmt(epic.startDate)} → ` : ''}{fmt(end)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-24 shrink-0 pr-4 z-20 text-right">
                    <span className="text-xs text-gray-400 dark:text-gray-600 truncate">{epic.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Legend row */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex-wrap">
        {(['blue-500', 'amber-400', 'red-500', 'green-500'] as const).map((_, i) => null)}
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block"/>On track</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-2 rounded-sm bg-amber-400 inline-block"/>Due &lt; 2 weeks</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block"/>Overdue</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-2 rounded-sm bg-green-500 inline-block"/>Shipped</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
          <span className="w-8 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/30 inline-block border border-blue-200 dark:border-blue-800"/>Active sprint
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineTab({ epics }: Props) {
  const [tab, setTab] = useState<'sprints' | 'roadmap'>('sprints')

  if (epics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-gray-500">
        <p className="text-sm">No epics to display. Sync your Jira data first.</p>
      </div>
    )
  }

  const allSprints = collectSprints(epics)
  // Show active first, then most recent 6 closed, then future
  const activeSprints = allSprints.filter(s => s.state === 'active')
  const futureSprints = allSprints.filter(s => s.state === 'future')
  const recentClosed = allSprints.filter(s => s.state === 'closed').slice(-5).reverse()
  const displayedSprints = [...futureSprints, ...activeSprints, ...recentClosed]

  const undatedEpics = epics.filter(e => !e.dueDate && !e.handoverDate && e.sprints.length === 0)

  return (
    <div className="space-y-5">

      {/* Tab toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setTab('sprints')}
            className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'sprints' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            Sprints
          </button>
          <button
            onClick={() => setTab('roadmap')}
            className={`px-3 py-1.5 rounded-md transition-colors ${tab === 'roadmap' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
          >
            Roadmap
          </button>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-600">
          {tab === 'sprints' ? `${displayedSprints.length} sprints · ${epics.length} epics` : `${epics.filter(e => e.dueDate || e.handoverDate).length} dated epics`}
        </span>
      </div>

      {/* Sprints view */}
      {tab === 'sprints' && (
        <div className="space-y-3">
          {displayedSprints.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No sprint data found. Sync to refresh.</p>
          )}
          {displayedSprints.map(sprint => (
            <SprintCard key={sprint.id} sprint={sprint} epics={epics} />
          ))}
          {undatedEpics.length > 0 && (
            <details className="group">
              <summary className="text-xs text-gray-400 dark:text-gray-600 cursor-pointer hover:text-gray-600 dark:hover:text-gray-400 select-none list-none flex items-center gap-1.5 py-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform group-open:rotate-90">
                  <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {undatedEpics.length} epic{undatedEpics.length !== 1 ? 's' : ''} with no sprint or dates
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {undatedEpics.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <span className="font-mono text-gray-400 dark:text-gray-600">{e.key}</span>
                    <span className="truncate">{e.summary}</span>
                    <span className="shrink-0 text-gray-400 dark:text-gray-600">{e.status}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Roadmap / Gantt view */}
      {tab === 'roadmap' && (
        <GanttChart epics={epics} sprints={allSprints} />
      )}
    </div>
  )
}
