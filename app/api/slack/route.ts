import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { fetchMessages, bustCache, getBotToken } from '@/lib/slack'
import type { SlackMessage } from '@/lib/slack'
import path from 'path'
import fs from 'fs'
import { DATA_DIR } from '@/lib/data-dir'

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
    if (searchParams.get('bust') === '1') {
      bustCache()
    }

    // If bot token is configured, attempt live fetch (auto-discovers channels if SLACK_CHANNEL_IDS is empty)
    if (getBotToken()) {
      try {
        const messages = await fetchMessages()
        // fetchMessages returns [] when it can't reach any channels — fall through to cache in that case
        if (messages.length > 0) {
          return NextResponse.json({ messages, synced_at: new Date().toISOString() })
        }
      } catch { /* fall through to disk cache */ }
    }

    // Fall back to disk cache (written by live fetch or by MCP-based sync)
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
      const data = JSON.parse(raw) as { synced_at: string; messages: SlackMessage[] }
      const enriched = await resolveUsers(data.messages)
      return NextResponse.json({ messages: enriched, synced_at: data.synced_at })
    }

    return NextResponse.json({ messages: [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/slack GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
