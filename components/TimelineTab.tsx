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

function collectSprints(epics: JiraEpic[]): JiraSprint[] {
  const map = new Map<number, JiraSprint>()
  for (const e of epics)
    for (const s of e.sprints)
      if (!map.has(s.id)) map.set(s.id, s)
  return [...map.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

// ─── Sprint card ─────────────────────────────────────────────────────────────

function getEpicStatusKey(status: string): 'todo' | 'progress' | 'review' | 'done' {
  const s = status.toLowerCase()
  if (s.includes('progress') || s.includes('doing') || s.includes('start') || s.includes('building') || s.includes('shaping')) return 'progress'
  if (s.includes('review') || s.includes('testing') || s.includes('block')) return 'review'
  if (s.includes('done') || s.includes('complete') || s.includes('close') || s.includes('delivered') || s.includes('released') || s.includes('ship')) return 'done'
  return 'todo'
}

function SprintCard({ sprint, epics }: { sprint: JiraSprint; epics: JiraEpic[] }) {
  const inSprint = epics.filter(e => e.sprints.some(s => s.id === sprint.id))
  const byProject = inSprint.reduce<Record<string, JiraEpic[]>>((acc, e) => {
    ;(acc[e.project] = acc[e.project] ?? []).push(e)
    return acc
  }, {})

  const isActive = sprint.state === 'active'
  const isFuture = sprint.state === 'future'
  const isEmpty = inSprint.length === 0

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px ${isFuture ? 'dashed' : 'solid'} ${isActive ? 'var(--pdAccent04)' : 'var(--pdBorder)'}`,
      }}
    >
      {/* Sprint header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: isActive ? 'var(--pdAccent01)' : 'var(--pdSurface2)' }}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isActive ? 'var(--pdAccent06)' : 'var(--pdBorderStrong)' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-semibold"
              style={{ color: isActive ? 'var(--pdAccent07)' : 'var(--pdTextBase)' }}
            >
              {sprint.name}
            </span>
            {isActive && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--pdAccent02)', color: 'var(--pdAccent07)' }}
              >
                Active
              </span>
            )}
            {isFuture && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ border: '1px solid var(--pdBorder)', color: 'var(--pdTextSubtle)' }}
              >
                Upcoming
              </span>
            )}
          </div>
          {sprint.goal && (
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--pdTextMuted)' }}>
              {sprint.goal}
            </p>
          )}
        </div>
        <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--pdTextSubtle)' }}>
          {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
        </span>
      </div>

      {/* Epic list */}
      {isEmpty ? (
        <div className="px-4 py-3">
          <p className="text-xs italic" style={{ color: 'var(--pdTextSubtle)' }}>
            No epics linked to this sprint.
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(byProject).map(([proj, epicList]) => (
            <div key={proj} style={{ borderTop: '1px solid var(--pdBorder)' }}>
              {/* Project label */}
              <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--pdTextSubtle)' }}>
                  {proj}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--pdBorderStrong)' }}>
                  {epicList.length} epic{epicList.length !== 1 ? 's' : ''}
                </span>
              </div>
              {epicList.map((e, idx) => {
                const statusKey = getEpicStatusKey(e.status)
                const end = e.dueDate ?? e.handoverDate
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderTop: idx > 0 ? '1px solid var(--pdBorder)' : undefined }}
                  >
                    <span className="text-xs font-mono shrink-0 w-24" style={{ color: 'var(--pdTextSubtle)' }}>
                      {e.key}
                    </span>
                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--pdTextBase)' }}>
                      {e.summary}
                    </span>
                    {end && (
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--pdTextSubtle)' }}>
                        {fmt(end)}
                      </span>
                    )}
                    <span className={`StatusPill StatusPill--${statusKey} shrink-0`}>{e.status}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Gantt chart ──────────────────────────────────────────────────────────────

function GanttChart({ epics, sprints }: { epics: JiraEpic[]; sprints: JiraSprint[] }) {
  const windowStart = getWindowStart()
  const monthMarkers = getMonthMarkers(windowStart)
  const todayLeft = toPercent(VISIBLE_DAYS)

  const datedEpics = epics.filter(e => e.dueDate || e.handoverDate)

  const byProject = datedEpics.reduce<Record<string, JiraEpic[]>>((acc, e) => {
    ;(acc[e.project] = acc[e.project] ?? []).push(e)
    return acc
  }, {})

  if (datedEpics.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--pdTextSubtle)' }}>
        No epics have dates set in Jira. Add start/due dates to epics to see them here.
      </p>
    )
  }

  const sprintBands = sprints.filter(s => s.startDate && s.endDate).map(s => {
    const start = dayOffset(new Date(s.startDate), windowStart)
    const end = dayOffset(new Date(s.endDate), windowStart)
    return { ...s, left: toPercent(start), width: toPercent(end - start) }
  })

  // Returns an inline style background color
  const epicBarColor = (e: JiraEpic): string => {
    const isShipped = ['done', 'ship', 'released', 'closed', 'cancelled'].some(x => e.status.toLowerCase().includes(x))
    const end = e.dueDate ?? e.handoverDate
    if (isShipped) return 'var(--pdStatusDoneText)'
    if (!end) return 'var(--pdBorderStrong)'
    const daysLeft = dayOffset(new Date(end), new Date())
    if (daysLeft < 0) return 'var(--pdPrioHigh)'
    if (daysLeft <= 14) return 'var(--pdPrioMedium)'
    return 'var(--pdAccent06)'
  }

  const activeBandBg = 'color-mix(in srgb, var(--pdAccent06) 6%, transparent)'

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--pdSurface1)', border: '1px solid var(--pdBorder)' }}
    >
      {/* Month header */}
      <div
        className="relative h-8 select-none"
        style={{ background: 'var(--pdSurface2)', borderBottom: '1px solid var(--pdBorder)' }}
      >
        {sprintBands.map(s => (
          <div
            key={s.id}
            className="absolute top-0 h-full"
            style={{ left: s.left, width: s.width, background: s.state === 'active' ? activeBandBg : 'transparent' }}
          />
        ))}
        {monthMarkers.map(m => (
          <div key={m.label} className="absolute top-0 h-full flex items-center" style={{ left: m.left }}>
            <div className="absolute top-0 bottom-0 w-px" style={{ background: 'var(--pdBorder)' }} />
            <span className="text-xs pl-1.5 whitespace-nowrap relative z-10" style={{ color: 'var(--pdTextSubtle)' }}>
              {m.label}
            </span>
          </div>
        ))}
        <div className="absolute top-0 h-full w-0.5" style={{ left: todayLeft, background: 'var(--pdAccentA03)' }} />
      </div>

      {/* Project groups */}
      {Object.entries(byProject).map(([proj, projEpics]) => (
        <div key={proj}>
          {/* Project header */}
          <div
            className="relative flex items-center h-8"
            style={{ background: 'var(--pdSurface2)', borderBottom: '1px solid var(--pdBorder)' }}
          >
            <div className="w-52 shrink-0 px-4">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--pdTextMuted)' }}>
                {proj}
              </span>
            </div>
            <div className="flex-1 relative h-full">
              {sprintBands.map(s => (
                <div
                  key={s.id}
                  className="absolute top-0 h-full"
                  style={{ left: s.left, width: s.width, background: s.state === 'active' ? activeBandBg : 'transparent' }}
                />
              ))}
            </div>
          </div>

          {/* Epic rows */}
          <div>
            {projEpics.map((epic, i) => {
              const end = epic.dueDate ?? epic.handoverDate
              const startD = epic.startDate ? new Date(epic.startDate) : (end ? new Date(new Date(end).getTime() - 14 * 86400000) : null)
              const endD = end ? new Date(end) : null
              const barLeft = startD ? toPercent(dayOffset(startD, windowStart)) : '48%'
              const barWidth = (startD && endD) ? toPercent(Math.max(1, dayOffset(endD, windowStart) - dayOffset(startD, windowStart))) : '2%'

              return (
                <div
                  key={epic.id}
                  className="relative flex items-center h-11 transition-colors group"
                  style={{ borderTop: i > 0 ? '1px solid var(--pdBorder)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--pdSurface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none" style={{ left: todayLeft, background: 'var(--pdAccentA02)' }} />
                  {sprintBands.map(s => (
                    <div
                      key={s.id}
                      className="absolute top-0 h-full pointer-events-none"
                      style={{ left: s.left, width: s.width, background: s.state === 'active' ? activeBandBg : 'transparent' }}
                    />
                  ))}
                  {monthMarkers.map(m => (
                    <div
                      key={m.label}
                      className="absolute top-0 bottom-0 w-px pointer-events-none"
                      style={{ left: m.left, background: 'var(--pdBorder)' }}
                    />
                  ))}

                  {/* Epic label */}
                  <div
                    className="w-52 shrink-0 px-4 z-20 transition-colors"
                    style={{ background: 'var(--pdSurface1)' }}
                  >
                    <span className="text-xs font-mono" style={{ color: 'var(--pdTextSubtle)' }}>{epic.key}</span>
                    <p className="text-xs truncate" style={{ color: 'var(--pdTextBase)' }}>{epic.summary}</p>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 relative h-full overflow-hidden">
                    <div
                      className="absolute top-2.5 h-6 rounded-md opacity-90 flex items-center px-2 min-w-[4px]"
                      style={{ left: barLeft, width: barWidth, background: epicBarColor(epic) }}
                      title={`${epic.startDate ? fmt(epic.startDate) + ' → ' : ''}${fmt(end)}`}
                    >
                      <span className="text-xs font-medium truncate whitespace-nowrap" style={{ color: '#fff' }}>
                        {epic.startDate ? `${fmt(epic.startDate)} → ` : ''}{fmt(end)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-24 shrink-0 pr-4 z-20 text-right">
                    <span className="text-xs truncate" style={{ color: 'var(--pdTextSubtle)' }}>{epic.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Legend row */}
      <div
        className="flex items-center gap-4 px-4 py-2 flex-wrap"
        style={{ borderTop: '1px solid var(--pdBorder)', background: 'var(--pdSurface2)' }}
      >
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--pdTextSubtle)' }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: 'var(--pdAccent06)' }} />
          On track
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--pdTextSubtle)' }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: 'var(--pdPrioMedium)' }} />
          Due &lt; 2 weeks
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--pdTextSubtle)' }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: 'var(--pdPrioHigh)' }} />
          Overdue
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--pdTextSubtle)' }}>
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: 'var(--pdStatusDoneText)' }} />
          Shipped
        </div>
        <div className="flex items-center gap-1.5 text-xs ml-auto" style={{ color: 'var(--pdTextSubtle)' }}>
          <span
            className="w-8 h-3 rounded-sm inline-block"
            style={{ background: activeBandBg, border: '1px solid var(--pdAccent03)' }}
          />
          Active sprint
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineTab({ epics }: Props) {
  const [tab, setTab] = useState<'sprints' | 'roadmap'>('roadmap')

  if (epics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24" style={{ color: 'var(--pdTextMuted)' }}>
        <p className="text-sm">No epics to display. Sync your Jira data first.</p>
      </div>
    )
  }

  const allSprints = collectSprints(epics)
  const activeSprints = allSprints.filter(s => s.state === 'active')
  const futureSprints = allSprints.filter(s => s.state === 'future')
  const recentClosed = allSprints.filter(s => s.state === 'closed').slice(-5).reverse()
  const displayedSprints = [...futureSprints, ...activeSprints, ...recentClosed]

  const undatedEpics = epics.filter(e => !e.dueDate && !e.handoverDate && e.sprints.length === 0)

  return (
    <div className="space-y-5">

      {/* Tab toggle */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center rounded-lg p-0.5 text-xs"
          style={{ background: 'var(--pdSurface3)', border: '1px solid var(--pdBorder)' }}
        >
          <button
            onClick={() => setTab('roadmap')}
            className="px-3 py-1.5 rounded-md transition-colors"
            style={tab === 'roadmap' ? {
              background: 'var(--pdSurface1)',
              color: 'var(--pdTextStrong)',
              boxShadow: 'var(--pdShadowSm)',
            } : { color: 'var(--pdTextMuted)' }}
          >
            Roadmap
          </button>
          <button
            onClick={() => setTab('sprints')}
            className="px-3 py-1.5 rounded-md transition-colors"
            style={tab === 'sprints' ? {
              background: 'var(--pdSurface1)',
              color: 'var(--pdTextStrong)',
              boxShadow: 'var(--pdShadowSm)',
            } : { color: 'var(--pdTextMuted)' }}
          >
            Sprints
          </button>
        </div>
        <span className="text-xs" style={{ color: 'var(--pdTextSubtle)' }}>
          {tab === 'sprints'
            ? `${displayedSprints.length} sprints · ${epics.length} epics`
            : `${epics.filter(e => e.dueDate || e.handoverDate).length} dated epics`}
        </span>
      </div>

      {/* Sprints view */}
      {tab === 'sprints' && (
        <div className="space-y-3">
          {displayedSprints.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--pdTextSubtle)' }}>
              No sprint data found. Sync to refresh.
            </p>
          )}
          {displayedSprints.map(sprint => (
            <SprintCard key={sprint.id} sprint={sprint} epics={epics} />
          ))}
          {undatedEpics.length > 0 && (
            <details className="group">
              <summary
                className="cursor-pointer select-none list-none flex items-center gap-1.5 py-1 text-xs"
                style={{ color: 'var(--pdTextSubtle)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform group-open:rotate-90">
                  <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {undatedEpics.length} epic{undatedEpics.length !== 1 ? 's' : ''} with no sprint or dates
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {undatedEpics.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--pdTextMuted)' }}>
                    <span className="font-mono" style={{ color: 'var(--pdTextSubtle)' }}>{e.key}</span>
                    <span className="truncate">{e.summary}</span>
                    <span className="shrink-0" style={{ color: 'var(--pdTextSubtle)' }}>{e.status}</span>
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
