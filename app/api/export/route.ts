import { NextRequest, NextResponse } from 'next/server'
import { fetchEpics } from '@/lib/jira'
import {
  getPinnedDecisions,
  pinDecision,
  unpinDecision,
  type PinnedDecision,
} from '@/lib/db'

export async function GET() {
  try {
    const [epics, pinnedDecisions] = await Promise.all([
      fetchEpics(),
      getPinnedDecisions(),
    ])

    return NextResponse.json({ epics, pinnedDecisions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/export GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'pin' | 'unpin'
      entry?: Omit<PinnedDecision, 'id'>
      sourceId?: string
    }

    if (body.action === 'pin' && body.entry) {
      const result = pinDecision(body.entry)
      return NextResponse.json({ ok: true, decision: result })
    }

    if (body.action === 'unpin' && body.sourceId) {
      unpinDecision(body.sourceId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action or missing fields' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/export POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
