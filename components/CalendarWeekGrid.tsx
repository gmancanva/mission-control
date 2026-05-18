'use client'

import { useEffect, useRef } from 'react'

/**
 * Extract a Zoom or Teams meeting URL from a description (HTML or plain text).
 * Returns the first video-conference URL found, or null.
 */
function extractVideoLink(html: string): string | null {
  // Check <a href="..."> tags first
  const hrefMatch = html.match(/href=['"]?(https?:\/\/[^\s'"<>]*(?:zoom\.us|teams\.microsoft|meet\.google|webex)[^\s'"<>]*)/i)
  if (hrefMatch) return hrefMatch[1]
  // Fall back to plain-text URLs
  const plainMatch = html.match(/https?:\/\/[^\s<>"']*(?:zoom\.us|teams\.microsoft|meet\.google|webex)[^\s<>"']*/i)
  if (plainMatch) return plainMatch[0]
  return null
}

/**
 * Sanitize calendar description HTML:
 * - Remove dangerous tags (script, style, iframe, form)
 * - Strip inline event handlers
 * - Ensure all links open in a new tab safely
 * - Auto-link bare https:// URLs that aren't already inside <a> tags
 */
function prepareDescription(html: string): string {
  let out = html
  // Remove dangerous tags
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
  out = out.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
  out = out.replace(/<input\b[^>]*\/?>/gi, '')
  // Strip inline event handlers
  out = out.replace(/\s+on\w+="[^"]*"/gi, '')
  out = out.replace(/\s+on\w+='[^']*'/gi, '')
  // Rewrite all <a ...> tags: strip existing target/rel, then add safe values
  out = out.replace(/<a([^>]*)>/gi, (_, attrs) => {
    const cleaned = attrs
      .replace(/\s+target=["'][^"']*["']/gi, '')
      .replace(/\s+rel=["'][^"']*["']/gi, '')
    return `<a${cleaned} target="_blank" rel="noopener noreferrer">`
  })
  // Auto-link bare URLs that are NOT already inside an <a> tag
  // Split on existing tags, only process text nodes
  out = out.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag  // preserve HTML tags as-is
    // Linkify https:// URLs in plain text segments
    return text.replace(
      /(https?:\/\/[^\s<>"')\]]+)/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    )
  })
  return out
}

type MeetingEntry = {
  title: string
  start: string
  end: string
  duration_min: number
  responseStatus?: string  // 'accepted' | 'tentative' | 'needsAction' | 'declined'
}

type DayEntry = {
  date: string
  meetings: MeetingEntry[]
  total_min: number
}

type MeetingEventDetails = {
  description: string | null
  location: string | null
  hangoutLink: string | null
  conferenceLink: string | null
  attendees: Array<{ email: string; displayName?: string; self?: boolean; responseStatus?: string }>
  selfResponseStatus: string | null
}

type Props = {
  dailyBreakdown: DayEntry[]
  weekStart: string
  weekEnd: string
  expandedMeeting: string | null
  meetingDetails: Record<string, MeetingEventDetails | null | 'loading' | 'error'>
  meetingRsvp: Record<string, 'attending' | 'not-attending'>
  onExpandMeeting: (start: string) => void
  onSetRsvp: (start: string, status: 'attending' | 'not-attending') => void
}

const PX_PER_HOUR = 64
const GRID_START = 7  // 7am
const GRID_END = 20   // 8pm
const TOTAL_HEIGHT = (GRID_END - GRID_START) * PX_PER_HOUR
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i)

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  while (cursor <= endDate) {
    dates.push(localDateStr(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

export default function CalendarWeekGrid({
  dailyBreakdown, weekStart, weekEnd,
  expandedMeeting, meetingDetails, meetingRsvp,
  onExpandMeeting, onSetRsvp,
}: Props) {
  const dates = getDatesInRange(weekStart, weekEnd)
  const todayStr = localDateStr(new Date())
  const now = new Date()
  const nowDecimal = now.getHours() + now.getMinutes() / 60
  const nowTop = (nowDecimal - GRID_START) * PX_PER_HOUR
  const showNowLine = nowTop >= 0 && nowTop <= TOTAL_HEIGHT

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current time minus a bit of padding on mount
  useEffect(() => {
    if (scrollRef.current && showNowLine) {
      const scrollTo = Math.max(0, nowTop - 80)
      scrollRef.current.scrollTop = scrollTo
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const expandedMeetingEntry = expandedMeeting
    ? dailyBreakdown.flatMap(d => d.meetings).find(m => m.start === expandedMeeting)
    : null
  const expandedDetails = expandedMeeting ? meetingDetails[expandedMeeting] : undefined
  const expandedRsvp = expandedMeeting ? meetingRsvp[expandedMeeting] : undefined

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sticky day header */}
      <div
        className="grid border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        style={{ gridTemplateColumns: `44px repeat(${dates.length}, 1fr)` }}
      >
        <div className="py-2 border-r border-gray-100 dark:border-gray-800" />
        {dates.map(date => {
          const d = new Date(`${date}T00:00:00`)
          const isToday = date === todayStr
          const isPast = date < todayStr
          return (
            <div key={date} className={`py-2 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${isPast && !isToday ? 'opacity-40' : ''}`}>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                {d.toLocaleDateString('en-AU', { weekday: 'short' })}
              </p>
              <div className={`text-sm font-semibold mt-0.5 w-7 h-7 rounded-full mx-auto flex items-center justify-center ${
                isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 460 }}>
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>

          {/* Time label column */}
          <div className="w-11 shrink-0 border-r border-gray-100 dark:border-gray-800 relative select-none" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-1.5 text-xs text-gray-400 dark:text-gray-600 leading-none"
                style={{ top: (h - GRID_START) * PX_PER_HOUR - 7 }}
              >
                {h !== GRID_START ? formatHour(h) : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map(date => {
            const dayEntry = dailyBreakdown.find(d => d.date === date)
            const isToday = date === todayStr
            const isPast = date < todayStr

            return (
              <div
                key={date}
                className={`flex-1 relative border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${isPast && !isToday ? 'opacity-40' : ''}`}
                style={{ height: TOTAL_HEIGHT }}
              >
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100 dark:border-gray-800"
                    style={{ top: (h - GRID_START) * PX_PER_HOUR }}
                  />
                ))}

                {/* Current time line */}
                {isToday && showNowLine && (
                  <div className="absolute w-full z-10 flex items-center pointer-events-none" style={{ top: nowTop }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}

                {/* Meeting blocks */}
                {(dayEntry?.meetings ?? []).map((m, i) => {
                  const start = new Date(m.start)
                  const startDecimal = start.getHours() + start.getMinutes() / 60
                  const top = Math.max(0, (startDecimal - GRID_START) * PX_PER_HOUR)
                  const height = Math.max(22, (m.duration_min / 60) * PX_PER_HOUR - 2)
                  const isSelected = expandedMeeting === m.start
                  const isPending = m.responseStatus === 'needsAction'
                  const isTentative = m.responseStatus === 'tentative'

                  return (
                    <button
                      key={i}
                      onClick={() => onExpandMeeting(m.start)}
                      className={`absolute left-0.5 right-0.5 rounded text-left overflow-hidden px-1.5 py-0.5 transition-all z-[5] ${
                        isPending
                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                          : isTentative
                          ? 'bg-purple-50 dark:bg-purple-950/30 border border-dashed border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-950/50'
                          : 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                      } ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 z-[6]' : ''}`}
                      style={{ top, height }}
                    >
                      <div className="flex items-start gap-1">
                        <p className="text-xs font-medium leading-tight text-gray-800 dark:text-gray-100 truncate flex-1">{m.title}</p>
                        {isPending && <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 shrink-0 leading-tight">?</span>}
                      </div>
                      {height > 32 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                          {start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded detail drawer */}
      {expandedMeetingEntry && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{expandedMeetingEntry.title}</h3>
                  {expandedMeetingEntry.responseStatus === 'needsAction' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                      Awaiting response
                    </span>
                  )}
                  {expandedMeetingEntry.responseStatus === 'tentative' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
                      Tentative
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {new Date(expandedMeetingEntry.start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' – '}
                  {new Date(expandedMeetingEntry.end).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' · '}
                  {expandedMeetingEntry.duration_min}min
                </p>
              </div>
              <button
                onClick={() => onExpandMeeting(expandedMeeting!)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 mt-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {expandedDetails === 'loading' && (
              <p className="text-sm text-gray-400">Loading details…</p>
            )}
            {expandedDetails && expandedDetails !== 'loading' && expandedDetails !== 'error' && (() => {
              // Resolve the best video call link: explicit field first, then extracted from description
              const explicitVideoLink = expandedDetails.hangoutLink || expandedDetails.conferenceLink
              const descVideoLink = expandedDetails.description ? extractVideoLink(expandedDetails.description) : null
              const videoLink = explicitVideoLink || descVideoLink
              const isZoom = videoLink ? /zoom\.us/i.test(videoLink) : false

              const hasDetails = !!(expandedDetails.description || expandedDetails.location || videoLink || expandedDetails.attendees.length > 0)
              if (!hasDetails) return null
              return (
                <div className="space-y-2">
                  {expandedDetails.description && (
                    <div
                      className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed calendar-description relative"
                      dangerouslySetInnerHTML={{ __html: prepareDescription(expandedDetails.description) }}
                    />
                  )}
                  {expandedDetails.location && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{expandedDetails.location}</span>
                    </div>
                  )}
                  {videoLink && (
                    <a
                      href={videoLink}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {isZoom ? 'Join Zoom' : 'Join video call'}
                    </a>
                  )}
                  {expandedDetails.attendees.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                        {expandedDetails.attendees.length} attendee{expandedDetails.attendees.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {expandedDetails.attendees.slice(0, 14).map((a, j) => (
                          <span key={j} className={`text-xs px-1.5 py-0.5 rounded ${
                            a.responseStatus === 'accepted'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                              : a.responseStatus === 'declined'
                              ? 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400 line-through opacity-60'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {a.displayName || a.email.split('@')[0]}
                          </span>
                        ))}
                        {expandedDetails.attendees.length > 14 && (
                          <span className="text-xs text-gray-400">+{expandedDetails.attendees.length - 14} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* RSVP row */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {expandedMeetingEntry.responseStatus === 'needsAction' && (
                <a
                  href={`https://calendar.google.com/calendar/r/week/${new Date(expandedMeetingEntry.start).getFullYear()}/${new Date(expandedMeetingEntry.start).getMonth() + 1}/${new Date(expandedMeetingEntry.start).getDate()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-3 py-1.5 rounded-md font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  Respond in Google Calendar →
                </a>
              )}
              {expandedMeetingEntry.responseStatus !== 'needsAction' && (
                <>
                  <button
                    onClick={() => onSetRsvp(expandedMeeting!, 'attending')}
                    className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                      expandedRsvp === 'attending'
                        ? 'bg-green-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700'
                    }`}
                  >
                    ✓ Attending
                  </button>
                  <button
                    onClick={() => onSetRsvp(expandedMeeting!, 'not-attending')}
                    className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                      expandedRsvp === 'not-attending'
                        ? 'bg-red-500 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                  >
                    ✗ Not attending
                  </button>
                </>
              )}
              <a
                href="https://calendar.google.com/calendar/r"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-auto"
              >
                Open Google Calendar ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
