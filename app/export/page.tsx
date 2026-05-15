'use client'

import { useEffect, useState } from 'react'
import type { JiraEpic } from '@/lib/jira'
import type { PinnedDecision } from '@/lib/db'

type ExportData = {
  epics: JiraEpic[]
  pinnedDecisions: PinnedDecision[]
}

function getStatusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('ship') || s.includes('released')) return 'Shipped'
  if (s.includes('review') || s.includes('testing')) return 'In Review'
  if (s.includes('block') || s.includes('risk')) return 'At Risk'
  return 'Active'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatPinnedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function timelineSummary(epics: JiraEpic[]): string {
  const total = epics.length
  if (total === 0) return 'No epics tracked.'
  const shipped = epics.filter(
    (e) =>
      e.status.toLowerCase().includes('done') ||
      e.status.toLowerCase().includes('ship') ||
      e.status.toLowerCase().includes('released')
  ).length
  const overdue = epics.filter((e) => {
    if (!e.handoverDate) return false
    return new Date(e.handoverDate) < new Date() && shipped === 0
  }).length
  const avgProgress = Math.round(epics.reduce((s, e) => s + e.progress, 0) / total)
  return `${total} epic${total !== 1 ? 's' : ''} tracked — ${shipped} shipped, ${overdue} overdue, avg. ${avgProgress}% complete.`
}

export default function ExportPage() {
  const [data, setData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/export')
      .then((r) => r.json())
      .then((d: ExportData) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const today = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      {/* Print-hidden toolbar */}
      <div className="print:hidden bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <a
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          ← Back to dashboard
        </a>
        <div className="flex-1" />
        <button
          onClick={handleCopyLink}
          className="text-sm bg-gray-800 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          onClick={() => window.print()}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-3xl mx-auto px-8 py-12 print:py-8">
        <div className="mb-10 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Project Status Report</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : !data ? (
          <p className="text-red-600 text-sm">Failed to load data.</p>
        ) : (
          <>
            {/* Timeline summary */}
            <section className="mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Summary
              </h2>
              <p className="text-base text-gray-700">{timelineSummary(data.epics)}</p>
            </section>

            {/* Projects */}
            <section className="mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Projects
              </h2>
              {data.epics.length === 0 ? (
                <p className="text-sm text-gray-400">No epics found.</p>
              ) : (
                <div className="space-y-4">
                  {data.epics.map((epic) => (
                    <div
                      key={epic.id}
                      className="border border-gray-200 rounded-xl p-5 print:border-gray-300 print:break-inside-avoid"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <span className="text-xs font-mono text-gray-400">{epic.key}</span>
                          <h3 className="text-base font-semibold text-gray-900 mt-0.5">
                            {epic.summary}
                          </h3>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                          {getStatusLabel(epic.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-xs text-gray-400 block mb-0.5">Handover</span>
                          <span className="font-medium text-gray-800">{formatDate(epic.handoverDate)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-0.5">Progress</span>
                          <span className="font-medium text-gray-800">{epic.progress}%</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-0.5">Open tickets</span>
                          <span className="font-medium text-gray-800">{epic.openTickets}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-0.5">Blockers</span>
                          <span className={`font-medium ${epic.blockers > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {epic.blockers}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${epic.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Timeline visual summary */}
            <section className="mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Timeline Overview
              </h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {data.epics
                  .filter((e) => e.handoverDate)
                  .sort((a, b) =>
                    new Date(a.handoverDate!).getTime() - new Date(b.handoverDate!).getTime()
                  )
                  .map((epic) => {
                    const handover = new Date(epic.handoverDate!)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const overdue = handover < today
                    const shipped =
                      epic.status.toLowerCase().includes('done') ||
                      epic.status.toLowerCase().includes('ship')
                    return (
                      <div
                        key={epic.id}
                        className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 border-gray-100 print:break-inside-avoid"
                      >
                        <div className="w-28 shrink-0">
                          <span
                            className={`text-xs font-medium ${
                              shipped
                                ? 'text-green-600'
                                : overdue
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {formatDate(epic.handoverDate)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-mono text-gray-400">{epic.key}</span>
                          <p className="text-sm text-gray-800 truncate">{epic.summary}</p>
                        </div>
                        <div className="shrink-0">
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${shipped ? 'bg-green-500' : overdue ? 'bg-red-400' : 'bg-blue-500'}`}
                              style={{ width: `${epic.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>

            {/* Pinned decisions */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Pinned Decisions
              </h2>
              {data.pinnedDecisions.length === 0 ? (
                <p className="text-sm text-gray-400">No decisions pinned yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.pinnedDecisions.map((d) => (
                    <div
                      key={d.id}
                      className="border border-amber-200 bg-amber-50 rounded-xl p-4 print:break-inside-avoid"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          Decision
                        </span>
                        {d.project && (
                          <span className="text-xs text-gray-500">{d.project}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {d.source === 'jira' ? 'Jira' : 'Slack'}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          Pinned {formatPinnedDate(d.pinned_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mb-2">{d.summary}</p>
                      {d.note && (
                        <div className="text-sm text-amber-800 bg-amber-100/60 rounded-lg px-3 py-2 border border-amber-200/60">
                          <span className="font-medium">Note:</span> {d.note}
                        </div>
                      )}
                      {d.link && (
                        <a
                          href={d.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block print:hidden"
                        >
                          View source →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
