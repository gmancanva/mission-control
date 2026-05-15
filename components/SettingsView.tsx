'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeProvider'
import type { ColorMode, Accent, Font } from './ThemeProvider'

// ── Env tooltip ───────────────────────────────────────────────────────────────

function EnvTooltip() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--pdTextMuted)', flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="5" r=".8" fill="currentColor" />
        </svg>
      </div>
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--pdSurface0)',
          border: '1px solid var(--pdBorder)',
          borderRadius: 8,
          padding: '8px 10px',
          width: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          <p style={{ fontSize: 12, color: 'var(--pdTextPrimary)', margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--pdTextStrong)' }}>Loaded from .env.local</strong>
          </p>
          <p style={{ fontSize: 11, color: 'var(--pdTextMuted)', margin: '4px 0 0', lineHeight: 1.5 }}>
            This credential was set in your <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--pdSurface1)', padding: '1px 4px', borderRadius: 3 }}>.env.local</code> file. To change it, edit that file and restart the server.
          </p>
          {/* Arrow */}
          <div style={{
            position: 'absolute', bottom: -5, left: '50%',
            width: 8, height: 8,
            background: 'var(--pdSurface0)',
            border: '1px solid var(--pdBorder)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" style={{ width: 14, height: 14 }}>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 9l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}>
      <path d="M6 10l4-4M8.5 4.5l1.5-1.5a2.828 2.828 0 1 1 4 4L12.5 8.5M7.5 11.5l-1.5 1.5a2.828 2.828 0 1 1-4-4L3.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SlackIcon() {
  return (
    <svg width={24} height={24} viewBox="73 73 124 124">
      <path fill="#E01E5A" d="M99.4,151.2c0,7.1-5.8,12.9-12.9,12.9c-7.1,0-12.9-5.8-12.9-12.9c0-7.1,5.8-12.9,12.9-12.9h12.9V151.2z" />
      <path fill="#E01E5A" d="M105.9,151.2c0-7.1,5.8-12.9,12.9-12.9s12.9,5.8,12.9,12.9v32.3c0,7.1-5.8,12.9-12.9,12.9s-12.9-5.8-12.9-12.9V151.2z" />
      <path fill="#36C5F0" d="M118.8,99.4c-7.1,0-12.9-5.8-12.9-12.9c0-7.1,5.8-12.9,12.9-12.9s12.9,5.8,12.9,12.9v12.9H118.8z" />
      <path fill="#36C5F0" d="M118.8,105.9c7.1,0,12.9,5.8,12.9,12.9s-5.8,12.9-12.9,12.9H86.5c-7.1,0-12.9-5.8-12.9-12.9s5.8-12.9,12.9-12.9H118.8z" />
      <path fill="#2EB67D" d="M170.6,118.8c0-7.1,5.8-12.9,12.9-12.9c7.1,0,12.9,5.8,12.9,12.9s-5.8,12.9-12.9,12.9h-12.9V118.8z" />
      <path fill="#2EB67D" d="M164.1,118.8c0,7.1-5.8,12.9-12.9,12.9c-7.1,0-12.9-5.8-12.9-12.9V86.5c0-7.1,5.8-12.9,12.9-12.9c7.1,0,12.9,5.8,12.9,12.9V118.8z" />
      <path fill="#ECB22E" d="M151.2,170.6c7.1,0,12.9,5.8,12.9,12.9c0,7.1-5.8,12.9-12.9,12.9c-7.1,0-12.9-5.8-12.9-12.9v-12.9H151.2z" />
      <path fill="#ECB22E" d="M151.2,164.1c-7.1,0-12.9-5.8-12.9-12.9c0-7.1,5.8-12.9,12.9-12.9h32.3c7.1,0,12.9,5.8,12.9,12.9c0,7.1-5.8,12.9-12.9,12.9H151.2z" />
    </svg>
  )
}

function FigmaIcon() {
  return (
    <svg width={14} height={22} viewBox="0 0 400 600">
      <path d="M0 500C0 444.772 44.772 400 100 400H200V500C200 555.228 155.228 600 100 600C44.772 600 0 555.228 0 500Z" fill="#24CB71" />
      <path d="M200 0V200H300C355.228 200 400 155.228 400 100C400 44.772 355.228 0 300 0H200Z" fill="#FF7237" />
      <path d="M299.167 400C354.395 400 399.167 355.228 399.167 300C399.167 244.772 354.395 200 299.167 200C243.939 200 199.167 244.772 199.167 300C199.167 355.228 243.939 400 299.167 400Z" fill="#00B6FF" />
      <path d="M0 100C0 155.228 44.772 200 100 200H200V0H100C44.772 0 0 44.772 0 100Z" fill="#FF3737" />
      <path d="M0 300C0 355.228 44.772 400 100 400H200V200H100C44.772 200 0 244.772 0 300Z" fill="#874FFF" />
    </svg>
  )
}

function JiraIcon() {
  return (
    <svg width={24} height={24} viewBox="0 -30.632 255.324 285.957">
      <defs>
        <linearGradient id="sv-jira-b" x1="98.031%" x2="58.888%" y1=".161%" y2="40.766%">
          <stop offset=".18" stopColor="#0052cc" />
          <stop offset="1" stopColor="#2684ff" />
        </linearGradient>
        <linearGradient id="sv-jira-c" x1="100.665%" x2="55.402%" y1=".455%" y2="44.727%">
          <stop offset=".18" stopColor="#0052cc" />
          <stop offset="1" stopColor="#2684ff" />
        </linearGradient>
      </defs>
      <path d="M244.658 0H121.707a55.502 55.502 0 0 0 55.502 55.502h22.649V77.37c.02 30.625 24.841 55.447 55.466 55.467V10.666C255.324 4.777 250.55 0 244.658 0z" fill="#2684ff" />
      <path d="M183.822 61.262H60.872c.019 30.625 24.84 55.447 55.466 55.467h22.649v21.938c.039 30.625 24.877 55.43 55.502 55.43V71.93c0-5.891-4.776-10.667-10.667-10.667z" fill="url(#sv-jira-b)" />
      <path d="M122.951 122.489H0c0 30.653 24.85 55.502 55.502 55.502h22.72v21.867c.02 30.597 24.798 55.408 55.396 55.466V133.156c0-5.891-4.776-10.667-10.667-10.667z" fill="url(#sv-jira-c)" />
    </svg>
  )
}

function GoogleCalIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 512 512">
      <defs>
        <clipPath id="sv-gcal-clip">
          <rect width="512" height="512" fill="white" />
        </clipPath>
      </defs>
      <g clipPath="url(#sv-gcal-clip)">
        <path d="M390.736 121.264H121.264V390.736H390.736V121.264Z" fill="white" />
        <path d="M390.736 512L512 390.736L451.368 380.392L390.736 390.736L379.67 446.196L390.736 512Z" fill="#EA4335" />
        <path d="M0 390.736V471.578C0 493.912 18.088 512 40.42 512H121.264L133.714 451.368L121.264 390.736L55.198 380.392L0 390.736Z" fill="#188038" />
        <path d="M512 121.264V40.42C512 18.088 493.912 0 471.58 0H390.736C383.36 30.072 379.671 52.2027 379.67 66.392C379.67 80.58 383.359 98.8707 390.736 121.264C417.556 128.944 437.767 132.784 451.368 132.784C464.969 132.784 485.18 128.945 512 121.264Z" fill="#1967D2" />
        <path d="M512 121.264H390.736V390.736H512V121.264Z" fill="#FBBC04" />
        <path d="M390.736 390.736H121.264V512H390.736V390.736Z" fill="#34A853" />
        <path d="M390.736 0H40.422C18.088 0 0 18.088 0 40.42V390.736H121.264V121.264H390.736V0Z" fill="#4285F4" />
        <path d="M176.54 330.308C166.468 323.504 159.494 313.568 155.688 300.428L179.066 290.796C181.186 298.88 184.891 305.145 190.182 309.592C195.436 314.038 201.836 316.228 209.314 316.228C216.959 316.228 223.527 313.903 229.018 309.254C234.51 304.606 237.272 298.678 237.272 291.504C237.272 284.16 234.375 278.164 228.582 273.516C222.788 268.868 215.512 266.544 206.822 266.544H193.314V243.404H205.44C212.917 243.404 219.216 241.382 224.336 237.338C229.456 233.298 232.016 227.772 232.016 220.732C232.016 214.468 229.726 209.482 225.146 205.744C220.566 202.004 214.77 200.118 207.73 200.118C200.858 200.118 195.402 201.938 191.36 205.608C187.319 209.289 184.282 213.937 182.534 219.116L159.394 209.482C162.458 200.792 168.084 193.112 176.336 186.476C184.588 179.84 195.132 176.506 207.932 176.506C217.398 176.506 225.92 178.326 233.466 181.996C241.01 185.668 246.938 190.754 251.216 197.222C255.496 203.722 257.616 210.998 257.616 219.082C257.616 227.334 255.63 234.308 251.656 240.034C247.682 245.76 242.796 250.138 237.002 253.204V254.584C244.483 257.669 250.982 262.735 255.798 269.238C260.682 275.806 263.142 283.654 263.142 292.818C263.142 301.978 260.816 310.164 256.168 317.338C251.52 324.514 245.088 330.172 236.934 334.282C228.75 338.392 219.554 340.482 209.348 340.482C197.524 340.514 186.612 337.112 176.54 330.308ZM320.132 214.298L294.466 232.858L281.632 213.39L327.678 180.176H345.328V336.842H320.132V214.298Z" fill="#4285F4" />
      </g>
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsData = {
  jira: {
    baseUrl: string
    email: string
    apiTokenSet: boolean
    projectKeys: string
    source: 'db' | 'env' | 'none'
  }
  googleCreds: {
    clientIdSet: boolean
    clientSecretSet: boolean
    source: 'db' | 'env' | 'none'
  }
  googleCalendar: {
    connected: boolean
    email: string | null
    syncedAt: string | null
  }
  slack: {
    botTokenSet: boolean
    channelIds: string
    myUserId: string
    source: 'db' | 'env' | 'none'
  }
  figma: {
    accessTokenSet: boolean
    teamIds: string
    myHandle: string
    source: 'db' | 'env' | 'none'
  }
  canva: {
    clientIdSet: boolean
    clientSecretSet: boolean
    connected: boolean
    myUserId: string
    source: 'db' | 'env' | 'none'
  }
}

type Props = {
  urlError?: string | null
  canvaUrlError?: string | null
}

// ── Shared form field ─────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--pdTextSubtle)', letterSpacing: '0.03em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '7px 10px',
          background: 'var(--pdSurface0)',
          border: '1px solid var(--pdBorder)',
          borderRadius: 6,
          fontSize: 13,
          color: 'var(--pdTextBase)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--pdAccent06)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--pdBorder)' }}
      />
      {hint && <p style={{ fontSize: 11, color: 'var(--pdTextSubtle)', margin: 0 }}>{hint}</p>}
    </div>
  )
}

