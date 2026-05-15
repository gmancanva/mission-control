import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import path from 'path'
import fs from 'fs'
import { getBotToken, getMyUserId } from '@/lib/slack'
import { DATA_DIR } from '@/lib/data-dir'

const CACHE_PATH = path.join(DATA_DIR, 'slack-threads-cache.json')

export type ThreadMessage = {
  author: string
  avatar_url?: string
  text: string
  ts: string
  is_parent?: boolean
  is_me?: boolean
  reactions?: { name: string; count: number }[]
  files?: {
    url: string
    name: string
    mimetype: string
    thumb_url?: string
  }[]
}

type ThreadCache = {
  synced_at: string
  threads: Record<string, ThreadMessage[]>
}

async function fetchThreadLive(channel: string, ts: string): Promise<ThreadMessage[] | null> {
  const token = getBotToken()
  if (!token) return null

  const myUserId = getMyUserId().trim() || undefined
  const client = new WebClient(token)

  // Cursor through all replies (Slack pages at 200 max per request)
  const rawMessages: Array<{
    ts?: string
    text?: string
    user?: string
    username?: string
    files?: Array<{
      url_private?: string
      name?: string
      mimetype?: string
      thumb_800?: string
      permalink?: string
    }>
  }> = []

  let cursor: string | undefined
  do {
    const res = await client.conversations.replies({
      channel,
      ts,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    })
    rawMessages.push(...((res.messages ?? []) as typeof rawMessages))
    cursor = (res as { response_metadata?: { next_cursor?: string } }).response_metadata?.next_cursor || undefined
  } while (cursor)

  if (rawMessages.length === 0) return null

  // Resolve user display names + avatars in one pass
  const userIds = [...new Set(rawMessages.map(m => m.user).filter(Boolean))] as string[]
  const displayNames: Record<string, string> = {}
  const avatarUrls: Record<string, string> = {}
  await Promise.all(userIds.map(async (uid) => {
    try {
      const info = await client.users.info({ user: uid })
      const u = info.user as {
        real_name?: string
        profile?: { display_name?: string; real_name?: string; image_72?: string }
      } | undefined
      displayNames[uid] = u?.profile?.display_name || u?.real_name || uid
      if (u?.profile?.image_72) avatarUrls[uid] = u.profile.image_72
    } catch {
      displayNames[uid] = uid
    }
  }))

  return rawMessages.map(msg => {
    const userId = msg.user ?? ''
    const msgFiles = (msg.files ?? [])
      .map(f => ({
        url: f.url_private ?? f.permalink ?? '',
        name: f.name ?? 'file',
        mimetype: f.mimetype ?? '',
        thumb_url: f.thumb_800,
      }))
      .filter(f => f.url)

    return {
      author: displayNames[userId] ?? msg.username ?? userId,
      ...(avatarUrls[userId] ? { avatar_url: avatarUrls[userId] } : {}),
      text: msg.text ?? '',
      ts: msg.ts ?? '',
      is_parent: msg.ts === ts || undefined,
      is_me: (myUserId && userId === myUserId) || undefined,
      ...(msgFiles.length > 0 ? { files: msgFiles } : {}),
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')
    const ts = searchParams.get('ts')

    if (!channel || !ts) {
      return NextResponse.json({ error: 'Missing channel or ts param' }, { status: 400 })
    }

    // Live fetch when bot token is configured
    if (getBotToken()) {
      try {
        const thread = await fetchThreadLive(channel, ts)
        if (thread && thread.length > 0) {
          return NextResponse.json({ thread, live: true })
        }
      } catch (err) {
        console.warn('[/api/slack/thread] live fetch failed, falling back to cache:', err)
      }
    }

    // Fall back to static cache
    if (!fs.existsSync(CACHE_PATH)) {
      return NextResponse.json({ thread: null })
    }

    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const data = JSON.parse(raw) as ThreadCache
    const key = `${channel}:${ts}`
    const thread = data.threads[key] ?? null

    return NextResponse.json({ thread, synced_at: data.synced_at })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/slack/thread GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
