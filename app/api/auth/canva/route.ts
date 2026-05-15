import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getClientId, CANVA_SCOPES } from '@/lib/canva'
import { setKvConfig } from '@/lib/token-store'

const AUTH_URL = 'https://www.canva.com/api/oauth/authorize'

export async function GET(request: NextRequest) {
  const clientId = getClientId()
  if (!clientId) {
    return NextResponse.json({ error: 'CANVA_CLIENT_ID not configured' }, { status: 500 })
  }

  // PKCE: generate code_verifier (64 hex chars) and code_challenge (SHA-256 → base64url)
  // Per RFC 7636: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
  const codeVerifier = crypto.randomBytes(32).toString('hex')  // 64 chars, [0-9a-f] only
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  // Persist verifier in KV/DB (avoids cookie domain/SameSite issues between localhost and 127.0.0.1)
  await setKvConfig('canva.pkce_verifier', codeVerifier, 600)

  const origin = new URL(request.url).origin
  const redirectUri = process.env.CANVA_REDIRECT_URI ?? `${origin}/api/auth/canva/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CANVA_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return NextResponse.redirect(`${AUTH_URL}?${params}`)
}
