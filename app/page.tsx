'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { JiraEpic, JiraTicket } from '@/lib/jira'
import type { SlackMessage } from '@/lib/slack'
import type { PinnedDecision } from '@/lib/db'
import type { CanvaMention } from '@/app/api/canva/route'
import type { FigmaMention } from '@/app/api/figma/route'
import OverviewTab from '@/components/OverviewTab'
import TimelineTab from '@/components/TimelineTab'
import CommsTrail from '@/components/CommsTrail'
import MyTasks from '@/components/MyTasks'
import CapacityView from '@/components/CapacityView'
import SettingsView from '@/components/SettingsView'
import TemplateTaskModal from '@/components/TemplateTaskModal'
import UpdatesPage from '@/components/UpdatesPage'
import OnboardingWizard from '@/components/OnboardingWizard'
import { useTheme } from '@/components/ThemeProvider'
import ProfileAvatar from '@/components/ProfileAvatar'
import { Moon, Sun, Search, Plus, Settings, RefreshCw, Check, Copy, Sunrise, ListChecks, LayoutDashboard, Gauge, AtSign, AlertTriangle, X } from 'lucide-react'

type View = 'updates' | 'tasks' | 'jira-projects' | 'capacity' | 'comms' | 'settings'

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; count?: number }[] = [
  { id: 'updates',       label: 'Summary',       icon: <Sunrise size={17} /> },
  { id: 'tasks',         label: 'Tasks',         icon: <ListChecks size={17} /> },
  { id: 'jira-projects', label: 'Jira Projects', icon: <LayoutDashboard size={17} /> },
  { id: 'capacity',      label: 'Capacity',      icon: <Gauge size={17} /> },
  { id: 'comms',         label: 'Mentions',      icon: <AtSign size={17} /> },
]

function SyncIcon({ spinning }: { spinning: boolean }) {
  return <RefreshCw size={15} style={spinning ? { animation: 'spin 1s linear infinite' } : undefined} />
}

// ── Auth-loss detection ────────────────────────────────────────────────────────
// Surfaced as a banner when an integration is configured but no longer authorised
// (e.g. an OAuth token was wiped or expired, or an API token turned invalid).

type AuthIssue = { key: string; message: string; action: 'canva-oauth' | 'settings' }

const AUTH_ISSUE_DEFS: Record<string, AuthIssue> = {
  canva:  { key: 'canva',  message: 'Canva sign-in has expired — reconnect to resume mention syncing.', action: 'canva-oauth' },
  google: { key: 'google', message: 'Google Calendar is disconnected — reconnect it in Settings.', action: 'settings' },
  jira:   { key: 'jira',   message: 'Jira API token is missing or invalid — update it in Settings.', action: 'settings' },
  slack:  { key: 'slack',  message: 'Slack bot token is missing or invalid — update it in Settings.', action: 'settings' },
  figma:  { key: 'figma',  message: 'Figma access token is missing or invalid — update it in Settings.', action: 'settings' },
}

const AUTH_ERROR_RE = /401|403|unauthori[sz]|not connected|expired|invalid[_ ]?token|forbidden/i

