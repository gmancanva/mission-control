import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { fetchMessages, bustCache, getBotToken } from '@/lib/slack'
import type { SlackMessage } from '@/lib/slack'
import path from 'path'
import fs from 'fs'
import { DATA_DIR } from '@/lib/data-dir'

export const dynamic = 'force-dynamic'

const CACHE_PATH = path.join(DATA_DIR, 'slack-mentions-cache.json')
const USERS_CACHE_PATH = path.join(DATA_DIR, 'slack-users-cache.json')

// In-memory user info cache (persists for process lifetime)
const userInfoCache: Record<string, { username: string; avatar_url?: string }> = {}

function readUsersCache(): Record<string, string> {
  try {
    if (fs.existsSync(USERS_CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(USERS_CACHE_PATH, 'utf-8'))
      return data.users ?? {}
    }
  } catch { /* ignore */ }
  return {}
}

async function resolveUsers(messages: SlackMessage[]): Promise<SlackMessage[]> {
  const token = getBotToken()
  if (!token) return messages

  // Slack user IDs start with U or W followed by alphanumeric chars
  const isSlackId = (s: string) => /^[UW][A-Z0-9]{6,}$/.test(s)

  // Resolve real Slack IDs via users.info
  const unresolvedIds = [...new Set(
    messages.filter(m => !m.username && m.user && m.user !== 'unknown' && isSlackId(m.user)).map(m => m.user)
  )].filter(uid => !userInfoCache[uid])

  if (unresolvedIds.length > 0) {
    const client = new WebClient(token)
    await Promise.all(unresolvedIds.map(async uid => {
      try {
        const info = await client.users.info({ user: uid })
        const u = info.user as { real_name?: string; profile?: { display_name?: string; image_72?: string } } | undefined
        userInfoCache[uid] = {
          username: u?.profile?.display_name || u?.real_name || uid,
          avatar_url: u?.profile?.image_72,
        }
      } catch {
        userInfoCache[uid] = { username: uid }
      }
    }))
  }

  // For display-name users (MCP cache), look up avatars from the disk users cache
  const usersList = readUsersCache()

  return messages.map(m => {
    if (isSlackId(m.user)) {
      if (m.username) return m
      const info = userInfoCache[m.user]
      if (!info) return m
      return { ...m, username: info.username, avatar_url: info.avatar_url }
    }
    // Display name user — set username from user field, look up avatar from cache
    if (m.avatar_url) return { ...m, username: m.username ?? m.user }
    const nameKey = Object.keys(usersList).find(
      k => k.toLowerCase() === m.user?.toLowerCase()
    )
    const avatar = nameKey ? usersList[nameKey] : undefined
    return { ...m, username: m.username ?? m.user, avatar_url: avatar }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isBust = searchParams.get('bust') === '1'

    // Explicit sync request: attempt live fetch, write to disk on success
    if (isBust && getBotToken()) {
      bustCache()
      try {
        const messages = await fetchMessages()
        // fetchMessages returns [] when it can't reach any channels — fall through to disk cache
        if (messages.length > 0) {
          const payload = { synced_at: new Date().toISOString(), messages }
          fs.writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2))
          return NextResponse.json(payload)
        }
      } catch { /* fall through to disk cache below */ }
    }

    // Regular GET (or live fetch returned nothing): serve disk cache — always fast
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
      const data = JSON.parse(raw) as { synced_at?: string; messages: SlackMessage[] }
      const enriched = await resolveUsers(data.messages)
      // Fall back to file mtime if the cache predates the synced_at field
      const syncedAt = data.synced_at ?? fs.statSync(CACHE_PATH).mtime.toISOString()
      return NextResponse.json({ messages: enriched, synced_at: syncedAt })
    }

    return NextResponse.json({ messages: [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/slack GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
