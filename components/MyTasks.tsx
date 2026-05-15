'use client'

import { useState } from 'react'
import type { JiraTicket, JiraEpic } from '@/lib/jira'
import KanbanBoard from './KanbanBoard'
import TicketDetailPanel from './TicketDetailPanel'

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
  return new Date(dueDate) < new Date()
}

function getStatusKey(status: string): 'todo' | 'progress' | 'review' | 'done' {
  const s = status.toLowerCase()
  if (s.includes('progress') || s.includes('doing') || s.includes('start')) return 'progress'
  if (s.includes('review') || s.includes('testing') || s.includes('block')) return 'review'
  if (s.includes('done') || s.includes('complete') || s.includes('close')) return 'done'
  return 'todo'
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M3.5 5L6 2.5L8.5 5M6 2.5V12M12.5 11L10 13.5L7.5 11M10 13.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function MyTasks({ tickets, epics, projectKeys, jiraBaseUrl, onTicketUpdated, onOpenCreate }: Props) {
  const [view, setView] = useState<'board' | 'list'>('board')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [completing, setCompleting] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [filterProject, setFilterProject] = useState<string>('all')

  const projects = ['all', ...Array.from(new Set(tickets.map((t) => t.project))).sort()]

  const visibleTickets = tickets.filter((t) => {
    if (completed.has(t.key)) return false
    if (filterProject !== 'all' && t.project !== filterProject) return false
    return true
  })

  async function handleMarkDone(ticket: JiraTicket) {
    setCompleting((prev) => ({ ...prev, [ticket.key]: true }))
    try {
      await fetch('/api/jira', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', issueKey: ticket.key, transition: 'Done' }),
      })
      setCompleted((prev) => new Set(Array.from(prev).concat(ticket.key)))
      onTicketUpdated?.()
    } catch (err) {
      console.error('Failed to transition ticket', err)
    } finally {
      setCompleting((prev) => ({ ...prev, [ticket.key]: false }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>

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

        <button className="FilterChip">
          <SortIcon />
          Sort
        </button>

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
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
              {visibleTickets.length === 0 ? (
                <div className="EmptyState">
                  <div className="EmptyState__icon">
                    <svg viewBox="0 0 28 28" fill="none" style={{ width: 28, height: 28 }}>
                      <path d="M5 7A2 2 0 0 1 7 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M9 11.5L12.5 15L19 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="EmptyState__title">All clear</p>
                  <p className="EmptyState__desc">No open tasks assigned to you.</p>
                </div>
              ) : (
                <table className="PdTable" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}></th>
                      <th style={{ width: 110 }}>Key</th>
                      <th>Summary</th>
                      <th style={{ width: 130 }}>Status</th>
                      <th style={{ width: 100 }}>Priority</th>
                      <th style={{ width: 110 }}>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTickets.map((ticket) => {
                      const overdue = isOverdue(ticket.dueDate)
                      const statusKey = getStatusKey(ticket.status)
                      return (
                        <tr
                          key={ticket.key}
                          onClick={() => setSelectedKey(ticket.key)}
                          className={selectedKey === ticket.key ? 'is-selected' : ''}
                        >
                          <td>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkDone(ticket) }}
                              disabled={completing[ticket.key]}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: '1.5px solid var(--pdBorderStrong)',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Mark done"
                            />
                          </td>
                          <td>
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
                          <td className="PdTable__title">{ticket.summary}</td>
                          <td><span className={`StatusPill StatusPill--${statusKey}`}>{ticket.status}</span></td>
                          <td>
                            <span style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: ticket.priority.toLowerCase() === 'blocker' ? 'var(--pdPrioBlocker)'
                                : ticket.priority.toLowerCase() === 'high' ? 'var(--pdPrioHigh)'
                                : ticket.priority.toLowerCase() === 'medium' ? 'var(--pdPrioMedium)'
                                : 'var(--pdPrioLow)',
                            }}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td>
                            {ticket.dueDate && (
                              <span style={{ fontSize: 12, color: overdue ? 'var(--pdPrioHigh)' : 'var(--pdTextMuted)' }}>
                                {overdue && '⚠ '}
                                {new Date(ticket.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
