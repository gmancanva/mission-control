import { NextResponse } from 'next/server'
import { isConnected, isConfigured, getCalendarCapacity } from '@/lib/google-calendar'
import { fetchSprintData } from '@/lib/jira'

export async function GET() {
  // Status-only check (no sprint needed)
  if (!isConfigured()) {
    return NextResponse.json({ connected: false, configured: false })
  }

  if (!(await isConnected())) {
    return NextResponse.json({ connected: false, configured: true })
  }

  try {
    // Get sprint dates for the capacity window
    const { active } = await fetchSprintData()

    if (!active?.startDate || !active?.endDate) {
      // Connected but no active sprint — return connected status with zero capacity
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
    console.error('[/api/calendar/capacity]', message)
    return NextResponse.json({ connected: true, configured: true, error: message }, { status: 500 })
  }
}
