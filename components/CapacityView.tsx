'use client'

import { useState, useEffect } from 'react'
import type { SprintInfo, SprintTicket } from '@/lib/jira'
import type { CalendarCapacity } from '@/lib/google-calendar'
import type { CalendarWeekly } from '@/app/api/calendar/weekly/route'

type Props = {
  sprintCapacityHours?: number
}

function getStatusKey(status: string): 'todo' | 'progress' | 'review' | 'done' {
  const s = status.toLowerCase()
  if (s.includes('progress') || s.includes('doing') || s.includes('start') || s.includes('building') || s.includes('shaping')) return 'progress'
  if (s.includes('review') || s.includes('testing') || s.includes('block')) return 'review'
  if (s.includes('done') || s.includes('complete') || s.includes('close') || s.includes('delivered') || s.includes('released')) return 'done'
  return 'todo'
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" style={{ width: 13, height: 13 }}>
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6h11M5 1.5v2M9 1.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" style={{ width: 12, height: 12 }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3.5L9.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--pdStatusDoneFg)',
      background: 'var(--pdStatusDoneBg)',
      border: '1px solid var(--pdStatusDoneBorder)',
      padding: '2px 8px',
      borderRadius: 'var(--pdRadiusPill)',
      letterSpacing: '0.02em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pdStatusDoneDot)', flexShrink: 0 }} />
      Live
    </span>
  )
}