// ── Connection card shell ─────────────────────────────────────────────────────

function ConnectionCard({
  icon, name, description, iconBg, iconColor, status, onEdit, children,
}: {
  icon: React.ReactNode
  name: string
  description: string
  iconBg: string
  iconColor: string
  status?: React.ReactNode
  onEdit?: () => void
  children?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--pdSurface1)',
      border: '1px solid var(--pdBorder)',
      borderRadius: 'var(--pdRadiusLg)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--pdTextStrong)' }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--pdTextMuted)', marginTop: 2 }}>{description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {status}
          {onEdit && (
            <button
              className="PdButton PdButton--tertiary PdButton--small"
              onClick={onEdit}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <EditIcon /> Edit
            </button>
          )}
        </div>
      </div>
      {children && (
        <div style={{ borderTop: '1px solid var(--pdBorder)', padding: '16px 20px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ConnectedBadge() {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600,
      color: 'var(--pdStatusDoneFg)',
      background: 'var(--pdStatusDoneBg)',
      border: '1px solid var(--pdStatusDoneBorder)',
      padding: '3px 10px', borderRadius: 'var(--pdRadiusPill)',
    }}>
      <CheckIcon /> Connected
    </span>
  )
}

// ── Jira card ─────────────────────────────────────────────────────────────────

function JiraCard({ data, onSaved }: { data: SettingsData['jira']; onSaved: () => void }) {
  const isConfigured = data.source !== 'none'
  const [editing, setEditing] = useState(!isConfigured)
  const [form, setForm] = useState({
    baseUrl: data.baseUrl,
    email: data.email,
    apiToken: '',
    projectKeys: data.projectKeys,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!form.baseUrl || !form.email) { setError('Jira URL and email are required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'jira', ...form }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Save failed')
      }
      onSaved()
      setEditing(false)
      setForm(f => ({ ...f, apiToken: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const sourceLabel = data.source === 'env' ? 'via .env' : data.source === 'db' ? 'via settings' : null

  return (
    <ConnectionCard
      icon={<JiraIcon />}
      name="Jira"
      description={isConfigured && !editing
        ? (data.baseUrl.replace('https://', '') + (data.email ? ` · ${data.email}` : ''))
        : 'Connect your Atlassian Jira workspace to sync epics, tickets and sprints'}
      iconBg="#E8F0FE"
      iconColor="#0052CC"
      status={isConfigured && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ConnectedBadge />
          {sourceLabel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--pdTextSubtle)' }}>
              {sourceLabel}
              {data.source === 'env' && <EnvTooltip />}
            </span>
          )}
        </div>
      ) : undefined}
      onEdit={isConfigured && !editing ? () => setEditing(true) : undefined}
    >
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '10px 12px',
            background: 'var(--pdSurface2)',
            borderRadius: 6, fontSize: 12, color: 'var(--pdTextMuted)', lineHeight: 1.6,
          }}>
            Find your Jira URL at <strong style={{ color: 'var(--pdTextBase)' }}>yourorg.atlassian.net</strong>. Generate an API token at{' '}
            <strong style={{ color: 'var(--pdTextBase)' }}>id.atlassian.com → Security → API tokens</strong>. Project keys are the short codes shown before ticket numbers (e.g. <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>DESIGN-123</code> → key is <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>DESIGN</code>).
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="Jira URL"
              value={form.baseUrl}
              onChange={v => setForm(f => ({ ...f, baseUrl: v }))}
              placeholder="https://yourorg.atlassian.net"
              hint="Your Atlassian Cloud URL"
            />
            <Field
              label="Email"
              value={form.email}
              onChange={v => setForm(f => ({ ...f, email: v }))}
              type="email"
              placeholder="you@yourorg.com"
              hint="The email for your Jira account"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="API Token"
              value={form.apiToken}
              onChange={v => setForm(f => ({ ...f, apiToken: v }))}
              type="password"
              placeholder={data.apiTokenSet ? '••••••••  (leave blank to keep current)' : 'Paste your API token'}
              hint="Generate at id.atlassian.com → Security → API tokens"
            />
            <Field
              label="Project Keys"
              value={form.projectKeys}
              onChange={v => setForm(f => ({ ...f, projectKeys: v }))}
              placeholder="DESIGN,PLATFORM"
              hint="Comma-separated — the prefix before ticket numbers"
            />
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {isConfigured && (
              <button className="PdButton PdButton--tertiary PdButton--small" onClick={() => { setEditing(false); setError(null) }}>
                Cancel
              </button>
            )}
            <button
              className="PdButton PdButton--primary PdButton--small"
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save connection'}
            </button>
          </div>
        </div>
      )}
    </ConnectionCard>
  )
}

// ── Google Calendar card ──────────────────────────────────────────────────────

