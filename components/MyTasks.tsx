'use client'

import { useState, useEffect } from 'react'
import type { JiraTicket, JiraEpic } from '@/lib/jira'
import KanbanBoard from './KanbanBoard'
import TicketDetailPanel from './TicketDetailPanel'
import { Check, Loader2, Calendar } from 'lucide-react'

type Props = {
  tickets: JiraTicket[]
  epics: JiraEpic[]
  projectKeys: string[]
  jiraBaseUrl: string
  onTicketUpdated?: () => void
  onOpenCreate: (opts: { tab?: 'template' | 'manual'; sprint?: 'backlog' | 'current' | 'next'; projectKey?: string }) => void
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  // Compare date strings — new Date('YYYY-MM-DD') parses as UTC midnight (10am AEST),
  // which would mark tickets due today as overdue for most of the working day
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return dueDate.slice(0, 10) < todayStr
}

function getStatusKey(status: string): 'todo' | 'progress' | 'review' | 'done' {
  const s = status.toLowerCase()
  if (s.includes('progress') || s.includes('doing') || s.includes('start')) return 'progress'
  if (s.includes('review') || s.includes('testing') || s.includes('block')) return 'review'
  if (s.includes('done') || s.includes('complete') || s.includes('close')) return 'done'
  return 'todo'
}

function getPriorityKey(priority: string): 'blocker' | 'high' | 'medium' | 'low' {
  const p = priority.toLowerCase()
  if (p === 'blocker' || p === 'critical' || p === 'must have') return 'blocker'
  if (p === 'high' || p === 'should have') return 'high'
  if (p === 'medium' || p === 'nice to have') return 'medium'
  return 'low'
}

function KanbanIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <rect x="1.5" y="2" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="6.25" y="2" width="3.5" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="2" width="3.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M5 4h8M5 8h8M5 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="2.5" cy="4" r="0.9" fill="currentColor"/>
      <circle cx="2.5" cy="8" r="0.9" fill="currentColor"/>
      <circle cx="2.5" cy="12" r="0.9" fill="currentColor"/>
    </svg>
  )
}


