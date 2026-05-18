import { NextRequest, NextResponse } from 'next/server'
import { getConfig, setConfig } from '@/lib/db'
import { getToken } from '@/lib/token-store'
import { isConnected as canvaIsConnected, getMyUserId as canvaGetMyUserId } from '@/lib/canva'
import path from 'path'
import fs from 'fs'
import { DATA_DIR } from '@/lib/data-dir'

const CALENDAR_CACHE_PATH = path.join(DATA_DIR, 'calendar-cache.json')

function jiraSource(): 'db' | 'env' | 'none' {
  if (getConfig('jira.baseUrl')) return 'db'
  if (process.env.JIRA_BASE_URL) return 'env'
  return 'none'
}

function googleCredsSource(): 'db' | 'env' | 'none' {
  if (getConfig('google.clientId')) return 'db'
  if (process.env.GOOGLE_CLIENT_ID) return 'env'
  return 'none'
}

function slackSource(): 'db' | 'env' | 'none' {
  if (getConfig('slack.botToken')) return 'db'
  if (process.env.SLACK_BOT_TOKEN) return 'env'
  return 'none'
}

function figmaSource(): 'db' | 'env' | 'none' {
  if (getConfig('figma.accessToken')) return 'db'
  if (process.env.FIGMA_ACCESS_TOKEN) return 'env'
  return 'none'
}

function canvaCredsSource(): 'db' | 'env' | 'none' {
  if (getConfig('canva.clientId')) return 'db'
  if (process.env.CANVA_CLIENT_ID) return 'env'
  return 'none'
}

export async function GET() {
  const jiraSrc = jiraSource()
  const googleSrc = googleCredsSource()
  const googleToken = await getToken('google')

  const calendarConnected = !!googleToken?.access_token
  const calendarEmail = googleToken?.email ?? null
  // Show the most recent synced_at from either the token or the cache file
  let calendarSyncedAt: string | null = null
  if (fs.existsSync(CALENDAR_CACHE_PATH)) {
    try {
      const cache = JSON.parse(fs.readFileSync(CALENDAR_CACHE_PATH, 'utf-8'))
      calendarSyncedAt = cache.synced_at ?? null
    } catch { /* ignore */ }
  }
  // Whether there is local cached data to display (even without live OAuth)
  const calendarHasCache = fs.existsSync(CALENDAR_CACHE_PATH)

  return NextResponse.json({
    jira: {
      baseUrl: getConfig('jira.baseUrl') ?? process.env.JIRA_BASE_URL ?? '',
      email: getConfig('jira.email') ?? process.env.JIRA_EMAIL ?? '',
      apiTokenSet: !!(getConfig('jira.apiToken') ?? process.env.JIRA_API_TOKEN),
      projectKeys: getConfig('jira.projectKeys') ?? process.env.JIRA_PROJECT_KEYS ?? '',
      source: jiraSrc,
    },
    googleCreds: {
      clientIdSet: !!(getConfig('google.clientId') ?? process.env.GOOGLE_CLIENT_ID),
      clientSecretSet: !!(getConfig('google.clientSecret') ?? process.env.GOOGLE_CLIENT_SECRET),
      source: googleSrc,
    },
    googleCalendar: {
      connected: calendarConnected,
      hasCache: calendarHasCache,
      email: calendarEmail,
      syncedAt: calendarSyncedAt,
    },
    slack: {
      botTokenSet: !!(getConfig('slack.botToken') ?? process.env.SLACK_BOT_TOKEN),
      channelIds: getConfig('slack.channelIds') ?? process.env.SLACK_CHANNEL_IDS ?? '',
      myUserId: getConfig('slack.myUserId') ?? process.env.SLACK_MY_USER_ID ?? '',
      source: slackSource(),
    },
    figma: {
      accessTokenSet: !!(getConfig('figma.accessToken') ?? process.env.FIGMA_ACCESS_TOKEN),
      teamIds: getConfig('figma.teamIds') ?? process.env.FIGMA_TEAM_IDS ?? '',
      myHandle: getConfig('figma.myHandle') ?? process.env.FIGMA_MY_HANDLE ?? '',
      source: figmaSource(),
    },
    canva: {
      clientIdSet: !!(getConfig('canva.clientId') ?? process.env.CANVA_CLIENT_ID),
      clientSecretSet: !!(getConfig('canva.clientSecret') ?? process.env.CANVA_CLIENT_SECRET),
      connected: await canvaIsConnected(),
      myUserId: canvaGetMyUserId(),
      source: canvaCredsSource(),
    },
  })
}

function isValidUrl(s: string): boolean {
  try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:' }
  catch { return false }
}

export async function POST(request: NextRequest) {
  let body: Record<string, string>
  try {
    body = await request.json() as Record<string, string>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, ...values } = body

  if (type === 'jira') {
    if (values.baseUrl !== undefined) {
      if (values.baseUrl && !isValidUrl(values.baseUrl)) {
        return NextResponse.json({ error: 'baseUrl must be a valid URL' }, { status: 400 })
      }
      setConfig('jira.baseUrl', values.baseUrl)
    }
    if (values.email !== undefined) {
      if (values.email && !values.email.includes('@')) {
        return NextResponse.json({ error: 'email must be a valid email address' }, { status: 400 })
      }
      setConfig('jira.email', values.email)
    }
    if (values.apiToken) setConfig('jira.apiToken', values.apiToken)
    if (values.projectKeys !== undefined) {
      const keys = values.projectKeys.split(',').map((k) => k.trim()).filter(Boolean)
      if (keys.some((k) => !/^[A-Z0-9_]+$/i.test(k))) {
        return NextResponse.json({ error: 'projectKeys must be comma-separated alphanumeric keys' }, { status: 400 })
      }
      setConfig('jira.projectKeys', values.projectKeys)
    }
    return NextResponse.json({ ok: true })
  }

  if (type === 'google') {
    if (values.clientId) setConfig('google.clientId', values.clientId)
    if (values.clientSecret) setConfig('google.clientSecret', values.clientSecret)
    return NextResponse.json({ ok: true })
  }

  if (type === 'slack') {
    if (values.botToken) setConfig('slack.botToken', values.botToken)
    if (values.channelIds !== undefined) setConfig('slack.channelIds', values.channelIds)
    if (values.myUserId !== undefined) setConfig('slack.myUserId', values.myUserId)
    return NextResponse.json({ ok: true })
  }

  if (type === 'figma') {
    if (values.accessToken) setConfig('figma.accessToken', values.accessToken)
    if (values.teamIds !== undefined) setConfig('figma.teamIds', values.teamIds)
    if (values.myHandle !== undefined) setConfig('figma.myHandle', values.myHandle)
    return NextResponse.json({ ok: true })
  }

  if (type === 'canva') {
    if (values.clientId) setConfig('canva.clientId', values.clientId)
    if (values.clientSecret) setConfig('canva.clientSecret', values.clientSecret)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