export default function CapacityView({ sprintCapacityHours = 30 }: Props) {
  const [loadingJira, setLoadingJira] = useState(true)
  const [loadingCal, setLoadingCal] = useState(true)

  const [sprintInfo, setSprintInfo] = useState<{ active: SprintInfo | null; next: SprintInfo | null }>({ active: null, next: null })
  const [sprintTickets, setSprintTickets] = useState<SprintTicket[]>([])
  const [calCapacity, setCalCapacity] = useState<(CalendarCapacity & { configured?: boolean; noSprint?: boolean }) | null>(null)
  const [weeklyMeetings, setWeeklyMeetings] = useState<(CalendarWeekly & { available: boolean }) | null>(null)
  const [showMeetingDay, setShowMeetingDay] = useState<string | null>(null)

  // Whether to show daily meeting breakdown (expandable)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    fetch('/api/jira/sprint')
      .then((r) => r.json())
      .then((d: { active: SprintInfo | null; next: SprintInfo | null; sprintTickets: SprintTicket[] }) => {
        setSprintInfo({ active: d.active, next: d.next })
        setSprintTickets(d.sprintTickets ?? [])
      })
      .catch(() => { /* show empty state */ })
      .finally(() => setLoadingJira(false))

    fetch('/api/calendar/capacity')
      .then((r) => r.json())
      .then((d: CalendarCapacity & { configured?: boolean; noSprint?: boolean }) => setCalCapacity(d))
      .catch(() => { /* calendar optional */ })
      .finally(() => setLoadingCal(false))

    fetch('/api/calendar/weekly')
      .then((r) => r.json())
      .then((d: CalendarWeekly & { available: boolean }) => setWeeklyMeetings(d))
      .catch(() => { /* optional */ })
  }, [])

  // isLive = full OAuth capacity (sprint-scoped, accurate productive hours)
  const isLive = calCapacity?.connected === true && !calCapacity.noSprint
  // hasWeeklyCache = MCP-synced weekly file cache is available (different auth path)
  const hasWeeklyCache = weeklyMeetings?.available === true
  // Either source can power the stacked bar
  const hasMeetingData = isLive || hasWeeklyCache

  const allocatedHours = sprintTickets.reduce((sum, t) => sum + (t.estimateHours ?? 0), 0)

  const HOURS_PER_DAY = 8

  // Gross hours denominator: sprint working days (OAuth) or 5-day week (cache fallback)
  const grossWorkingDays = isLive ? (calCapacity?.workingDays ?? 0) : hasWeeklyCache ? 5 : 0
  const totalGrossHours = hasMeetingData && grossWorkingDays > 0
    ? grossWorkingDays * HOURS_PER_DAY
    : sprintCapacityHours

  // Meeting hours: sprint-scoped (OAuth) or this week's total (cache)
  const meetingHours = isLive
    ? (calCapacity?.totalMeetingHours ?? 0)
    : hasWeeklyCache
      ? Math.round((weeklyMeetings!.weekly_total_min / 60) * 10) / 10
      : 0

  // % of the gross bar each segment occupies
  const meetingPct = totalGrossHours > 0 ? Math.min(100, Math.round((meetingHours / totalGrossHours) * 100)) : 0
  const taskPct    = totalGrossHours > 0 ? Math.min(100 - meetingPct, Math.round((allocatedHours / totalGrossHours) * 100)) : 0
  const combinedPct = meetingPct + taskPct

  // Remaining productive capacity
  const effectiveCapacity = isLive
    ? (calCapacity?.capacityHours ?? 0)
    : hasMeetingData
      ? Math.max(0, totalGrossHours - meetingHours)
      : sprintCapacityHours
  const remainingHours = Math.max(0, effectiveCapacity - allocatedHours)

  // Colour badge by task load vs available productive time
  const utilizationOfProductive = effectiveCapacity > 0
    ? Math.min(100, Math.round((allocatedHours / effectiveCapacity) * 100))
    : 0

  const badgeColor =
    utilizationOfProductive >= 90 ? '#EF4444'
    : utilizationOfProductive >= 70 ? '#F59E0B'
    : '#22C55E'

  const teams = Array.from(new Set(sprintTickets.map((t) => t.project))).sort()
  const ticketsByTeam = teams.reduce<Record<string, SprintTicket[]>>((acc, team) => {
    acc[team] = sprintTickets.filter((t) => t.project === team)
    return acc
  }, {})

  const loading = loadingJira

  const sprintName = sprintInfo.active?.name ?? 'Current Sprint'
  const sprintStart = formatDate(sprintInfo.active?.startDate)
  const sprintEnd = formatDate(sprintInfo.active?.endDate)
  const sprintDateRange = sprintStart && sprintEnd ? `${sprintStart} – ${sprintEnd}` : ''

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div className="EmptyState">
          <div className="EmptyState__icon" style={{ background: 'none', boxShadow: 'none' }}>
            <picture>
              <source srcSet="/loopi-loading.webp" type="image/webp" />
              <img src="/loopi-loading.gif" alt="Loading…" width={96} height={104} style={{ imageRendering: 'pixelated' }} />
            </picture>
          </div>
          <p className="EmptyState__title">Loading capacity data…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          .PdSidebar, .PdTopbar, .FilterBar, .CapacityExportBtn, .CapacityCalBtn { display: none !important; }
          body { background: white !important; }
          .CapacityPrintArea { padding: 24px !important; }
        }
      `}</style>

      <div className="CapacityPrintArea" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pdTextStrong)', margin: 0 }}>
              Capacity
            </h2>
            {sprintDateRange && (
              <p style={{ fontSize: 13, color: 'var(--pdTextMuted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarIcon /> {sprintDateRange}
              </p>
            )}
          </div>
          <button
            className="CapacityExportBtn PdButton PdButton--secondary PdButton--small"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ExportIcon />
            Export PDF
          </button>
        </div>

        {/* Section 1: Sprint summary bar */}
        <div style={{
          background: 'var(--pdSurface1)',
          border: '1px solid var(--pdBorder)',
          borderRadius: 'var(--pdRadiusLg)',
          padding: 24,
          boxShadow: 'var(--pdShadowSm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--pdTextStrong)', margin: 0 }}>
                  {sprintName}
                </h3>
                {isLive && <LiveBadge />}
              </div>
              {sprintDateRange && (
                <span style={{ fontSize: 12, color: 'var(--pdTextMuted)' }}>{sprintDateRange}</span>
              )}
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 800,
              color: badgeColor,
              letterSpacing: '-0.02em',
            }}>
              {combinedPct}%
            </div>
          </div>

          {/* Stacked capacity bar: meetings (blue) + tasks (dynamic colour) */}
          <div style={{
            height: 12,
            background: 'var(--pdSurface3)',
            borderRadius: 'var(--pdRadiusPill)',
            overflow: 'hidden',
            marginBottom: 10,
            display: 'flex',
          }}>
            {/* Meetings segment */}
            {meetingPct > 0 && (
              <div style={{
                height: '100%',
                width: `${meetingPct}%`,
                background: '#3B82F6',
                transition: 'width 600ms cubic-bezier(.4,0,.2,1)',
                flexShrink: 0,
              }} />
            )}
            {/* Tasks segment */}
            {taskPct > 0 && (
              <div style={{
                height: '100%',
                width: `${taskPct}%`,
                background: badgeColor,
                transition: 'width 600ms cubic-bezier(.4,0,.2,1)',
                flexShrink: 0,
              }} />
            )}
          </div>

          {/* Legend */}
          {hasMeetingData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--pdTextMuted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3B82F6', flexShrink: 0 }} />
                Meetings
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--pdTextMuted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: badgeColor, flexShrink: 0 }} />
                Tasks
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--pdTextMuted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--pdSurface3)', border: '1px solid var(--pdBorder)', flexShrink: 0 }} />
                Available
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--pdTextMuted)' }}>
              {hasMeetingData && meetingHours > 0 && (
                <><strong style={{ color: '#3B82F6' }}>{meetingHours}h</strong>
                {' '}{hasWeeklyCache && !isLive ? 'meetings this week · ' : 'meetings · '}</>
              )}
              <strong style={{ color: 'var(--pdTextStrong)' }}>{allocatedHours}h</strong>{' tasks · '}
              <strong style={{ color: 'var(--pdTextStrong)' }}>{totalGrossHours}h</strong> total —{' '}
              <strong style={{ color: badgeColor }}>{remainingHours}h</strong> productive remaining
              {isLive && calCapacity?.workingDays != null && (
                <span style={{ color: 'var(--pdTextSubtle)', marginLeft: 6 }}>
                  ({calCapacity.workingDays} working days)
                </span>
              )}
              {!isLive && hasWeeklyCache && (
                <span style={{ color: 'var(--pdTextSubtle)', marginLeft: 6 }}>
                  (this week)
                </span>
              )}
            </span>

            {!loadingCal && !isLive && !hasWeeklyCache && (
              <a
                href="/?view=settings"
                className="CapacityCalBtn"
                style={{
                  fontSize: 12,
                  color: 'var(--pdAccent06)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'transparent',
                }}
              >
                <CalendarIcon />
                Connect Google Calendar for accurate hours →
              </a>
            )}

            {isLive && calCapacity?.dailyBreakdown && calCapacity.dailyBreakdown.length > 0 && (
              <button
                onClick={() => setShowBreakdown((v) => !v)}
                style={{
                  fontSize: 12,
                  color: 'var(--pdAccent06)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                {showBreakdown ? 'Hide breakdown' : 'Show daily breakdown'}
              </button>
            )}
          </div>

          {/* Daily breakdown (Google Calendar) */}
          {isLive && showBreakdown && calCapacity?.dailyBreakdown && (
            <div style={{
              marginTop: 16,
              borderTop: '1px solid var(--pdBorder)',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {calCapacity.dailyBreakdown.map((day) => (
                <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <span style={{ width: 80, flexShrink: 0, color: 'var(--pdTextMuted)' }}>
                    {new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <div style={{ flex: 1, height: 6, background: 'var(--pdSurface3)', borderRadius: 'var(--pdRadiusPill)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (day.meetingHours / 8) * 100)}%`,
                      background: '#3B82F6',
                      borderRadius: 'var(--pdRadiusPill)',
                    }} />
                  </div>
                  <span style={{ width: 60, flexShrink: 0, color: 'var(--pdTextMuted)', textAlign: 'right' }}>
                    {day.meetingHours}h meetings
                  </span>
                  <span style={{ width: 60, flexShrink: 0, color: 'var(--pdStatusDoneFg)', fontWeight: 600, textAlign: 'right' }}>
                    {day.productiveHours}h free
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Weekly meetings */}
        {weeklyMeetings?.available && weeklyMeetings.daily_breakdown && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', margin: '0 0 12px' }}>
              This week&apos;s meetings
            </h3>
            <div style={{
              background: 'var(--pdSurface1)',
              border: '1px solid var(--pdBorder)',
              borderRadius: 'var(--pdRadiusLg)',
              overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--pdBorder)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--pdTextStrong)', letterSpacing: '-0.02em' }}>
                    {Math.round(weeklyMeetings.weekly_total_min / 60 * 10) / 10}h
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--pdTextMuted)' }}>in meetings this week</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--pdTextSubtle)' }}>
                  Synced {new Date(weeklyMeetings.synced_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              {/* Day bars */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {weeklyMeetings.daily_breakdown.map((day) => {
                  const totalHours = Math.round(day.total_min / 60 * 10) / 10
                  const maxMin = Math.max(...weeklyMeetings.daily_breakdown.map(d => d.total_min), 1)
                  const pct = Math.round((day.total_min / maxMin) * 100)
                  const dayLabel = new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                  const isExpanded = showMeetingDay === day.date

                  return (
                    <div key={day.date}>
                      <button
                        onClick={() => setShowMeetingDay(isExpanded ? null : day.date)}
                        style={{
                          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                          padding: '6px 0', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ width: 100, fontSize: 12, color: 'var(--pdTextMuted)', textAlign: 'left', flexShrink: 0 }}>{dayLabel}</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--pdSurface3)', borderRadius: 'var(--pdRadiusPill)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : 'var(--pdAccent06)',
                            borderRadius: 'var(--pdRadiusPill)',
                            transition: 'width 400ms ease',
                          }} />
                        </div>
                        <span style={{ width: 36, fontSize: 12, fontWeight: 600, color: 'var(--pdTextStrong)', textAlign: 'right', flexShrink: 0 }}>{totalHours}h</span>
                        <span style={{ width: 16, fontSize: 11, color: 'var(--pdTextSubtle)', textAlign: 'right', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {/* Expanded meeting list */}
                      {isExpanded && (
                        <div style={{
                          marginLeft: 112, marginBottom: 6, paddingLeft: 12,
                          borderLeft: '2px solid var(--pdBorder)',
                          display: 'flex', flexDirection: 'column', gap: 4,
                        }}>
                          {day.meetings.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--pdTextMuted)' }}>
                              <span style={{ flexShrink: 0, width: 36, color: 'var(--pdTextSubtle)' }}>
                                {m.duration_min}m
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--pdTextBase)' }}>
                                {m.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{
                padding: '10px 20px', borderTop: '1px solid var(--pdBorder)',
                fontSize: 11, color: 'var(--pdTextSubtle)',
                background: 'var(--pdSurface2)',
              }}>
                Ask Claude to &quot;sync calendar&quot; to refresh with the latest data.
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Per-team breakdown */}
        {teams.length > 0 && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', margin: '0 0 12px' }}>
              Team breakdown
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(teams.length, 3)}, 1fr)`,
              gap: 12,
            }}>
              {teams.map((team) => {
                const teamTickets = ticketsByTeam[team] ?? []
                const teamHours = teamTickets.reduce((sum, t) => sum + (t.estimateHours ?? 0), 0)
                const teamPct = effectiveCapacity > 0 ? Math.min(100, Math.round((teamHours / effectiveCapacity) * 100)) : 0
                const teamColor = teamPct >= 90 ? '#EF4444' : teamPct >= 70 ? '#F59E0B' : '#22C55E'
                return (
                  <div key={team} style={{
                    background: 'var(--pdSurface1)',
                    border: '1px solid var(--pdBorder)',
                    borderRadius: 'var(--pdRadiusMd)',
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--pdTextMuted)' }}>
                        {team}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--pdTextSubtle)' }}>
                        {teamTickets.length} ticket{teamTickets.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--pdSurface3)', borderRadius: 'var(--pdRadiusPill)', overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${teamPct}%`, background: teamColor, borderRadius: 'var(--pdRadiusPill)' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pdTextStrong)' }}>
                      {teamHours}h
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--pdTextMuted)' }}> · {teamPct}% of capacity</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 3: Ticket list */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', margin: '0 0 12px' }}>
            Sprint tickets
          </h3>

          {sprintTickets.length === 0 ? (
            <div className="EmptyState" style={{ padding: '40px 24px' }}>
              <div className="EmptyState__icon">
                <svg viewBox="0 0 28 28" fill="none" style={{ width: 28, height: 28 }}>
                  <rect x="4" y="5" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M9 11h10M9 15h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="EmptyState__title">No sprint tickets</p>
              <p className="EmptyState__desc">No open tickets assigned to you in the current sprint.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {teams.map((team) => {
                const teamTickets = ticketsByTeam[team] ?? []
                if (teamTickets.length === 0) return null

                const sorted = [...teamTickets].sort((a, b) => {
                  const order = { progress: 0, review: 1, todo: 2, done: 3 }
                  return (order[getStatusKey(a.status)] ?? 2) - (order[getStatusKey(b.status)] ?? 2)
                })

                return (
                  <div key={team} style={{ background: 'var(--pdSurface1)', border: '1px solid var(--pdBorder)', borderRadius: 'var(--pdRadiusLg)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', background: 'var(--pdSurface2)', borderBottom: '1px solid var(--pdBorder)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--pdTextMuted)' }}>
                        {team}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--pdTextSubtle)', background: 'var(--pdSurface3)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                        {teamTickets.length}
                      </span>
                    </div>

                    {sorted.map((ticket) => {
                      const statusKey = getStatusKey(ticket.status)
                      return (
                        <div key={ticket.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--pdBorder)', fontSize: 13 }}>
                          <span className="JiraKey" style={{ minWidth: 90, flexShrink: 0 }}>{ticket.key}</span>
                          <span style={{ flex: 1, fontWeight: 500, color: 'var(--pdTextStrong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ticket.summary}
                          </span>
                          {ticket.estimateHours > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--pdTextMuted)', flexShrink: 0 }}>
                              <ClockIcon />{ticket.estimateHours}h
                            </span>
                          )}
                          <span className={`StatusPill StatusPill--${statusKey}`} style={{ flexShrink: 0 }}>{ticket.status}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pdTextSubtle)', background: 'var(--pdSurface3)', padding: '2px 7px', borderRadius: 'var(--pdRadiusPill)', letterSpacing: '0.02em', flexShrink: 0 }}>
                            {ticket.project}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
