import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/db'

function getAuthHeader(): string {
  const email = getConfig('jira.email') ?? process.env.JIRA_EMAIL ?? ''
  const token = getConfig('jira.apiToken') ?? process.env.JIRA_API_TOKEN ?? ''
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
}

function getBaseUrl(): string {
  return (getConfig('jira.baseUrl') ?? process.env.JIRA_BASE_URL ?? '').replace(/\/$/, '')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  // Validate the URL is on the configured Jira domain
  const base = getBaseUrl()
  if (!base || !url.startsWith(base)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(),
        Accept: '*/*',
      },
      cache: 'no-store',
    })

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
