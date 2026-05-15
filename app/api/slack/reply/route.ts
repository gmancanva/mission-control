import { NextRequest, NextResponse } from 'next/server'
import { getBotToken } from '@/lib/slack'

export async function POST(request: NextRequest) {
  const token = getBotToken()
  if (!token) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 503 })
  }

  try {
    const { channel, thread_ts, message } = await request.json() as {
      channel: string
      thread_ts: string
      message: string
    }

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, thread_ts, text: message }),
    })

    const data = await res.json() as { ok: boolean; error?: string }
    if (!data.ok) {
      return NextResponse.json({ error: data.error ?? 'Slack API error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/slack/reply POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
