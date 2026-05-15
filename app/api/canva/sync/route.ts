import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { isConnected, fetchMentions } from '@/lib/canva'
import type { CanvaMention, CanvaMentionsCache } from '../route'
import { DATA_DIR } from '@/lib/data-dir'

const CACHE_PATH = path.join(DATA_DIR, 'canva-mentions-cache.json')

function readCache(): CanvaMention[] {
  if (!fs.existsSync(CACHE_PATH)) return []
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const data = JSON.parse(raw) as CanvaMentionsCache
    return data.mentions ?? []
  } catch { return [] }
}

function writeCache(mentions: CanvaMention[]): string {
  const synced_at = new Date().toISOString()
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(CACHE_PATH, JSON.stringify({ synced_at, mentions }, null, 2))
  return synced_at
}

function mergeMentions(existing: CanvaMention[], incoming: CanvaMention[]): { merged: CanvaMention[]; added: number } {
  const map = new Map(existing.map(m => [m.id, m]))
  let added = 0
  for (const m of incoming) {
    if (!map.has(m.id)) added++
    map.set(m.id, m)
  }
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return { merged, added }
}

/**
 * GET /api/canva/sync
 *
 * Triggers a live fetch from the Canva Connect API, merges results into the
 * disk cache, and returns the updated list. Called by:
 *   - "Sync Now" button in the UI
 *   - Vercel/Railway scheduled cron (see vercel.json)
 *
 * Returns 400 if Canva is not connected (OAuth not completed).
 */
export async function GET() {
  if (!(await isConnected())) {
    return NextResponse.json(
      { error: 'Canva not connected — complete OAuth in Settings first' },
      { status: 400 }
    )
  }

  try {
    const fresh = await fetchMentions()
    const existing = readCache()
    const { merged, added } = mergeMentions(existing, fresh as CanvaMention[])
    const synced_at = writeCache(merged)

    return NextResponse.json({
      ok: true,
      added,
      total: merged.length,
      synced_at,
      mentions: merged,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/canva/sync GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/canva/sync
 *
 * Accepts an array of CanvaMention objects (e.g. from an external agent),
 * merges them into the disk cache, and returns the updated count.
 *
 * Body: { mentions: CanvaMention[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { mentions?: unknown }
    const incoming = body.mentions

    if (!Array.isArray(incoming)) {
      return NextResponse.json({ error: '`mentions` must be an array' }, { status: 400 })
    }
    const mentions = incoming as CanvaMention[]

    const existing = readCache()
    const { merged, added } = mergeMentions(existing, mentions)
    const synced_at = writeCache(merged)

    return NextResponse.json({ ok: true, added, total: merged.length, synced_at })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/canva/sync POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