export default function MyTasks({ tickets, epics, projectKeys, jiraBaseUrl, onTicketUpdated, onOpenCreate }: Props) {
  const [view, setView] = useState<'board' | 'list'>('board')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [completing, setCompleting] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [markDoneError, setMarkDoneError] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState<string>('all')

  // Auto-dismiss mark-done error after 6 seconds
  useEffect(() => {
    if (!markDoneError) return
    const t = setTimeout(() => setMarkDoneError(null), 6000)
    return () => clearTimeout(t)
  }, [markDoneError])

  const projects = ['all', ...Array.from(new Set(tickets.map((t) => t.project))).sort()]

  const visibleTickets = tickets.filter((t) => {
    if (completed.has(t.key)) return false
    if (filterProject !== 'all' && t.project !== filterProject) return false
    return true
  })

  async function handleMarkDone(ticket: JiraTicket) {
    setCompleting((prev) => ({ ...prev, [ticket.key]: true }))
    setMarkDoneError(null)
    try {
      const res = await fetch('/api/jira', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', issueKey: ticket.key, transition: 'Done' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Jira returned ${res.status}`)
      }
      // Only hide the ticket once Jira confirms the transition succeeded
      setCompleted((prev) => new Set(Array.from(prev).concat(ticket.key)))
      onTicketUpdated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark done'
      console.error('Failed to transition ticket', err)
      setMarkDoneError(`${ticket.key}: ${msg}`)
    } finally {
      setCompleting((prev) => ({ ...prev, [ticket.key]: false }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>

      {/* ── Mark-done error banner ── */}
      {markDoneError && (
        <div style={{
          margin: '0 0 8px', padding: '8px 12px',
          background: 'var(--pdStatusReviewBg)', border: '1px solid var(--pdStatusReviewBorder)',
          borderRadius: 6, fontSize: 12, color: 'var(--pdStatusReviewFg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>⚠ Could not mark done — {markDoneError}</span>
          <button
            onClick={() => setMarkDoneError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit', padding: 0, lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="FilterBar">
        <button
          className={`FilterChip${filterProject === 'all' ? ' is-active' : ''}`}
          onClick={() => setFilterProject('all')}
        >
          All
          {filterProject === 'all' && <span className="FilterChip__count">{visibleTickets.length}</span>}
        </button>

        {projects.filter((p) => p !== 'all').map((p) => {
          const count = visibleTickets.filter((t) => t.project === p).length
          return (
            <button
              key={p}
              className={`FilterChip${filterProject === p ? ' is-active' : ''}`}
              onClick={() => setFilterProject(p)}
            >
              {p}
              {filterProject === p && count > 0 && <span className="FilterChip__count">{count}</span>}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--pdSurface2)',
          border: '1px solid var(--pdBorder)',
          borderRadius: 8,
          padding: 2,
          gap: 2,
        }}>
          <button
            className="IconButton IconButton--small"
            onClick={() => setView('board')}
            title="Board view"
            style={view === 'board' ? {
              background: 'var(--pdSurface1)',
              color: 'var(--pdTextStrong)',
              boxShadow: 'var(--pdShadowSm)',
            } : undefined}
          >
            <KanbanIcon />
          </button>
          <button
            className="IconButton IconButton--small"
            onClick={() => setView('list')}
            title="List view"
            style={view === 'list' ? {
              background: 'var(--pdSurface1)',
              color: 'var(--pdTextStrong)',
              boxShadow: 'var(--pdShadowSm)',
            } : undefined}
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {/* ── Main area: board/list + drawer side-by-side ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Board or list */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {view === 'board' && (
            <KanbanBoard
              tickets={visibleTickets}
              jiraBaseUrl={jiraBaseUrl}
              onTicketUpdated={onTicketUpdated}
              onSelectTicket={setSelectedKey}
              selectedTicketKey={selectedKey}
              onAddTicket={() => onOpenCreate({ tab: 'manual', projectKey: filterProject !== 'all' ? filterProject : undefined })}
            />
          )}

          {view === 'list' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px 20px' }}>
              {visibleTickets.length === 0 ? (
                <div className="EmptyState">
                  <div className="EmptyState__icon">
                    <svg viewBox="0 0 32 32" fill="none" style={{ width: 30, height: 30 }}>
                      <rect x="6" y="5" width="20" height="23" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 5V3.5A1 1 0 0 1 13 2.5h6a1 1 0 0 1 1 1V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M10.5 13h4M10.5 17.5h3.5M10.5 22h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.45"/>
                      <circle cx="22" cy="23" r="5" fill="currentColor" opacity="0.12"/>
                      <path d="M19.5 23l1.8 1.8 3.2-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="EmptyState__title">All clear</p>
                  <p className="EmptyState__desc">No open tasks assigned to you right now.</p>
                </div>
              ) : (
                <div style={{
                  border: '1px solid var(--pdBorder)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--pdSurface1)',
                }}>
                  <table className="PdTable" style={{ marginTop: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}></th>
                        <th style={{ width: 120 }}>Key</th>
                        <th>Summary</th>
                        <th style={{ width: 130 }}>Status</th>
                        <th style={{ width: 130 }}>Priority</th>
                        <th style={{ width: 100 }}>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTickets.map((ticket) => {
                        const overdue = isOverdue(ticket.dueDate)
                        const statusKey = getStatusKey(ticket.status)
                        const priorityKey = getPriorityKey(ticket.priority)
                        return (
                          <tr
                            key={ticket.key}
                            onClick={() => setSelectedKey(ticket.key)}
                            className={selectedKey === ticket.key ? 'is-selected' : ''}
                          >
                            {/* Checkbox */}
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="TaskCheck"
                                onClick={(e) => { e.stopPropagation(); handleMarkDone(ticket) }}
                                disabled={completing[ticket.key]}
                                title="Mark done"
                              >
                                {completing[ticket.key] ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={10} />}
                              </button>
                            </td>

                            {/* Key */}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <a
                                className="JiraKey JiraKey--clickable"
                                href={`${jiraBaseUrl}/browse/${ticket.key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {ticket.key}
                              </a>
                            </td>

                            {/* Summary */}
                            <td className="PdTable__title">{ticket.summary}</td>

                            {/* Status */}
                            <td>
                              <span className={`StatusPill StatusPill--${statusKey}`}>{ticket.status}</span>
                            </td>

                            {/* Priority */}
                            <td>
                              <span className={`PriorityBadge PriorityBadge--${priorityKey}`}>
                                {ticket.priority}
                              </span>
                            </td>

                            {/* Due */}
                            <td>
                              {ticket.dueDate && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: overdue ? 600 : 400,
                                  color: overdue ? 'var(--pdPrioHigh)' : 'var(--pdTextMuted)',
                                }}>
                                  <Calendar size={10} />
                                  {new Date(ticket.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ticket detail drawer */}
        {selectedKey && (
          <TicketDetailPanel
            ticketKey={selectedKey}
            jiraBaseUrl={jiraBaseUrl}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </div>
  )
}
