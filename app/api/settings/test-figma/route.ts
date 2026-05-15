import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/db'

export async function POST() {
  const token = getConfig('figma.accessToken') ?? process.env.FIGMA_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ ok: false, error: 'No access token configured' })
  }

  try {
    const res = await fetch('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': token },
    })
    const data = await res.json() as { id?: string; handle?: string; email?: string; err?: string }
    if (res.ok && data.id) {
      return NextResponse.json({ ok: true, name: data.handle ?? data.email })
    }
    return NextResponse.json({ ok: false, error: data.err ?? 'Request failed' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ ok: false, error: msg })
  }
}