function GoogleCalendarCard({
  creds, calendar, onSaved, onDisconnect, urlError,
}: {
  creds: SettingsData['googleCreds']
  calendar: SettingsData['googleCalendar']
  onSaved: () => void
  onDisconnect: () => void
  urlError?: string | null
}) {
  const credsConfigured = creds.source !== 'none'
  const [editingCreds, setEditingCreds] = useState(!credsConfigured && !calendar.connected)
  const [form, setForm] = useState({ clientId: '', clientSecret: '' })
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSaveCreds() {
    if (!form.clientId && !creds.clientIdSet) { setError('Client ID is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'google', ...form }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      setEditingCreds(false)
      setForm({ clientId: '', clientSecret: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' })
      onDisconnect()
    } finally {
      setDisconnecting(false)
    }
  }

  const syncLabel = calendar.syncedAt
    ? `Synced ${new Date(calendar.syncedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
    : null
  const description = calendar.connected
    ? calendar.email
      ? `Connected as ${calendar.email}${syncLabel ? ` · ${syncLabel}` : ''}`
      : syncLabel ?? 'Calendar data synced'
    : credsConfigured && !editingCreds
    ? 'Credentials saved — authorise calendar access below'
    : 'Powers live sprint capacity based on your actual meetings'

  const status = calendar.connected ? <ConnectedBadge /> : undefined

  const showEdit = calendar.connected
    ? () => setEditingCreds(true)
    : credsConfigured && !editingCreds
    ? () => setEditingCreds(true)
    : undefined

  const hasChildren = editingCreds || (!editingCreds && credsConfigured && !calendar.connected) || urlError

  return (
    <ConnectionCard
      icon={<GoogleCalIcon />}
      name="Google Calendar"
      description={description}
      iconBg="#F0F4FF"
      iconColor="#1A73E8"
      status={status}
      onEdit={showEdit}
    >
      {hasChildren && (
        <>
          {/* OAuth error from callback */}
          {urlError && (
            <div style={{
              marginBottom: 12, padding: '8px 12px',
              background: 'var(--pdStatusReviewBg)', border: '1px solid var(--pdStatusReviewBorder)',
              borderRadius: 6, fontSize: 12, color: 'var(--pdStatusReviewFg)',
            }}>
              {(() => { try { return decodeURIComponent(urlError) } catch { return urlError } })()}
            </div>
          )}

          {/* Credentials form */}
          {editingCreds && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '10px 12px',
                background: 'var(--pdSurface2)',
                borderRadius: 6, fontSize: 12, color: 'var(--pdTextMuted)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--pdTextBase)' }}>Setup steps:</strong>
                <ol style={{ margin: '6px 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <li>Go to <strong style={{ color: 'var(--pdTextBase)' }}>console.cloud.google.com</strong> → APIs &amp; Services → Credentials</li>
                  <li>Create an <strong style={{ color: 'var(--pdTextBase)' }}>OAuth 2.0 Client ID</strong> (type: Web application)</li>
                  <li>Add authorised redirect URI: <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>http://127.0.0.1:3000/api/auth/google/callback</code></li>
                  <li>Enable the <strong style={{ color: 'var(--pdTextBase)' }}>Google Calendar API</strong> in APIs &amp; Services → Library</li>
                </ol>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field
                  label="Client ID"
                  value={form.clientId}
                  onChange={v => setForm(f => ({ ...f, clientId: v }))}
                  placeholder={creds.clientIdSet ? '••••••••  (leave blank to keep)' : 'Paste Client ID'}
                  hint="Ends in .apps.googleusercontent.com"
                />
                <Field
                  label="Client Secret"
                  value={form.clientSecret}
                  onChange={v => setForm(f => ({ ...f, clientSecret: v }))}
                  type="password"
                  placeholder={creds.clientSecretSet ? '••••••••  (leave blank to keep)' : 'Paste Client Secret'}
                  hint="Found next to the Client ID in GCP console"
                />
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="PdButton PdButton--tertiary PdButton--small" onClick={() => { setEditingCreds(false); setError(null) }}>
                  Cancel
                </button>
                <button
                  className="PdButton PdButton--primary PdButton--small"
                  onClick={handleSaveCreds}
                  disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save credentials'}
                </button>
                {calendar.connected && (
                  <button
                    className="PdButton PdButton--tertiary PdButton--small"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    style={{ opacity: disconnecting ? 0.5 : 1, color: 'var(--pdPrioHigh)' }}
                  >
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* OAuth connect row — creds saved, not yet OAuth'd */}
          {!editingCreds && credsConfigured && !calendar.connected && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--pdTextMuted)', margin: 0 }}>
                Click to authorise <strong>read-only</strong> access to your primary Google Calendar — used to show meeting load and calculate sprint capacity. You&apos;ll be redirected to Google and back.
              </p>
              <a
                href="/api/auth/google"
                className="PdButton PdButton--primary PdButton--small"
                style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0, marginLeft: 16 }}
              >
                <LinkIcon /> Connect Google Calendar
              </a>
            </div>
          )}
        </>
      )}
    </ConnectionCard>
  )
}

// ── Slack card ────────────────────────────────────────────────────────────────

function SlackCard({ data, onSaved }: { data: SettingsData['slack']; onSaved: () => void }) {
  const isConfigured = data.source !== 'none'
  const [editing, setEditing] = useState(!isConfigured)
  const [form, setForm] = useState({
    botToken: '',
    channelIds: data.channelIds,
    myUserId: data.myUserId,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'slack', ...form }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      setEditing(false)
      setForm(f => ({ ...f, botToken: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/settings/test-slack', { method: 'POST' })
      const json = await res.json() as { ok: boolean; workspace?: string; bot?: string; error?: string }
      if (json.ok) {
        setTestResult(`Connected to ${json.workspace ?? 'workspace'} as ${json.bot ?? 'bot'}`)
      } else {
        setTestResult(`Failed: ${json.error ?? 'unknown error'}`)
      }
    } catch {
      setTestResult('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const sourceLabel = data.source === 'env' ? 'via .env' : data.source === 'db' ? 'via settings' : null

  return (
    <ConnectionCard
      icon={<SlackIcon />}
      name="Slack"
      description={isConfigured && !editing ? `Bot token configured${data.channelIds ? ` · ${data.channelIds.split(',').length} channel(s)` : ''}` : 'Connect Slack to surface messages and thread context'}
      iconBg="#F9F0FF"
      iconColor="#4A154B"
      status={isConfigured && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ConnectedBadge />
          {sourceLabel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--pdTextSubtle)' }}>
              {sourceLabel}
              {data.source === 'env' && <EnvTooltip />}
            </span>
          )}
        </div>
      ) : undefined}
      onEdit={isConfigured && !editing ? () => setEditing(true) : undefined}
    >
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '10px 12px', background: 'var(--pdSurface2)', borderRadius: 6, fontSize: 12, color: 'var(--pdTextMuted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--pdTextBase)' }}>Setup steps:</strong>
            <ol style={{ margin: '6px 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <li>Go to <strong style={{ color: 'var(--pdTextBase)' }}>api.slack.com/apps</strong> → Create New App → From scratch</li>
              <li>Under <strong style={{ color: 'var(--pdTextBase)' }}>OAuth &amp; Permissions</strong>, add bot scopes: <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>channels:history, users:read, emoji:list, reactions:read, chat:write</code></li>
              <li>Click <strong style={{ color: 'var(--pdTextBase)' }}>Install to Workspace</strong> and copy the <strong style={{ color: 'var(--pdTextBase)' }}>Bot User OAuth Token</strong> (starts with <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>xoxb-</code>)</li>
              <li>Invite the bot to your channels with <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>/invite @your-bot</code></li>
            </ol>
          </div>
          <div style={{ position: 'relative' }}>
            <Field
              label="Bot Token"
              value={form.botToken}
              onChange={v => setForm(f => ({ ...f, botToken: v }))}
              type={showToken ? 'text' : 'password'}
              placeholder={data.botTokenSet ? '••••••••  (leave blank to keep)' : 'xoxb-...'}
              hint="Starts with xoxb- — found in OAuth & Permissions after installing"
            />
            <button
              type="button"
              onClick={() => setShowToken(s => !s)}
              style={{ position: 'absolute', right: 8, top: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pdTextSubtle)', fontSize: 11 }}
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="Channel IDs"
              value={form.channelIds}
              onChange={v => setForm(f => ({ ...f, channelIds: v }))}
              placeholder="C0ABC123,C0DEF456"
              hint="Right-click a channel in Slack → View channel details → scroll to bottom for the ID"
            />
            <Field
              label="My User ID"
              value={form.myUserId}
              onChange={v => setForm(f => ({ ...f, myUserId: v }))}
              placeholder="U01ABCDEF"
              hint="Your Slack user ID — click your name → profile → ⋯ → Copy member ID"
            />
          </div>
          {testResult && (
            <p style={{ fontSize: 12, color: testResult.startsWith('Failed') ? 'var(--pdPrioHigh)' : 'var(--pdStatusDoneFg)', margin: 0 }}>
              {testResult}
            </p>
          )}
          {error && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {data.botTokenSet && (
              <button
                className="PdButton PdButton--tertiary PdButton--small"
                onClick={handleTest}
                disabled={testing}
                style={{ opacity: testing ? 0.6 : 1 }}
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
            )}
            {isConfigured && (
              <button className="PdButton PdButton--tertiary PdButton--small" onClick={() => { setEditing(false); setError(null); setTestResult(null) }}>
                Cancel
              </button>
            )}
            <button
              className="PdButton PdButton--primary PdButton--small"
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save connection'}
            </button>
          </div>
        </div>
      )}
    </ConnectionCard>
  )
}

// ── Figma card ─────────────────────────────────────────────────────────────────

function FigmaCard({ data, onSaved }: { data: SettingsData['figma']; onSaved: () => void }) {
  const isConfigured = data.source !== 'none'
  const [editing, setEditing] = useState(!isConfigured)
  const [form, setForm] = useState({
    accessToken: '',
    teamIds: data.teamIds,
    myHandle: data.myHandle,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'figma', ...form }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      setEditing(false)
      setForm(f => ({ ...f, accessToken: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/settings/test-figma', { method: 'POST' })
      const json = await res.json() as { ok: boolean; name?: string; error?: string }
      if (json.ok) {
        setTestResult(`Connected as ${json.name ?? 'user'}`)
      } else {
        setTestResult(`Failed: ${json.error ?? 'unknown error'}`)
      }
    } catch {
      setTestResult('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const sourceLabel = data.source === 'env' ? 'via .env' : data.source === 'db' ? 'via settings' : null

  return (
    <ConnectionCard
      icon={<FigmaIcon />}
      name="Figma"
      description={isConfigured && !editing ? `Token configured${data.teamIds ? ` · ${data.teamIds.split(',').length} team(s)` : ''}` : 'Connect Figma to surface design file comments'}
      iconBg="#F5F5F5"
      iconColor="#000"
      status={isConfigured && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ConnectedBadge />
          {sourceLabel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--pdTextSubtle)' }}>
              {sourceLabel}
              {data.source === 'env' && <EnvTooltip />}
            </span>
          )}
        </div>
      ) : undefined}
      onEdit={isConfigured && !editing ? () => setEditing(true) : undefined}
    >
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '10px 12px', background: 'var(--pdSurface2)', borderRadius: 6, fontSize: 12, color: 'var(--pdTextMuted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--pdTextBase)' }}>Setup steps:</strong>
            <ol style={{ margin: '6px 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <li>Go to <strong style={{ color: 'var(--pdTextBase)' }}>figma.com</strong> → click your avatar → Settings → Security</li>
              <li>Under <strong style={{ color: 'var(--pdTextBase)' }}>Personal access tokens</strong>, click Generate new token</li>
              <li>To find Team IDs: open a team in Figma and copy the number from the URL — <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>figma.com/files/team/<strong>123456789</strong>/...</code></li>
            </ol>
          </div>
          <div style={{ position: 'relative' }}>
            <Field
              label="Personal Access Token"
              value={form.accessToken}
              onChange={v => setForm(f => ({ ...f, accessToken: v }))}
              type={showToken ? 'text' : 'password'}
              placeholder={data.accessTokenSet ? '••••••••  (leave blank to keep)' : 'figd_...'}
              hint="Starts with figd_ — generated in Figma Settings → Security"
            />
            <button
              type="button"
              onClick={() => setShowToken(s => !s)}
              style={{ position: 'absolute', right: 8, top: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pdTextSubtle)', fontSize: 11 }}
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="Team IDs"
              value={form.teamIds}
              onChange={v => setForm(f => ({ ...f, teamIds: v }))}
              placeholder="123456789,987654321"
              hint="Comma-separated — find in your team URL on figma.com"
            />
            <Field
              label="My Handle / Name"
              value={form.myHandle}
              onChange={v => setForm(f => ({ ...f, myHandle: v }))}
              placeholder="e.g. Jane Smith"
              hint="Your display name in Figma — used to detect mentions"
            />
          </div>
          {testResult && (
            <p style={{ fontSize: 12, color: testResult.startsWith('Failed') ? 'var(--pdPrioHigh)' : 'var(--pdStatusDoneFg)', margin: 0 }}>
              {testResult}
            </p>
          )}
          {error && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {data.accessTokenSet && (
              <button
                className="PdButton PdButton--tertiary PdButton--small"
                onClick={handleTest}
                disabled={testing}
                style={{ opacity: testing ? 0.6 : 1 }}
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
            )}
            {isConfigured && (
              <button className="PdButton PdButton--tertiary PdButton--small" onClick={() => { setEditing(false); setError(null); setTestResult(null) }}>
                Cancel
              </button>
            )}
            <button
              className="PdButton PdButton--primary PdButton--small"
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save connection'}
            </button>
          </div>
        </div>
      )}
    </ConnectionCard>
  )
}

// ── Canva card ────────────────────────────────────────────────────────────────

function CanvaWordmark() {
  // Real Canva wordmark — cropped to content bounds, natural aspect ratio
  return (
    <svg width={76} height={27} viewBox="0 17 80 29" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="sv-c-grad0" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(40.96 47.44) rotate(-45.8069) scale(24.1006 16.0169)">
          <stop stopColor="#6420FF" />
          <stop offset="1" stopColor="#6420FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sv-c-grad1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1.92 36.08) rotate(5.08826) scale(46.9048 37.3842)">
          <stop offset="0.25" stopColor="#00C4CC" />
          <stop offset="1" stopColor="#00C4CC" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sv-c-grad2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(34.14 44.64) rotate(-38.8493) scale(30.226 20.6676)">
          <stop stopColor="#6420FF" />
          <stop offset="1" stopColor="#6420FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sv-c-grad3" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(2.28 44.64) rotate(-26.1243) scale(34.8837 23.8524)">
          <stop stopColor="#6420FF" />
          <stop offset="1" stopColor="#6420FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sv-c-grad4" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(7.68 21.36) rotate(12.4717) scale(69.6432 85.4148)">
          <stop stopColor="#00C4CC" />
          <stop offset="1" stopColor="#00C4CC" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M79.444 36.536C79.308 36.536 79.184 36.624 79.12 36.808C78.3 39.148 77.192 40.54 76.28 40.54C75.756 40.54 75.544 39.956 75.544 39.04C75.544 36.748 76.916 31.888 77.608 29.672C77.688 29.404 77.74 29.164 77.74 28.96C77.74 28.316 77.388 28 76.516 28C75.576 28 74.564 28.368 73.58 30.092C73.24 28.572 72.212 27.908 70.776 27.908C69.116 27.908 67.512 28.976 66.192 30.708C64.872 32.44 63.32 33.008 62.152 32.728C62.992 30.672 63.304 29.136 63.304 27.996C63.304 26.208 62.42 25.128 60.992 25.128C58.82 25.128 57.568 27.2 57.568 29.38C57.568 31.064 58.332 32.796 60.012 33.636C58.604 36.82 56.548 39.7 55.768 39.7C54.76 39.7 54.464 34.768 54.52 31.24C54.556 29.216 54.724 29.112 54.724 28.5C54.724 28.148 54.496 27.908 53.58 27.908C51.444 27.908 50.784 29.716 50.684 31.792C50.652 32.58 50.528 33.364 50.316 34.124C49.424 37.308 47.584 39.724 46.384 39.724C45.828 39.724 45.676 39.168 45.676 38.44C45.676 36.148 46.96 33.284 46.96 30.84C46.96 29.044 46.172 27.908 44.688 27.908C42.94 27.908 40.628 29.988 38.44 33.884C39.16 30.9 39.456 28.012 37.324 28.012C36.86 28.02 36.408 28.136 36 28.356C35.72 28.488 35.548 28.776 35.568 29.084C35.772 32.26 33.008 40.396 30.388 40.396C29.912 40.396 29.68 39.88 29.68 39.048C29.68 36.752 31.048 31.904 31.736 29.684C31.824 29.396 31.872 29.148 31.872 28.932C31.872 28.324 31.496 28.012 30.644 28.012C29.708 28.012 28.692 28.368 27.712 30.092C27.368 28.572 26.34 27.908 24.904 27.908C22.548 27.908 19.916 30.4 18.76 33.648C17.212 37.984 14.092 42.172 9.892 42.172C6.08 42.172 4.068 39 4.068 33.988C4.068 26.752 9.38 20.84 13.32 20.84C15.204 20.84 16.104 22.04 16.104 23.88C16.104 26.108 14.86 27.144 14.86 27.992C14.86 28.252 15.076 28.508 15.504 28.508C17.216 28.508 19.232 26.496 19.232 23.752C19.232 21.008 17.004 19 13.064 19C6.552 19 0 25.552 0 33.948C0 40.628 3.296 44.656 8.996 44.656C12.884 44.656 16.28 41.632 18.112 38.104C18.32 41.028 19.648 42.556 21.672 42.556C23.472 42.556 24.928 41.484 26.04 39.6C26.468 41.572 27.604 42.536 29.08 42.536C30.772 42.536 32.188 41.464 33.536 39.472C33.516 41.036 33.872 42.508 35.228 42.508C35.868 42.508 36.632 42.36 36.768 41.8C38.196 35.896 41.724 31.076 42.804 31.076C43.124 31.076 43.212 31.384 43.212 31.748C43.212 33.352 42.08 36.64 42.08 38.74C42.08 41.008 43.044 42.508 45.036 42.508C47.244 42.508 49.488 39.804 50.984 35.852C51.452 39.544 52.464 42.524 54.048 42.524C55.992 42.524 59.444 38.432 61.536 34.1C62.356 34.204 63.588 34.176 64.772 33.34C64.268 34.616 63.972 36.012 63.972 37.408C63.972 41.428 65.892 42.556 67.544 42.556C69.34 42.556 70.796 41.484 71.912 39.6C72.28 41.3 73.22 42.532 74.948 42.532C77.652 42.532 80 39.768 80 37.5C80 36.9 79.744 36.536 79.444 36.536ZM23.32 40.328C22.228 40.328 21.8 39.228 21.8 37.588C21.8 34.74 23.748 29.984 25.808 29.984C26.708 29.984 27.048 31.044 27.048 32.34C27.048 35.232 25.196 40.328 23.32 40.328ZM60.724 31.828C60.072 31.052 59.836 29.996 59.836 29.056C59.836 27.896 60.26 26.916 60.768 26.916C61.276 26.916 61.432 27.416 61.432 28.112C61.432 29.276 61.016 30.976 60.724 31.828ZM69.192 40.328C68.1 40.328 67.672 39.064 67.672 37.588C67.672 34.84 69.62 29.984 71.696 29.984C72.596 29.984 72.916 31.036 72.916 32.34C72.916 35.232 71.096 40.328 69.192 40.328Z" fill="#7D2AE7" />
      <path d="M79.444 36.536C79.308 36.536 79.184 36.624 79.12 36.808C78.3 39.148 77.192 40.54 76.28 40.54C75.756 40.54 75.544 39.956 75.544 39.04C75.544 36.748 76.916 31.888 77.608 29.672C77.688 29.404 77.74 29.164 77.74 28.96C77.74 28.316 77.388 28 76.516 28C75.576 28 74.564 28.368 73.58 30.092C73.24 28.572 72.212 27.908 70.776 27.908C69.116 27.908 67.512 28.976 66.192 30.708C64.872 32.44 63.32 33.008 62.152 32.728C62.992 30.672 63.304 29.136 63.304 27.996C63.304 26.208 62.42 25.128 60.992 25.128C58.82 25.128 57.568 27.2 57.568 29.38C57.568 31.064 58.332 32.796 60.012 33.636C58.604 36.82 56.548 39.7 55.768 39.7C54.76 39.7 54.464 34.768 54.52 31.24C54.556 29.216 54.724 29.112 54.724 28.5C54.724 28.148 54.496 27.908 53.58 27.908C51.444 27.908 50.784 29.716 50.684 31.792C50.652 32.58 50.528 33.364 50.316 34.124C49.424 37.308 47.584 39.724 46.384 39.724C45.828 39.724 45.676 39.168 45.676 38.44C45.676 36.148 46.96 33.284 46.96 30.84C46.96 29.044 46.172 27.908 44.688 27.908C42.94 27.908 40.628 29.988 38.44 33.884C39.16 30.9 39.456 28.012 37.324 28.012C36.86 28.02 36.408 28.136 36 28.356C35.72 28.488 35.548 28.776 35.568 29.084C35.772 32.26 33.008 40.396 30.388 40.396C29.912 40.396 29.68 39.88 29.68 39.048C29.68 36.752 31.048 31.904 31.736 29.684C31.824 29.396 31.872 29.148 31.872 28.932C31.872 28.324 31.496 28.012 30.644 28.012C29.708 28.012 28.692 28.368 27.712 30.092C27.368 28.572 26.34 27.908 24.904 27.908C22.548 27.908 19.916 30.4 18.76 33.648C17.212 37.984 14.092 42.172 9.892 42.172C6.08 42.172 4.068 39 4.068 33.988C4.068 26.752 9.38 20.84 13.32 20.84C15.204 20.84 16.104 22.04 16.104 23.88C16.104 26.108 14.86 27.144 14.86 27.992C14.86 28.252 15.076 28.508 15.504 28.508C17.216 28.508 19.232 26.496 19.232 23.752C19.232 21.008 17.004 19 13.064 19C6.552 19 0 25.552 0 33.948C0 40.628 3.296 44.656 8.996 44.656C12.884 44.656 16.28 41.632 18.112 38.104C18.32 41.028 19.648 42.556 21.672 42.556C23.472 42.556 24.928 41.484 26.04 39.6C26.468 41.572 27.604 42.536 29.08 42.536C30.772 42.536 32.188 41.464 33.536 39.472C33.516 41.036 33.872 42.508 35.228 42.508C35.868 42.508 36.632 42.36 36.768 41.8C38.196 35.896 41.724 31.076 42.804 31.076C43.124 31.076 43.212 31.384 43.212 31.748C43.212 33.352 42.08 36.64 42.08 38.74C42.08 41.008 43.044 42.508 45.036 42.508C47.244 42.508 49.488 39.804 50.984 35.852C51.452 39.544 52.464 42.524 54.048 42.524C55.992 42.524 59.444 38.432 61.536 34.1C62.356 34.204 63.588 34.176 64.772 33.34C64.268 34.616 63.972 36.012 63.972 37.408C63.972 41.428 65.892 42.556 67.544 42.556C69.34 42.556 70.796 41.484 71.912 39.6C72.28 41.3 73.22 42.532 74.948 42.532C77.652 42.532 80 39.768 80 37.5C80 36.9 79.744 36.536 79.444 36.536ZM23.32 40.328C22.228 40.328 21.8 39.228 21.8 37.588C21.8 34.74 23.748 29.984 25.808 29.984C26.708 29.984 27.048 31.044 27.048 32.34C27.048 35.232 25.196 40.328 23.32 40.328ZM60.724 31.828C60.072 31.052 59.836 29.996 59.836 29.056C59.836 27.896 60.26 26.916 60.768 26.916C61.276 26.916 61.432 27.416 61.432 28.112C61.432 29.276 61.016 30.976 60.724 31.828ZM69.192 40.328C68.1 40.328 67.672 39.064 67.672 37.588C67.672 34.84 69.62 29.984 71.696 29.984C72.596 29.984 72.916 31.036 72.916 32.34C72.916 35.232 71.096 40.328 69.192 40.328Z" fill="url(#sv-c-grad0)" />
      <path d="M79.444 36.536C79.308 36.536 79.184 36.624 79.12 36.808C78.3 39.148 77.192 40.54 76.28 40.54C75.756 40.54 75.544 39.956 75.544 39.04C75.544 36.748 76.916 31.888 77.608 29.672C77.688 29.404 77.74 29.164 77.74 28.96C77.74 28.316 77.388 28 76.516 28C75.576 28 74.564 28.368 73.58 30.092C73.24 28.572 72.212 27.908 70.776 27.908C69.116 27.908 67.512 28.976 66.192 30.708C64.872 32.44 63.32 33.008 62.152 32.728C62.992 30.672 63.304 29.136 63.304 27.996C63.304 26.208 62.42 25.128 60.992 25.128C58.82 25.128 57.568 27.2 57.568 29.38C57.568 31.064 58.332 32.796 60.012 33.636C58.604 36.82 56.548 39.7 55.768 39.7C54.76 39.7 54.464 34.768 54.52 31.24C54.556 29.216 54.724 29.112 54.724 28.5C54.724 28.148 54.496 27.908 53.58 27.908C51.444 27.908 50.784 29.716 50.684 31.792C50.652 32.58 50.528 33.364 50.316 34.124C49.424 37.308 47.584 39.724 46.384 39.724C45.828 39.724 45.676 39.168 45.676 38.44C45.676 36.148 46.96 33.284 46.96 30.84C46.96 29.044 46.172 27.908 44.688 27.908C42.94 27.908 40.628 29.988 38.44 33.884C39.16 30.9 39.456 28.012 37.324 28.012C36.86 28.02 36.408 28.136 36 28.356C35.72 28.488 35.548 28.776 35.568 29.084C35.772 32.26 33.008 40.396 30.388 40.396C29.912 40.396 29.68 39.88 29.68 39.048C29.68 36.752 31.048 31.904 31.736 29.684C31.824 29.396 31.872 29.148 31.872 28.932C31.872 28.324 31.496 28.012 30.644 28.012C29.708 28.012 28.692 28.368 27.712 30.092C27.368 28.572 26.34 27.908 24.904 27.908C22.548 27.908 19.916 30.4 18.76 33.648C17.212 37.984 14.092 42.172 9.892 42.172C6.08 42.172 4.068 39 4.068 33.988C4.068 26.752 9.38 20.84 13.32 20.84C15.204 20.84 16.104 22.04 16.104 23.88C16.104 26.108 14.86 27.144 14.86 27.992C14.86 28.252 15.076 28.508 15.504 28.508C17.216 28.508 19.232 26.496 19.232 23.752C19.232 21.008 17.004 19 13.064 19C6.552 19 0 25.552 0 33.948C0 40.628 3.296 44.656 8.996 44.656C12.884 44.656 16.28 41.632 18.112 38.104C18.32 41.028 19.648 42.556 21.672 42.556C23.472 42.556 24.928 41.484 26.04 39.6C26.468 41.572 27.604 42.536 29.08 42.536C30.772 42.536 32.188 41.464 33.536 39.472C33.516 41.036 33.872 42.508 35.228 42.508C35.868 42.508 36.632 42.36 36.768 41.8C38.196 35.896 41.724 31.076 42.804 31.076C43.124 31.076 43.212 31.384 43.212 31.748C43.212 33.352 42.08 36.64 42.08 38.74C42.08 41.008 43.044 42.508 45.036 42.508C47.244 42.508 49.488 39.804 50.984 35.852C51.452 39.544 52.464 42.524 54.048 42.524C55.992 42.524 59.444 38.432 61.536 34.1C62.356 34.204 63.588 34.176 64.772 33.34C64.268 34.616 63.972 36.012 63.972 37.408C63.972 41.428 65.892 42.556 67.544 42.556C69.34 42.556 70.796 41.484 71.912 39.6C72.28 41.3 73.22 42.532 74.948 42.532C77.652 42.532 80 39.768 80 37.5C80 36.9 79.744 36.536 79.444 36.536ZM23.32 40.328C22.228 40.328 21.8 39.228 21.8 37.588C21.8 34.74 23.748 29.984 25.808 29.984C26.708 29.984 27.048 31.044 27.048 32.34C27.048 35.232 25.196 40.328 23.32 40.328ZM60.724 31.828C60.072 31.052 59.836 29.996 59.836 29.056C59.836 27.896 60.26 26.916 60.768 26.916C61.276 26.916 61.432 27.416 61.432 28.112C61.432 29.276 61.016 30.976 60.724 31.828ZM69.192 40.328C68.1 40.328 67.672 39.064 67.672 37.588C67.672 34.84 69.62 29.984 71.696 29.984C72.596 29.984 72.916 31.036 72.916 32.34C72.916 35.232 71.096 40.328 69.192 40.328Z" fill="url(#sv-c-grad1)" />
      <path d="M79.444 36.536C79.308 36.536 79.184 36.624 79.12 36.808C78.3 39.148 77.192 40.54 76.28 40.54C75.756 40.54 75.544 39.956 75.544 39.04C75.544 36.748 76.916 31.888 77.608 29.672C77.688 29.404 77.74 29.164 77.74 28.96C77.74 28.316 77.388 28 76.516 28C75.576 28 74.564 28.368 73.58 30.092C73.24 28.572 72.212 27.908 70.776 27.908C69.116 27.908 67.512 28.976 66.192 30.708C64.872 32.44 63.32 33.008 62.152 32.728C62.992 30.672 63.304 29.136 63.304 27.996C63.304 26.208 62.42 25.128 60.992 25.128C58.82 25.128 57.568 27.2 57.568 29.38C57.568 31.064 58.332 32.796 60.012 33.636C58.604 36.82 56.548 39.7 55.768 39.7C54.76 39.7 54.464 34.768 54.52 31.24C54.556 29.216 54.724 29.112 54.724 28.5C54.724 28.148 54.496 27.908 53.58 27.908C51.444 27.908 50.784 29.716 50.684 31.792C50.652 32.58 50.528 33.364 50.316 34.124C49.424 37.308 47.584 39.724 46.384 39.724C45.828 39.724 45.676 39.168 45.676 38.44C45.676 36.148 46.96 33.284 46.96 30.84C46.96 29.044 46.172 27.908 44.688 27.908C42.94 27.908 40.628 29.988 38.44 33.884C39.16 30.9 39.456 28.012 37.324 28.012C36.86 28.02 36.408 28.136 36 28.356C35.72 28.488 35.548 28.776 35.568 29.084C35.772 32.26 33.008 40.396 30.388 40.396C29.912 40.396 29.68 39.88 29.68 39.048C29.68 36.752 31.048 31.904 31.736 29.684C31.824 29.396 31.872 29.148 31.872 28.932C31.872 28.324 31.496 28.012 30.644 28.012C29.708 28.012 28.692 28.368 27.712 30.092C27.368 28.572 26.34 27.908 24.904 27.908C22.548 27.908 19.916 30.4 18.76 33.648C17.212 37.984 14.092 42.172 9.892 42.172C6.08 42.172 4.068 39 4.068 33.988C4.068 26.752 9.38 20.84 13.32 20.84C15.204 20.84 16.104 22.04 16.104 23.88C16.104 26.108 14.86 27.144 14.86 27.992C14.86 28.252 15.076 28.508 15.504 28.508C17.216 28.508 19.232 26.496 19.232 23.752C19.232 21.008 17.004 19 13.064 19C6.552 19 0 25.552 0 33.948C0 40.628 3.296 44.656 8.996 44.656C12.884 44.656 16.28 41.632 18.112 38.104C18.32 41.028 19.648 42.556 21.672 42.556C23.472 42.556 24.928 41.484 26.04 39.6C26.468 41.572 27.604 42.536 29.08 42.536C30.772 42.536 32.188 41.464 33.536 39.472C33.516 41.036 33.872 42.508 35.228 42.508C35.868 42.508 36.632 42.36 36.768 41.8C38.196 35.896 41.724 31.076 42.804 31.076C43.124 31.076 43.212 31.384 43.212 31.748C43.212 33.352 42.08 36.64 42.08 38.74C42.08 41.008 43.044 42.508 45.036 42.508C47.244 42.508 49.488 39.804 50.984 35.852C51.452 39.544 52.464 42.524 54.048 42.524C55.992 42.524 59.444 38.432 61.536 34.1C62.356 34.204 63.588 34.176 64.772 33.34C64.268 34.616 63.972 36.012 63.972 37.408C63.972 41.428 65.892 42.556 67.544 42.556C69.34 42.556 70.796 41.484 71.912 39.6C72.28 41.3 73.22 42.532 74.948 42.532C77.652 42.532 80 39.768 80 37.5C80 36.9 79.744 36.536 79.444 36.536ZM23.32 40.328C22.228 40.328 21.8 39.228 21.8 37.588C21.8 34.74 23.748 29.984 25.808 29.984C26.708 29.984 27.048 31.044 27.048 32.34C27.048 35.232 25.196 40.328 23.32 40.328ZM60.724 31.828C60.072 31.052 59.836 29.996 59.836 29.056C59.836 27.896 60.26 26.916 60.768 26.916C61.276 26.916 61.432 27.416 61.432 28.112C61.432 29.276 61.016 30.976 60.724 31.828ZM69.192 40.328C68.1 40.328 67.672 39.064 67.672 37.588C67.672 34.84 69.62 29.984 71.696 29.984C72.596 29.984 72.916 31.036 72.916 32.34C72.916 35.232 71.096 40.328 69.192 40.328Z" fill="url(#sv-c-grad2)" />
      <path d="M79.444 36.536C79.308 36.536 79.184 36.624 79.12 36.808C78.3 39.148 77.192 40.54 76.28 40.54C75.756 40.54 75.544 39.956 75.544 39.04C75.544 36.748 76.916 31.888 77.608 29.672C77.688 29.404 77.74 29.164 77.74 28.96C77.74 28.316 77.388 28 76.516 28C75.576 28 74.564 28.368 73.58 30.092C73.24 28.572 72.212 27.908 70.776 27.908C69.116 27.908 67.512 28.976 66.192 30.708C64.872 32.44 63.32 33.008 62.152 32.728C62.992 30.672 63.304 29.136 63.304 27.996C63.304 26.208 62.42 25.128 60.992 25.128C58.82 25.128 57.568 27.2 57.568 29.38C57.568 31.064 58.332 32.796 60.012 33.636C58.604 36.82 56.548 39.7 55.768 39.7C54.76 39.7 54.464 34.768 54.52 31.24C54.556 29.216 54.724 29.112 54.724 28.5C54.724 28.148 54.496 27.908 53.58 27.908C51.444 27.908 50.784 29.716 50.684 31.792C50.652 32.58 50.528 33.364 50.316 34.124C49.424 37.308 47.584 39.724 46.384 39.724C45.828 39.724 45.676 39.168 45.676 38.44C45.676 36.148 46.96 33.284 46.96 30.84C46.96 29.044 46.172 27.908 44.688 27.908C42.94 27.908 40.628 29.988 38.44 33.884C39.16 30.9 39.456 28.012 37.324 28.012C36.86 28.02 36.408 28.136 36 28.356C35.72 28.488 35.548 28.776 35.568 29.084C35.772 32.26 33.008 40.396 30.388 40.396C29.912 40.396 29.68 39.88 29.68 39.048C29.68 36.752 31.048 31.904 31.736 29.684C31.824 29.396 31.872 29.148 31.872 28.932C31.872 28.324 31.496 28.012 30.644 28.012C29.708 28.012 28.692 28.368 27.712 30.092C27.368 28.572 26.34 27.908 24.904 27.908C22.548 27.908 19.916 30.4 18.76 33.648C17.212 37.984 14.092 42.172 9.892 42.172C6.08 42.172 4.068 39 4.068 33.988C4.068 26.752 9.38 20.84 13.32 20.84C15.204 20.84 16.104 22.04 16.104 23.88C16.104 26.108 14.86 27.144 14.86 27.992C14.86 28.252 15.076 28.508 15.504 28.508C17.216 28.508 19.232 26.496 19.232 23.752C19.232 21.008 17.004 19 13.064 19C6.552 19 0 25.552 0 33.948C0 40.628 3.296 44.656 8.996 44.656C12.884 44.656 16.28 41.632 18.112 38.104C18.32 41.028 19.648 42.556 21.672 42.556C23.472 42.556 24.928 41.484 26.04 39.6C26.468 41.572 27.604 42.536 29.08 42.536C30.772 42.536 32.188 41.464 33.536 39.472C33.516 41.036 33.872 42.508 35.228 42.508C35.868 42.508 36.632 42.36 36.768 41.8C38.196 35.896 41.724 31.076 42.804 31.076C43.124 31.076 43.212 31.384 43.212 31.748C43.212 33.352 42.08 36.64 42.08 38.74C42.08 41.008 43.044 42.508 45.036 42.508C47.244 42.508 49.488 39.804 50.984 35.852C51.452 39.544 52.464 42.524 54.048 42.524C55.992 42.524 59.444 38.432 61.536 34.1C62.356 34.204 63.588 34.176 64.772 33.34C64.268 34.616 63.972 36.012 63.972 37.408C63.972 41.428 65.892 42.556 67.544 42.556C69.34 42.556 70.796 41.484 71.912 39.6C72.28 41.3 73.22 42.532 74.948 42.532C77.652 42.532 80 39.768 80 37.5C80 36.9 79.744 36.536 79.444 36.536ZM23.32 40.328C22.228 40.328 21.8 39.228 21.8 37.588C21.8 34.74 23.748 29.984 25.808 29.984C26.708 29.984 27.048 31.044 27.048 32.34C27.048 35.232 25.196 40.328 23.32 40.328ZM60.724 31.828C60.072 31.052 59.836 29.996 59.836 29.056C59.836 27.896 60.26 26.916 60.768 26.916C61.276 26.916 61.432 27.416 61.432 28.112C61.432 29.276 61.016 30.976 60.724 31.828ZM69.192 40.328C68.1 40.328 67.672 39.064 67.672 37.588C67.672 34.84 69.62 29.984 71.696 29.984C72.596 29.984 72.916 31.036 72.916 32.34C72.916 35.232 71.096 40.328 69.192 40.328Z" fill="url(#sv-c-grad3)" />
      <path d="M79.444 36.536C79.308 36.536 79.184 36.624 79.12 36.808C78.3 39.148 77.192 40.54 76.28 40.54C75.756 40.54 75.544 39.956 75.544 39.04C75.544 36.748 76.916 31.888 77.608 29.672C77.688 29.404 77.74 29.164 77.74 28.96C77.74 28.316 77.388 28 76.516 28C75.576 28 74.564 28.368 73.58 30.092C73.24 28.572 72.212 27.908 70.776 27.908C69.116 27.908 67.512 28.976 66.192 30.708C64.872 32.44 63.32 33.008 62.152 32.728C62.992 30.672 63.304 29.136 63.304 27.996C63.304 26.208 62.42 25.128 60.992 25.128C58.82 25.128 57.568 27.2 57.568 29.38C57.568 31.064 58.332 32.796 60.012 33.636C58.604 36.82 56.548 39.7 55.768 39.7C54.76 39.7 54.464 34.768 54.52 31.24C54.556 29.216 54.724 29.112 54.724 28.5C54.724 28.148 54.496 27.908 53.58 27.908C51.444 27.908 50.784 29.716 50.684 31.792C50.652 32.58 50.528 33.364 50.316 34.124C49.424 37.308 47.584 39.724 46.384 39.724C45.828 39.724 45.676 39.168 45.676 38.44C45.676 36.148 46.96 33.284 46.96 30.84C46.96 29.044 46.172 27.908 44.688 27.908C42.94 27.908 40.628 29.988 38.44 33.884C39.16 30.9 39.456 28.012 37.324 28.012C36.86 28.02 36.408 28.136 36 28.356C35.72 28.488 35.548 28.776 35.568 29.084C35.772 32.26 33.008 40.396 30.388 40.396C29.912 40.396 29.68 39.88 29.68 39.048C29.68 36.752 31.048 31.904 31.736 29.684C31.824 29.396 31.872 29.148 31.872 28.932C31.872 28.324 31.496 28.012 30.644 28.012C29.708 28.012 28.692 28.368 27.712 30.092C27.368 28.572 26.34 27.908 24.904 27.908C22.548 27.908 19.916 30.4 18.76 33.648C17.212 37.984 14.092 42.172 9.892 42.172C6.08 42.172 4.068 39 4.068 33.988C4.068 26.752 9.38 20.84 13.32 20.84C15.204 20.84 16.104 22.04 16.104 23.88C16.104 26.108 14.86 27.144 14.86 27.992C14.86 28.252 15.076 28.508 15.504 28.508C17.216 28.508 19.232 26.496 19.232 23.752C19.232 21.008 17.004 19 13.064 19C6.552 19 0 25.552 0 33.948C0 40.628 3.296 44.656 8.996 44.656C12.884 44.656 16.28 41.632 18.112 38.104C18.32 41.028 19.648 42.556 21.672 42.556C23.472 42.556 24.928 41.484 26.04 39.6C26.468 41.572 27.604 42.536 29.08 42.536C30.772 42.536 32.188 41.464 33.536 39.472C33.516 41.036 33.872 42.508 35.228 42.508C35.868 42.508 36.632 42.36 36.768 41.8C38.196 35.896 41.724 31.076 42.804 31.076C43.124 31.076 43.212 31.384 43.212 31.748C43.212 33.352 42.08 36.64 42.08 38.74C42.08 41.008 43.044 42.508 45.036 42.508C47.244 42.508 49.488 39.804 50.984 35.852C51.452 39.544 52.464 42.524 54.048 42.524C55.992 42.524 59.444 38.432 61.536 34.1C62.356 34.204 63.588 34.176 64.772 33.34C64.268 34.616 63.972 36.012 63.972 37.408C63.972 41.428 65.892 42.556 67.544 42.556C69.34 42.556 70.796 41.484 71.912 39.6C72.28 41.3 73.22 42.532 74.948 42.532C77.652 42.532 80 39.768 80 37.5C80 36.9 79.744 36.536 79.444 36.536ZM23.32 40.328C22.228 40.328 21.8 39.228 21.8 37.588C21.8 34.74 23.748 29.984 25.808 29.984C26.708 29.984 27.048 31.044 27.048 32.34C27.048 35.232 25.196 40.328 23.32 40.328ZM60.724 31.828C60.072 31.052 59.836 29.996 59.836 29.056C59.836 27.896 60.26 26.916 60.768 26.916C61.276 26.916 61.432 27.416 61.432 28.112C61.432 29.276 61.016 30.976 60.724 31.828ZM69.192 40.328C68.1 40.328 67.672 39.064 67.672 37.588C67.672 34.84 69.62 29.984 71.696 29.984C72.596 29.984 72.916 31.036 72.916 32.34C72.916 35.232 71.096 40.328 69.192 40.328Z" fill="url(#sv-c-grad4)" />
    </svg>
  )
}

function CanvaCard({
  data, onSaved, onDisconnect, urlError,
}: {
  data: SettingsData['canva']
  onSaved: () => void
  onDisconnect: () => void
  urlError?: string | null
}) {
  const credsConfigured = data.source !== 'none'
  const [editingCreds, setEditingCreds] = useState(!credsConfigured && !data.connected)
  const [form, setForm] = useState({ clientId: '', clientSecret: '' })
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSaveCreds() {
    if (!form.clientId && !data.clientIdSet) { setError('Client ID is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'canva', ...form }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved()
      setEditingCreds(false)
      setForm({ clientId: '', clientSecret: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/auth/canva/disconnect', { method: 'POST' })
      onDisconnect()
    } finally {
      setDisconnecting(false)
    }
  }

  const description = data.connected
    ? data.myUserId
      ? `Connected · user ${data.myUserId.slice(0, 8)}…`
      : 'Connected — comment mentions synced'
    : credsConfigured && !editingCreds
    ? 'Credentials saved — authorise Canva access below'
    : 'Connect Canva to surface design comment @mentions'

  const status = data.connected ? <ConnectedBadge /> : undefined
  const showEdit = credsConfigured && !editingCreds ? () => setEditingCreds(true) : undefined
  const hasChildren = editingCreds || (!editingCreds && credsConfigured && !data.connected) || !!urlError

  return (
    <ConnectionCard
      icon={<CanvaWordmark />}
      name="Canva"
      description={description}
      iconBg="#F3EEFF"
      iconColor="#7D2AE7"
      status={status}
      onEdit={showEdit}
    >
      {hasChildren && (
        <>
          {/* OAuth error from callback */}
          {urlError && (
            <div style={{
              marginBottom: 12, padding: '8px 12px',
              background: 'var(--pdStatusReviewBg)', border: '1px solid var(--pdStatusReviewBorder)',
              borderRadius: 6, fontSize: 12, color: 'var(--pdStatusReviewFg)',
            }}>
              {(() => { try { return decodeURIComponent(urlError) } catch { return urlError } })()}
              {urlError.includes('invalid_scope') && (
                <span> — Go to <strong>developers.canva.com</strong> → your integration → <strong>Scopes</strong> and enable Read for: <code>design:meta</code>, <code>comment</code>, <code>profile</code></span>
              )}
            </div>
          )}

          {/* Credentials form */}
          {editingCreds && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '10px 12px',
                background: 'var(--pdSurface2)',
                borderRadius: 6, fontSize: 12, color: 'var(--pdTextMuted)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--pdTextBase)' }}>Setup steps:</strong>
                <ol style={{ margin: '6px 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <li>Go to <strong style={{ color: 'var(--pdTextBase)' }}>developers.canva.com</strong> → Your integrations → Create integration</li>
                  <li>Under <strong style={{ color: 'var(--pdTextBase)' }}>Authentication</strong>, add redirect URI: <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>http://127.0.0.1:3000/api/auth/canva/callback</code></li>
                  <li>Under <strong style={{ color: 'var(--pdTextBase)' }}>Scopes</strong>, enable Read for: <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>design:meta</code>, <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>comment</code>, <code style={{ fontSize: 11, background: 'var(--pdSurface3)', padding: '1px 4px', borderRadius: 3 }}>profile</code></li>
                  <li>Copy the <strong style={{ color: 'var(--pdTextBase)' }}>Client ID</strong> and <strong style={{ color: 'var(--pdTextBase)' }}>Client Secret</strong> from the integration page</li>
                </ol>
                <p style={{ margin: '6px 0 0', color: 'var(--pdTextSubtle)' }}>⚠ Access the app at <strong>127.0.0.1:3000</strong> (not localhost) — Canva requires this for local OAuth.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field
                  label="Client ID"
                  value={form.clientId}
                  onChange={v => setForm(f => ({ ...f, clientId: v }))}
                  placeholder={data.clientIdSet ? '••••••••  (leave blank to keep)' : 'Paste Client ID'}
                />
                <Field
                  label="Client Secret"
                  value={form.clientSecret}
                  onChange={v => setForm(f => ({ ...f, clientSecret: v }))}
                  type="password"
                  placeholder={data.clientSecretSet ? '••••••••  (leave blank to keep)' : 'Paste Client Secret'}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {credsConfigured && (
                  <button className="PdButton PdButton--tertiary PdButton--small" onClick={() => { setEditingCreds(false); setError(null) }}>
                    Cancel
                  </button>
                )}
                {data.connected && (
                  <button
                    className="PdButton PdButton--tertiary PdButton--small"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    style={{ opacity: disconnecting ? 0.5 : 1, color: 'var(--pdPrioHigh)' }}
                  >
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                )}
                <button
                  className="PdButton PdButton--primary PdButton--small"
                  onClick={handleSaveCreds}
                  disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save credentials'}
                </button>
              </div>
            </div>
          )}

          {/* OAuth connect row — creds saved, not yet OAuth'd */}
          {!editingCreds && credsConfigured && !data.connected && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--pdTextMuted)', margin: 0 }}>
                Click to authorise <strong>read-only</strong> access to your Canva designs and comments — used to surface @mentions. You&apos;ll be redirected to Canva and back. Make sure you&apos;re using <strong>127.0.0.1:3000</strong> in your browser.
              </p>
              <a
                href="/api/auth/canva"
                className="PdButton PdButton--primary PdButton--small"
                style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0, marginLeft: 16 }}
              >
                <LinkIcon /> Connect Canva
              </a>
            </div>
          )}
        </>
      )}
    </ConnectionCard>
  )
}

// ── Appearance ────────────────────────────────────────────────────────────────

const FONTS: { id: Font; label: string; stack: string; sample: string }[] = [
  { id: 'default', label: 'Canva Sans', stack: '"Canva Sans", sans-serif',                                               sample: 'Ag' },
  { id: 'inter',   label: 'Inter',      stack: '"Inter", sans-serif',                                                    sample: 'Ag' },
  { id: 'system',  label: 'System',     stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',              sample: 'Ag' },
  { id: 'serif',   label: 'Serif',      stack: '"Lora", Georgia, serif',                                                 sample: 'Ag' },
  { id: 'mono',    label: 'Mono',       stack: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',   sample: 'Ag' },
]

interface AccentTheme {
  id: Accent
  name: string
  group: 'solid' | 'gradient'
  swatch: string
}

const ACCENTS: AccentTheme[] = [
  { id: 'orange',    name: 'Default',      group: 'solid',    swatch: '#EE7E36' },
  { id: 'blue',      name: 'Blueprint',    group: 'solid',    swatch: '#3D7DFF' },
  { id: 'purple',    name: 'Studio',       group: 'solid',    swatch: '#7B5CFF' },
  { id: 'teal',      name: 'Canva',        group: 'solid',    swatch: '#00AFA0' },
  { id: 'rose',      name: 'Raspberry',    group: 'solid',    swatch: '#F05880' },
  { id: 'slate',     name: 'Monochrome',   group: 'solid',    swatch: '#7A879F' },
  { id: 'aubergine', name: 'Aubergine',    group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #8B5CF6, #4C1D95)' },
  { id: 'raspberry', name: 'Raspberry',    group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #EC4899, #9D174D)' },
  { id: 'chill',     name: 'Chill Vibes',  group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #34D399, #065F46)' },
  { id: 'banana',    name: 'Banana',       group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #FCD34D, #D97706)' },
  { id: 'pbj',       name: 'PB&J',         group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #F9A8D4, #C2410C)' },
  { id: 'seaglass',  name: 'Sea Glass',    group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #A5F3FC, #7C3AED)' },
  { id: 'mintchip',  name: 'Mint Chip',    group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #86EFAC, #D1FAE5)' },
  { id: 'bigbiz',    name: 'Big Business', group: 'gradient', swatch: 'radial-gradient(circle at 40% 40%, #3B82F6, #1E1B4B)' },
]

const ACCENT_GROUPS: Array<{ label: string; group: 'solid' | 'gradient' }> = [
  { label: 'Single color', group: 'solid' },
  { label: 'Gradients & vibrant', group: 'gradient' },
]

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: 'light',  label: 'Light'  },
  { id: 'dark',   label: 'Dark'   },
  { id: 'system', label: 'System' },
]

function AppearanceSection() {
  const { colorMode, setColorMode, accent, setAccent, font, setFont } = useTheme()

  return (
    <section>
      <h3 style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--pdTextSubtle)', margin: '0 0 12px',
      }}>
        Appearance
      </h3>

      <div style={{
        background: 'var(--pdSurface1)',
        border: '1px solid var(--pdBorder)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

        {/* Color Mode */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--pdTextStrong)', marginBottom: 8 }}>
            Color mode
          </div>
          <div style={{ display: 'inline-flex', borderRadius: 8, border: '1px solid var(--pdBorder)', overflow: 'hidden' }}>
            {COLOR_MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setColorMode(m.id)}
                style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: colorMode === m.id ? 600 : 400,
                  border: 'none',
                  borderRight: i < COLOR_MODES.length - 1 ? '1px solid var(--pdBorder)' : 'none',
                  cursor: 'pointer',
                  background: colorMode === m.id
                    ? (ACCENTS.find(a => a.id === accent)?.group === 'gradient' ? 'var(--pdAccentGradient)' : 'var(--pdAccent05)')
                    : 'var(--pdSurface1)',
                  color: colorMode === m.id ? '#fff' : 'var(--pdTextBase)',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent palette */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--pdTextStrong)', marginBottom: 12 }}>
            Accent colour
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ACCENT_GROUPS.map(({ label, group }) => (
              <div key={group}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: 'var(--pdTextSubtle)', marginBottom: 8,
                }}>
                  {label}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ACCENTS.filter(a => a.group === group).map((a) => (
                    <button
                      key={a.id}
                      title={a.name}
                      onClick={() => setAccent(a.id)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        border: accent === a.id
                          ? `3px solid var(--pdAccent05)`
                          : '2px solid transparent',
                        outline: accent === a.id ? `2px solid var(--pdSurface1)` : 'none',
                        outlineOffset: accent === a.id ? '-5px' : 0,
                        background: a.swatch,
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: accent === a.id
                          ? `0 0 0 3px var(--pdAccentA03)`
                          : '0 1px 3px rgba(0,0,0,0.15)',
                        transition: 'box-shadow 0.12s, transform 0.12s',
                        transform: accent === a.id ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--pdTextSubtle)', marginTop: 10 }}>
            {ACCENTS.find(a => a.id === accent)?.name}
          </div>
        </div>

        {/* Font family */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--pdTextStrong)', marginBottom: 10 }}>
            Font
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FONTS.map((f) => (
              <button
                key={f.id}
                title={f.label}
                onClick={() => setFont(f.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: font === f.id
                    ? '2px solid var(--pdAccent05)'
                    : '2px solid var(--pdBorder)',
                  background: font === f.id ? 'var(--pdAccentA01)' : 'var(--pdSurface2)',
                  cursor: 'pointer',
                  transition: 'border-color 0.12s, background 0.12s',
                  minWidth: 64,
                }}
              >
                <span style={{
                  fontFamily: f.stack,
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: font === f.id ? 'var(--pdAccent06)' : 'var(--pdTextStrong)',
                }}>
                  {f.sample}
                </span>
                <span style={{
                  fontFamily: f.stack,
                  fontSize: 11,
                  color: font === f.id ? 'var(--pdAccent06)' : 'var(--pdTextMuted)',
                  fontWeight: font === f.id ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsView({ urlError, canvaUrlError }: Props) {
  const [data, setData] = useState<SettingsData | null>(null)

  function load() {
    fetch('/api/settings')
      .then(r => r.json())
      .then((d: SettingsData) => setData(d))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pdTextStrong)', margin: '0 0 4px' }}>Settings</h2>
        <p style={{ fontSize: 13, color: 'var(--pdTextMuted)', margin: 0 }}>
          Connect your tools below. Each integration is independent — connect the ones you use. Credentials are stored locally in your database and never leave your machine.
        </p>
      </div>

      <section>
        <h3 style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--pdTextSubtle)', margin: '0 0 12px',
        }}>
          Connections
        </h3>

        {data === null ? (
          <div style={{ fontSize: 13, color: 'var(--pdTextSubtle)', padding: '24px 0' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <JiraCard data={data.jira} onSaved={load} />
            <SlackCard data={data.slack} onSaved={load} />
            <FigmaCard data={data.figma} onSaved={load} />
            <CanvaCard
              data={data.canva}
              onSaved={load}
              onDisconnect={() => setData(d => d ? { ...d, canva: { ...d.canva, connected: false } } : d)}
              urlError={canvaUrlError}
            />
            <GoogleCalendarCard
              creds={data.googleCreds}
              calendar={data.googleCalendar}
              onSaved={load}
              onDisconnect={() => setData(d => d ? { ...d, googleCalendar: { connected: false, email: null, syncedAt: null } } : d)}
              urlError={urlError}
            />
          </div>
        )}
      </section>

      <AppearanceSection />

      <section style={{ borderTop: '1px solid var(--pdBorder)', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pdTextBase)' }}>Session</div>
            <div style={{ fontSize: 12, color: 'var(--pdTextMuted)', marginTop: 2 }}>Sign out of the dashboard</div>
          </div>
          <button
            className="PdButton PdButton--tertiary PdButton--small"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
          >
            Sign out
          </button>
        </div>
      </section>

    </div>
  )
}