export default function DashboardPage() {
  const { theme, toggle: toggleTheme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeView, setActiveView] = useState<View>('updates')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarSyncKey, setCalendarSyncKey] = useState(0)
  const [sourceSyncTimes, setSourceSyncTimes] = useState<Record<string, string>>({})
  const [syncingSources, setSyncingSources] = useState<Set<string>>(new Set())
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [authIssues, setAuthIssues] = useState<AuthIssue[]>([])
  const [dismissedAuth, setDismissedAuth] = useState<Set<string>>(new Set())
  const [hoveredTooltip, setHoveredTooltip] = useState<{ key: string; x: number; y: number; h: number } | null>(null)

  const [epics, setEpics] = useState<JiraEpic[]>([])
  const [myTickets, setMyTickets] = useState<JiraTicket[]>([])
  const [projectKeys, setProjectKeys] = useState<string[]>([])
  const [slackMessages, setSlackMessages] = useState<SlackMessage[]>([])
  const [pinnedDecisions, setPinnedDecisions] = useState<PinnedDecision[]>([])
  const [canvaMentions, setCanvaMentions] = useState<CanvaMention[]>([])
  const [figmaMentions, setFigmaMentions] = useState<FigmaMention[]>([])
  const [jiraTab, setJiraTab] = useState<'projects' | 'timeline'>('projects')

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalTab, setCreateModalTab] = useState<'template' | 'manual'>('template')
  const [createModalSprint, setCreateModalSprint] = useState<'backlog' | 'current' | 'next'>('current')
  const [createModalProjectKey, setCreateModalProjectKey] = useState<string | undefined>(undefined)

  // Onboarding wizard state
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Set<string>>(new Set())
  const [connectedCount, setConnectedCount] = useState<number | null>(null)

  // OAuth callback errors — captured into state BEFORE the URL params are
  // stripped below, otherwise Settings renders after the error is already gone
  const [urlError, setUrlError] = useState<string | null>(null)
  const [canvaUrlError, setCanvaUrlError] = useState<string | null>(null)

  // Sync activeView with ?view= param (used by OAuth callback redirects),
  // then strip all URL params so reloading always lands on the Summary page.
  useEffect(() => {
    const v = searchParams.get('view')
    const validViews: View[] = ['updates', 'tasks', 'jira-projects', 'capacity', 'comms', 'settings']
    if (v && validViews.includes(v as View)) {
      setActiveView(v as View)
    }
    const err = searchParams.get('error')
    const canvaErr = searchParams.get('canva_error')
    if (err) setUrlError(err)
    if (canvaErr) setCanvaUrlError(canvaErr)
    // Strip params from URL so the next reload goes to the default (Summary)
    if (searchParams.toString()) {
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  const jiraBaseUrl = process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? ''

  // Lightweight Jira-only refresh — used after ticket create/update so the board
  // updates instantly without waiting for Slack/Canva/Figma to re-fetch too
  const refreshJira = useCallback(async () => {
    try {
      const res = await fetch('/api/jira?bust=1')
      if (!res.ok) return
      const data = await res.json() as { epics: JiraEpic[]; myTickets: JiraTicket[]; projectKeys: string[] }
      setEpics(data.epics ?? [])
      setMyTickets(data.myTickets ?? [])
      setProjectKeys(data.projectKeys ?? [])
    } catch { /* silent — board keeps existing data */ }
  }, [])

  const fetchAll = useCallback(async (bust = false) => {
    try {
      const qs = bust ? '?bust=1' : ''
      const [jiraRes, slackRes, exportRes, canvaRes, figmaRes, calendarRes] = await Promise.all([
        fetch(`/api/jira${qs}`),
        fetch(`/api/slack${qs}`),
        fetch('/api/export'),
        fetch('/api/canva'),
        fetch(`/api/figma${qs}`),
        fetch('/api/calendar/weekly'),
      ])

      const newSyncTimes: Record<string, string> = {}

      if (jiraRes.ok) {
        const jiraData = await jiraRes.json() as { epics: JiraEpic[]; myTickets: JiraTicket[]; projectKeys: string[]; synced_at?: string }
        setEpics(jiraData.epics ?? [])
        setMyTickets(jiraData.myTickets ?? [])
        setProjectKeys(jiraData.projectKeys ?? [])
        if (jiraData.synced_at) newSyncTimes.jira = jiraData.synced_at
      }

      if (slackRes.ok) {
        const slackData = await slackRes.json() as { messages: SlackMessage[]; synced_at?: string }
        setSlackMessages(slackData.messages ?? [])
        if (slackData.synced_at) newSyncTimes.slack = slackData.synced_at
      }

      if (exportRes.ok) {
        const exportData = await exportRes.json() as { pinnedDecisions: PinnedDecision[] }
        setPinnedDecisions(exportData.pinnedDecisions ?? [])
      }

      if (canvaRes.ok) {
        const canvaData = await canvaRes.json() as { available: boolean; mentions?: CanvaMention[]; synced_at?: string }
        setCanvaMentions(canvaData.mentions ?? [])
        if (canvaData.synced_at) newSyncTimes.canva = canvaData.synced_at
      }

      if (figmaRes.ok) {
        const figmaData = await figmaRes.json() as { available: boolean; mentions?: FigmaMention[]; synced_at?: string }
        setFigmaMentions(figmaData.mentions ?? [])
        if (figmaData.synced_at) newSyncTimes.figma = figmaData.synced_at
      }

      if (calendarRes.ok) {
        const calendarData = await calendarRes.json() as { available: boolean; synced_at?: string }
        if (calendarData.available && calendarData.synced_at) newSyncTimes.calendar = calendarData.synced_at
      }

      setSourceSyncTimes(prev => ({ ...prev, ...newSyncTimes }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAll(false).finally(() => setLoading(false))
  }, [fetchAll])

  // Auto-refresh every 5 minutes (non-busting — uses in-memory TTL for Jira/Slack)
  useEffect(() => {
    const id = setInterval(() => { fetchAll(false) }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchAll])

  // Fetch settings to drive onboarding wizard + sidebar progress badge
  useEffect(() => {
    const forceSetup = searchParams.get('setup') === '1'
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Record<string, { source?: string; connected?: boolean; hasCache?: boolean; botTokenSet?: boolean; accessTokenSet?: boolean; apiTokenSet?: boolean; clientIdSet?: boolean }>) => {
        const cfgMap: Record<string, boolean> = {
          jira:   s.jira?.source !== 'none',
          slack:  s.slack?.source !== 'none',
          figma:  s.figma?.source !== 'none',
          canva:  s.canva?.source !== 'none',
          // Google: count as configured if credentials saved, OAuth token exists, OR local cache present (MCP sync)
          google: s.googleCreds?.source !== 'none' || s.googleCalendar?.connected === true || s.googleCalendar?.hasCache === true,
        }
        const cfgSet = new Set(Object.entries(cfgMap).filter(([, v]) => v).map(([k]) => k))
        setConfiguredIntegrations(cfgSet)
        setConnectedCount(cfgSet.size)
        setGoogleConnected(s.googleCalendar?.connected === true)

        // Configured but no longer authorised → surface a reconnect banner
        const issues: AuthIssue[] = []
        if (s.canva?.clientIdSet && s.canva?.connected !== true) issues.push(AUTH_ISSUE_DEFS.canva)
        if (s.googleCreds?.source !== 'none' && s.googleCalendar?.connected !== true) issues.push(AUTH_ISSUE_DEFS.google)
        if (s.jira?.source !== 'none' && !s.jira?.apiTokenSet) issues.push(AUTH_ISSUE_DEFS.jira)
        if (s.slack?.source !== 'none' && !s.slack?.botTokenSet) issues.push(AUTH_ISSUE_DEFS.slack)
        if (s.figma?.source !== 'none' && !s.figma?.accessTokenSet) issues.push(AUTH_ISSUE_DEFS.figma)
        setAuthIssues(issues)

        // Show wizard if forced via ?setup=1, or if nothing at all is configured
        const nothingConfigured = cfgSet.size === 0
        const dismissed = !forceSetup && localStorage.getItem('onboarding_dismissed') === '1'
        if (forceSetup || (nothingConfigured && !dismissed)) {
          setShowOnboarding(true)
        }
      })
      .catch(() => {
        // If settings fail, just show wizard if ?setup=1
        if (searchParams.get('setup') === '1') setShowOnboarding(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flagAuthIssue(key: string) {
    const def = AUTH_ISSUE_DEFS[key]
    if (!def) return
    setAuthIssues(prev => (prev.some(i => i.key === key) ? prev : [...prev, def]))
    // A fresh failure re-surfaces the banner even if previously dismissed
    setDismissedAuth(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev); next.delete(key); return next
    })
  }

  function clearAuthIssue(key: string) {
    setAuthIssues(prev => (prev.some(i => i.key === key) ? prev.filter(i => i.key !== key) : prev))
  }

  async function checkAuthFailure(key: string, res: Response) {
    if (res.ok) { clearAuthIssue(key); return }
    if (res.status === 401 || res.status === 403) { flagAuthIssue(key); return }
    const body = await res.clone().json().catch(() => null) as { error?: string } | null
    if (body?.error && AUTH_ERROR_RE.test(body.error)) flagAuthIssue(key)
  }

  async function syncSource(key: string) {
    setSyncingSources(prev => new Set([...prev, key]))
    try {
      if (key === 'jira') {
        const res = await fetch('/api/jira?bust=1')
        await checkAuthFailure('jira', res)
        if (res.ok) {
          const d = await res.json() as { epics: JiraEpic[]; myTickets: JiraTicket[]; projectKeys: string[]; synced_at?: string }
          setEpics(d.epics ?? []); setMyTickets(d.myTickets ?? []); setProjectKeys(d.projectKeys ?? [])
          if (d.synced_at) setSourceSyncTimes(prev => ({ ...prev, jira: d.synced_at! }))
        }
      } else if (key === 'canva') {
        const res = await fetch('/api/canva/sync')
        await checkAuthFailure('canva', res)
        if (res.ok) {
          const d = await res.json() as { mentions?: CanvaMention[]; synced_at?: string }
          if (d.mentions) setCanvaMentions(d.mentions)
          // Re-read cache for updated timestamp
          const cacheRes = await fetch('/api/canva')
          if (cacheRes.ok) {
            const cd = await cacheRes.json() as { mentions?: CanvaMention[]; synced_at?: string }
            if (cd.synced_at) setSourceSyncTimes(prev => ({ ...prev, canva: cd.synced_at! }))
          }
        }
      } else if (key === 'figma') {
        const res = await fetch('/api/figma?bust=1')
        await checkAuthFailure('figma', res)
        if (res.ok) {
          const d = await res.json() as { available: boolean; mentions?: FigmaMention[]; synced_at?: string }
          if (d.mentions) setFigmaMentions(d.mentions)
          if (d.synced_at) setSourceSyncTimes(prev => ({ ...prev, figma: d.synced_at! }))
        }
      } else if (key === 'slack') {
        const res = await fetch('/api/slack?bust=1')
        await checkAuthFailure('slack', res)
        if (res.ok) {
          const d = await res.json() as { messages?: SlackMessage[]; synced_at?: string }
          if (d.messages) setSlackMessages(d.messages)
          if (d.synced_at) setSourceSyncTimes(prev => ({ ...prev, slack: d.synced_at! }))
        }
      } else if (key === 'calendar') {
        const res = await fetch('/api/calendar/weekly', { method: 'POST' })
        await checkAuthFailure('google', res)
        if (res.ok) {
          const getRes = await fetch('/api/calendar/weekly')
          if (getRes.ok) {
            const d = await getRes.json() as { available: boolean; synced_at?: string }
            if (d.synced_at) setSourceSyncTimes(prev => ({ ...prev, calendar: d.synced_at! }))
          }
          setCalendarSyncKey(k => k + 1)
        }
      }
    } finally {
      setSyncingSources(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  async function syncAll() {
    // Slack live fetch is unreliable on Enterprise (fires in background, doesn't block)
    syncSource('slack')
    await Promise.all(['jira', 'canva', 'figma'].map(key => syncSource(key)))
  }

  function copyMcpPrompt(key: string) {
    const prompts: Record<string, string> = {
      slack: 'Sync my Slack mentions in Mission Control — use the Slack MCP tool to search for messages mentioning me in the last 14 days and update the cache at data/slack-mentions-cache.json',
      calendar: 'Sync my Google Calendar in Mission Control — use the Google Calendar MCP tool to fetch this week and next week\'s events and update the calendar cache',
    }
    const prompt = prompts[key]
    if (!prompt) return
    navigator.clipboard.writeText(prompt).catch(() => {})
    setCopiedPrompt(key)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  async function refreshPins() {
    const exportRes = await fetch('/api/export')
    if (exportRes.ok) {
      const exportData = await exportRes.json() as { pinnedDecisions: PinnedDecision[] }
      setPinnedDecisions(exportData.pinnedDecisions ?? [])
    }
  }

  function openCreateModal(opts: { tab?: 'template' | 'manual'; sprint?: 'backlog' | 'current' | 'next'; projectKey?: string }) {
    setCreateModalTab(opts.tab ?? 'template')
    setCreateModalSprint(opts.sprint ?? 'current')
    setCreateModalProjectKey(opts.projectKey)
    setCreateModalOpen(true)
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === activeView)

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--pdSurface0)', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside className="PdSidebar">
        <div className="PdSidebar__brand">
          <ProfileAvatar />
          <div>
            <div className="PdSidebar__brandName">Mission Control</div>
            <div className="PdSidebar__brandSub">My workspace</div>
          </div>
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`PdNavItem${activeView === item.id ? ' is-selected' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            {item.icon}
            {item.label}
            {item.count != null && (
              <span className="PdNavItem__count">{item.count}</span>
            )}
          </button>
        ))}

        <div className="PdSidebar__spacer" />

        {/* Setup progress badge */}
        {connectedCount !== null && connectedCount < 5 && (
          <div style={{ padding: '0 8px', marginBottom: 4 }}>
            <button
              onClick={() => setShowOnboarding(true)}
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 10, border: '1px solid var(--pdBorder)',
                background: 'var(--pdSurface1)', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pdTextStrong)' }}>
                  Set up integrations
                </span>
                <span style={{ fontSize: 11, color: 'var(--pdTextMuted)' }}>
                  {connectedCount}/5
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: 'var(--pdBorder)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: connectedCount === 5 ? 'var(--pdStatusDoneDot)' : 'var(--pdAccent06)',
                  width: `${(connectedCount / 5) * 100}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </button>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          {/* Source sync panel */}
          <div style={{
            border: '1px solid var(--pdBorder)',
            borderRadius: 8,
            background: 'var(--pdSurface1)',
            padding: '6px 10px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {/* Sync all button */}
            {(() => {
              const isAnySyncing = ['jira', 'canva', 'figma'].some(k => syncingSources.has(k))
              return (
                <button onClick={syncAll} disabled={isAnySyncing} className="PdSyncAllBtn">
                  <RefreshCw size={11} style={isAnySyncing ? { animation: 'spin 1s linear infinite' } : undefined} />
                  Sync all
                </button>
              )
            })()}
            {([
              { key: 'jira', label: 'Jira', mcp: false },
              { key: 'canva', label: 'Canva', mcp: false },
              { key: 'figma', label: 'Figma', mcp: false },
              { key: 'slack', label: 'Slack', mcp: true },
              { key: 'calendar', label: 'Calendar', mcp: !googleConnected },
            ] as { key: string; label: string; mcp: boolean }[]).map(({ key, label, mcp }) => {
              const ts = sourceSyncTimes[key]
              const ageStr = ts ? (() => {
                const ageMs = Date.now() - new Date(ts).getTime()
                const ageMin = Math.floor(ageMs / 60000)
                const ageHr = Math.floor(ageMin / 60)
                const ageDays = Math.floor(ageHr / 24)
                return ageDays > 0 ? `${ageDays}d ago` : ageHr > 0 ? `${ageHr}h ago` : ageMin < 1 ? 'just now' : `${ageMin}m ago`
              })() : null
              const stale = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) >= 1 : false
              const isSyncing = syncingSources.has(key)
              const isCopied = copiedPrompt === key
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--pdTextMuted)', flex: 1, minWidth: 0 }}>{label}</span>
                  {ageStr && (
                    <span style={{ fontSize: 11, fontWeight: 500, flexShrink: 0, color: stale ? 'var(--pdPrioMedium)' : 'var(--pdTextMuted)' }}>
                      {ageStr}
                    </span>
                  )}
                  {mcp ? (
                    <div
                      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
                      onMouseEnter={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setHoveredTooltip({ key, x: r.right, y: r.top, h: r.height })
                      }}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <button
                        onClick={() => copyMcpPrompt(key)}
                        className={`PdIconBtn${isCopied ? ' PdIconBtn--done' : ''}`}
                        aria-label={`Copy ${label} sync prompt`}
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => syncSource(key)}
                      disabled={isSyncing}
                      className="PdIconBtn"
                      aria-label={`Sync ${label}`}
                    >
                      <RefreshCw size={12} style={isSyncing ? { animation: 'spin 1s linear infinite' } : undefined} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <button
          className={`PdNavItem${activeView === 'settings' ? ' is-selected' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <Settings size={17} />
          Settings
        </button>
      </aside>

      {/* ── Main column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', transition: 'flex 0.2s' }}>

        {/* Topbar */}
        <header className="PdTopbar">
          <div className="PdTopbar__spacer" />

          {error && (
            <span style={{
              fontSize: 12,
              color: 'var(--pdPrioBlocker)',
              background: 'var(--pdStatusTodoBg)',
              border: '1px solid var(--pdBorder)',
              padding: '4px 10px',
              borderRadius: 'var(--pdRadiusPill)',
            }}>
              {error}
            </span>
          )}

          <div className="PdSearch">
            <Search size={14} />
            <input placeholder="Search tickets, epics…" readOnly />
            <span className="Kbd" style={{ fontSize: 11 }}>⌘K</span>
          </div>

          <button
            className="PdThemeToggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            className="PdButton PdButton--primary PdButton--small"
            onClick={() => openCreateModal({ tab: 'template' })}
          >
            <Plus size={13} />
            New ticket
          </button>
        </header>

        {/* Reconnect banners — shown when an integration lost its auth */}
        {authIssues.filter(i => !dismissedAuth.has(i.key)).map(issue => (
          <div key={issue.key} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px',
            background: 'var(--pdStatusTodoBg)', borderBottom: '1px solid var(--pdBorder)',
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--pdPrioMedium)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--pdTextStrong)' }}>{issue.message}</span>
            {issue.action === 'canva-oauth' ? (
              <a className="PdButton PdButton--primary PdButton--small" href="/api/auth/canva">
                Sign in to Canva
              </a>
            ) : (
              <button className="PdButton PdButton--small" onClick={() => setActiveView('settings')}>
                Open Settings
              </button>
            )}
            <button
              onClick={() => setDismissedAuth(prev => new Set([...prev, issue.key]))}
              aria-label="Dismiss"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pdTextMuted)', padding: 4, display: 'flex' }}
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {/* Content area */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div className="EmptyState">
                <div className="EmptyState__icon" style={{ background: 'none', boxShadow: 'none' }}>
                  <picture>
                    <source srcSet="/loopi-loading.webp" type="image/webp" />
                    <img src="/loopi-loading.gif" alt="Loading…" width={96} height={104} style={{ imageRendering: 'pixelated' }} />
                  </picture>
                </div>
                <p className="EmptyState__title">Loading project data…</p>
                <p className="EmptyState__desc">Fetching tickets, epics and comms from Jira and Slack.</p>
              </div>
            </div>
          ) : (
            <div key={activeView} className="PdViewContent" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activeView === 'updates' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '32px 32px' }}>
                  <UpdatesPage
                    epics={epics}
                    myTickets={myTickets}
                    slackMessages={slackMessages}
                    canvaMentions={canvaMentions}
                    figmaMentions={figmaMentions}
                    projectKeys={projectKeys}
                    jiraBaseUrl={jiraBaseUrl}
                    calendarSyncKey={calendarSyncKey}
                  />
                </div>
              )}
              {activeView === 'jira-projects' && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Tab bar */}
                  <div style={{ padding: '16px 32px 0', borderBottom: '1px solid var(--pdBorder)', display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(['projects', 'timeline'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setJiraTab(tab)}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          padding: '6px 14px',
                          borderRadius: '6px 6px 0 0',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: jiraTab === tab ? 'var(--pdSurface1)' : 'transparent',
                          color: jiraTab === tab ? 'var(--pdTextStrong)' : 'var(--pdTextMuted)',
                          borderBottom: jiraTab === tab ? '2px solid var(--pdAccent06)' : '2px solid transparent',
                        }}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  {/* Tab content */}
                  <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
                    {jiraTab === 'projects' && <OverviewTab epics={epics} jiraBaseUrl={jiraBaseUrl} />}
                    {jiraTab === 'timeline' && <TimelineTab epics={epics} />}
                  </div>
                </div>
              )}
              {activeView === 'capacity' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
                  <CapacityView sprintCapacityHours={30} />
                </div>
              )}
              {activeView === 'settings' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
                  <SettingsView urlError={urlError} canvaUrlError={canvaUrlError} />
                </div>
              )}
              {activeView === 'comms' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
                  <CommsTrail
                    jiraEpics={epics}
                    slackMessages={slackMessages}
                    canvaMentions={canvaMentions}
                    figmaMentions={figmaMentions}
                    pinnedDecisions={pinnedDecisions}
                    projectKeys={projectKeys}
                    onPinChange={refreshPins}
                  />
                </div>
              )}
              {activeView === 'tasks' && (
                <MyTasks
                  tickets={myTickets}
                  epics={epics}
                  projectKeys={projectKeys}
                  jiraBaseUrl={jiraBaseUrl}
                  onTicketUpdated={refreshJira}
                  onOpenCreate={openCreateModal}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Onboarding wizard ── */}
      {showOnboarding && (
        <OnboardingWizard
          configured={configuredIntegrations}
          onClose={() => {
            setShowOnboarding(false)
            localStorage.setItem('onboarding_dismissed', '1')
          }}
          onGoToSettings={() => {
            setActiveView('settings')
            setShowOnboarding(false)
            localStorage.setItem('onboarding_dismissed', '1')
          }}
        />
      )}

      {/* ── Create modal ── */}
      <TemplateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        projectKeys={projectKeys}
        epics={epics}
        defaultTab={createModalTab}
        defaultSprint={createModalSprint}
        defaultProjectKey={createModalProjectKey}
        onCreated={(newTickets) => {
          // Optimistically add new tickets to the board immediately
          if (newTickets?.length) {
            setMyTickets(prev => [...newTickets.map(t => ({ ...t, id: t.key })), ...prev])
          }
          // Then background-refresh from Jira to get full canonical data
          refreshJira()
        }}
      />

      {/* ── MCP tooltip — rendered at root to escape sidebar overflow ── */}
      {hoveredTooltip && (
        <div style={{
          position: 'fixed',
          left: hoveredTooltip.x + 10,
          top: hoveredTooltip.y + hoveredTooltip.h / 2,
          transform: 'translateY(-50%)',
          background: 'var(--pdTextStrong)',
          color: 'var(--pdSurface0)',
          fontSize: 11, lineHeight: 1.5, fontWeight: 400,
          padding: '7px 10px', borderRadius: 7,
          width: 200, whiteSpace: 'normal',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}>
          Can only sync via Claude&apos;s MCP tools. Click to copy a prompt to paste into Claude Code.
          <div style={{
            position: 'absolute', top: '50%', left: -5,
            transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '5px solid var(--pdTextStrong)',
          }} />
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
