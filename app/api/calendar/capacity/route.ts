import { NextResponse } from 'next/server'
import { isConnected, isConfigured, getCalendarCapacity } from '@/lib/google-calendar'
import { fetchSprintData } from '@/lib/jira'
import { DATA_DIR } from '@/lib/data-dir'
import path from 'path'
import fs from 'fs'

const SPRINT_CACHE_PATH = path.join(DATA_DIR, 'sprint-capacity-cache.json')

export async function GET() {
  // If Google OAuth is configured and connected, use the live API
  if (isConfigured() && (await isConnected())) {
    try {
      const { active } = await fetchSprintData()

      if (!active?.startDate || !active?.endDate) {
        return NextResponse.json({
          connected: true,
          configured: true,
          capacityHours: 0,
          workingDays: 0,
          totalMeetingHours: 0,
          dailyBreakdown: [],
          email: null,
          noSprint: true,
        })
      }

      const capacity = await getCalendarCapacity(active.startDate, active.endDate)
      return NextResponse.json({ ...capacity, configured: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Calendar error'
      console.error('[/api/calendar/capacity live]', message)
      // Fall through to cache
    }
  }

  // Fall back to sprint-capacity-cache.json (written by Claude via MCP calendar sync)
  if (fs.existsSync(SPRINT_CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(SPRINT_CACHE_PATH, 'utf-8')
      const cache = JSON.parse(raw)
      return NextResponse.json({ ...cache, configured: true })
    } catch (err) {
      console.error('[/api/calendar/capacity cache]', err)
    }
  }

  return NextResponse.json({ connected: false, configured: false })
}
