import { WebClient } from '@slack/web-api'
import path from 'path'
import fs from 'fs'
import { getConfig } from './db'
import { DATA_DIR } from './data-dir'

export type SlackMessage = {
  id: string
  channel: string
  channelName: string
  text: string
  ts: string
  thread_ts?: string  // parent thread ts; equals ts for top-level messages
  user: string
  username?: string
  avatar_url?: string
  permalink: string
}

const CACHE_PATH = path.join(DATA_DIR, 'slack-mentions-cache.json')

// ── Credential helpers (DB takes precedence over env vars) ────────────────────
export function getBotToken(): string {
  return getConfig('slack.botToken') ?? process.env.SLACK_BOT_TOKEN ?? ''
}
export function getMyUserId(): string {
  return getConfig('slack.myUserId') ?? process.env.SLACK_MY_USER_ID ?? ''
}

const memCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function bustCache(): void {
  memCache.clear()
}

function getFromMemCache<T>(key: string): T | null {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    memCache.delete(key)
    return null
  }
  return entry.data as T
}

function setInMemCache(key: string, data: unknown): void {
  memCache.set(key, { data, ts: Date.now() })
}

function getChannelIds(): string[] {
  return (getConfig('slack.channelIds') ?? process.env.SLACK_CHANNEL_IDS ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

function buildPermalink(workspaceUrl: string, channelId: string, ts: string): string {
  const tsNoDot = ts.replace('.', '')
  return `${workspaceUrl}/archives/${channelId}/p${tsNoDot}`
}

/** Write a fresh result to the disk cache so it survives server restarts */
function writeToDiskCache(messages: SlackMessage[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(CACHE_PATH, JSON.stringify({
      synced_at: new Date().toISOString(),
      messages,
    }, null, 2))
  } catch { /* non-fatal */ }
}

export async function fetchMessages(): Promise<SlackMessage[]> {
  const cacheKey = 'slack_messages'
  const cached = getFromMemCache<SlackMessage[]>(cacheKey)
  if (cached) return cached

  const token = getBotToken()
  if (!token) return []

  const client = new WebClient(token)
  const mySlackId = getMyUserId().trim() || undefined

  // Resolve workspace URL
  let workspaceUrl = ''
  try {
    const auth = await client.auth.test()
    workspaceUrl = (auth as { url?: string }).url?.replace(/\/$/, '') ?? ''
  } catch { /* workspaceUrl stays empty */ }

  // Use configured channel IDs, or auto-discover channels the bot is in
  let channelIds = getChannelIds()

  if (channelIds.length === 0) {
    try {
      // List channels the bot is a member of (public + private + DMs)
      const list = await client.conversations.list({
        types: 'public_channel,private_channel,mpim,im',
        exclude_archived: true,
        limit: 200,
      })
      channelIds = ((list.channels ?? []) as Array<{ id?: string; is_member?: boolean }>)
        .filter(c => c.is_member !== false && c.id)
        .map(c => c.id!)
        .slice(0, 100) // cap at 100 channels
    } catch { /* no channels discovered */ }
  }

  if (channelIds.length === 0) return []

  const allMessages: SlackMessage[] = []
  // Only fetch messages from the last 14 days
  const oldest = String(Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000))

  // Resolve user display names + avatars (shared across all channels)
  const userNames: Record<string, string> = {}
  const userAvatars: Record<string, string> = {}
  async function resolveUser(uid: string) {
    if (userNames[uid] !== undefined || !uid) return
    try {
      const info = await client.users.info({ user: uid })
      const u = info.user as { real_name?: string; profile?: { display_name?: string; image_72?: string } } | undefined
      userNames[uid] = u?.profile?.display_name || u?.real_name || uid
      if (u?.profile?.image_72) userAvatars[uid] = u.profile.image_72
    } catch { userNames[uid] = uid }
  }

  for (const channelId of channelIds) {
    // Resolve channel name
    let channelName = channelId
    try {
      const info = await client.conversations.info({ channel: channelId })
      const ch = info.channel as { name?: string; is_im?: boolean; is_mpim?: boolean } | undefined
      channelName = ch?.name ?? channelId
    } catch { /* keep channelId */ }

    // Fetch recent history
    let historyMessages: Array<{
      client_msg_id?: string; ts?: string; thread_ts?: string; text?: string; user?: string; bot_id?: string
    }> = []
    try {
      const history = await client.conversations.history({ channel: channelId, limit: 50, oldest })
      historyMessages = (history.messages ?? []) as typeof historyMessages
    } catch { continue }

    for (const msg of historyMessages) {
      if (!msg.ts || msg.bot_id) continue  // skip bot messages
      if (mySlackId && !msg.text?.includes(`<@${mySlackId}>`)) continue  // skip non-mentions

      await resolveUser(msg.user ?? '')
      allMessages.push({
        id: msg.client_msg_id ?? `${channelId}-${msg.ts}`,
        channel: channelId,
        channelName,
        text: msg.text ?? '',
        ts: msg.ts,
        thread_ts: msg.thread_ts,
        user: msg.user ?? 'unknown',
        username: userNames[msg.user ?? ''] || undefined,
        avatar_url: userAvatars[msg.user ?? ''] || undefined,
        permalink: workspaceUrl ? buildPermalink(workspaceUrl, channelId, msg.ts) : '',
      })
    }
  }

  // Sort newest first
  allMessages.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts))

  setInMemCache(cacheKey, allMessages)
  if (allMessages.length > 0) writeToDiskCache(allMessages)
  return allMessages
}
