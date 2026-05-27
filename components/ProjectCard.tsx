'use client'

import type { JiraEpic } from '@/lib/jira'

type Props = {
  epic: JiraEpic
  jiraBaseUrl: string
}

type StatusKey = 'done' | 'review' | 'blocked' | 'active'

function getStatusInfo(status: string): { label: string; key: StatusKey } {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('ship') || s.includes('released') || s.includes('closed')) {
    return { label: 'Shipped', key: 'done' }
  }
  if (s.includes('review') || s.includes('testing') || s.includes('qa')) {
    return { label: 'In Review', key: 'review' }
  }
  if (s.includes('block') || s.includes('risk') || s.includes('hold')) {
    return { label: 'At Risk', key: 'blocked' }
  }
  return { label: 'Active', key: 'active' }
}

const STATUS_STYLE: Record<StatusKey, React.CSSProperties> = {
  done:    { background: 'var(--pdStatusDoneBg)',     color: 'var(--pdStatusDoneText)',     border: '1px solid var(--pdStatusDoneBorder)' },
  review:  { background: 'var(--pdStatusReviewBg)',   color: 'var(--pdStatusReviewText)',   border: '1px solid var(--pdStatusReviewBorder)' },
  blocked: { background: 'var(--pdStatusBlockedBg)',  color: 'var(--pdStatusBlockedText)',  border: '1px solid var(--pdStatusBlockedBorder)' },
  active:  { background: 'var(--pdStatusProgressBg)', color: 'var(--pdStatusProgressText)', border: '1px solid var(--pdStatusProgressBorder)' },
}

function getProgressToken(progress: number): string {
  if (progress >= 80) return 'var(--pdStatusDoneText)'
  if (progress >= 50) return 'var(--pdStatusProgressText)'
  if (progress >= 25) return 'var(--pdStatusReviewText)'
  return 'var(--pdStatusBlockedText)'
}

function getProgressBg(progress: number): string {
  if (progress >= 80) return 'var(--pdStatusDoneBg)'
  if (progress >= 50) return 'var(--pdStatusProgressBg)'
  if (progress >= 25) return 'var(--pdStatusReviewBg)'
  return 'var(--pdStatusBlockedBg)'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProjectCard({ epic, jiraBaseUrl }: Props) {
  const { label: statusLabel, key: statusKey } = getStatusInfo(epic.status)
  const jiraUrl = `${jiraBaseUrl}/browse/${epic.key}`
  const progressColor = getProgressToken(epic.progress)
  const progressBg = getProgressBg(epic.progress)

  return (
    <div
      style={{
        background: 'var(--pdSurface1)',
        border: '1px solid var(--pdBorder)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'border-color 150ms, box-shadow 150ms',
        cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pdBorderStrong)'; e.currentTarget.style.boxShadow = 'var(--pdShadowMd)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--pdBorder)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="JiraKey JiraKey--clickable"
            style={{ fontSize: 11 }}
          >
            {epic.key}
          </a>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--pdTextStrong)',
            marginTop: 4,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {epic.summary}
          </h3>
        </div>
        <span style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          ...STATUS_STYLE[statusKey],
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { value: epic.openTickets, label: 'Open', color: 'var(--pdTextStrong)' },
          { value: epic.blockers, label: 'Blockers', color: epic.blockers > 0 ? 'var(--pdPrioHigh)' : 'var(--pdTextStrong)' },
          { value: `${epic.progress}%`, label: 'Done', color: 'var(--pdTextStrong)' },
        ].map(({ value, label, color }) => (
          <div key={label} style={{ background: 'var(--pdSurface2)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--pdTextSubtle)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--pdTextSubtle)', marginBottom: 6 }}>
          <span>Progress</span>
          <span>{epic.progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--pdSurface3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${epic.progress}%`,
            background: progressColor,
            borderRadius: 99,
            transition: 'width 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        </div>
      </div>

      {/* Handover date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--pdTextMuted)' }}>
        <svg style={{ width: 13, height: 13, color: 'var(--pdTextSubtle)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Handover: {formatDate(epic.handoverDate)}</span>
      </div>

      {/* My tickets */}
      {epic.myTickets.length > 0 && (
        <div style={{ borderTop: '1px solid var(--pdBorder)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--pdAccent05)', marginBottom: 4 }}>
            <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {epic.myTickets.length} assigned to you
          </div>
          {epic.myTickets.slice(0, 3).map((t) => (
            <a
              key={t.key}
              href={`${jiraBaseUrl}/browse/${t.key}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 8,
                background: 'var(--pdSurface2)',
                textDecoration: 'none',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pdSurface3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--pdSurface2)')}
            >
              <span className="JiraKey" style={{ fontSize: 11, flexShrink: 0, paddingTop: 1 }}>{t.key}</span>
              <span style={{ fontSize: 13, color: 'var(--pdTextBase)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{t.summary}</span>
            </a>
          ))}
          {epic.myTickets.length > 3 && (
            <a
              href={`${jiraBaseUrl}/issues/?jql=assignee%3DcurrentUser()%20AND%20parent%3D${epic.key}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--pdTextSubtle)', textDecoration: 'none', paddingLeft: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--pdTextBase)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--pdTextSubtle)')}
            >
              +{epic.myTickets.length - 3} more
            </a>
          )}
        </div>
      )}

      {/* Footer link */}
      <a
        href={jiraUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--pdAccent06)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--pdAccent05)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--pdAccent06)')}
      >
        View in Jira
        <svg style={{ width: 11, height: 11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
