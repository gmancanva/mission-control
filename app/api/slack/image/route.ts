import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/db'

function getToken(): string {
  return getConfig('slack.botToken') ?? process.env.SLACK_BOT_TOKEN ?? ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  // Only proxy Slack CDN URLs
  const allowed = ['https://files.slack.com/', 'https://a.slack-edge.com/', 'https://avatars.slack-edge.com/']
  if (!allowed.some(prefix => url.startsWith(prefix))) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  const token = getToken()
  const headers: Record<string, string> = { Accept: '*/*' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: res.status })
    }
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Proxy error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
