'use client'

import { useState, useEffect } from 'react'
import SlackText from '@/components/SlackText'
import ReactionBar from '@/components/ReactionBar'
import Tooltip from '@/components/Tooltip'
import { loadAvatars, getGlobalAvatars } from '@/lib/avatarStore'
import { BTN_BASE, BTN_DEFAULT, BTN_ACTIVE_GREEN } from '@/lib/cardStyles'
import type { JiraEpic, JiraTicket } from '@/lib/jira'
import type { SlackMessage } from '@/lib/slack'
import type { CanvaMention } from '@/app/api/canva/route'
import type { FigmaMention } from '@/app/api/figma/route'
import type { CalendarWeekly } from '@/app/api/calendar/weekly/route'
import CalendarWeekGrid from './CalendarWeekGrid'
import TemplateTaskModal from './TemplateTaskModal'

type Props = {
  epics: JiraEpic[]
  myTickets: JiraTicket[]
  slackMessages: SlackMessage[]
  canvaMentions: CanvaMention[]
  figmaMentions: FigmaMention[]
  projectKeys: string[]
  jiraBaseUrl: string
  calendarSyncKey?: number
}

type ItemFlags = Record<string, { completed?: boolean; bookmarked?: boolean }>

type MeetingEventDetails = {
  description: string | null
  location: string | null
  hangoutLink: string | null
  conferenceLink: string | null
  attendees: Array<{ email: string; displayName?: string; self?: boolean; responseStatus?: string }>
  selfResponseStatus: string | null
}

type MentionItem = {
  id: string
  source: 'slack' | 'canva' | 'figma'
  project: string
  text: string
  author: string
  avatarUrl?: string
  date: string
  link: string
  isQuestion: boolean
  // reply metadata
  figmaFileKey?: string
  figmaCommentId?: string
  slackChannel?: string
  slackTs?: string
}

// ─── Logos ──────────────────────────────────────────────────────────────────

function SlackLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none">
      <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#2EB67D"/>
      <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#36C5F0"/>
      <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386H34.048a5.381 5.381 0 0 0-5.376 5.386 5.381 5.381 0 0 0 5.376 5.387" fill="#ECB22E"/>
      <path d="M0 34.248a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387v-5.386H5.376A5.381 5.381 0 0 0 0 34.248m14.336 0v14.365A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.248a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386" fill="#E01E5A"/>
    </svg>
  )
}

function CanvaLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#7D2AE8"/>
      <path d="M22.4 20.5c-.9 1.4-2.4 2.3-4.4 2.3-3.2 0-5.5-2.4-5.5-5.8s2.3-5.8 5.5-5.8c1.9 0 3.3.8 4.3 2l2-1.9C22.8 9.8 20.6 9 18 9c-4.7 0-8 3.4-8 8s3.3 8 8 8c2.7 0 4.9-1.1 6.3-2.8l-1.9-1.7z" fill="white"/>
    </svg>
  )
}

function FigmaLogo({ size = 13 }: { size?: number }) {
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

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function isQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  return text.includes('?') || lower.includes('wdyt') || lower.includes('thoughts') ||
    lower.includes('what do you think') || lower.includes('feedback')
}

function isWithinDays(dateStr: string, days: number): boolean {
  return Date.now() - new Date(dateStr).getTime() < days * 86400000
}

function priorityOrder(p: string): number {
  return { Blocker: 0, Critical: 1, High: 2, Medium: 3, Low: 4 }[p] ?? 3
}

// ─── Source pill ──────────────────────────────────────────────────────────────

