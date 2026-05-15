import { NextRequest, NextResponse } from 'next/server'
import { getClientId } from '@/lib/google-calendar'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

export async function GET(request: NextRequest) {
  const clientId = getClientId()
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 })
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
