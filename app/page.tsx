'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
import ChatPanel from '@/components/ChatPanel'
import UpdatesPage from '@/components/UpdatesPage'
import OnboardingWizard from '@/components/OnboardingWizard'
import { useTheme } from '@/components/ThemeProvider'
import ProfileAvatar from '@/components/ProfileAvatar'

type View = 'updates' | 'tasks' | 'jira-projects' | 'capacity' | 'comms' | 'settings'

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; count?: number }[] = [
  {
    id: 'updates',
    label: 'Summary',
    icon: (
      // Sunrise — morning briefing
      <svg viewBox="0 0 18 18" fill="none">
        <path d="M3.5 13a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 2.5v1.8M14.2 4.8l-1.3 1.3M3.8 4.8l1.3 1.3M1.5 10.5h1.8M14.7 10.5h1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      // Checklist with ticks
      <svg viewBox="0 0 18 18" fill="none">
        <path d="M3 4.5l1.2 1.2L6.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 9l1.2 1.2L6.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 13.5l1.2 1.2L6.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 5h6M9 9.5h6M9 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'jira-projects',
    label: 'Jira Projects',
    icon: (
      // Bento grid — project overview
      <svg viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="10" y="2" width="6" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="2" y="11" width="6" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="10" y="8.5" width="6" height="7.5" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    id: 'capacity',
    label: 'Capacity',
    icon: (
      // Speedometer / gauge
      <svg viewBox="0 0 18 18" fill="none">
        <path d="M3.2 13.5a6.5 6.5 0 0 1 11.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 13l3-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="13" r="1.1" fill="currentColor"/>
        <path d="M5.5 11l.8.8M12.5 11l-.8.8M9 6v1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'comms',
    label: 'Mentions',
    icon: (
      // @ symbol
      <svg viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M11.8 9a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0v1.5c0 1 .9 1.5 1.7.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      style={{ width: 16, height: 16, ...(spinning ? { animation: 'spin 1s linear infinite' } : {}) }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" style={{ width: 16, height: 16 }}>
      <path d="M14.5 11A6 6 0 0 1 7 3.5 6 6 0 1 0 14.5 11z" fill="currentColor"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" style={{ width: 16, height: 16 }}>
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
      <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.4 10.4L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" style={{ width: 18, height: 18 }}>
      <path d="M4.5 12.5V8a4.5 4.5 0 0 1 9 0v4.5l1.5 2H3l1.5-2zM7 14.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function CogIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" style={{ width: 18, height: 18 }}>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9 1.5v2M9 14.5v2M16.5 9h-2M3.5 9h-2M14.2 3.8l-1.4 1.4M5.2 12.8l-1.4 1.4M14.2 14.2l-1.4-1.4M5.2 5.2L3.8 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export default function DashboardPage() {
  const { theme, toggle: toggleTheme } = useTheme()
  const searchParams = useSearchParams()
  const [activeView, setActiveView] = useState<View>('updates')
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [calendarSyncKey, setCalendarSyncKey] = useState(0)

  const [epics, setEpics] = useState<JiraEpic[]>([])
  const [myTickets, setMyTickets] = useState<JiraTicket[]>([])
  const [projectKeys, setProjectKeys] = useState<string[]>([])
  const [slackMessages, setSlackMessages] = useState<SlackMessage[]>([])
  const [pinnedDecisions, setPinnedDecisions] = useState<PinnedDecision[]>([])
  const [canvaMentions, setCanvaMentions] = useState<CanvaMention[]>([])
  const [figmaMentions, setFigmaMentions] = useState<FigmaMention[]>([])
  const [chatOpen, setChatOpen] = useState(false)
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

  // OAuth callback errors — keyed by provider to show in the right card
  const urlError = searchParams.get('error')
  const canvaUrlError = searchParams.get('canva_error')

  // Sync activeView with ?view= param (used by OAuth callback redirect)
  useEffect(() => {
    const v = searchParams.get('view')
    if (v === 'settings') setActiveView('settings')
  }, [searchParams])

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
      const [jiraRes, slackRes, exportRes, canvaRes, figmaRes] = await Promise.all([
        fetch(`/api/jira${qs}`),
        fetch(`/api/slack${qs}`),
        fetch('/api/export'),
        fetch('/api/canva'),
        fetch(`/api/figma${qs}`),
      ])

      if (jiraRes.ok) {
        const jiraData = await jiraRes.json() as { epics: JiraEpic[]; myTickets: JiraTicket[]; projectKeys: string[] }
        setEpics(jiraData.epics ?? [])
        setMyTickets(jiraData.myTickets ?? [])
        setProjectKeys(jiraData.projectKeys ?? [])
      }

      if (slackRes.ok) {
        const slackData = await slackRes.json() as { messages: SlackMessage[] }
        setSlackMessages(slackData.messages ?? [])
      }

      if (exportRes.ok) {
        const exportData = await exportRes.json() as { pinnedDecisions: PinnedDecision[] }
        setPinnedDecisions(exportData.pinnedDecisions ?? [])
      }

      if (canvaRes.ok) {
        const canvaData = await canvaRes.json() as { available: boolean; mentions?: CanvaMention[] }
        setCanvaMentions(canvaData.mentions ?? [])
      }

      if (figmaRes.ok) {
        const figmaData = await figmaRes.json() as { available: boolean; mentions?: FigmaMention[] }
        setFigmaMentions(figmaData.mentions ?? [])
      }

      setLastSyncedAt(new Date())
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
      .then((s: Record<string, { source?: string; connected?: boolean; botTokenSet?: boolean; accessTokenSet?: boolean }>) => {
        const cfgMap: Record<string, boolean> = {
          jira:   s.jira?.source !== 'none',
          slack:  s.slack?.source !== 'none',
          figma:  s.figma?.source !== 'none',
          canva:  s.canva?.source !== 'none',
          // Google: count as configured if credentials are saved OR if the calendar OAuth token already exists
          google: s.googleCreds?.source !== 'none' || s.googleCalendar?.connected === true,
        }
        const cfgSet = new Set(Object.entries(cfgMap).filter(([, v]) => v).map(([k]) => k))
        setConfiguredIntegrations(cfgSet)
        setConnectedCount(cfgSet.size)

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

  async function handleSync() {
    setSyncing(true)
    try {
      // Kick off all syncs in parallel — each is best-effort
      const [, calRes, canvaSyncRes] = await Promise.allSettled([
        fetchAll(true),
        fetch('/api/calendar/weekly', { method: 'POST' }),
        fetch('/api/canva/sync'),            // live Canva API fetch (no-op if not connected)
      ])

      if (calRes.status === 'fulfilled' && calRes.value.ok) {
        setCalendarSyncKey(k => k + 1)
      }

      // If Canva returned fresh mentions, update state directly
      if (canvaSyncRes.status === 'fulfilled' && canvaSyncRes.value.ok) {
        try {
          const canvaData = await canvaSyncRes.value.json() as { mentions?: CanvaMention[] }
          if (canvaData.mentions) setCanvaMentions(canvaData.mentions)
        } catch { /* ignore parse errors */ }
      }
    } finally {
      setSyncing(false)
    }
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
  const topbarTitle = activeView === 'settings' ? 'Settings' : activeView === 'updates' ? 'Mission Control' : activeView === 'jira-projects' ? 'Jira Projects' : activeView === 'comms' ? 'Mentions' : (activeNav?.label ?? 'Mission Control')

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
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pdTextPrimary)' }}>
                  Set up integrations
                </span>
                <span style={{ fontSize: 11, color: 'var(--pdTextMuted)' }}>
                  {connectedCount}/5
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: 'var(--pdBorder)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: connectedCount === 5 ? '#16a34a' : 'var(--pdAccent)',
                  width: `${(connectedCount / 5) * 100}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </button>
          </div>
        )}

        <div style={{ padding: '0 8px' }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--pdBorder)',
              background: 'var(--pdSurface1)',
              cursor: syncing ? 'default' : 'pointer',
              opacity: syncing ? 0.7 : 1,
              gap: 6,
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--pdTextPrimary)' }}>
              <SyncIcon spinning={syncing} />
              {syncing ? 'Syncing…' : 'Sync now'}
            </span>
            {lastSyncedAt && !syncing && (
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: 'var(--pdTextMuted)',
                background: 'var(--pdSurface0)',
                border: '1px solid var(--pdBorder)',
                borderRadius: 100,
                padding: '2px 7px',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
              }}>
                {(() => {
                  const mins = Math.round((Date.now() - lastSyncedAt.getTime()) / 60000)
                  return mins < 1 ? 'just now' : `${mins}m ago`
                })()}
              </span>
            )}
          </button>
        </div>
        <button
          className={`PdNavItem${activeView === 'settings' ? ' is-selected' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <CogIcon />
          Settings
        </button>
      </aside>

      {/* ── Main column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', transition: 'flex 0.2s' }}>

        {/* Topbar */}
        <header className="PdTopbar">
          <div className="PdTopbar__title">
            <span>{topbarTitle}</span>
          </div>
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
            <SearchIcon />
            <input placeholder="Search tickets, epics…" readOnly />
            <span className="Kbd" style={{ fontSize: 11 }}>⌘K</span>
          </div>

          <button
            className="PdThemeToggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            className="PdButton PdButton--primary PdButton--small"
            onClick={() => openCreateModal({ tab: 'template' })}
          >
            <PlusIcon />
            New ticket
          </button>
        </header>

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
            <>
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
                          color: jiraTab === tab ? 'var(--pdTextPrimary)' : 'var(--pdTextMuted)',
                          borderBottom: jiraTab === tab ? '2px solid var(--pdAccent)' : '2px solid transparent',
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
            </>
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

      {/* ── Chat panel ── */}
      {chatOpen && (
        <ChatPanel
          onClose={() => setChatOpen(false)}
          slackMessages={slackMessages}
          canvaMentions={canvaMentions}
          figmaMentions={figmaMentions}
          jiraEpics={epics}
          myTickets={myTickets}
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
        onCreated={refreshJira}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
