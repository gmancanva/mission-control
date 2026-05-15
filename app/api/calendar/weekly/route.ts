import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { isConfigured, isConnected, fetchWeeklyForCache } from '@/lib/google-calendar'
import { DATA_DIR } from '@/lib/data-dir'

const CACHE_PATH = path.join(DATA_DIR, 'calendar-cache.json')

export type MeetingEntry = {
  title: string
  start: string
  end: string
  duration_min: number
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
  if (!fs.existsSync(CACHE_PATH)) {
    return NextResponse.json({ available: false })
  }

  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const data = JSON.parse(raw) as CalendarWeekly
    return NextResponse.json({ available: true, ...data })
  } catch {
    return NextResponse.json({ available: false })
  }
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

    const cache: CalendarWeekly = {
      synced_at: new Date().toISOString(),
      week_start: weekStart,
      week_end: weekEnd,
      weekly_total_min: dailyBreakdown.reduce((s, d) => s + d.total_min, 0),
      daily_breakdown: dailyBreakdown,
    }

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

    return NextResponse.json({ available: true, ...cache })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar sync failed'
    console.error('[/api/calendar/weekly POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
