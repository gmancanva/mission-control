'use client'

import { useState, useRef } from 'react'
import type { JiraTicket } from '@/lib/jira'

type Props = {
  tickets: JiraTicket[]
  jiraBaseUrl: string
  onTicketUpdated?: () => void
  onSelectTicket?: (key: string) => void
  selectedTicketKey?: string | null
  onAddTicket?: () => void
}

type ColumnDef = {
  id: string
  label: string
  status: 'todo' | 'progress' | 'review' | 'done'
  statusNames: string[]
  transitions: string[]
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'todo',
    label: 'To Do',
    status: 'todo',
    statusNames: ['backlog', 'ready', 'open', 'to do', 'new'],
    transitions: ['Backlog', 'Ready', 'To Do', 'Open', 'Reopen'],
  },
  {
    id: 'inprogress',
    label: 'In Progress',
    status: 'progress',
    statusNames: ['in progress', 'shaping', 'building', 'doing', 'in development', 'started'],
    transitions: ['In Progress', 'Shaping', 'Building', 'Start', 'Start Progress', 'Doing'],
  },
  {
    id: 'review',
    label: 'Review',
    status: 'review',
    statusNames: ['review', 'testing', 'blocked', 'in review', 'qa', 'waiting', 'feedback'],
    transitions: ['Review', 'Testing', 'In Review', 'Blocked', 'QA', 'Submit for Review'],
  },
  {
    id: 'done',
    label: 'Done',
    status: 'done',
    statusNames: ['done', 'delivered', 'completed', 'closed', 'released', 'shipped', 'resolved'],
    transitions: ['Delivered', 'Done', 'Complete', 'Close', 'Resolve', 'Completed', 'Released'],
  },
]

function columnForTicket(ticket: JiraTicket): ColumnDef {
  const statusLower = ticket.status.toLowerCase()
  const found = COLUMNS.find((col) => col.statusNames.some((s) => statusLower.includes(s)))
  if (found) return found
  if (ticket.statusCategoryKey === 'done') return COLUMNS[3]
  if (ticket.statusCategoryKey === 'indeterminate') return COLUMNS[1]
  return COLUMNS[0]
}

function getPriorityClass(priority: string): string {
  const p = priority.toLowerCase()
  if (p === 'blocker' || p === 'critical') return 'TicketCard--priorityBlocker'
  if (p === 'high') return 'TicketCard--priorityHigh'
  return ''
}

function getPriorityIcon(priority: string) {
  const p = priority.toLowerCase()
  if (p === 'blocker' || p === 'critical') {
    return (
      <span className="Priority Priority--blocker" title={priority}>
        <span className="Priority__icon">
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
            <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M3.6 3.6l8.8 8.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </span>
      </span>
    )
  }
  if (p === 'high') {
    return (
      <span className="Priority Priority--high" title={priority}>
        <span className="Priority__icon">
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
            <path d="M8 12V4M4 7.5L8 4l4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </span>
    )
  }
  if (p === 'medium') {
    return (
      <span className="Priority Priority--medium" title={priority}>
        <span className="Priority__icon">
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
            <path d="M3.5 6.5h9M3.5 9.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </span>
      </span>
    )
  }
  if (p === 'low') {
    return (
      <span className="Priority Priority--low" title={priority}>
        <span className="Priority__icon">
          <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
            <path d="M8 4v8M4 8.5L8 12l4-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </span>
    )
  }
  return null
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" style={{ width: 12, height: 12, flexShrink: 0 }}>
      <rect x="1" y="1.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 4.5h10M4 0.5v2M8 0.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 16, height: 16 }}>
      <circle cx="3.5" cy="8" r="1.3"/>
      <circle cx="8" cy="8" r="1.3"/>
      <circle cx="12.5" cy="8" r="1.3"/>
    </svg>
  )
}

