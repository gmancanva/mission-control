'use client'

import { useState, useEffect } from 'react'
import SlackText from '@/components/SlackText'
import ReactionBar from '@/components/ReactionBar'
import Tooltip from '@/components/Tooltip'
import { loadAvatars, getGlobalAvatars } from '@/lib/avatarStore'
import { BTN_BASE, BTN_DEFAULT, BTN_ACTIVE_GREEN, BTN_ACTIVE_BLUE, BTN_ACTIVE_AMBER, BTN_PURPLE, BTN_PURPLE_ACTIVE } from '@/lib/cardStyles'
import TemplateTaskModal from '@/components/TemplateTaskModal'
import type { JiraEpic } from '@/lib/jira'
import type { SlackMessage } from '@/lib/slack'
import type { PinnedDecision } from '@/lib/db'
import type { CanvaMention } from '@/app/api/canva/route'
import type { FigmaMention } from '@/app/api/figma/route'
import type { FigmaReply } from '@/lib/figma'

type Props = {
  jiraEpics: JiraEpic[]
  slackMessages: SlackMessage[]
  canvaMentions: CanvaMention[]
  figmaMentions: FigmaMention[]
  pinnedDecisions: PinnedDecision[]
  projectKeys: string[]
  onPinChange?: () => void
}

type ThreadMessage = {
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

type FeedEntry = {
  id: string
  date: string
  project: string
  source: 'jira' | 'slack' | 'canva' | 'figma'
  summary: string
  link: string
  sourceId: string
  isPinned: boolean
  pinnedNote: string | null
  threadKey?: string
  author?: string
  avatarUrl?: string
  figmaMention?: FigmaMention
  canvaMention?: CanvaMention
}

type ViewMode = 'feed' | 'timeline'
type TimeFilter = 'today' | 'week' | 'month' | 'all'
type PlatformFilter = 'all' | 'jira' | 'slack' | 'canva' | 'figma'
type ItemFlags = Record<string, { completed?: boolean; bookmarked?: boolean }>

// ─── Brand logos ────────────────────────────────────────────────────────────

function SlackLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none">
      <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#2EB67D"/>
      <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#36C5F0"/>
      <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386H34.048a5.381 5.381 0 0 0-5.376 5.386 5.381 5.381 0 0 0 5.376 5.387" fill="#ECB22E"/>
      <path d="M0 34.248a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387v-5.386H5.376A5.381 5.381 0 0 0 0 34.248m14.336 0v14.365A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.248a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386" fill="#E01E5A"/>
    </svg>
  )
}

function CanvaLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#7D2AE8"/>
      <path d="M22.4 20.5c-.9 1.4-2.4 2.3-4.4 2.3-3.2 0-5.5-2.4-5.5-5.8s2.3-5.8 5.5-5.8c1.9 0 3.3.8 4.3 2l2-1.9C22.8 9.8 20.6 9 18 9c-4.7 0-8 3.4-8 8s3.3 8 8 8c2.7 0 4.9-1.1 6.3-2.8l-1.9-1.7z" fill="white"/>
    </svg>
  )
}

function JiraLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M15.9 2L2 15.9l5.1 5.1 3-3 8.8 8.8-3 3 5.1 5.1L30 21.1z" fill="#2684FF"/>
      <path d="M15.9 2l-5 14 5.1 5.1 5-14z" fill="url(#jira-grad)"/>
      <path d="M16 16l-5 14 5.1 5.1 5-14z" fill="url(#jira-grad2)"/>
      <defs>
        <linearGradient id="jira-grad" x1="13" y1="14" x2="18" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC"/>
          <stop offset="1" stopColor="#2684FF"/>
        </linearGradient>
        <linearGradient id="jira-grad2" x1="14" y1="28" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC"/>
          <stop offset="1" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function FigmaLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 57" fill="none">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/>
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/>
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/>
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF"/>
    </svg>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeSlackText(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+\|([^>]+)>/g, '@$1')
    .replace(/<@[A-Z0-9]+>/g, '@mention')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dDay.getTime() === today.getTime()) return 'Today'
  if (dDay.getTime() === yesterday.getTime()) return 'Yesterday'
  const diffDays = Math.floor((today.getTime() - dDay.getTime()) / 86400000)
  if (diffDays < 7) return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isWithinDays(date: Date, now: Date, days: number) {
  return (now.getTime() - date.getTime()) < days * 86400000
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ─── Feed builder ─────────────────────────────────────────────────────────────

function buildFeed(
  jiraEpics: JiraEpic[],
  slackMessages: SlackMessage[],
  canvaMentions: CanvaMention[],
  figmaMentions: FigmaMention[],
  pinnedDecisions: PinnedDecision[]
): FeedEntry[] {
  const pinnedMap = new Map<string, PinnedDecision>()
  pinnedDecisions.forEach((d) => pinnedMap.set(d.source_id, d))

  const entries: FeedEntry[] = []

  for (const epic of jiraEpics) {
    for (const comment of epic.comments) {
      const sourceId = `jira-comment-${comment.id}`
      entries.push({
        id: sourceId, date: comment.created, project: epic.key.split('-')[0],
        source: 'jira', summary: `${comment.author}: ${comment.body.slice(0, 200)}`,
        link: '#', sourceId, isPinned: pinnedMap.has(sourceId),
        pinnedNote: pinnedMap.get(sourceId)?.note ?? null,
      })
    }
  }

  for (const msg of slackMessages) {
    const sourceId = `slack-${msg.id}`
    let threadKey: string | undefined
    try {
      const url = new URL(msg.permalink)
      const threadTs = url.searchParams.get('thread_ts') ?? msg.ts
      threadKey = `${msg.channel}:${threadTs}`
    } catch { /* invalid URL, no thread key */ }
    entries.push({
      id: sourceId, date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      project: msg.channelName, source: 'slack',
      summary: msg.text,
      link: msg.permalink, sourceId, isPinned: pinnedMap.has(sourceId),
      pinnedNote: pinnedMap.get(sourceId)?.note ?? null,
      threadKey,
      author: msg.username ?? msg.user,
      avatarUrl: msg.avatar_url,
    })
  }

  for (const mention of canvaMentions) {
    const sourceId = `canva-${mention.id}`
    entries.push({
      id: sourceId, date: mention.created_at, project: mention.design_title,
      source: 'canva', summary: `${mention.author}: ${mention.text.slice(0, 200)}`,
      link: mention.design_url, sourceId, isPinned: pinnedMap.has(sourceId),
      pinnedNote: pinnedMap.get(sourceId)?.note ?? null,
      author: mention.author, avatarUrl: mention.author_avatar_url,
      canvaMention: mention,
    })
  }

  for (const mention of figmaMentions) {
    const sourceId = `figma-${mention.id}`
    entries.push({
      id: sourceId, date: mention.created_at, project: mention.file_name,
      source: 'figma', summary: `${mention.author}: ${mention.text.slice(0, 200)}`,
      link: mention.file_url, sourceId, isPinned: pinnedMap.has(sourceId),
      pinnedNote: pinnedMap.get(sourceId)?.note ?? null,
      author: mention.author, avatarUrl: mention.author_avatar_url,
      figmaMention: mention,
    })
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return entries
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'jira' | 'slack' | 'canva' | 'figma' }) {
  if (source === 'slack') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-[#4A154B]/10 text-[#611f69] border-[#4A154B]/20 dark:bg-[#611f69]/20 dark:text-[#e8b4f8] dark:border-[#611f69]/30">
        <SlackLogo size={12} />
        Slack
      </span>
    )
  }
  if (source === 'canva') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/40">
        <CanvaLogo size={12} />
        Canva
      </span>
    )
  }
  if (source === 'figma') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40">
        <FigmaLogo size={12} />
        Figma
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
      <JiraLogo size={12} />
      Jira
    </span>
  )
}

