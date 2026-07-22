'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Plus, Bookmark, Check, Circle, MessageSquare, ChevronDown } from 'lucide-react'
import SlackText from '@/components/SlackText'
import ReactionBar from '@/components/ReactionBar'
import Tooltip from '@/components/Tooltip'
import { SourceBadge, MentionAvatar, SlackLogo, CanvaLogo, FigmaLogo, JiraLogo } from '@/components/MentionShared'
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
    // Thread cache is keyed by the PARENT ts — prefer the explicit thread_ts field,
    // fall back to the permalink query param, then the message's own ts
    let threadTs = msg.thread_ts
    if (!threadTs) {
      try { threadTs = new URL(msg.permalink).searchParams.get('thread_ts') ?? msg.ts } catch { threadTs = msg.ts }
    }
    const threadKey = `${msg.channel}:${threadTs}`
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
          ? <img src={thumbSrc} alt={file.name} loading="lazy" className="rounded-md max-h-48 object-cover" style={{ border: '1px solid var(--pdBorder)' }} />
          : <span className="text-xs underline" style={{ color: 'var(--pdAccent06)' }}>{file.name}</span>}
      </a>
    )
  }
  if (isVideo) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-1.5 text-xs hover:underline" style={{ color: 'var(--pdAccent06)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
        {file.name}
      </a>
    )
  }
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-1.5 text-xs hover:underline" style={{ color: 'var(--pdAccent06)' }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7 1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
      {file.name}
    </a>
  )
}


// ─── Figma/Canva @mention highlight ──────────────────────────────────────────

