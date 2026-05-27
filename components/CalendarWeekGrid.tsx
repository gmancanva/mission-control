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
 * Sanitize calendar description HTML using an allowlist approach via the
 * browser's own DOM parser. Only permits:
 *   - Safe text/structure elements: b, strong, i, em, u, br, p, div, span,
 *     ul, ol, li, h1–h4 (all stripped of attributes)
 *   - <a href="https?://…"> only — unsafe schemes (javascript:, data:, etc.)
 *     are replaced with their plain-text content
 * Everything else (script, style, iframe, form, on* handlers, data: attrs…)
 * is dropped automatically because we rebuild from the parsed DOM.
 */
function prepareDescription(html: string): string {
  if (typeof document === 'undefined') return '' // SSR guard (component is 'use client')

  const SAFE_TAGS = new Set([
    'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
  ])

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

  function walk(node: Element): void {
    // Iterate in reverse so in-place mutations don't skip nodes
    const children = Array.from(node.childNodes).reverse()
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue // plain text is always safe
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child) // remove comments, PIs, etc.
        continue
      }

      const el = child as Element
      const tag = el.tagName.toLowerCase()

      if (tag === 'a') {
        const href = (el.getAttribute('href') ?? '').trim()
        if (!/^https?:\/\//i.test(href)) {
          // Unsafe scheme — replace with the link's inner text
          el.replaceWith(el.textContent ?? '')
        } else {
          // Safe — strip every attribute, re-add only href + safe defaults
          while (el.attributes.length) el.removeAttribute(el.attributes[0].name)
          el.setAttribute('href', href)
          el.setAttribute('target', '_blank')
          el.setAttribute('rel', 'noopener noreferrer')
          walk(el)
        }
      } else if (SAFE_TAGS.has(tag)) {
        // Strip all attributes from allowed structural/text tags
        while (el.attributes.length) el.removeAttribute(el.attributes[0].name)
        walk(el)
      } else {
        // Disallowed tag — unwrap (keep children, discard the element itself)
        walk(el)
        while (el.firstChild) el.before(el.firstChild)
        el.parentNode?.removeChild(el)
      }
    }
  }

  walk(doc.body)

  // Auto-link bare https:// URLs in text nodes not already inside an <a>
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) {
    if ((n.parentElement?.tagName ?? '').toLowerCase() !== 'a') {
      textNodes.push(n as Text)
    }
  }
  for (const textNode of textNodes) {
    const text = textNode.textContent ?? ''
    if (!/https?:\/\//i.test(text)) continue
    const frag = doc.createDocumentFragment()
    let last = 0
    text.replace(/(https?:\/\/[^\s<>"')\]]+)/gi, (url, _, offset) => {
      if (offset > last) frag.append(doc.createTextNode(text.slice(last, offset)))
      const a = doc.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = url
      frag.append(a)
      last = offset + url.length
      return url
    })
    if (last < text.length) frag.append(doc.createTextNode(text.slice(last)))
    textNode.replaceWith(frag)
  }

  return doc.body.innerHTML
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
    <div style={{ borderRadius: 12, border: '1px solid var(--pdBorder)', background: 'var(--pdSurface1)', overflow: 'hidden' }}>
      {/* Sticky day header */}
      <div
        style={{ display: 'grid', gridTemplateColumns: `44px repeat(${dates.length}, 1fr)`, borderBottom: '1px solid var(--pdBorder)', background: 'var(--pdSurface1)' }}
      >
        <div style={{ padding: '8px 0', borderRight: '1px solid var(--pdSurface2)' }} />
        {dates.map(date => {
          const d = new Date(`${date}T00:00:00`)
          const isToday = date === todayStr
          const isPast = date < todayStr
          return (
            <div key={date} style={{ padding: '8px 0', textAlign: 'center', borderRight: '1px solid var(--pdSurface2)', opacity: isPast && !isToday ? 0.4 : 1 }}>
              <p style={{ fontSize: 11, color: 'var(--pdTextSubtle)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                {d.toLocaleDateString('en-AU', { weekday: 'short' })}
              </p>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                marginTop: 2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                margin: '2px auto 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isToday ? 'var(--pdAccent06)' : 'transparent',
                color: isToday ? '#fff' : 'var(--pdTextStrong)',
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: 460 }}>
        <div style={{ display: 'flex', height: TOTAL_HEIGHT }}>

          {/* Time label column */}
          <div style={{ width: 44, flexShrink: 0, borderRight: '1px solid var(--pdSurface2)', position: 'relative', userSelect: 'none', height: TOTAL_HEIGHT }}>
            {HOURS.map(h => (
              <div
                key={h}
                style={{ position: 'absolute', right: 6, fontSize: 11, color: 'var(--pdTextSubtle)', lineHeight: 1, top: (h - GRID_START) * PX_PER_HOUR - 7 }}
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
                style={{
                  flex: 1,
                  position: 'relative',
                  borderRight: '1px solid var(--pdSurface2)',
                  height: TOTAL_HEIGHT,
                  opacity: isPast && !isToday ? 0.4 : 1,
                  background: isToday ? 'color-mix(in srgb, var(--pdAccent06) 3%, transparent)' : undefined,
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ position: 'absolute', width: '100%', borderTop: '1px solid var(--pdSurface2)', top: (h - GRID_START) * PX_PER_HOUR }}
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--pdTextStrong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: 0 }}>{m.title}</p>
                        {isPending && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--pdStatusReviewText)', flexShrink: 0, lineHeight: 1.3 }}>?</span>}
                      </div>
                      {height > 32 && (
                        <p style={{ fontSize: 11, color: 'var(--pdTextSubtle)', lineHeight: 1.3, marginTop: 2 }}>
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
        <div style={{ borderTop: '1px solid var(--pdBorder)', padding: 16, background: 'var(--pdSurface2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--pdTextStrong)', margin: 0 }}>{expandedMeetingEntry.title}</h3>
                  {expandedMeetingEntry.responseStatus === 'needsAction' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--pdStatusReviewBg)', color: 'var(--pdStatusReviewText)', border: '1px solid var(--pdStatusReviewBorder)' }}>
                      Awaiting response
                    </span>
                  )}
                  {expandedMeetingEntry.responseStatus === 'tentative' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--pdSurface3)', color: 'var(--pdTextSubtle)', border: '1px solid var(--pdBorder)' }}>
                      Tentative
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--pdTextSubtle)', marginTop: 2 }}>
                  {new Date(expandedMeetingEntry.start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' – '}
                  {new Date(expandedMeetingEntry.end).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' · '}
                  {expandedMeetingEntry.duration_min}min
                </p>
              </div>
              <button
                onClick={() => onExpandMeeting(expandedMeeting!)}
                className="IconButton IconButton--small"
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {expandedDetails === 'loading' && (
              <p style={{ fontSize: 13, color: 'var(--pdTextSubtle)' }}>Loading details…</p>
            )}
            {expandedDetails && expandedDetails !== 'loading' && expandedDetails !== 'error' && (() => {
              const explicitVideoLink = expandedDetails.hangoutLink || expandedDetails.conferenceLink
              const descVideoLink = expandedDetails.description ? extractVideoLink(expandedDetails.description) : null
              const videoLink = explicitVideoLink || descVideoLink
              const isZoom = videoLink ? /zoom\.us/i.test(videoLink) : false

              const hasDetails = !!(expandedDetails.description || expandedDetails.location || videoLink || expandedDetails.attendees.length > 0)
              if (!hasDetails) return null
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {expandedDetails.description && (
                    <div
                      style={{ fontSize: 13, color: 'var(--pdTextBase)', lineHeight: 1.6 }}
                      className="calendar-description"
                      dangerouslySetInnerHTML={{ __html: prepareDescription(expandedDetails.description) }}
                    />
                  )}
                  {expandedDetails.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--pdTextSubtle)' }}>
                      <svg style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expandedDetails.location}</span>
                    </div>
                  )}
                  {videoLink && (
                    <a href={videoLink} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--pdAccent06)', textDecoration: 'none', fontWeight: 500 }}>
                      <svg style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {isZoom ? 'Join Zoom' : 'Join video call'}
                    </a>
                  )}
                  {expandedDetails.attendees.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--pdTextSubtle)', marginBottom: 6 }}>
                        {expandedDetails.attendees.length} attendee{expandedDetails.attendees.length !== 1 ? 's' : ''}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {expandedDetails.attendees.slice(0, 14).map((a, j) => (
                          <span key={j} style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: a.responseStatus === 'accepted' ? 'var(--pdStatusDoneBg)' : a.responseStatus === 'declined' ? 'var(--pdStatusBlockedBg)' : 'var(--pdSurface3)',
                            color: a.responseStatus === 'accepted' ? 'var(--pdStatusDoneText)' : a.responseStatus === 'declined' ? 'var(--pdStatusBlockedText)' : 'var(--pdTextSubtle)',
                            textDecoration: a.responseStatus === 'declined' ? 'line-through' : undefined,
                            opacity: a.responseStatus === 'declined' ? 0.7 : 1,
                          }}>
                            {a.displayName || a.email.split('@')[0]}
                          </span>
                        ))}
                        {expandedDetails.attendees.length > 14 && (
                          <span style={{ fontSize: 11, color: 'var(--pdTextSubtle)' }}>+{expandedDetails.attendees.length - 14} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* RSVP row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
              {expandedMeetingEntry.responseStatus === 'needsAction' && (
                <a
                  href={`https://calendar.google.com/calendar/r/week/${new Date(expandedMeetingEntry.start).getFullYear()}/${new Date(expandedMeetingEntry.start).getMonth() + 1}/${new Date(expandedMeetingEntry.start).getDate()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="PdButton PdButton--primary PdButton--small"
                  style={{ textDecoration: 'none' }}
                >
                  Respond in Google Calendar →
                </a>
              )}
              {expandedMeetingEntry.responseStatus !== 'needsAction' && (
                <>
                  <button
                    onClick={() => onSetRsvp(expandedMeeting!, 'attending')}
                    className={expandedRsvp === 'attending' ? 'PdButton PdButton--primary PdButton--small' : 'PdButton PdButton--secondary PdButton--small'}
                  >
                    ✓ Attending
                  </button>
                  <button
                    onClick={() => onSetRsvp(expandedMeeting!, 'not-attending')}
                    className={expandedRsvp === 'not-attending' ? 'PdButton PdButton--primary PdButton--small' : 'PdButton PdButton--secondary PdButton--small'}
                  >
                    ✗ Not attending
                  </button>
                </>
              )}
              <a
                href="https://calendar.google.com/calendar/r"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--pdTextSubtle)', textDecoration: 'none', marginLeft: 'auto' }}
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
