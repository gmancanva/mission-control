import { NextResponse } from 'next/server'
import { fetchSprintData } from '@/lib/jira'

export async function GET() {
  try {
    const data = await fetchSprintData()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/jira/sprint GET]', message)
    return NextResponse.json({ active: null, next: null, sprintTickets: [] })
  }
}
