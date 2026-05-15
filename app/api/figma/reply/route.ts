import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/figma'

export async function POST(request: NextRequest) {
  const token = getAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'FIGMA_ACCESS_TOKEN not configured' }, { status: 503 })
  }

  try {
    const { file_key, parent_id, message } = await request.json() as {
      file_key: string
      parent_id: string
      message: string
    }

    const res = await fetch(`https://api.figma.com/v1/files/${file_key}/comments`, {
      method: 'POST',
      headers: { 'X-Figma-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, parent_id }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Figma API error: ${res.status} — ${text}` }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/figma/reply POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