type TicketCardProps = {
  ticket: JiraTicket
  jiraBaseUrl: string
  isMoving: boolean
  isSelected: boolean
  isDragging: boolean
  error?: string
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function TicketCard({ ticket, jiraBaseUrl, isMoving, isSelected, isDragging, error, onSelect, onDragStart, onDragEnd }: TicketCardProps) {
  const overdue = isOverdue(ticket.dueDate)

  const cls = [
    'TicketCard',
    getPriorityClass(ticket.priority),
    isSelected ? 'is-selected' : '',
    isDragging ? 'is-dragging' : '',
    isMoving ? '' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      style={{ opacity: isMoving ? 0.5 : 1 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
    >
      <div className="TicketCard__header">
        <a
          className="JiraKey JiraKey--clickable"
          href={`${jiraBaseUrl}/browse/${ticket.key}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {ticket.key}
        </a>
        {getPriorityIcon(ticket.priority)}
      </div>

      <p className="TicketCard__title">{ticket.summary}</p>

      {ticket.parentSummary && (
        <span className="EpicTag EpicTag--blue">
          <span>{ticket.parentKey ? `${ticket.parentKey} · ` : ''}{ticket.parentSummary}</span>
        </span>
      )}

      <div className="TicketCard__footer">
        <div className="TicketCard__meta">
          {ticket.dueDate && (
            <span style={{ color: overdue ? 'var(--pdPrioHigh)' : undefined }}>
              <CalendarIcon />
              {new Date(ticket.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {ticket.project && (
            <span style={{ color: 'var(--pdTextSubtle)' }}>{ticket.project}</span>
          )}
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', marginTop: 4 }}>{error}</p>
      )}
    </div>
  )
}

export default function KanbanBoard({ tickets, jiraBaseUrl, onTicketUpdated, onSelectTicket, selectedTicketKey, onAddTicket }: Props) {
  const [optimisticCols, setOptimisticCols] = useState<Record<string, string>>({})
  const [transitioning, setTransitioning] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const draggingRef = useRef<string | null>(null)

  function getColumnId(ticket: JiraTicket): string {
    return optimisticCols[ticket.key] ?? columnForTicket(ticket).id
  }

  async function moveTicket(ticketKey: string, targetColId: string) {
    const col = COLUMNS.find((c) => c.id === targetColId)
    if (!col) return

    setOptimisticCols((prev) => ({ ...prev, [ticketKey]: targetColId }))
    setTransitioning((prev) => ({ ...prev, [ticketKey]: true }))
    setErrors((prev) => { const n = { ...prev }; delete n[ticketKey]; return n })

    try {
      const res = await fetch('/api/jira', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transition',
          issueKey: ticketKey,
          transition: col.transitions,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Transition failed')
      }
      if (targetColId === 'done') {
        onTicketUpdated?.()
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [ticketKey]: err instanceof Error ? err.message : 'Failed',
      }))
      setOptimisticCols((prev) => { const n = { ...prev }; delete n[ticketKey]; return n })
    } finally {
      setTransitioning((prev) => ({ ...prev, [ticketKey]: false }))
    }
  }

  function onDragStart(e: React.DragEvent, ticketKey: string) {
    draggingRef.current = ticketKey
    setDraggingKey(ticketKey)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragEnd() {
    draggingRef.current = null
    setDraggingKey(null)
    setDropTarget(null)
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(colId)
  }

  function onDragLeave() {
    setDropTarget(null)
  }

  function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    const key = draggingRef.current
    setDropTarget(null)
    setDraggingKey(null)
    draggingRef.current = null
    if (!key) return
    const ticket = tickets.find((t) => t.key === key)
    if (!ticket) return
    const currentCol = getColumnId(ticket)
    if (currentCol !== colId) {
      moveTicket(key, colId)
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: '16px 20px 20px',
      overflowX: 'auto',
      flex: 1,
      minHeight: 0,
      alignItems: 'stretch',
      height: '100%',
    }}>
      {COLUMNS.map((col) => {
        const colTickets = tickets.filter((t) => getColumnId(t) === col.id)
        const isDropTarget = dropTarget === col.id

        return (
          <div
            key={col.id}
            className="Column"
            onDragOver={(e) => onDragOver(e, col.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, col.id)}
            style={isDropTarget ? { outline: '2px solid var(--pdAccent04)' } : undefined}
          >
            <div className="Column__header">
              <div className="Column__headerLeft">
                <span className={`StatusPill StatusPill--${col.status}`}>{col.label}</span>
                <span className="Column__count">{colTickets.length}</span>
              </div>
              <div className="Column__actions">
                <button className="IconButton IconButton--small" title="Add ticket" onClick={onAddTicket}>
                  <PlusIcon />
                </button>
                <button className="IconButton IconButton--small" title="More options">
                  <MoreIcon />
                </button>
              </div>
            </div>

            <div className="Column__list">
              {colTickets.length === 0 && !isDropTarget && (
                <div className="EmptyState" style={{ padding: '24px 12px' }}>
                  <p style={{ fontSize: 12, color: 'var(--pdTextSubtle)', margin: 0 }}>No tickets</p>
                </div>
              )}
              {colTickets.map((ticket) => (
                <TicketCard
                  key={ticket.key}
                  ticket={ticket}
                  jiraBaseUrl={jiraBaseUrl}
                  isMoving={!!transitioning[ticket.key]}
                  isSelected={selectedTicketKey === ticket.key}
                  isDragging={draggingKey === ticket.key}
                  error={errors[ticket.key]}
                  onSelect={() => onSelectTicket?.(ticket.key)}
                  onDragStart={(e) => onDragStart(e, ticket.key)}
                  onDragEnd={onDragEnd}
                />
              ))}
              {isDropTarget && (
                <div className="Column__dropTarget">
                  Drop here → {col.label}
                </div>
              )}
            </div>

            <button className="Column__addBtn" onClick={onAddTicket}>
              <PlusIcon />
              Add ticket
            </button>
          </div>
        )
      })}
    </div>
  )
}