// ─── Entry card ───────────────────────────────────────────────────────────────

type ThreadState = 'idle' | 'loading' | 'loaded' | 'error'

function useThreadLoader(threadKey: string) {
  const [state, setState] = useState<ThreadState>('idle')
  const [thread, setThread] = useState<ThreadMessage[] | null>(null)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [open, setOpen] = useState(false)

  const [channel, ts] = threadKey.split(':')

  async function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (state !== 'idle') return
    setState('loading')
    try {
      const res = await fetch(`/api/slack/thread?channel=${encodeURIComponent(channel)}&ts=${encodeURIComponent(ts)}`)
      const data = await res.json() as { thread?: ThreadMessage[] | null; synced_at?: string; live?: boolean }
      setThread(data.thread ?? null)
      setSyncedAt(data.synced_at ?? null)
      setLive(!!data.live)
      setState('loaded')
    } catch {
      setState('error')
    }
  }

  return { state, thread, syncedAt, live, open, toggle, channel, ts }
}

function slackImageProxy(url: string): string {
  return `/api/slack/image?url=${encodeURIComponent(url)}`
}

function FileAttachment({ file }: { file: NonNullable<ThreadMessage['files']>[number] }) {
  const isImage = file.mimetype.startsWith('image/')
  const isVideo = file.mimetype.startsWith('video/')
  if (isImage) {
    const thumbSrc = file.thumb_url ? slackImageProxy(file.thumb_url) : null
    const fullSrc = slackImageProxy(file.url)
    return (
      <a href={fullSrc} target="_blank" rel="noopener noreferrer" className="block mt-1.5 max-w-xs">
        {thumbSrc
          ? <img src={thumbSrc} alt={file.name} loading="lazy" className="rounded-md border border-gray-200 dark:border-gray-700 max-h-48 object-cover" />
          : <span className="text-xs text-blue-600 dark:text-blue-400 underline">{file.name}</span>}
      </a>
    )
  }
  if (isVideo) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
        {file.name}
      </a>
    )
  }
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7 1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
      {file.name}
    </a>
  )
}

const SLACK_CDN_PREFIXES = [
  'https://avatars.slack-edge.com/',
  'https://a.slack-edge.com/',
  'https://files.slack.com/',
]

function toProxiedUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (SLACK_CDN_PREFIXES.some(p => url.startsWith(p))) {
    return `/api/slack/image?url=${encodeURIComponent(url)}`
  }
  return url
}

