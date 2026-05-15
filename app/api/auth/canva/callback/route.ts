import { NextRequest, NextResponse } from 'next/server'
import { getClientId, getClientSecret, fetchMyUserId } from '@/lib/canva'
import { saveToken, getKvConfig, deleteKvConfig } from '@/lib/token-store'

const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/?view=settings&canva_error=${encodeURIComponent(error ?? 'access_denied')}`
    )
  }

  // Retrieve PKCE code_verifier from KV/DB (stored during /api/auth/canva)
  const codeVerifier = await getKvConfig('canva.pkce_verifier')

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${origin}/?view=settings&canva_error=${encodeURIComponent('Missing PKCE verifier — please try connecting again')}`
    )
  }

  // Clean up — verifier is single-use
  await deleteKvConfig('canva.pkce_verifier')

  const clientId = getClientId()
  const clientSecret = getClientSecret()
  const redirectUri = process.env.CANVA_REDIRECT_URI ?? `${origin}/api/auth/canva/callback`
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
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

    await saveToken({
      provider: 'canva',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry: Date.now() + tokens.expires_in * 1000,
      email: null,
    })

    // Auto-detect and save the user's Canva user ID (for mention filtering)
    // fetchMyUserId() already calls setKvConfig('canva.myUserId', ...) internally
    try {
      await fetchMyUserId()
    } catch { /* non-fatal */ }

    return NextResponse.redirect(`${origin}/?view=settings`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth error'
    console.error('[canva/callback]', message)
    return NextResponse.redirect(
      `${origin}/?view=settings&canva_error=${encodeURIComponent(message)}`
    )
  }
}
