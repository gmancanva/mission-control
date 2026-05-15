'use client'

import { useState, useRef, useEffect } from 'react'
import type { JiraEpic, JiraTicket } from '@/lib/jira'
import type { SlackMessage } from '@/lib/slack'
import type { CanvaMention } from '@/app/api/canva/route'
import type { FigmaMention } from '@/app/api/figma/route'
import type { DayEntry } from '@/app/api/calendar/weekly/route'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  onClose: () => void
  slackMessages: SlackMessage[]
  canvaMentions: CanvaMention[]
  figmaMentions: FigmaMention[]
  jiraEpics: JiraEpic[]
  myTickets: JiraTicket[]
}

type Preset = {
  label: string
  icon: React.ReactNode
  build: (data: Props & { calendar: DayEntry[] }) => { userMessage: string; systemContext: string }
}

function decodeSlack(text: string) {
  return text
    .replace(/<@[A-Z0-9]+\|([^>]+)>/g, '@$1')
    .replace(/<@[A-Z0-9]+>/g, '@mention')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function buildWhatsNewContext(data: Props): string {
  const cutoff = Date.now() - 7 * 86400000
  const lines: string[] = []

  const recentSlack = data.slackMessages.filter(m => parseFloat(m.ts) * 1000 > cutoff)
  if (recentSlack.length) {
    lines.push('=== Slack mentions (last 7 days) ===')
    recentSlack.slice(0, 30).forEach(m => {
      const date = fmtDate(new Date(parseFloat(m.ts) * 1000).toISOString())
      lines.push(`[${date}] #${m.channelName} — ${m.user}: "${decodeSlack(m.text).slice(0, 200)}"`)
    })
  }

  const recentFigma = data.figmaMentions.filter(m => new Date(m.created_at).getTime() > cutoff)
  if (recentFigma.length) {
    lines.push('\n=== Figma comments (last 7 days) ===')
    recentFigma.slice(0, 20).forEach(m => {
      lines.push(`[${fmtDate(m.created_at)}] ${m.file_name} — ${m.author}: "${m.text.slice(0, 200)}"`)
    })
  }

  if (data.canvaMentions.length) {
    lines.push('\n=== Canva design comments ===')
    data.canvaMentions.forEach(m => {
      lines.push(`[${fmtDate(m.created_at)}] ${m.design_title} — ${m.author}: "${m.text.slice(0, 200)}"`)
    })
  }

  return lines.join('\n')
}

function buildPrioritiesContext(data: Props & { calendar: DayEntry[] }): string {
  const lines: string[] = []

  if (data.calendar.length) {
    lines.push('=== This week\'s calendar ===')
    data.calendar.forEach(day => {
      if (!day.meetings.length) return
      lines.push(`\n${fmtDate(day.date)} (${day.total_min} min total):`)
      day.meetings.forEach(m => {
        const start = new Date(m.start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
        lines.push(`  ${start} — ${m.title} (${m.duration_min} min)`)
      })
    })
  }

  if (data.myTickets.length) {
    lines.push('\n=== My Jira tickets ===')
    data.myTickets.slice(0, 20).forEach(t => {
      const due = (t as { dueDate?: string }).dueDate ? ` [due ${fmtDate((t as { dueDate?: string }).dueDate!)}]` : ''
      lines.push(`${t.key} [${t.status}]${due}: ${t.summary}`)
    })
  }

  const cutoff = Date.now() - 7 * 86400000
  const questions: string[] = []

  data.slackMessages.filter(m => parseFloat(m.ts) * 1000 > cutoff).slice(0, 15).forEach(m => {
    const text = decodeSlack(m.text)
    if (text.includes('?') || text.toLowerCase().includes('wdyt') || text.toLowerCase().includes('thoughts')) {
      questions.push(`Slack #${m.channelName}: "${text.slice(0, 150)}"`)
    }
  })
  data.figmaMentions.filter(m => new Date(m.created_at).getTime() > cutoff).slice(0, 10).forEach(m => {
    if (m.text.includes('?')) questions.push(`Figma (${m.file_name}): "${m.text.slice(0, 150)}"`)
  })
  data.canvaMentions.forEach(m => {
    if (m.text.includes('?')) questions.push(`Canva (${m.design_title}): "${m.text.slice(0, 150)}"`)
  })

  if (questions.length) {
    lines.push('\n=== Open questions needing a response ===')
    questions.forEach(q => lines.push(q))
  }

  return lines.join('\n')
}

const PRESETS: Preset[] = [
  {
    label: "What's new",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9 4 11.5l1.5-4L2 5h4.5L8 1z" fill="currentColor"/>
      </svg>
    ),
    build: ({ slackMessages, canvaMentions, figmaMentions, jiraEpics, myTickets, calendar }) => ({
      userMessage: "What's new for me this week? Summarise my recent mentions and tell me what I should action, resolve, or ignore.",
      systemContext: `Here is the user's recent activity data:\n\n${buildWhatsNewContext({ slackMessages, canvaMentions, figmaMentions, jiraEpics, myTickets, onClose: () => {} })}\n\nFor each item, classify it as ACTION (needs a response), RESOLVE (can be marked done), or IGNORE (FYI only). Group by platform. Be concise.`,
    }),
  },
  {
    label: 'Weekly priorities',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    build: ({ slackMessages, canvaMentions, figmaMentions, jiraEpics, myTickets, calendar }) => ({
      userMessage: "Give me a summary of my priorities for this week.",
      systemContext: `Here is the user's work context for this week:\n\n${buildPrioritiesContext({ slackMessages, canvaMentions, figmaMentions, jiraEpics, myTickets, calendar, onClose: () => {} })}\n\nProvide a prioritised list of what to focus on this week. Consider deadlines, meeting prep needed, and open questions. Be specific and opinionated about what matters most.`,
    }),
  },
]

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xs font-bold text-gray-800 dark:text-gray-100 mt-3 mb-1">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xs font-bold text-gray-800 dark:text-gray-100 mt-3 mb-1">{line.slice(3)}</h2>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={i} className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-2">{line.slice(2, -2)}</p>)
    } else if (line.match(/^(\*|-) /)) {
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <span className="text-gray-400 mt-0.5 shrink-0">•</span>
          <span>{formatInline(line.replace(/^(\*|-) /, ''))}</span>
        </div>
      )
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1]
      elements.push(
        <div key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <span className="text-gray-400 shrink-0 w-4 text-right">{num}.</span>
          <span>{formatInline(line.replace(/^\d+\. /, ''))}</span>
        </div>
      )
    } else if (line === '') {
      if (elements.length > 0) elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(<p key={i} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{formatInline(line)}</p>)
    }
    i++
  }
  return <div className="space-y-0.5">{elements}</div>
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{part.slice(1, -1)}</code>
    }
    return part
  })
}

