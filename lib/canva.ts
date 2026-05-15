/**
 * Canva Connect API integration
 *
 * Docs: https://www.canva.dev/docs/connect/
 * OAuth: https://www.canva.dev/docs/connect/oauth2/
 *
 * Required scopes: design:content:read comment:read
 *
 * Set up at developers.canva.com → Create integration → OAuth 2.0
 * Add redirect URI: http://127.0.0.1:3000/api/auth/canva/callback  ← must use 127.0.0.1, not localhost
 */

import { getConfig } from './db'
import { getToken, saveToken, deleteToken, setKvConfig } from './token-store'

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.canva.com/rest/v1'
const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'

export const CANVA_SCOPES = 'design:meta:read comment:read profile:read'

export function getClientId(): string {
  return getConfig('canva.clientId') ?? process.env.CANVA_CLIENT_ID ?? ''
}

export function getClientSecret(): string {
  return getConfig('canva.clientSecret') ?? process.env.CANVA_CLIENT_SECRET ?? ''
}

export function getMyUserId(): string {
  return getConfig('canva.myUserId') ?? process.env.CANVA_MY_USER_ID ?? ''
}

export function isConfigured(): boolean {
  return !!(getClientId() && getClientSecret())
}

export async function isConnected(): Promise<boolean> {
  const token = await getToken('canva')
  return !!token?.access_token
}

// ── Token management ──────────────────────────────────────────────────────────

function basicAuth(): string {
  return Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')
}

async function getValidAccessToken(): Promise<string> {
  const token = await getToken('canva')
  if (!token) throw new Error('Canva not connected')

  const bufferMs = 5 * 60 * 1000
  const isExpired = token.expiry ? Date.now() > token.expiry - bufferMs : false

  if (!isExpired) return token.access_token

  if (!token.refresh_token) throw new Error('No refresh token — please reconnect Canva')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const err = await res.text()
    // If token is invalid/revoked, clear it so UI shows "disconnected"
    if (res.status === 400 || res.status === 401) await deleteToken('canva')
    throw new Error(`Canva token refresh failed: ${err}`)
  }

  const data = await res.json() as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }

  await saveToken({
    provider: 'canva',
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? token.refresh_token,
    expiry: Date.now() + data.expires_in * 1000,
    email: token.email,
  })

  return data.access_token
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function canvaGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const accessToken = await getValidAccessToken()
  const url = new URL(`${API_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Canva API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ── Types mirroring Canva Connect API responses ───────────────────────────────

type CanvaDesign = {
  id: string
  title: string
  created_at?: number   // Unix seconds
  updated_at?: number   // Unix seconds
  thumbnail?: { url: string }
  urls?: { view_url?: string; edit_url?: string }
}

type CanvaDesignsResponse = {
  items: CanvaDesign[]
  continuation?: string
}

type CanvaCommentMention = {
  type: 'user'
  user_id: string
  display_name?: string
}

type CanvaComment = {
  id: string
  thread_id?: string
  created_at: number   // Unix seconds
  updated_at?: number
  author?: {
    id?: string
    display_name?: string
    team_id?: string
  }
  message?: string
  mentions?: Record<string, CanvaCommentMention>
}

type CanvaCommentsResponse = {
  items: CanvaComment[]
  continuation?: string
}

type CanvaMeResponse = {
  team_user?: {
    user_id?: string
    display_name?: string
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type CanvaMentionResult = {
  id: string
  design_id: string
  design_title: string
  design_url: string
  author: string
  text: string
  created_at: string  // ISO string
}

/**
 * Returns the connected user's Canva user ID.
 * Used during OAuth callback to auto-populate CANVA_MY_USER_ID.
 */
export async function fetchMyUserId(): Promise<string | null> {
  try {
    const data = await canvaGet<CanvaMeResponse>('/users/me')
    const userId = data.team_user?.user_id ?? null
    if (userId) {
      await setKvConfig('canva.myUserId', userId)
    }
    return userId
  } catch {
    return null
  }
}

/**
 * Fetches all @mentions of the configured user across recently modified designs.
 *
 * Strategy:
 *   1. List up to 200 designs sorted by modified_descending (2 pages × 100)
 *   2. For each design modified in the last 60 days, fetch comments
 *   3. Filter comments whose `mentions` map contains the user's ID
 *
 * This mirrors what the Canva MCP tools do but runs entirely server-side.
 */
export async function fetchMentions(): Promise<CanvaMentionResult[]> {
  const myUserId = getMyUserId()
  if (!myUserId) throw new Error('CANVA_MY_USER_ID not set — reconnect Canva to auto-detect it')

  const cutoffSeconds = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000)
  const mentions: CanvaMentionResult[] = []

  // ── 1. Collect recent designs ─────────────────────────────────────────────
  const designs: CanvaDesign[] = []

  // Page 1
  const page1 = await canvaGet<CanvaDesignsResponse>('/designs', {
    sort_by: 'modified_descending',
    ownership: 'any',
    limit: '100',
  })
  designs.push(...page1.items)

  // Page 2 (if there's a continuation token)
  if (page1.continuation && designs.length < 200) {
    try {
      const page2 = await canvaGet<CanvaDesignsResponse>('/designs', {
        sort_by: 'modified_descending',
        ownership: 'any',
        limit: '100',
        continuation: page1.continuation,
      })
      designs.push(...page2.items)
    } catch { /* page 2 is best-effort */ }
  }

  // Filter to designs updated in the last 60 days
  const recentDesigns = designs.filter(d => {
    const updatedAt = d.updated_at ?? d.created_at ?? 0
    return updatedAt >= cutoffSeconds
  })

  // ── 2. Fetch comments for each design ─────────────────────────────────────
  for (const design of recentDesigns) {
    let items: CanvaComment[] = []

    try {
      const res = await canvaGet<CanvaCommentsResponse>(`/designs/${design.id}/comments`, {
        limit: '100',
      })
      items = res.items ?? []
    } catch {
      continue  // skip inaccessible designs
    }

    // ── 3. Filter for mentions of the user ──────────────────────────────────
    for (const comment of items) {
      if (!comment.mentions || !comment.mentions[myUserId]) continue

      const viewUrl = design.urls?.view_url ?? `https://www.canva.com/design/${design.id}/view`
      const createdAt = new Date((comment.created_at ?? 0) * 1000).toISOString()

      mentions.push({
        id: comment.id,
        design_id: design.id,
        design_title: design.title ?? design.id,
        design_url: viewUrl,
        author: comment.author?.display_name ?? 'Unknown',
        text: comment.message ?? '',
        created_at: createdAt,
      })
    }
  }

  return mentions
}
