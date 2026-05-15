'use client'

import type { JiraEpic } from '@/lib/jira'

type Props = {
  epic: JiraEpic
  jiraBaseUrl: string
}

function getStatusBadge(status: string): { label: string; classes: string } {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('ship') || s.includes('released') || s.includes('closed')) {
    return { label: 'Shipped', classes: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/60 dark:text-green-300 dark:border-green-700' }
  }
  if (s.includes('review') || s.includes('testing') || s.includes('qa')) {
    return { label: 'In Review', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/60 dark:text-yellow-300 dark:border-yellow-700' }
  }
  if (s.includes('block') || s.includes('risk') || s.includes('hold')) {
    return { label: 'At Risk', classes: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700' }
  }
  return { label: 'Active', classes: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-700' }
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProjectCard({ epic, jiraBaseUrl }: Props) {
  const badge = getStatusBadge(epic.status)
  const progressColor = getProgressColor(epic.progress)
  const jiraUrl = `${jiraBaseUrl}/browse/${epic.key}`

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-gray-500 dark:text-gray-500 hover:text-blue-400 transition-colors"
          >
            {epic.key}
          </a>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5 leading-snug line-clamp-2">
            {epic.summary}
          </h3>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.classes}`}>
          {badge.label}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-100/60 dark:bg-gray-800/60 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{epic.openTickets}</div>
          <div className="text-sm text-gray-500 dark:text-gray-500">Open</div>
        </div>
        <div className="bg-gray-100/60 dark:bg-gray-800/60 rounded-lg p-2">
          <div className={`text-lg font-bold ${epic.blockers > 0 ? 'text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {epic.blockers}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">Blockers</div>
        </div>
        <div className="bg-gray-100/60 dark:bg-gray-800/60 rounded-lg p-2">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{epic.progress}%</div>
          <div className="text-sm text-gray-500 dark:text-gray-500">Done</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-500 mb-1">
          <span>Progress</span>
          <span>{epic.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${epic.progress}%` }}
          />
        </div>
      </div>

      {/* Handover date */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Handover: {formatDate(epic.handoverDate)}</span>
      </div>

      {/* My tickets */}
      {epic.myTickets.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-400 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="flex items-start gap-2 p-2 rounded-lg bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <span className="shrink-0 text-sm font-mono text-gray-500 dark:text-gray-500 group-hover:text-blue-400 transition-colors pt-px">
                {t.key}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1 leading-snug">{t.summary}</span>
            </a>
          ))}
          {epic.myTickets.length > 3 && (
            <a
              href={`${jiraBaseUrl}/issues/?jql=assignee%3DcurrentUser()%20AND%20parent%3D${epic.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors pl-1"
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
        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
      >
        View in Jira
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
