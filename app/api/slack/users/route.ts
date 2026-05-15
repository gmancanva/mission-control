import { NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import path from 'path'
import fs from 'fs'
import { getBotToken } from '@/lib/slack'
import { DATA_DIR } from '@/lib/data-dir'

const DISK_CACHE_PATH = path.join(DATA_DIR, 'slack-users-cache.json')
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let fetching = false

function readDiskCache(): { users: Record<string, string>; ts: number } | null {
  try {
    if (fs.existsSync(DISK_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(DISK_CACHE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return null
}

async function fetchAndCache(token: string): Promise<void> {
  if (fetching) return
  fetching = true
  try {
    const client = new WebClient(token)
    const users: Record<string, string> = {}
    let cursor: string | undefined
    do {
      const res = await client.users.list({ limit: 200, ...(cursor ? { cursor } : {}) })
      for (const member of res.members ?? []) {
        const m = member as {
          deleted?: boolean; is_bot?: boolean; real_name?: string
          profile?: { display_name?: string; real_name?: string; image_72?: string }
        }
        if (m.deleted || m.is_bot) continue
        const avatar = m.profile?.image_72
        if (!avatar) continue
        const displayName = m.profile?.display_name?.trim() || ''
        const realName = m.profile?.real_name?.trim() || m.real_name?.trim() || ''
        if (displayName) users[displayName] = avatar
        if (realName && realName !== displayName) users[realName] = avatar
      }
      cursor = (res.response_metadata as { next_cursor?: string } | undefined)?.next_cursor || undefined
    } while (cursor)
    fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify({ users, ts: Date.now() }))
  } catch { /* ignore */ } finally {
    fetching = false
  }
}

export async function GET() {
  const token = getBotToken()
  if (!token) return NextResponse.json({ users: {} })

  const cached = readDiskCache()

  // If cache is stale or missing, kick off background refresh
  if (!cached || Date.now() - cached.ts > CACHE_TTL_MS) {
    fetchAndCache(token) // fire-and-forget
  }

  // Return what we have immediately (may be empty on first ever load)
  return NextResponse.json({ users: cached?.users ?? {} })
}
