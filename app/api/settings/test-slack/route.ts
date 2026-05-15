import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/db'

export async function POST() {
  const token = getConfig('slack.botToken') ?? process.env.SLACK_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ ok: false, error: 'No bot token configured' })
  }

  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as { ok: boolean; team?: string; bot_id?: string; user?: string; error?: string }
    if (data.ok) {
      return NextResponse.json({ ok: true, workspace: data.team, bot: data.user })
    }
    return NextResponse.json({ ok: false, error: data.error ?? 'auth.test failed' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ ok: false, error: msg })
  }
}
