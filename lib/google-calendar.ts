import { getConfig } from './db'
import { getToken, saveToken, deleteToken } from './token-store'

export type CalendarEvent = {
  summary: string
  startIso: string
  endIso: string
  durationMinutes: number
}

export type DayBreakdown = {
  date: string        // YYYY-MM-DD
  meetingHours: number
  productiveHours: number
  events: CalendarEvent[]
}

export type CalendarCapacity = {
  connected: boolean
  capacityHours: number
  workingDays: number
  totalMeetingHours: number
  dailyBreakdown: DayBreakdown[]
  email: string | null
}

export type EventDetails = {
  description: string | null
  location: string | null
  hangoutLink: string | null
  conferenceLink: string | null
  attendees: Array<{ email: string; displayName?: string; self?: boolean; responseStatus?: string }>
  selfResponseStatus: string | null
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const GROSS_HOURS_PER_DAY = 8
const BUFFER_HOURS = 1

export function getClientId(): string {
  return getConfig('google.clientId') ?? process.env.GOOGLE_CLIENT_ID ?? ''
}

export function getClientSecret(): string {
  return getConfig('google.clientSecret') ?? process.env.GOOGLE_CLIENT_SECRET ?? ''
}

export function isConfigured(): boolean {
  return !!(getClientId() && getClientSecret())
}

export async function isConnected(): Promise<boolean> {
  const token = await getToken('google')
  return !!token?.access_token
}

// Returns a valid access token, refreshing if expired
async function getValidAccessToken(): Promise<string> {
  const token = await getToken('google')
  if (!token) throw new Error('Google Calendar not connected')

  const bufferMs = 5 * 60 * 1000
  const isExpired = token.expiry ? Date.now() > token.expiry - bufferMs : false

  if (!isExpired) return token.access_token

  if (!token.refresh_token) throw new Error('No refresh token — please reconnect Google Calendar')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const err = await res.text()
    // Clear stale token so UI shows "disconnected" instead of looping on every request
    if (res.status === 400 || res.status === 401) await deleteToken('google')
    throw new Error(`Token refresh failed: ${err}`)
  }

  const data = await res.json() as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }

  await saveToken({
    provider: 'google',
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? token.refresh_token,
    expiry: Date.now() + data.expires_in * 1000,
    email: token.email,
  })

  return data.access_token
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function dateRange(startIso: string, endIso: string): string[] {
  const dates: string[] = []
  const cursor = new Date(startIso)
  const end = new Date(endIso)

  while (cursor <= end) {
    if (!isWeekend(cursor)) {
      dates.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function clampToDay(startIso: string, endIso: string, dayStr: string): number {
  const dayStart = new Date(`${dayStr}T00:00:00Z`).getTime()
  const dayEnd = new Date(`${dayStr}T24:00:00Z`).getTime()
  const evStart = Math.max(new Date(startIso).getTime(), dayStart)
  const evEnd = Math.min(new Date(endIso).getTime(), dayEnd)
  return Math.max(0, evEnd - evStart)
}

export async function getCalendarCapacity(
  sprintStartIso: string,
  sprintEndIso: string
): Promise<CalendarCapacity> {
  const token = await getToken('google')
  if (!token) {
    return { connected: false, capacityHours: 0, workingDays: 0, totalMeetingHours: 0, dailyBreakdown: [], email: null }
  }

  const accessToken = await getValidAccessToken()
  const workingDays = dateRange(sprintStartIso, sprintEndIso)

  // Fetch all events in the sprint window in one call
  // Note: do NOT use a narrow fields mask here — Google Calendar omits attendees.self
  // when false, which breaks the acceptance filter. Request full attendees/organizer objects.
  const params = new URLSearchParams({
    timeMin: new Date(sprintStartIso).toISOString(),
    timeMax: new Date(`${sprintEndIso}T23:59:59Z`).toISOString(),
    singleEvents: 'true',
    maxResults: '2500',
    fields: 'items(summary,start,end,status,organizer,attendees)',
  })

  const res = await fetch(`${CALENDAR_EVENTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar API error: ${res.status} — ${err}`)
  }

  const data = await res.json() as {
    items?: Array<{
      summary?: string
      status?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
      organizer?: { self?: boolean; email?: string }
      attendees?: Array<{ email?: string; self?: boolean; responseStatus?: string }>
    }>
  }

  // Filter to actual meetings the user is attending
  const myEvents = (data.items ?? []).filter((ev) => {
    if (ev.status === 'cancelled') return false
    if (!ev.start?.dateTime) return false  // skip all-day events

    const attendees = ev.attendees ?? []

    // Solo calendar blocks (no other attendees) are not meetings — skip Focus time, Lunch, etc.
    // An attendee without self=true means it's someone else.
    const hasOtherAttendees = attendees.some(a => a.self !== true)
    if (!hasOtherAttendees) return false

    // Find the authenticated user's attendee entry (Google marks it with self: true)
    const selfAttendee = attendees.find(a => a.self === true)
    if (selfAttendee) {
      // Only count meetings explicitly accepted or tentative — not needsAction/declined
      return selfAttendee.responseStatus === 'accepted' || selfAttendee.responseStatus === 'tentative'
    }

    // No self-marked entry found: user organised this meeting without adding themselves.
    // Only include if they're confirmed as organiser (they're definitely attending).
    return ev.organizer?.self === true
  })

  // Group events by working day
  const breakdown: DayBreakdown[] = workingDays.map((day) => {
    const dayEvents: CalendarEvent[] = []
    let totalMs = 0

    for (const ev of myEvents) {
      const startIso = ev.start!.dateTime!
      const endIso = ev.end?.dateTime ?? startIso
      const evDay = startIso.slice(0, 10)
      if (evDay !== day) continue  // quick filter — event starts on this day

      const durationMs = clampToDay(startIso, endIso, day)
      if (durationMs <= 0) continue

      totalMs += durationMs
      dayEvents.push({
        summary: ev.summary ?? '(No title)',
        startIso,
        endIso,
        durationMinutes: Math.round(durationMs / 60000),
      })
    }

    const meetingHours = Math.round((totalMs / 3_600_000) * 10) / 10
    const productiveHours = Math.max(0, Math.round((GROSS_HOURS_PER_DAY - meetingHours - BUFFER_HOURS) * 10) / 10)

    return { date: day, meetingHours, productiveHours, events: dayEvents }
  })

  const totalMeetingHours = Math.round(breakdown.reduce((s, d) => s + d.meetingHours, 0) * 10) / 10
  const capacityHours = Math.round(breakdown.reduce((s, d) => s + d.productiveHours, 0) * 10) / 10

  return {
    connected: true,
    capacityHours,
    workingDays: workingDays.length,
    totalMeetingHours,
    dailyBreakdown: breakdown,
    email: token.email,
  }
}

// ─── Weekly cache sync ───────────────────────────────────────────────────────

export type WeeklyMeetingEntry = {
  title: string
  start: string
  end: string
  duration_min: number
  description: string | null
  location: string | null
  conference_link: string | null
  hangout_link: string | null
  attendees: Array<{ email: string; displayName?: string; self?: boolean; organizer?: boolean; responseStatus?: string }>
  self_response_status: string | null
}

export type WeeklyDayEntry = {
  date: string
  meetings: WeeklyMeetingEntry[]
  total_min: number
}

function tzOffsetStr(): string {
  const offset = -new Date().getTimezoneOffset() // e.g. 600 for UTC+10
  const sign = offset >= 0 ? '+' : '-'
  const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const m = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${sign}${h}:${m}`
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function fetchWeeklyForCache(weekStart: string, weekEnd: string): Promise<WeeklyDayEntry[]> {
  const accessToken = await getValidAccessToken()
  const tz = tzOffsetStr()

  const params = new URLSearchParams({
    timeMin: new Date(`${weekStart}T00:00:00${tz}`).toISOString(),
    timeMax: new Date(`${weekEnd}T23:59:59${tz}`).toISOString(),
    singleEvents: 'true',
    maxResults: '500',
    orderBy: 'startTime',
    fields: 'items(summary,status,description,location,hangoutLink,conferenceData,start,end,organizer,attendees)',
  })

  const res = await fetch(`${CALENDAR_EVENTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar API error: ${res.status} — ${err}`)
  }

  const data = await res.json() as {
    items?: Array<{
      summary?: string
      status?: string
      description?: string
      location?: string
      hangoutLink?: string
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
      organizer?: { self?: boolean }
      attendees?: Array<{ email: string; displayName?: string; self?: boolean; organizer?: boolean; responseStatus?: string }>
    }>
  }

  const meetings: WeeklyMeetingEntry[] = []
  const seen = new Set<string>()

  for (const ev of data.items ?? []) {
    if (ev.status === 'cancelled') continue
    if (!ev.start?.dateTime || !ev.end?.dateTime) continue // skip all-day events

    const durationMs = new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()
    const durationMin = Math.round(durationMs / 60_000)
    if (durationMin > 480) continue // skip all-day blockers (> 8 hours)

    // Must be a real meeting with other attendees — skip solo blocks (Focus time, Lunch, etc.)
    const attendees = ev.attendees ?? []
    const hasOtherAttendees = attendees.some(a => a.self !== true)
    if (!hasOtherAttendees) continue

    // Only count meetings the user accepted or is tentative for
    const selfAttendee = attendees.find(a => a.self === true)
    if (selfAttendee) {
      if (selfAttendee.responseStatus !== 'accepted' && selfAttendee.responseStatus !== 'tentative') continue
    } else if (ev.organizer?.self !== true) {
      // No self-entry and not organiser → can't confirm attendance
      continue
    }

    const dedupKey = `${ev.summary ?? ''}|${ev.start.dateTime}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)

    const conferenceLink = ev.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null

    meetings.push({
      title: ev.summary ?? 'Untitled',
      start: ev.start.dateTime,
      end: ev.end.dateTime,
      duration_min: durationMin,
      description: ev.description ?? null,
      location: ev.location ?? null,
      conference_link: conferenceLink,
      hangout_link: ev.hangoutLink ?? null,
      attendees: (ev.attendees ?? []).map(a => ({
        email: a.email,
        displayName: a.displayName,
        self: a.self,
        organizer: a.organizer,
        responseStatus: a.responseStatus,
      })),
      self_response_status: selfAttendee?.responseStatus ?? null,
    })
  }

  // Group by local date (date portion of start ISO, which is already in local timezone)
  const byDate = new Map<string, WeeklyMeetingEntry[]>()
  for (const m of meetings) {
    // Parse start to get local date via server's timezone
    const localDate = localDateStr(new Date(m.start))
    const list = byDate.get(localDate) ?? []
    list.push(m)
    byDate.set(localDate, list)
  }

  // Build Mon→Fri day entries
  const days: WeeklyDayEntry[] = []
  const cursor = new Date(`${weekStart}T12:00:00`) // noon to avoid DST edge cases
  const endD = new Date(`${weekEnd}T12:00:00`)
  while (cursor <= endD) {
    const dateStr = localDateStr(cursor)
    const dayMeetings = (byDate.get(dateStr) ?? []).sort((a, b) => a.start.localeCompare(b.start))
    days.push({ date: dateStr, meetings: dayMeetings, total_min: dayMeetings.reduce((s, m) => s + m.duration_min, 0) })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export async function getEventDetails(startIso: string): Promise<EventDetails | null> {
  const accessToken = await getValidAccessToken()

  // Query a narrow 2-minute window around the event start time to find it
  const timeMin = new Date(new Date(startIso).getTime() - 60_000).toISOString()
  const timeMax = new Date(new Date(startIso).getTime() + 60_000).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    maxResults: '10',
    fields: 'items(summary,description,location,hangoutLink,conferenceData,start,attendees)',
  })

  const res = await fetch(`${CALENDAR_EVENTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) return null

  const data = await res.json() as {
    items?: Array<{
      summary?: string
      description?: string
      location?: string
      hangoutLink?: string
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
      start?: { dateTime?: string }
      attendees?: Array<{ email: string; displayName?: string; self?: boolean; responseStatus?: string }>
    }>
  }

  const event = (data.items ?? []).find(ev => ev.start?.dateTime === startIso)
  if (!event) return null

  const conferenceLink = event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null
  const selfAttendee = (event.attendees ?? []).find(a => a.self)

  return {
    description: event.description ?? null,
    location: event.location ?? null,
    hangoutLink: event.hangoutLink ?? null,
    conferenceLink,
    attendees: event.attendees ?? [],
    selfResponseStatus: selfAttendee?.responseStatus ?? null,
  }
}