function MentionText({ text }: { text: string }) {
  const parts = text.split(/(@\S+)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="font-medium" style={{ color: 'var(--pdAccent06)' }}>{part}</span>
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
        <div className="mb-2 rounded-lg overflow-hidden max-w-sm" style={{ border: '1px solid var(--pdBorder)' }}>
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
        <span className="text-sm font-medium" style={{ color: 'var(--pdTextMuted)' }}>{mention.file_name}</span>
        {mention.node_id && (
          <span className="text-sm" style={{ color: 'var(--pdTextSubtle)' }}>· on frame</span>
        )}
      </div>

      {/* Comment text */}
      <div className="text-base leading-relaxed" style={{ color: 'var(--pdTextBase)' }}>
        <MentionText text={mention.text} />
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplies(p => !p) }}
            className="inline-flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 transition-colors"
          >
            <MessageSquare size={11} />
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            <ChevronDown size={12} className={`transition-transform ${showReplies ? 'rotate-180' : ''}`} />
          </button>

          {showReplies && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-rose-200 dark:border-rose-800/50">
              {replies.map((r: FigmaReply) => (
                <div key={r.id} className="flex gap-2 items-start">
                  <MentionAvatar author={r.author} avatarUrl={r.author_avatar_url} size={20} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold mr-1.5" style={{ color: 'var(--pdTextMuted)' }}>{r.author}</span>
                    <span className="text-sm" style={{ color: 'var(--pdTextSubtle)' }}>{formatDate(r.created_at)}</span>
                    <div className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--pdTextBase)' }}>
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
        <div className="mb-2 rounded-lg overflow-hidden max-w-sm" style={{ border: '1px solid var(--pdBorder)' }}>
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
      <div className="text-sm font-medium mb-1.5" style={{ color: 'var(--pdTextMuted)' }}>{mention.design_title}</div>

      {/* Comment text */}
      <div className="text-base leading-relaxed" style={{ color: 'var(--pdTextBase)' }}>
        <MentionText text={mention.text} />
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReplies(p => !p) }}
            className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
          >
            <MessageSquare size={11} />
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            <ChevronDown size={12} className={`transition-transform ${showReplies ? 'rotate-180' : ''}`} />
          </button>

          {showReplies && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-violet-200 dark:border-violet-800/50">
              {replies.map((r) => (
                <div key={r.id} className="flex gap-2 items-start">
                  <MentionAvatar author={r.author} avatarUrl={r.author_avatar_url} size={20} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold mr-1.5" style={{ color: 'var(--pdTextMuted)' }}>{r.author}</span>
                    <span className="text-sm" style={{ color: 'var(--pdTextSubtle)' }}>{formatDate(r.created_at)}</span>
                    <div className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--pdTextBase)' }}>
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
        <span className="text-sm font-medium" style={{ color: 'var(--pdAccent06)' }}>{thread.length} messages</span>
        {live
          ? <span className="text-sm" style={{ color: 'var(--pdStatusDoneFg)' }}>Live</span>
          : syncedAt && (
            <span className="text-sm" style={{ color: 'var(--pdTextSubtle)' }}>
              Cached {new Date(syncedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          )}
      </div>
      {thread.map((msg, i) => (
        <div key={msg.ts || i} className="flex gap-2.5 items-start">
          <MentionAvatar author={msg.author} avatarUrl={msg.avatar_url} size={26} />
          <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={
            msg.is_parent
              ? { background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)' }
              : msg.is_me
                ? { background: 'var(--pdAccent01)', border: '1px solid var(--pdAccent02)' }
                : { background: 'var(--pdSurface1)' }
          }>
            <div className="text-sm font-semibold mb-1" style={{ color: msg.is_me ? 'var(--pdAccent07)' : 'var(--pdTextMuted)' }}>
              {msg.author}{msg.is_me ? ' (you)' : ''}
              {msg.is_parent && <span className="ml-1 font-normal" style={{ color: 'var(--pdTextSubtle)' }}>(original)</span>}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: msg.is_me ? 'var(--pdAccent08)' : 'var(--pdTextBase)' }}>
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

  const isClickable = entry.source === 'slack' && !!entry.threadKey

  return (
    <div
      onClick={isClickable ? thread.toggle : undefined}
      className={`border rounded-xl p-4 transition-all ${isClickable ? 'cursor-pointer select-none' : ''} ${
        isCompleted
          ? 'opacity-50 border-[var(--pdBorder)]'
          : entry.isPinned
            ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-700/50'
            : isBookmarked
              ? 'border-sky-400/50 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-700/40'
              : thread.open
                ? 'border-[var(--pdAccent04)]'
                : 'border-[var(--pdBorder)] hover:border-[var(--pdBorderStrong)]'
      }`}
      style={!entry.isPinned && !isBookmarked ? { background: 'var(--pdSurface0)' } : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <SourceBadge source={entry.source} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {entry.author && (
              <>
                <MentionAvatar author={entry.author} avatarUrl={entry.avatarUrl} size={24} />
                <span className="text-sm font-bold" style={{ color: 'var(--pdTextStrong)' }}>{entry.author}</span>
              </>
            )}
            <span className="text-xs" style={{ color: 'var(--pdTextMuted)' }}>{formatDate(entry.date)}</span>
            <Tooltip label={entry.project}>
              <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--pdTextSubtle)' }}>{entry.project}</span>
            </Tooltip>
            {entry.isPinned && <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded">Decision</span>}
            {isBookmarked && !entry.isPinned && <span className="text-xs font-medium text-sky-600 dark:text-sky-400">Bookmarked</span>}
          </div>

          <div className={isCompleted ? 'line-through' : ''} style={isCompleted ? { color: 'var(--pdTextSubtle)' } : undefined}>
            {entry.source === 'figma' && entry.figmaMention
              ? <FigmaCardBody mention={entry.figmaMention} />
              : entry.source === 'canva' && entry.canvaMention
                ? <CanvaCardBody mention={entry.canvaMention} />
                : <div className="text-sm leading-relaxed" style={{ color: 'var(--pdTextBase)' }}>
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
                <ExternalLink size={11} />
                Open
              </a>
            )}

            <button onClick={() => onNewTask(entry.summary.slice(0, 120))} className={BTN_DEFAULT}>
              <Plus size={11} />
              New task
            </button>

            <button onClick={() => onToggleFlag(entry.sourceId, 'bookmarked')} className={isBookmarked ? BTN_ACTIVE_BLUE : BTN_DEFAULT}>
              <Bookmark size={11} fill={isBookmarked ? 'currentColor' : 'none'} />
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>

            <button onClick={() => onToggleFlag(entry.sourceId, 'completed')} className={isCompleted ? BTN_ACTIVE_GREEN : BTN_DEFAULT}>
              {isCompleted ? <Check size={11} /> : <Circle size={11} />}
              {isCompleted ? 'Resolved' : 'Resolve'}
            </button>

            {entry.source === 'figma' && entry.link && entry.link !== '#' && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className={BTN_DEFAULT}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={11} />
                Open in Figma
              </a>
            )}
          </div>

          {/* Thread expansion */}
          {entry.source === 'slack' && entry.threadKey && thread.open && (
            thread.state === 'error'
              ? <div onClick={e => e.stopPropagation()}><p className="mt-2 text-xs text-red-400">Failed to load thread. Check that the bot token has <code>channels:history</code> scope.</p></div>
              : thread.state === 'loaded' && thread.thread === null
                ? <div onClick={e => e.stopPropagation()}><p className="mt-2 text-sm italic" style={{ color: 'var(--pdTextSubtle)' }}>Thread not found — add a Slack bot token in Settings to fetch live.</p></div>
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
                            onClick={summarizeThread}
                            disabled={summaryState === 'loading'}
                            className={BTN_DEFAULT}
                          >
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className={summaryState === 'loading' ? 'animate-spin' : ''}>
                              <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9 4 11.5l1.5-4L2 5h4.5L8 1z" fill="currentColor"/>
                            </svg>
                            {summaryState === 'loading' ? 'Summarising…' : 'Summarise'}
                          </button>
                          {entry.link && entry.link !== '#' && (
                            <a href={entry.link} target="_blank" rel="noopener noreferrer" className={BTN_DEFAULT} onClick={e => e.stopPropagation()}>
                              <ExternalLink size={11} />
                              Open in Slack
                            </a>
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



  return (
    <>
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ── Filter / view bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {/* View toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)', borderRadius: 8, padding: 2, gap: 2 }}>
          {(['feed', 'timeline'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 120ms, color 120ms, box-shadow 120ms',
                background: viewMode === mode ? 'var(--pdSurface1)' : 'transparent',
                color: viewMode === mode ? 'var(--pdTextStrong)' : 'var(--pdTextSubtle)',
                boxShadow: viewMode === mode ? 'var(--pdShadowSm)' : 'none',
              }}
            >
              {mode === 'feed' ? 'Feed' : 'Timeline'}
            </button>
          ))}
        </div>

        {/* Platform filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['all', 'slack', 'canva', 'figma', 'jira'] as const).map(p => {
            const isActive = platformFilter === p
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${isActive ? 'var(--pdBorderStrong)' : 'var(--pdBorder)'}`,
                  background: isActive ? 'var(--pdSurface3)' : 'transparent',
                  color: isActive ? 'var(--pdTextStrong)' : 'var(--pdTextSubtle)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 120ms',
                }}
              >
                {p === 'slack' && <SlackLogo size={11} />}
                {p === 'canva' && <CanvaLogo size={11} />}
                {p === 'figma' && <FigmaLogo size={11} />}
                {p === 'jira' && <JiraLogo size={11} />}
                <span>{p === 'all' ? `All (${counts.all})` : `${p.charAt(0).toUpperCase() + p.slice(1)} (${counts[p]})`}</span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--pdBorder)' }} />

        {/* Time filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['today', 'week', 'month', 'all'] as const).map(t => {
            const isActive = timeFilter === t
            return (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${isActive ? 'var(--pdBorderStrong)' : 'var(--pdBorder)'}`,
                  background: isActive ? 'var(--pdSurface3)' : 'transparent',
                  color: isActive ? 'var(--pdTextStrong)' : 'var(--pdTextSubtle)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 120ms',
                }}
              >
                {t === 'today' ? 'Today' : t === 'week' ? '7 days' : t === 'month' ? '30 days' : 'All time'}
              </button>
            )
          })}
        </div>

        {/* Bookmark filter + resolved toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowBookmarkedOnly(p => !p)}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 99,
              border: `1px solid ${showBookmarkedOnly ? 'var(--pdAccent04)' : 'var(--pdBorder)'}`,
              color: showBookmarkedOnly ? 'var(--pdAccent06)' : 'var(--pdTextSubtle)',
              background: showBookmarkedOnly ? 'var(--pdAccent01)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 120ms',
            }}
          >
            {showBookmarkedOnly ? '★ Bookmarked' : '☆ Bookmarked'}
          </button>
          <button
            onClick={() => setShowCompleted(p => !p)}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 99,
              border: `1px solid ${showCompleted ? 'var(--pdStatusDoneBorder)' : 'var(--pdBorder)'}`,
              color: showCompleted ? 'var(--pdStatusDoneText)' : 'var(--pdTextSubtle)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 120ms',
            }}
          >
            {showCompleted ? '✓ Show resolved' : '○ Hide resolved'}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', color: 'var(--pdTextSubtle)' }}>
          <p style={{ fontSize: 14 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span className="PdSectionTitle" style={{ whiteSpace: 'nowrap' }}>{group.label}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--pdBorder)' }} />
              </div>

              {/* Items with timeline line */}
              <div style={{ position: 'relative', paddingLeft: 22 }}>
                {/* Vertical line — stops 20px before bottom so it doesn't bleed past the last dot */}
                <div style={{ position: 'absolute', left: 7, top: 8, bottom: 20, width: 1, background: 'var(--pdBorder)' }} />

                <div className="space-y-3">
                  {group.entries.map(entry => (
                    <div key={entry.id} style={{ position: 'relative' }}>
                      {/* Timeline dot — centered on the line (container paddingLeft 22, line at left 7, dot left-edge at 3 = center at 7) */}
                      <div style={{
                        position: 'absolute',
                        left: -19,
                        top: 18,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        border: '2px solid var(--pdSurface0)',
                        background: entry.source === 'jira' ? 'var(--pdStatusProgressText)' : 'var(--pdAccent06)',
                      }} />
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