function SourcePill({ source }: { source: 'slack' | 'canva' | 'figma' }) {
  const styles = {
    slack: 'bg-[#4A154B]/10 text-[#611f69] border-[#4A154B]/20 dark:bg-[#611f69]/20 dark:text-[#e8b4f8] dark:border-[#611f69]/30',
    canva: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/40',
    figma: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40',
  }
  const logos = { slack: <SlackLogo size={11} />, canva: <CanvaLogo size={11} />, figma: <FigmaLogo size={11} /> }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${styles[source]}`}>
      {logos[source]}
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  )
}

// ─── Shared thread helpers ────────────────────────────────────────────────────

type ThreadMsg = {
  author: string
  avatar_url?: string
  text: string
  ts: string
  is_parent?: boolean
  is_me?: boolean
  reactions?: { name: string; count: number }[]
  files?: { url: string; name: string; mimetype: string; thumb_url?: string }[]
}

function Avatar({ author, avatarUrl, size = 24 }: { author: string; avatarUrl?: string; size?: number }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(
    avatarUrl ?? getGlobalAvatars()?.[author]
  )

  useEffect(() => {
    if (resolvedUrl) return
    loadAvatars().then(map => {
      const url = map[author]
      if (url) setResolvedUrl(url)
    })
  }, [author]) // eslint-disable-line react-hooks/exhaustive-deps

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

function FileAttachment({ file }: { file: NonNullable<ThreadMsg['files']>[number] }) {
  const isImage = file.mimetype.startsWith('image/')
  const isVideo = file.mimetype.startsWith('video/')
  if (isImage) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block mt-1.5 max-w-xs">
        {file.thumb_url
          ? <img src={file.thumb_url} alt={file.name} className="rounded-md border border-gray-200 dark:border-gray-700 max-h-48 object-cover" />
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

function decodeSlack(text: string) {
  return text
    .replace(/<@[A-Z0-9]+\|([^>]+)>/g, '@$1')
    .replace(/<@[A-Z0-9]+>/g, '@mention')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

// ─── Mention card ─────────────────────────────────────────────────────────────

function MentionCard({
  item, resolved, onResolve, onNewTask,
}: {
  item: MentionItem
  resolved: boolean
  onResolve: (id: string) => void
  onNewTask: (text: string) => void
}) {

  // Thread
  const [threadOpen, setThreadOpen] = useState(false)
  const [threadLoading, setThreadLoading] = useState(false)
  const [thread, setThread] = useState<ThreadMsg[] | null>(null)
  const [threadLive, setThreadLive] = useState(false)

  // Reply
  const [showReply, setShowReply] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftLoading, setDraftLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  async function fetchThread(): Promise<ThreadMsg[] | null> {
    if (!item.slackChannel || !item.slackTs) return null
    setThreadLoading(true)
    try {
      const res = await fetch(`/api/slack/thread?channel=${encodeURIComponent(item.slackChannel)}&ts=${encodeURIComponent(item.slackTs)}`)
      const data = await res.json() as { thread?: ThreadMsg[] | null; live?: boolean }
      const msgs = data.thread ?? null
      setThread(msgs)
      setThreadLive(!!data.live)
      return msgs
    } catch { return null }
    finally { setThreadLoading(false) }
  }

  async function toggleThread() {
    if (threadOpen) { setThreadOpen(false); return }
    setThreadOpen(true)
    if (!thread) await fetchThread()
  }

  async function draftReply() {
    setDraftLoading(true)
    setShowReply(true)
    setSentOk(false)
    setSendError(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', text: item.text, source: item.source, project: item.project, author: item.author }),
      })
      const data = await res.json() as { result?: string; error?: string }
      if (data.error) {
        setSendError(`AI error: ${data.error}`)
      } else {
        setDraft(data.result ?? '')
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setDraftLoading(false)
    }
  }

  async function sendReply() {
    if (!draft.trim()) return
    setSending(true)
    setSendError(null)

    try {
      if (item.source === 'figma' && item.figmaFileKey && item.figmaCommentId) {
        const res = await fetch('/api/figma/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_key: item.figmaFileKey, parent_id: item.figmaCommentId, message: draft }),
        })
        const data = await res.json() as { ok?: boolean; error?: string }
        if (!data.ok) { setSendError(data.error ?? 'Failed to send'); return }
        setSentOk(true)
        setShowReply(false)
      } else if (item.source === 'slack' && item.slackChannel && item.slackTs) {
        await navigator.clipboard.writeText(draft).catch(() => {})
        window.open(item.link, '_blank')
        setCopied(true)
        setTimeout(() => { setCopied(false); setShowReply(false) }, 2500)
      } else {
        // Canva — copy + open
        await navigator.clipboard.writeText(draft).catch(() => {})
        window.open(item.link, '_blank')
        setCopied(true)
        setTimeout(() => { setCopied(false); setShowReply(false) }, 2500)
      }
    } finally {
      setSending(false)
    }
  }

  const canSendDirect = item.source === 'figma' && item.figmaFileKey
  const sendLabel = canSendDirect ? 'Send' : 'Copy & open'

  const isClickable = item.source === 'slack' && !!item.slackChannel

  return (
    <div
      onClick={isClickable ? toggleThread : undefined}
      className={`rounded-xl border transition-all ${isClickable ? 'cursor-pointer select-none' : ''} ${
        resolved
          ? 'opacity-40 bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800'
          : threadOpen
            ? 'bg-white dark:bg-gray-900 border-purple-300 dark:border-purple-700'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <SourcePill source={item.source} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Avatar author={item.author} avatarUrl={item.avatarUrl} size={24} />
              <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{item.author}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{relativeTime(item.date)}</span>
              <Tooltip label={item.project}>
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{item.project}</span>
              </Tooltip>
            </div>

            <div className={`text-sm leading-relaxed ${resolved ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
              {item.source === 'slack' ? <SlackText text={item.text} /> : item.text}
            </div>

            {sentOk && (
              <p className="mt-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-lg px-3 py-1.5">
                ✓ Reply sent
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-3" onClick={e => e.stopPropagation()}>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className={BTN_DEFAULT}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M7 1h4v4M11 1L5.5 6.5M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Open
                </a>
              )}

              <button onClick={showReply ? () => setShowReply(false) : draftReply}
                className={showReply ? `${BTN_BASE} bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400` : BTN_DEFAULT}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H6.5L4 11V9H2.5A1.5 1.5 0 0 1 1 7.5v-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                Reply
              </button>

              <button onClick={() => onNewTask(item.text.slice(0, 120))} className={BTN_DEFAULT}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                New task
              </button>

              <button onClick={() => onResolve(item.id)} className={resolved ? BTN_ACTIVE_GREEN : BTN_DEFAULT}>
                {resolved
                  ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/></svg>
                }
                {resolved ? 'Resolved' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thread panel */}
      {threadOpen && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {threadLoading ? 'Loading thread…' : thread ? `${thread.length} messages` : 'Thread'}
            </span>
            {!threadLoading && thread && (
              <span className={`text-xs ${threadLive ? 'text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-gray-600'}`}>
                {threadLive ? 'Live' : 'Cached'}
              </span>
            )}
          </div>
          {threadLoading && (
            <div className="flex items-center gap-2 py-3">
              <picture>
                <source srcSet="/loopi-loading.webp" type="image/webp" />
                <img src="/loopi-loading.gif" alt="" width={28} height={30} style={{ imageRendering: 'pixelated' }} />
              </picture>
              <span className="text-xs text-gray-400">Fetching thread…</span>
            </div>
          )}
          {!threadLoading && thread === null && (
            <div className="flex items-center gap-3 py-1">
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Thread couldn&apos;t be loaded.</p>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                  Open in Slack
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M7 1h4v4M11 1L5.5 6.5M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )}
            </div>
          )}
          {!threadLoading && thread && thread.length > 0 && (
            <div className="space-y-2.5">
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
                    <div className={`text-xs font-semibold mb-1 ${msg.is_me ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
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
          )}
        </div>
      )}

      {/* Reply panel */}
      {showReply && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 space-y-2" onClick={e => e.stopPropagation()}>
          {copied ? (
            <div className="flex items-center gap-2 py-3">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-green-500 shrink-0">
                <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Draft copied — paste it in the Slack thread</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Draft reply</span>
                <button onClick={draftReply} disabled={draftLoading}
                  className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 disabled:opacity-50 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className={draftLoading ? 'animate-spin' : ''}>
                    <path d="M10 6A4 4 0 1 1 6 2M6 2l2-2M6 2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {draftLoading ? 'Generating…' : 'Regenerate'}
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={draftLoading ? 'Drafting reply…' : 'Your reply…'}
                rows={4}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-sky-400 dark:focus:border-sky-600 resize-none leading-relaxed"
              />
              {sendError && (
                <p className="text-xs text-red-500 dark:text-red-400">{sendError}</p>
              )}
              <div className="flex gap-2">
                <button onClick={sendReply} disabled={sending || !draft.trim() || draftLoading}
                  className="text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-md font-medium transition-colors">
                  {sending ? 'Opening…' : sendLabel}
                </button>
                <button onClick={() => setShowReply(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1.5 transition-colors">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count, action }: {
  icon: React.ReactNode
  title: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {count != null && (
        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{count}</span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

// ─── Week helpers ────────────────────────────────────────────────────────────

function calLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekRange(offset: number): { start: string; end: string } {
  const today = new Date()
  const dow = today.getDay() // 0=Sun … 6=Sat
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const mon = new Date(today)
  mon.setDate(today.getDate() - daysFromMon + offset * 7)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  return { start: calLocalDateStr(mon), end: calLocalDateStr(fri) }
}

function formatWeekLabel(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-AU', opts)
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${fmt(s, { month: 'long', year: 'numeric' })} · ${s.getDate()}–${e.getDate()}`
  }
  return `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UpdatesPage({ epics, myTickets, slackMessages, canvaMentions, figmaMentions, projectKeys, jiraBaseUrl, calendarSyncKey }: Props) {
  const [flags, setFlags] = useState<ItemFlags>({})
  const [calendarByWeek, setCalendarByWeek] = useState<Record<string, CalendarWeekly>>({})
  const [weekOffset, setWeekOffset] = useState(0)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalSummary, setTaskModalSummary] = useState('')

  function openNewTask(text: string) {
    setTaskModalSummary(text)
    setTaskModalOpen(true)
  }
  const [showAllAttention, setShowAllAttention] = useState(false)
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [activeTab, setActiveTab] = useState<'attention' | 'questions'>('attention')
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const [meetingDetails, setMeetingDetails] = useState<Record<string, MeetingEventDetails | null | 'loading' | 'error'>>({})
  const [meetingRsvp, setMeetingRsvp] = useState<Record<string, 'attending' | 'not-attending'>>({})

  useEffect(() => {
    const stored = localStorage.getItem('comms-item-flags')
    if (stored) { try { setFlags(JSON.parse(stored)) } catch { /* ignore */ } }
    const rsvpStored = localStorage.getItem('meeting-rsvp')
    if (rsvpStored) { try { setMeetingRsvp(JSON.parse(rsvpStored)) } catch { /* ignore */ } }
  }, [])

  useEffect(() => {
    async function loadCalendar() {
      try {
        const r = await fetch('/api/calendar/weekly')
        const d = await r.json()
        if (!d.available) return
        setCalendarByWeek((d.weeks ?? {}) as Record<string, CalendarWeekly>)
      } catch { /* no calendar */ }
    }
    loadCalendar()
  }, [calendarSyncKey])

  async function expandMeeting(start: string) {
    if (expandedMeeting === start) { setExpandedMeeting(null); return }
    setExpandedMeeting(start)
    if (meetingDetails[start] !== undefined) return
    setMeetingDetails(prev => ({ ...prev, [start]: 'loading' }))
    try {
      const res = await fetch(`/api/calendar/event-details?start=${encodeURIComponent(start)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMeetingDetails(prev => ({ ...prev, [start]: data as MeetingEventDetails }))
    } catch {
      setMeetingDetails(prev => ({ ...prev, [start]: 'error' }))
    }
  }

  function setRsvp(start: string, status: 'attending' | 'not-attending') {
    setMeetingRsvp(prev => {
      const next = { ...prev, [start]: status }
      localStorage.setItem('meeting-rsvp', JSON.stringify(next))
      return next
    })
  }

  function resolve(id: string) {
    setFlags(prev => {
      const current = prev[id] ?? {}
      const updated = { ...prev, [id]: { ...current, completed: !current.completed } }
      localStorage.setItem('comms-item-flags', JSON.stringify(updated))
      return updated
    })
  }

  // ── Build mention items ──
  const allMentions: MentionItem[] = [
    ...slackMessages.filter(m => isWithinDays(new Date(parseFloat(m.ts) * 1000).toISOString(), 30)).map(m => ({
      id: `slack-${m.id}`,
      source: 'slack' as const,
      project: m.channelName,
      text: m.text,
      author: m.username ?? m.user ?? 'Slack user',
      avatarUrl: m.avatar_url,
      date: new Date(parseFloat(m.ts) * 1000).toISOString(),
      link: m.permalink,
      isQuestion: isQuestion(m.text),
      slackChannel: m.channel,
      slackTs: (() => {
        try { return new URL(m.permalink).searchParams.get('thread_ts') ?? m.ts } catch { return m.ts }
      })(),
    })),
    ...canvaMentions.filter(m => isWithinDays(m.created_at, 60) && m.text.trim()).map(m => ({
      id: `canva-${m.id}`,
      source: 'canva' as const,
      project: m.design_title,
      text: `${m.author}: ${m.text}`.slice(0, 300),
      author: m.author,
      date: m.created_at,
      link: m.design_url,
      isQuestion: isQuestion(m.text),
    })),
    ...figmaMentions.filter(m => isWithinDays(m.created_at, 60) && m.text.trim()).map(m => ({
      id: `figma-${m.id}`,
      source: 'figma' as const,
      project: m.file_name,
      text: `${m.author}: ${m.text}`.slice(0, 300),
      author: m.author,
      date: m.created_at,
      link: m.file_url,
      isQuestion: isQuestion(m.text),
      figmaFileKey: m.file_key,
      figmaCommentId: m.id,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const needsAttention = allMentions.filter(m => isWithinDays(m.date, 14) && !flags[m.id]?.completed)
  const openQuestions = allMentions.filter(m => m.isQuestion && !flags[m.id]?.completed)

  // ── Jira tickets ──
  const openTickets = myTickets
    .filter(t => t.statusCategoryKey !== 'done')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return priorityOrder(a.priority) - priorityOrder(b.priority)
    })

  // ── Greeting ──
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  // ── Calendar: today's meetings ──
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayWeekStart = getWeekRange(0).start
  const todayEntry = calendarByWeek[todayWeekStart]?.daily_breakdown.find(d => d.date === todayStr)
  const meetingCount = todayEntry?.meetings.length ?? 0

  // ── Summary line ──
  const summaryParts: string[] = []
  if (needsAttention.length > 0) summaryParts.push(`${needsAttention.length} mention${needsAttention.length !== 1 ? 's' : ''} need attention`)
  if (openQuestions.length > 0) summaryParts.push(`${openQuestions.length} open question${openQuestions.length !== 1 ? 's' : ''}`)
  if (meetingCount > 0) summaryParts.push(`${meetingCount} meeting${meetingCount !== 1 ? 's' : ''} today`)
  if (openTickets.length > 0) summaryParts.push(`${openTickets.length} open task${openTickets.length !== 1 ? 's' : ''}`)

  const SHOW_LIMIT = 5

  return (
    <>
    <TemplateTaskModal
      isOpen={taskModalOpen}
      onClose={() => setTaskModalOpen(false)}
      projectKeys={projectKeys}
      epics={epics}
      defaultTab="manual"
      initialSummary={taskModalSummary}
      onCreated={() => setTaskModalOpen(false)}
    />
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{greeting}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{today}</p>
        {summaryParts.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{summaryParts.join(' · ')}</p>
        )}
        {summaryParts.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">You&apos;re all caught up.</p>
        )}
      </div>

      {/* ── Calendar ── */}
      {(() => {
        const hasAnyData = Object.keys(calendarByWeek).length > 0
        const { start: weekStart, end: weekEnd } = getWeekRange(weekOffset)
        const weekData = calendarByWeek[weekStart]
        const displayBreakdown = weekData?.daily_breakdown ?? []
        const isCurrentWeek = weekOffset === 0
        const syncedAt = weekData?.synced_at

        if (!hasAnyData) {
          return (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-sm text-gray-400 dark:text-gray-600">
                Calendar not connected.{' '}
                <a href="/?view=settings" className="underline hover:text-gray-600 dark:hover:text-gray-300">Set up in Settings →</a>
              </p>
            </div>
          )
        }

        return (
          <div>
            {/* Week navigation */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setWeekOffset(o => o - 1)}
                  title="Previous week"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8, border: '1px solid var(--pdBorder)',
                    background: 'var(--pdSurface1)', color: 'var(--pdTextBase)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 12L6 8l4-4"/>
                  </svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pdTextStrong)', minWidth: 200, textAlign: 'center' }}>
                  {formatWeekLabel(weekStart, weekEnd)}
                </span>
                <button
                  onClick={() => setWeekOffset(o => o + 1)}
                  title="Next week"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8, border: '1px solid var(--pdBorder)',
                    background: 'var(--pdSurface1)', color: 'var(--pdTextBase)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4l4 4-4 4"/>
                  </svg>
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {syncedAt && (
                  <span style={{ fontSize: 11, color: 'var(--pdTextMuted)' }}>
                    {(() => {
                      const mins = Math.round((Date.now() - new Date(syncedAt).getTime()) / 60000)
                      if (mins < 1) return 'synced just now'
                      if (mins < 60) return `synced ${mins}m ago`
                      const hrs = Math.floor(mins / 60)
                      if (hrs < 24) return `synced ${hrs}h ago`
                      return `synced ${Math.floor(hrs / 24)}d ago`
                    })()}
                  </span>
                )}
                {!isCurrentWeek && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    style={{
                      fontSize: 12, fontWeight: 500, padding: '4px 10px',
                      borderRadius: 6, border: '1px solid var(--pdBorder)',
                      background: 'var(--pdSurface1)', color: 'var(--pdTextMuted)',
                      cursor: 'pointer',
                    }}
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            {displayBreakdown.length === 0 ? (
              <div style={{
                border: '1px solid var(--pdBorder)', borderRadius: 12,
                background: 'var(--pdSurface1)', padding: '32px 24px',
                textAlign: 'center', color: 'var(--pdTextSubtle)', fontSize: 13,
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>📅</div>
                <div style={{ fontWeight: 600, color: 'var(--pdTextBase)', marginBottom: 4 }}>
                  No calendar data for this week
                </div>
                <div>Hit &ldquo;Sync now&rdquo; to pull in data from Google Calendar.</div>
              </div>
            ) : (
              <CalendarWeekGrid
                dailyBreakdown={displayBreakdown}
                weekStart={weekStart}
                weekEnd={weekEnd}
                expandedMeeting={expandedMeeting}
                meetingDetails={meetingDetails}
                meetingRsvp={meetingRsvp}
                onExpandMeeting={expandMeeting}
                onSetRsvp={setRsvp}
              />
            )}
          </div>
        )
      })()}

      {/* ── Tabbed: Needs attention + Open questions ── */}
      <section>
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 mb-5">
          <button
            onClick={() => setActiveTab('attention')}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'attention'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Needs attention
            {needsAttention.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === 'attention'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>{needsAttention.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'questions'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 6a1.5 1.5 0 0 1 3 0c0 1-1.5 1.5-1.5 2.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Open questions
            {openQuestions.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === 'questions'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>{openQuestions.length}</span>
            )}
          </button>
        </div>

        {/* Needs attention tab */}
        {activeTab === 'attention' && (
          needsAttention.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 py-6 text-center">Nothing in the last 14 days — you&apos;re clear.</p>
          ) : (
            <div className="space-y-3">
              {(showAllAttention ? needsAttention : needsAttention.slice(0, SHOW_LIMIT)).map(item => (
                <MentionCard
                  key={item.id}
                  item={item}
                  resolved={!!flags[item.id]?.completed}
                  onResolve={resolve}
                  onNewTask={openNewTask}
                />
              ))}
              {needsAttention.length > SHOW_LIMIT && (
                <button
                  onClick={() => setShowAllAttention(p => !p)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-2 w-full text-center"
                >
                  {showAllAttention ? 'Show less' : `Show ${needsAttention.length - SHOW_LIMIT} more`}
                </button>
              )}
            </div>
          )
        )}

        {/* Open questions tab */}
        {activeTab === 'questions' && (
          openQuestions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 py-6 text-center">No unanswered questions.</p>
          ) : (
            <div className="space-y-3">
              {(showAllQuestions ? openQuestions : openQuestions.slice(0, SHOW_LIMIT)).map(item => (
                <MentionCard
                  key={item.id}
                  item={item}
                  resolved={!!flags[item.id]?.completed}
                  onResolve={resolve}
                  onNewTask={openNewTask}
                />
              ))}
              {openQuestions.length > SHOW_LIMIT && (
                <button
                  onClick={() => setShowAllQuestions(p => !p)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-2 w-full text-center"
                >
                  {showAllQuestions ? 'Show less' : `Show ${openQuestions.length - SHOW_LIMIT} more`}
                </button>
              )}
            </div>
          )
        )}
      </section>

    </div>
    </>
  )
}
