/**
 * Persistent async token/config store.
 *
 * On Vercel: uses Vercel KV (Redis) — set KV_REST_API_URL + KV_REST_API_TOKEN env vars
 *   (these are auto-provisioned when you link a KV store in the Vercel dashboard)
 * Locally: falls back to SQLite via lib/db.ts
 */
import type { OAuthToken } from './db'

const USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

async function getKvClient() {
  const { kv } = await import('@vercel/kv')
  return kv
}

export async function getToken(provider: string): Promise<OAuthToken | null> {
  if (USE_KV) {
    const kv = await getKvClient()
    return kv.get<OAuthToken>(`token:${provider}`)
  }
  const { getOAuthToken } = await import('./db')
  return getOAuthToken(provider)
}

export async function saveToken(token: OAuthToken): Promise<void> {
  if (USE_KV) {
    const kv = await getKvClient()
    await kv.set(`token:${token.provider}`, token)
    return
  }
  const { saveOAuthToken } = await import('./db')
  saveOAuthToken(token)
}

export async function deleteToken(provider: string): Promise<void> {
  if (USE_KV) {
    const kv = await getKvClient()
    await kv.del(`token:${provider}`)
    return
  }
  const { deleteOAuthToken } = await import('./db')
  deleteOAuthToken(provider)
}

/**
 * Async config store for values that must persist on Vercel.
 * Use this for: canva.pkce_verifier, canva.myUserId
 * All other config (credentials) should come from env vars on Vercel.
 */
export async function getKvConfig(key: string): Promise<string | null> {
  if (USE_KV) {
    const kv = await getKvClient()
    return kv.get<string>(`config:${key}`)
  }
  const { getConfig } = await import('./db')
  return getConfig(key)
}

export async function setKvConfig(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (USE_KV) {
    const kv = await getKvClient()
    if (ttlSeconds) {
      await kv.set(`config:${key}`, value, { ex: ttlSeconds })
    } else {
      await kv.set(`config:${key}`, value)
    }
    return
  }
  const { setConfig } = await import('./db')
  setConfig(key, value)
}

export async function deleteKvConfig(key: string): Promise<void> {
  if (USE_KV) {
    const kv = await getKvClient()
    await kv.del(`config:${key}`)
    return
  }
  const { deleteConfig } = await import('./db')
  deleteConfig(key)
}
