import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { fetchSprintData, bustCache } from '@/lib/jira'

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('bust') === '1') bustCache()
    const data = await fetchSprintData()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/jira/sprint GET]', message)
    return NextResponse.json({ active: null, next: null, sprintTickets: [] })
  }
}
