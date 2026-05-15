import { NextRequest, NextResponse } from 'next/server'
import { getClientId, getClientSecret } from '@/lib/google-calendar'
import { saveToken } from '@/lib/token-store'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?view=settings&error=${encodeURIComponent(error ?? 'access_denied')}`)
  }

  const clientId = getClientId()
  const clientSecret = getClientSecret()
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/auth/google/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Token exchange failed: ${err}`)
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    // Fetch the user's email for display
    let email: string | null = null
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (profileRes.ok) {
        const profile = await profileRes.json() as { email?: string }
        email = profile.email ?? null
      }
    } catch { /* email is optional */ }

    await saveToken({
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry: Date.now() + tokens.expires_in * 1000,
      email,
    })

    return NextResponse.redirect(`${origin}/?view=settings`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth error'
    console.error('[google/callback]', message)
    return NextResponse.redirect(`${origin}/?view=settings&error=${encodeURIComponent(message)}`)
  }
}