function Avatar({ author, avatarUrl, size = 24 }: { author: string; avatarUrl?: string; size?: number }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(
    toProxiedUrl(avatarUrl ?? getGlobalAvatars()?.[author])
  )

  useEffect(() => {
    const direct = avatarUrl ?? getGlobalAvatars()?.[author]
    if (direct) { setResolvedUrl(toProxiedUrl(direct)); return }
    loadAvatars().then(map => {
      const url = map[author]
      if (url) setResolvedUrl(toProxiedUrl(url))
    })
  }, [author, avatarUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
  const color = colors[author.charCodeAt(0) % colors.length]

  return resolvedUrl ? (
    <img src={resolvedUrl} alt={author} width={size} height={size}
      onError={() => setResolvedUrl(undefined)}
      className="rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
  ) : (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} rounded-full shrink-0 flex items-center justify-center text-white font-semibold`}>
      {initials}
    </div>
  )
}

// ─── Figma/Canva @mention highlight ──────────────────────────────────────────

function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@\S+)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="text-blue-600 dark:text-blue-400 font-medium">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

// ─── Figma rich card body ─────────────────────────────────────────────────────

function FigmaCardBody({ mention }: { mention: FigmaMention }) {
  const [showReplies, setShowReplies] = useState(false)
  const replies = mention.replies ?? []

  return (
    <div>
      {/* Frame thumbnail */}
      {mention.frame_thumbnail_url && (
        <div className="mb-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mention.frame_thumbnail_url}
            alt="Frame preview"
            loading="lazy"
            className="w-full max-h-48 object-cover block"
            onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      {/* Context: file + node */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{mention.file_name}</span>
        {mention.node_id && (
          <span className="text-sm text-gray-400 dark:text-gray-600">· on frame</span>
        )}
      </div>

      {/* Comment text */}
      <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        <MentionText text={mention.text} />
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplies(p => !p) }}
            className="inline-flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H6.5L4 11V9H2.5A1.5 1.5 0 0 1 1 7.5v-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={`transition-transform ${showReplies ? 'rotate-180' : ''}`}>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showReplies && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-rose-200 dark:border-rose-800/50">
              {replies.map((r: FigmaReply) => (
                <div key={r.id} className="flex gap-2 items-start">
                  <Avatar author={r.author} avatarUrl={r.author_avatar_url} size={20} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-1.5">{r.author}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-600">{formatDate(r.created_at)}</span>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                      <MentionText text={r.text} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Canva rich card body ─────────────────────────────────────────────────────

function CanvaCardBody({ mention }: { mention: CanvaMention }) {
  const [showReplies, setShowReplies] = useState(false)
  const replies = mention.replies ?? []

  return (
    <div>
      {/* Design thumbnail */}
      {mention.design_thumbnail_url && (
        <div className="mb-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mention.design_thumbnail_url}
            alt="Design preview"
            loading="lazy"
            className="w-full max-h-48 object-cover block"
            onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      {/* Design name context */}
      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1.5">{mention.design_title}</div>

      {/* Comment text */}
      <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        <MentionText text={mention.text} />
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplies(p => !p) }}
            className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H6.5L4 11V9H2.5A1.5 1.5 0 0 1 1 7.5v-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={`transition-transform ${showReplies ? 'rotate-180' : ''}`}>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showReplies && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-violet-200 dark:border-violet-800/50">
              {replies.map((r) => (
                <div key={r.id} className="flex gap-2 items-start">
                  <Avatar author={r.author} avatarUrl={r.author_avatar_url} size={20} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-1.5">{r.author}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-600">{formatDate(r.created_at)}</span>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                      <MentionText text={r.text} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThreadMessages({ thread, syncedAt, live }: { thread: ThreadMessage[]; syncedAt: string | null; live?: boolean }) {
  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{thread.length} messages</span>
        {live
          ? <span className="text-sm text-green-600 dark:text-green-500">Live</span>
          : syncedAt && (
            <span className="text-sm text-gray-400 dark:text-gray-600">
              Cached {new Date(syncedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          )}
      </div>
      {thread.map((msg, i) => (
        <div key={msg.ts || i} className="flex gap-2.5 items-start">
          <Avatar author={msg.author} avatarUrl={msg.avatar_url} size={26} />
          <div className={`flex-1 min-w-0 rounded-xl px-3 py-2 ${
            msg.is_parent
              ? 'bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700'
              : msg.is_me
                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40'
                : 'bg-gray-50 dark:bg-gray-900/60'
          }`}>
            <div className={`text-sm font-semibold mb-1 ${msg.is_me ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {msg.author}{msg.is_me ? ' (you)' : ''}
              {msg.is_parent && <span className="ml-1 font-normal text-gray-400 dark:text-gray-600">(original)</span>}
            </div>
            <div className={`text-sm leading-relaxed ${msg.is_me ? 'text-blue-900 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}>
              <SlackText text={msg.text} />
            </div>
            {msg.reactions && msg.reactions.length > 0 && (
              <ReactionBar reactions={msg.reactions} />
            )}
            {msg.files && msg.files.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {msg.files.map((f, fi) => <FileAttachment key={fi} file={f} />)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


function EntryCard({
  entry, flags, loading,
  onNewTask, onToggleFlag,
}: {
  entry: FeedEntry
  flags: ItemFlags
  loading: Record<string, boolean>
  onNewTask: (text: string) => void
  onToggleFlag: (sourceId: string, flag: 'completed' | 'bookmarked') => void
}) {
  const f = flags[entry.sourceId] ?? {}
  const isCompleted = !!f.completed
  const isBookmarked = !!f.bookmarked
  const thread = useThreadLoader(entry.threadKey ?? '')

  const [summary, setSummary] = useState<string | null>(null)
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  // Thread reply state
  const [showReply, setShowReply] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyGenerating, setReplyGenerating] = useState(false)
  const [replySending, setReplySending] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const [replyCopied, setReplyCopied] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  async function summarizeThread() {
    if (!thread.thread?.length) return
    setSummaryState('loading')
    try {
      const res = await fetch('/api/slack/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: thread.thread }),
      })
      const data = await res.json() as { summary?: string; error?: string }
      if (data.summary) {
        setSummary(data.summary)
        setSummaryState('done')
      } else {
        setSummaryState('error')
      }
    } catch {
      setSummaryState('error')
    }
  }

  async function draftThreadReply() {
    setReplyGenerating(true)
    setShowReply(true)
    setReplySent(false)
    setReplyError(null)
    try {
      const contextText = thread.thread
        ? thread.thread.map(m => `${m.author}: ${m.text}`).join('\n\n')
        : entry.summary
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', text: contextText, source: 'slack', project: entry.project, author: '' }),
      })
      const data = await res.json() as { result?: string; error?: string }
      if (data.error) {
        setReplyError(`AI error: ${data.error}`)
      } else {
        setReplyDraft(data.result ?? '')
      }
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setReplyGenerating(false)
    }
  }

  async function sendThreadReply() {
    if (!replyDraft.trim()) return
    setReplySending(true)
    setReplyError(null)
    try {
      const res = await fetch('/api/slack/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: thread.channel, thread_ts: thread.ts, message: replyDraft }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (data.ok) {
        setReplySent(true)
        setReplyDraft('')
        setTimeout(() => { setReplySent(false); setShowReply(false) }, 2000)
      } else {
        await navigator.clipboard.writeText(replyDraft).catch(() => {})
        window.open(entry.link, '_blank')
        setReplyCopied(true)
        setTimeout(() => { setReplyCopied(false); setShowReply(false) }, 2500)
      }
    } finally {
      setReplySending(false)
    }
  }

  const isClickable = entry.source === 'slack' && !!entry.threadKey

  return (
    <div
      onClick={isClickable ? thread.toggle : undefined}
      className={`border rounded-xl p-4 transition-all ${isClickable ? 'cursor-pointer select-none' : ''} ${
        isCompleted
          ? 'opacity-50 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800'
          : entry.isPinned
            ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-700/50'
            : isBookmarked
              ? 'border-sky-400/50 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-700/40'
              : thread.open
                ? 'bg-white dark:bg-gray-900 border-purple-300 dark:border-purple-700'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <SourceBadge source={entry.source} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {entry.author && (
              <>
                <Avatar author={entry.author} avatarUrl={entry.avatarUrl} size={24} />
                <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{entry.author}</span>
              </>
            )}
            <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(entry.date)}</span>
            <Tooltip label={entry.project}>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{entry.project}</span>
            </Tooltip>
            {entry.isPinned && <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded">Decision</span>}
            {isBookmarked && !entry.isPinned && <span className="text-xs font-medium text-sky-600 dark:text-sky-400">Bookmarked</span>}
          </div>

          <div className={isCompleted ? 'line-through text-gray-400 dark:text-gray-600' : ''}>
            {entry.source === 'figma' && entry.figmaMention
              ? <FigmaCardBody mention={entry.figmaMention} />
              : entry.source === 'canva' && entry.canvaMention
                ? <CanvaCardBody mention={entry.canvaMention} />
                : <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {entry.source === 'slack' ? <SlackText text={entry.summary} /> : entry.summary}
                  </div>
            }
          </div>

          {entry.isPinned && entry.pinnedNote && (
            <div className="mt-2 text-sm text-amber-700 dark:text-amber-300/80 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
              <span className="font-medium">Note:</span> {entry.pinnedNote}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3" onClick={e => e.stopPropagation()}>
            {entry.link && entry.link !== '#' && (
              <a href={entry.link} target="_blank" rel="noopener noreferrer" className={BTN_DEFAULT}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7 1h4v4M11 1L5.5 6.5M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Open
              </a>
            )}

            <button onClick={() => onNewTask(entry.summary.slice(0, 120))} className={BTN_DEFAULT}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              New task
            </button>

            <button onClick={() => onToggleFlag(entry.sourceId, 'bookmarked')} className={isBookmarked ? BTN_ACTIVE_BLUE : BTN_DEFAULT}>
              {isBookmarked
                ? <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 1h8a1 1 0 0 1 1 1v9l-5-3-5 3V2a1 1 0 0 1 1-1z"/></svg>
                : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 1h8a1 1 0 0 1 1 1v9l-5-3-5 3V2a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
              }
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>

            <button onClick={() => onToggleFlag(entry.sourceId, 'completed')} className={isCompleted ? BTN_ACTIVE_GREEN : BTN_DEFAULT}>
              {isCompleted
                ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              }
              {isCompleted ? 'Resolved' : 'Resolve'}
            </button>

            {/* Figma reply button */}
            {entry.source === 'figma' && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className={BTN_DEFAULT}
                onClick={e => e.stopPropagation()}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H6.5L4 11V9H2.5A1.5 1.5 0 0 1 1 7.5v-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                Reply in Figma
              </a>
            )}
          </div>

          {/* Thread expansion */}
          {entry.source === 'slack' && entry.threadKey && thread.open && (
            thread.state === 'error'
              ? <div onClick={e => e.stopPropagation()}><p className="mt-2 text-xs text-red-400">Failed to load thread. Check that the bot token has <code>channels:history</code> scope.</p></div>
              : thread.state === 'loaded' && thread.thread === null
                ? <div onClick={e => e.stopPropagation()}><p className="mt-2 text-sm text-gray-400 dark:text-gray-600 italic">Thread not found — add a Slack bot token in Settings to fetch live.</p></div>
                : thread.thread && thread.thread.length > 0
                  ? (
                    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                      {/* AI summary */}
                      {summaryState === 'done' && summary ? (
                        <div className="rounded-lg px-3 py-2.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-violet-500 shrink-0">
                              <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9 4 11.5l1.5-4L2 5h4.5L8 1z" fill="currentColor"/>
                            </svg>
                            <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">AI Summary</span>
                            <button onClick={() => { setSummary(null); setSummaryState('idle') }} className="ml-auto text-sm text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors">✕</button>
                          </div>
                          <p className="text-sm text-violet-900 dark:text-violet-200 leading-relaxed">{summary}</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={showReply ? () => setShowReply(false) : draftThreadReply}
                            className={showReply ? BTN_ACTIVE_BLUE : BTN_DEFAULT}
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H6.5L4 11V9H2.5A1.5 1.5 0 0 1 1 7.5v-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                            Reply
                          </button>
                          <button
                            onClick={summarizeThread}
                            disabled={summaryState === 'loading'}
                            className={BTN_DEFAULT}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className={summaryState === 'loading' ? 'animate-spin' : ''}>
                              <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9 4 11.5l1.5-4L2 5h4.5L8 1z" fill="currentColor"/>
                            </svg>
                            {summaryState === 'loading' ? 'Summarising…' : 'Summarise'}
                          </button>
                        </div>
                      )}

                      {/* Reply panel */}
                      {showReply && (
                        <div className="rounded-lg border border-sky-200 dark:border-sky-800/50 bg-sky-50/50 dark:bg-sky-950/20 p-3 space-y-2">
                          {replyCopied ? (
                            <div className="flex items-center gap-2 py-2">
                              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-green-500 shrink-0">
                                <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">Draft copied — paste it in the Slack thread</span>
                            </div>
                          ) : replySent ? (
                            <div className="flex items-center gap-2 py-2">
                              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-green-500 shrink-0">
                                <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">Reply sent</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-sky-700 dark:text-sky-400">Reply in thread</span>
                                <button
                                  onClick={draftThreadReply}
                                  disabled={replyGenerating}
                                  className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 disabled:opacity-50 transition-colors"
                                >
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className={replyGenerating ? 'animate-spin' : ''}>
                                    <path d="M10 6A4 4 0 1 1 6 2M6 2l2-2M6 2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {replyGenerating ? 'Generating…' : 'Regenerate'}
                                </button>
                              </div>
                              <textarea
                                value={replyDraft}
                                onChange={e => setReplyDraft(e.target.value)}
                                placeholder={replyGenerating ? 'Drafting reply…' : 'Your reply…'}
                                rows={3}
                                className="w-full text-sm bg-white dark:bg-gray-800 border border-sky-200 dark:border-sky-800/60 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-sky-400 dark:focus:border-sky-600 resize-none leading-relaxed"
                              />
                              {replyError && <p className="text-sm text-red-500">{replyError}</p>}
                              <div className="flex gap-2">
                                <button
                                  onClick={sendThreadReply}
                                  disabled={replySending || !replyDraft.trim() || replyGenerating}
                                  className="text-sm bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
                                >
                                  {replySending ? 'Opening…' : 'Copy & Open in Slack'}
                                </button>
                                <button onClick={() => setShowReply(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1.5 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <ThreadMessages thread={thread.thread} syncedAt={thread.syncedAt} live={thread.live} />
                    </div>
                  )
                  : null
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CommsTrail({
  jiraEpics, slackMessages, canvaMentions, figmaMentions, pinnedDecisions, projectKeys, onPinChange,
}: Props) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalSummary, setTaskModalSummary] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)
  const [itemFlags, setItemFlags] = useState<ItemFlags>({})

  useEffect(() => {
    const stored = localStorage.getItem('comms-item-flags')
    if (stored) {
      try { setItemFlags(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  function toggleFlag(sourceId: string, flag: 'completed' | 'bookmarked') {
    setItemFlags(prev => {
      const current = prev[sourceId] ?? {}
      const updated = { ...prev, [sourceId]: { ...current, [flag]: !current[flag] } }
      localStorage.setItem('comms-item-flags', JSON.stringify(updated))
      return updated
    })
  }

  const allEntries = buildFeed(jiraEpics, slackMessages, canvaMentions, figmaMentions, pinnedDecisions)
  const now = new Date()

  const filtered = allEntries.filter(entry => {
    if (platformFilter !== 'all' && entry.source !== platformFilter) return false
    if (!showCompleted && itemFlags[entry.sourceId]?.completed) return false
    if (showBookmarkedOnly && !itemFlags[entry.sourceId]?.bookmarked) return false
    const d = new Date(entry.date)
    if (timeFilter === 'today') return isSameDay(d, now)
    if (timeFilter === 'week') return isWithinDays(d, now, 7)
    if (timeFilter === 'month') return isWithinDays(d, now, 30)
    return true
  })

  const counts = {
    all: allEntries.filter(e => !(!showCompleted && itemFlags[e.sourceId]?.completed)).length,
    jira: allEntries.filter(e => e.source === 'jira' && !(!showCompleted && itemFlags[e.sourceId]?.completed)).length,
    slack: allEntries.filter(e => e.source === 'slack' && !(!showCompleted && itemFlags[e.sourceId]?.completed)).length,
    canva: allEntries.filter(e => e.source === 'canva' && !(!showCompleted && itemFlags[e.sourceId]?.completed)).length,
    figma: allEntries.filter(e => e.source === 'figma' && !(!showCompleted && itemFlags[e.sourceId]?.completed)).length,
  }

  const cardProps = {
    flags: itemFlags, loading,
    onNewTask: (text: string) => { setTaskModalSummary(text); setTaskModalOpen(true) },
    onToggleFlag: toggleFlag,
  }

  // ── Timeline grouping ──
  const grouped: { label: string; entries: FeedEntry[] }[] = []
  if (viewMode === 'timeline') {
    const seen = new Map<string, number>()
    for (const entry of filtered) {
      const label = dateLabel(entry.date)
      if (!seen.has(label)) { seen.set(label, grouped.length); grouped.push({ label, entries: [] }) }
      grouped[seen.get(label)!].entries.push(entry)
    }
  }

  const dotColor: Record<'jira' | 'slack' | 'canva' | 'figma', string> = {
    jira: 'bg-blue-500',
    slack: 'bg-purple-500',
    canva: 'bg-violet-500',
    figma: 'bg-rose-500',
  }

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ── Filter / view bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-sm">
          <button
            onClick={() => setViewMode('feed')}
            className={`px-3 py-1 rounded-md transition-colors ${
              viewMode === 'feed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded-md transition-colors ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Timeline
          </button>
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-1 text-sm">
          {(['all', 'slack', 'canva', 'figma', 'jira'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${
                platformFilter === p
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {p === 'slack' && <SlackLogo size={11} />}
              {p === 'canva' && <CanvaLogo size={11} />}
              {p === 'figma' && <FigmaLogo size={11} />}
              {p === 'jira' && <JiraLogo size={11} />}
              <span className="capitalize">{p === 'all' ? `All (${counts.all})` : `${p.charAt(0).toUpperCase() + p.slice(1)} (${counts[p]})`}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Time filter */}
        <div className="flex items-center gap-1 text-sm">
          {(['today', 'week', 'month', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                timeFilter === t
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {t === 'today' ? 'Today' : t === 'week' ? '7 days' : t === 'month' ? '30 days' : 'All time'}
            </button>
          ))}
        </div>

        {/* Bookmark filter + resolved toggle */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowBookmarkedOnly(p => !p)}
            className={`text-sm px-2.5 py-1 rounded-full border transition-colors ${
              showBookmarkedOnly
                ? 'border-sky-400 text-sky-600 dark:text-sky-400 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30'
                : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-gray-300'
            }`}
          >
            {showBookmarkedOnly ? '★ Bookmarked' : '☆ Bookmarked'}
          </button>
          <button
            onClick={() => setShowCompleted(p => !p)}
            className={`text-sm px-2.5 py-1 rounded-full border transition-colors ${
              showCompleted
                ? 'border-green-400 text-green-600 dark:text-green-400 dark:border-green-700'
                : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-gray-300'
            }`}
          >
            {showCompleted ? '✓ Show resolved' : '○ Hide resolved'}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <p className="text-sm">
            {allEntries.length === 0
              ? 'No messages yet. Sync Jira and Slack data first.'
              : 'No items match the current filters.'}
          </p>
        </div>
      )}

      {/* ── Feed view ── */}
      {viewMode === 'feed' && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(entry => (
            <EntryCard key={entry.id} entry={entry} {...cardProps} />
          ))}
        </div>
      )}

      {/* ── Timeline view ── */}
      {viewMode === 'timeline' && filtered.length > 0 && (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.label} className="relative">
              {/* Date label */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              {/* Items with timeline line */}
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />

                <div className="space-y-3">
                  {group.entries.map(entry => (
                    <div key={entry.id} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-4 top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-950 ${dotColor[entry.source]}`} />
                      <EntryCard entry={entry} {...cardProps} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <TemplateTaskModal
      isOpen={taskModalOpen}
      onClose={() => setTaskModalOpen(false)}
      projectKeys={projectKeys}
      epics={jiraEpics}
      defaultTab="manual"
      initialSummary={taskModalSummary}
      onCreated={() => setTaskModalOpen(false)}
    />
    </>
  )
}
