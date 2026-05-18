import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { isConfigured, isConnected, fetchWeeklyForCache } from '@/lib/google-calendar'
import { DATA_DIR } from '@/lib/data-dir'

const CACHE_PATH = path.join(DATA_DIR, 'calendar-cache.json')
const WEEKS_CACHE_PATH = path.join(DATA_DIR, 'calendar-weeks-cache.json')

export type MeetingEntry = {
  title: string
  start: string
  end: string
  duration_min: number
  responseStatus?: string   // 'accepted' | 'tentative' | 'needsAction' | 'declined'
  // Rich detail fields — populated when synced via Google Calendar OAuth
  description?: string | null
  location?: string | null
  conference_link?: string | null
  hangout_link?: string | null
  attendees?: Array<{ email: string; displayName?: string; self?: boolean; organizer?: boolean; responseStatus?: string }>
}

export type DayEntry = {
  date: string
  meetings: MeetingEntry[]
  total_min: number
}

export type CalendarWeekly = {
  synced_at: string
  week_start: string
  week_end: string
  weekly_total_min: number
  daily_breakdown: DayEntry[]
}

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const today = new Date()
  const dow = today.getDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const mon = new Date(today)
  mon.setDate(today.getDate() - daysFromMon)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { weekStart: fmt(mon), weekEnd: fmt(fri) }
}

export async function GET() {
  const weeks: Record<string, CalendarWeekly> = {}

  // Primary: multi-week cache — validate each entry is a real CalendarWeekly object
  if (fs.existsSync(WEEKS_CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(WEEKS_CACHE_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      for (const [key, val] of Object.entries(parsed)) {
        // Skip malformed entries (arrays, primitives, objects without week_start)
        if (
          val && typeof val === 'object' && !Array.isArray(val) &&
          typeof (val as Record<string, unknown>).week_start === 'string'
        ) {
          weeks[key] = val as CalendarWeekly
        }
      }
    } catch { /* ignore */ }
  }

  // Backwards-compat: merge old single-week cache if not already present
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
      const data = JSON.parse(raw) as CalendarWeekly
      if (data.week_start && !weeks[data.week_start]) {
        weeks[data.week_start] = data
      }
    } catch { /* ignore */ }
  }

  if (Object.keys(weeks).length === 0) {
    return NextResponse.json({ available: false })
  }
  return NextResponse.json({ available: true, weeks })
}

// POST — sync current week from Google Calendar OAuth and write to cache
export async function POST() {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 400 })
  }
  if (!(await isConnected())) {
    return NextResponse.json({ error: 'Google Calendar not connected. Connect in Settings.' }, { status: 400 })
  }

  try {
    const { weekStart, weekEnd } = getWeekBounds()
    const dailyBreakdown = await fetchWeeklyForCache(weekStart, weekEnd)

    // Map WeeklyDayEntry → DayEntry, preserving all rich detail fields
    const mappedBreakdown = dailyBreakdown.map(d => ({
      date: d.date,
      total_min: d.total_min,
      meetings: d.meetings.map(m => ({
        title: m.title,
        start: m.start,
        end: m.end,
        duration_min: m.duration_min,
        responseStatus: m.self_response_status ?? undefined,
        description: m.description ?? undefined,
        location: m.location ?? undefined,
        conference_link: m.conference_link ?? undefined,
        hangout_link: m.hangout_link ?? undefined,
        attendees: m.attendees.length > 0 ? m.attendees : undefined,
      })),
    }))

    const cache: CalendarWeekly = {
      synced_at: new Date().toISOString(),
      week_start: weekStart,
      week_end: weekEnd,
      weekly_total_min: dailyBreakdown.reduce((s, d) => s + d.total_min, 0),
      daily_breakdown: mappedBreakdown,
    }

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

    // Write to multi-week cache (merge)
    let weeks: Record<string, CalendarWeekly> = {}
    if (fs.existsSync(WEEKS_CACHE_PATH)) {
      try { weeks = JSON.parse(fs.readFileSync(WEEKS_CACHE_PATH, 'utf-8')) } catch { /* ignore */ }
    }
    weeks[cache.week_start] = cache
    fs.writeFileSync(WEEKS_CACHE_PATH, JSON.stringify(weeks, null, 2))

    // Also write single-week cache for backwards compat
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

    return NextResponse.json({ available: true, weeks })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar sync failed'
    console.error('[/api/calendar/weekly POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