export default function ChatPanel({ onClose, slackMessages, canvaMentions, figmaMentions, jiraEpics, myTickets }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(userText: string, systemContext?: string) {
    if (!userText.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemContext,
        }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' })) as { error?: string }
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `Error: ${err.error ?? 'Something went wrong'}` }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: text }])
      }
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Failed to connect. Check your ANTHROPIC_API_KEY.' }])
    } finally {
      setStreaming(false)
    }
  }

  async function handlePreset(preset: Preset) {
    let calendar: DayEntry[] = []
    try {
      const res = await fetch('/api/calendar/weekly')
      if (res.ok) {
        const data = await res.json() as { available?: boolean; daily_breakdown?: DayEntry[] }
        calendar = data.daily_breakdown ?? []
      }
    } catch { /* no calendar */ }

    const { userMessage, systemContext } = preset.build({
      slackMessages, canvaMentions, figmaMentions, jiraEpics, myTickets, calendar, onClose,
    })
    await send(userMessage, systemContext)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950" style={{ width: 380 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-violet-500">
          <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9 4 11.5l1.5-4L2 5h4.5L8 1z" fill="currentColor"/>
        </svg>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ask Claude</span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
        <button
          onClick={onClose}
          className={`${messages.length > 0 ? '' : 'ml-auto'} text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-gray-400 dark:text-gray-600">Ask anything about your work, or use a quick prompt:</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                disabled={streaming}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors disabled:opacity-50"
              >
                <span className="text-violet-500 mt-0.5 shrink-0">{preset.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{preset.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                    {preset.label === "What's new"
                      ? 'Summarise recent mentions · suggest action / resolve / ignore'
                      : 'Calendar, Jira deadlines, open questions — ordered by priority'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] px-3 py-2 rounded-xl bg-violet-600 text-white text-xs leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[95%]">
                  {msg.content
                    ? <MarkdownText text={msg.content} />
                    : <span className="text-xs text-gray-400 animate-pulse">Thinking…</span>
                  }
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Preset chips — always visible at bottom if chat is active */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              disabled={streaming}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-700 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
            >
              <span className="text-violet-500">{preset.icon}</span>
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your work…"
            rows={2}
            disabled={streaming}
            className="flex-1 resize-none text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V3M3 7l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1.5">↵ send · shift+↵ newline</p>
      </div>
    </div>
  )
}
