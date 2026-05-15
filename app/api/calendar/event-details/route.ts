import { NextRequest, NextResponse } from 'next/server'
import { isConnected, isConfigured, getEventDetails } from '@/lib/google-calendar'
import path from 'path'
import fs from 'fs'

const CACHE_PATH = path.join(process.cwd(), 'data', 'calendar-cache.json')

type CacheMeeting = {
  title: string
  start: string
  end: string
  duration_min: number
  description?: string | null
  location?: string | null
  conference_link?: string | null
  hangout_link?: string | null
  attendees?: Array<{ email: string; displayName?: string; self?: boolean; organizer?: boolean; responseStatus?: string }>
  self_response_status?: string | null
}
type CacheDay = { date: string; meetings: CacheMeeting[]; total_min: number }

function findInCache(start: string) {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as { daily_breakdown: CacheDay[] }
    for (const day of data.daily_breakdown ?? []) {
      const match = day.meetings.find(m => m.start === start)
      if (match) return match
    }
  } catch { /* ignore */ }
  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')

  if (!start) {
    return NextResponse.json({ error: 'Missing start param' }, { status: 400 })
  }

  // Live fetch via OAuth
  if (isConfigured() && (await isConnected())) {
    try {
      const details = await getEventDetails(start)
      if (!details) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      return NextResponse.json(details)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Calendar error'
      console.error('[/api/calendar/event-details]', message)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // Fall back to cache — return enriched inline details if available
  const cached = findInCache(start)
  if (cached) {
    return NextResponse.json({
      description: cached.description ?? null,
      location: cached.location ?? null,
      hangoutLink: cached.hangout_link ?? null,
      conferenceLink: cached.conference_link ?? null,
      attendees: cached.attendees ?? [],
      selfResponseStatus: cached.self_response_status ?? null,
    })
  }

  return NextResponse.json({ error: 'Event not found' }, { status: 404 })
}
