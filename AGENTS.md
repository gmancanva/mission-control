# PD Tracker — Project Memory for Codex

> This file is the canonical context document. Read it at the start of every session.
> Keep it updated as the build evolves.

---

## What This Is

A **personal dashboard** for Garett (Product Designer at Canva) to track work across tools without switching between them. It runs locally (`http://127.0.0.1:3000`) and is being built toward a hosted Vercel deployment. **No auth layer** — single-user personal tool.

The goal is a self-contained web app that works without Codex or MCP tools. All syncs are on-demand (Sync Now button) or via Vercel cron jobs once hosted.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS + CSS custom properties (`styles/theme.css`) |
| Database | SQLite via `better-sqlite3` at `data/hub.db` (local) / Vercel KV (hosted) |
| Hosting target | Vercel (cron jobs in `vercel.json`) |
| AI | Anthropic Codex SDK (chat panel) + OpenAI SDK (thread summaries) |
| Icons | `lucide-react` |

---

## Running Locally

```bash
cd "/Users/garett/Documents/Canva work/Codex/PD tracker"
npm run dev
# Access at http://127.0.0.1:3000  ← must use IP, not localhost (OAuth redirect requirement)
```

**First-time setup:** Copy `.env.local.example` → `.env.local`, fill in credentials. The app has an onboarding wizard (`OnboardingWizard.tsx`) that appears when no integrations are connected.

---

## Integrations & Current Status

| Integration | Status | Auth method | Notes |
|---|---|---|---|
| **Jira** | ✅ Working | API token (env var) | `lib/jira.ts`, polls Atlassian Cloud REST v3 |
| **Slack** | ✅ Working | Bot token (env var) | `lib/slack.ts`, uses `@slack/web-api` |
| **Canva** | ✅ Working | OAuth 2.0 + PKCE | `lib/canva.ts` — see Canva section below |
| **Google Calendar** | ⚠️ Partial | OAuth 2.0 | `lib/google-calendar.ts` |
| **Figma** | ✅ Working | Personal access token | `lib/figma.ts` |
| **AI summaries** | ✅ Working | API keys (env vars) | OpenAI for thread summaries, Anthropic for chat |

---

## File Map

```
app/
  page.tsx                      ← Main SPA shell: all state, view routing, sync orchestration
  layout.tsx                    ← Root layout, ThemeProvider wrapper
  globals.css                   ← Global styles + component classes
  login/page.tsx                ← Login page (used when DASHBOARD_PASSWORD is set)
  export/page.tsx               ← Print-friendly stakeholder report page

  api/
    settings/
      route.ts                  ← GET: all config status; POST: save credentials to DB
      test-figma/route.ts       ← POST: verify Figma token is valid
      test-slack/route.ts       ← POST: verify Slack bot token is valid

    jira/
      route.ts                  ← GET: fetch epics+tickets (bust cache with ?bust=1)
                                   POST: create ticket / batch create / transition / update
      [key]/route.ts            ← GET: single ticket detail (comments, attachments, links)
                                   POST: add comment / add remote link / update fields
      attach/route.ts           ← POST: upload attachment to Jira ticket
      image/route.ts            ← GET: proxy Jira image URLs (adds auth header)
      sprint/route.ts           ← GET: sprint data for capacity view

    slack/
      route.ts                  ← GET: fetch mentions + write disk cache
      thread/route.ts           ← GET: fetch thread (live via token, fallback to disk cache)
      reply/route.ts            ← POST: post a reply to a Slack thread
      summarize/route.ts        ← POST: AI summary of a thread (OpenAI gpt-4o-mini)
      emojis/route.ts           ← GET: workspace custom emoji map (5-min in-memory cache)
      image/route.ts            ← GET: proxy Slack private image URLs (adds bot token auth)
      users/route.ts            ← GET: fetch user list + avatar URLs; writes disk cache

    canva/
      route.ts                  ← GET: serve canva-mentions-cache.json
                                   (types CanvaMention, CanvaMentionsCache exported from here)
      sync/route.ts             ← GET: fetch live Canva mentions + merge into cache
                                   POST: receive mentions from external agent + merge

    figma/
      route.ts                  ← GET: fetch Figma mentions + merge into cache
      reply/route.ts            ← POST: post a reply to a Figma comment

    calendar/
      route.ts                  ← GET: fetch Google Calendar events + write cache
      capacity/route.ts         ← GET: sprint capacity (calendar hours vs Jira sprint data)
      weekly/route.ts           ← GET: weekly calendar view data + write cache
      event-details/route.ts    ← GET: single event details (description, location, meet link)

    chat/route.ts               ← POST: streaming AI chat (Anthropic Codex-3-5-haiku)
    export/route.ts             ← GET/POST: pinned decisions for stakeholder export

    ai/route.ts                 ← POST: OpenAI thread summariser (legacy endpoint)

    auth/
      login/route.ts            ← POST: validate password, set pd_auth cookie
      logout/route.ts           ← POST: clear pd_auth cookie
      canva/route.ts            ← GET: start Canva OAuth (generate PKCE, redirect)
      canva/callback/route.ts   ← GET: receive code, exchange for token, save to DB
      canva/disconnect/route.ts ← POST: delete Canva OAuth token
      google/route.ts           ← GET: start Google OAuth
      google/callback/route.ts  ← GET: receive code, exchange for token, save to DB
      google/disconnect/route.ts← POST: delete Google OAuth token

lib/
  db.ts                         ← SQLite helpers: getDb(), getConfig/setConfig/deleteConfig,
                                   saveOAuthToken/getOAuthToken/deleteOAuthToken,
                                   pinDecision/unpinDecision/getPinnedDecisions/updateNote
  token-store.ts                ← Async token/config store: SQLite locally, Vercel KV in prod
                                   USE THIS (not db.ts directly) for OAuth tokens + PKCE state
  data-dir.ts                   ← DATA_DIR: 'data/' locally, '/tmp/data/' on Vercel
  jira.ts                       ← Jira API: fetchEpics, fetchMyTickets, fetchSprintData,
                                   fetchTicketDetails, createTicket, transitionTicket, etc.
  jira-constants.ts             ← CANVA_PRIORITIES, CANVA_DESIGN_STATUSES,
                                   CANVA_CATEGORIES_OF_WORK, CANVA_INITIAL_STATUSES
  slack.ts                      ← Slack API: fetchMessages, getBotToken, getUserToken,
                                   getMyUserId, bustCache
  canva.ts                      ← Canva Connect API: fetchMentions, isConnected,
                                   getClientId, getClientSecret, getMyUserId, CANVA_SCOPES
  google-calendar.ts            ← Google Calendar API: fetchCalendarEvents,
                                   fetchWeeklyForCache, getCalendarCapacity, getEventDetails,
                                   isConnected, isConfigured, getClientId, getClientSecret
  figma.ts                      ← Figma API: fetchFigmaMentions, isConfigured,
                                   getAccessToken, getMyHandle, getTeamIds
  adf.ts                        ← Browser-only: contentEditable HTML → Atlassian Document Format
                                   (used by RichEditor when posting Jira comments)
  adf-renderer.tsx              ← Server/client: render ADF JSON → React nodes
                                   (used by TicketDetailPanel to display Jira rich text)
  slackMarkdown.ts              ← Render Slack mrkdwn → HTML (handles <@U...>, :emoji:,
                                   bold, italic, links, blockquotes)
  avatarStore.ts                ← Browser singleton: lazy-loads Slack user avatars from
                                   /api/slack/users, shared across all components
  emojiStore.ts                 ← Browser singleton: lazy-loads custom emoji map from
                                   /api/slack/emojis
  cardStyles.ts                 ← Shared status → colour utility functions
  token-store.ts                ← (see above)

components/
  SettingsView.tsx              ← Settings page: all integration config cards
  UpdatesPage.tsx               ← Summary/feed: Jira + Slack + Canva + Figma mentions merged
  KanbanBoard.tsx               ← Jira project kanban (columns by status)
  TimelineTab.tsx               ← Gantt-style timeline across epics
  CapacityView.tsx              ← Calendar capacity + sprint workload view
  MyTasks.tsx                   ← My open Jira tickets list
  CommsTrail.tsx                ← Chronological mentions log across all sources; pin decisions
  OverviewTab.tsx               ← Project overview cards (epics summary)
  ChatPanel.tsx                 ← AI chat sidebar (Anthropic streaming)
  TicketDetailPanel.tsx         ← Ticket detail slide-in panel (ADF rendering, attachments)
  CalendarWeekGrid.tsx          ← Weekly calendar grid
  OnboardingWizard.tsx          ← First-run wizard (shows when no integrations connected)
  TemplateTaskModal.tsx         ← Create ticket modal (template or manual tab)
  RichEditor.tsx                ← contentEditable rich text editor → ADF (for Jira comments)
  SlackText.tsx                 ← Renders Slack mrkdwn text using slackMarkdown.ts
  ReactionBar.tsx               ← Slack emoji reaction display
  ProfileAvatar.tsx             ← User avatar with fallback initials
  ProjectCard.tsx               ← Jira project/epic summary card
  ThemeProvider.tsx             ← Dark/light mode context (wraps entire app)
  ThemeToggle.tsx               ← Sun/Moon toggle button
  Tooltip.tsx                   ← Hover tooltip component

styles/
  theme.css                     ← Design tokens as CSS custom properties
                                   References Canva DS vars (--pdSurface0, --pdAccent06 etc.)
                                   Edit here to restyle the whole app

data/                           ← All gitignored; auto-created at runtime
  hub.db                        ← SQLite database (WAL mode)
  hub.db-shm / hub.db-wal       ← SQLite WAL files (normal, don't delete while running)
  canva-mentions-cache.json     ← Persisted Canva mentions
  slack-mentions-cache.json     ← Persisted Slack @mentions
  slack-threads-cache.json      ← Persisted thread contents (see Slack section)
  slack-users-cache.json        ← Persisted Slack user → avatar URL map
  figma-mentions-cache.json     ← Persisted Figma comment mentions
  calendar-cache.json           ← Persisted Google Calendar events
  calendar-weeks-cache.json     ← Persisted weekly calendar view data
  sprint-capacity-cache.json    ← Persisted sprint capacity data

public/
  fonts/                        ← Canva Sans woff/woff2 (served locally)
  icons/                        ← SVG icon set
  loopi-loading.gif / .webp     ← Loading animation

middleware.ts                   ← Password gate (see Auth section)
vercel.json                     ← Cron job definitions
tailwind.config.ts              ← Tailwind: dark mode via [data-theme="dark"] selector
```

---

## Navigation Views

The app is a single-page app. Views are controlled by `activeView` state in `app/page.tsx`.

| `View` value | Nav label | Component rendered | Notes |
|---|---|---|---|
| `updates` | Summary | `UpdatesPage` | Default view; merged feed from all sources |
| `tasks` | Tasks | `MyTasks` | My open Jira tickets |
| `jira-projects` | Jira Projects | `KanbanBoard` + `TimelineTab` | Toggled by `jiraTab` state |
| `capacity` | Capacity | `CapacityView` + `CalendarWeekGrid` | Needs Google Calendar |
| `comms` | Mentions | `CommsTrail` | Chronological; pin decisions for export |
| `settings` | — | `SettingsView` | Accessed via cog icon, not nav |

URL params: `?view=<viewId>` sets the initial view (used by OAuth callback redirects). The param is stripped from the URL after reading so reloads always go to Summary.

---

## Database Schema (`data/hub.db`)

```sql
-- OAuth tokens for Canva, Google
oauth_tokens (
  provider TEXT PRIMARY KEY,    -- 'canva' | 'google'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry INTEGER,               -- Unix ms; null = no expiry
  email TEXT
)

-- Key-value config store
app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)

-- Decisions pinned from Comms Trail for stakeholder export
pinned_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,         -- 'jira' | 'slack' | 'canva'
  source_id TEXT NOT NULL UNIQUE,
  project TEXT,
  summary TEXT NOT NULL,
  note TEXT,
  link TEXT,
  pinned_at TEXT NOT NULL
)
```

**Important `app_config` keys:**
- `jira.baseUrl`, `jira.email`, `jira.apiToken`, `jira.projectKeys`
- `slack.botToken`, `slack.userToken`, `slack.channelIds`, `slack.myUserId`
- `figma.accessToken`, `figma.teamIds`, `figma.myHandle`
- `canva.clientId`, `canva.clientSecret`
- `canva.myUserId` — auto-detected on first OAuth connect (`oUYiGArSHk3zJTeyOYfyWA`)
- `canva.pkce_verifier` — temporary PKCE state during OAuth flow (deleted after use)
- `google.clientId`, `google.clientSecret`

**DB vs env var precedence:** DB values always win. Pattern used throughout:
```typescript
return getConfig('slack.botToken') ?? process.env.SLACK_BOT_TOKEN ?? ''
```

---

## Token Store (`lib/token-store.ts`)

This is the **correct abstraction for OAuth tokens and async config**. Use it instead of `lib/db.ts` directly for anything that needs to work on Vercel:

```typescript
import { getToken, saveToken, deleteToken } from '@/lib/token-store'
import { getKvConfig, setKvConfig, deleteKvConfig } from '@/lib/token-store'
```

- **Locally:** delegates to SQLite (`lib/db.ts`)
- **On Vercel:** uses Vercel KV (Redis) — auto-detected via `KV_REST_API_URL` env var

`setKvConfig` accepts optional `ttlSeconds` for expiring entries (used for PKCE verifier).

---

## Environment Variables

All live in `.env.local`. Copy `.env.local.example` to get started. Credentials can also be saved via the Settings UI (stored in `app_config` DB; takes precedence over env vars).

```bash
# Jira
JIRA_BASE_URL=https://yourorg.atlassian.net
NEXT_PUBLIC_JIRA_BASE_URL=https://yourorg.atlassian.net  # REQUIRED — baked into client bundle for ticket links
JIRA_EMAIL=you@yourorg.com
JIRA_API_TOKEN=                    # id.atlassian.com → Security → API tokens
JIRA_PROJECT_KEYS=DESIGN,PLATFORM  # comma-separated
JIRA_HANDOVER_FIELD=               # optional: custom field ID e.g. customfield_10282
JIRA_ACCOUNT_ID=                   # optional: auto-detected if blank (speeds up my-tickets query)

# Slack
SLACK_BOT_TOKEN=xoxb-...           # api.slack.com/apps → OAuth & Permissions
SLACK_USER_TOKEN=xoxp-...          # optional: needed for threads in private/DM channels
SLACK_CHANNEL_IDS=C012,C345        # comma-separated channel IDs
SLACK_MY_USER_ID=U02TBJZJJCB       # your Slack member ID (for @mention filtering)

# Canva (OAuth 2.0 + PKCE)
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URI=http://127.0.0.1:3000/api/auth/canva/callback

# Google Calendar (OAuth 2.0)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/auth/google/callback

# Figma
FIGMA_ACCESS_TOKEN=figd_...        # figma.com → Settings → Security → Personal access tokens
FIGMA_TEAM_IDS=123456789           # comma-separated numeric team IDs (from team URL)
FIGMA_MY_HANDLE=Garett MacGillivray  # your display name in Figma (for mention detection)
FIGMA_FILE_KEYS=                   # optional: comma-separated file keys to scan directly

# AI (optional — disables AI features if not set)
ANTHROPIC_API_KEY=                 # for AI chat panel (Codex-3-5-haiku)
OPENAI_API_KEY=                    # for thread summaries (gpt-4o-mini)

# Auth (optional — leave blank for local dev, set for hosted)
DASHBOARD_PASSWORD=                # enables login gate if set
```

**Garett's actual values (local .env.local):**
- `JIRA_BASE_URL` / `NEXT_PUBLIC_JIRA_BASE_URL`: `https://canva.atlassian.net`
- `JIRA_EMAIL`: `garett@canva.com`
- `JIRA_PROJECT_KEYS`: `CNAV,CPAS`
- `JIRA_HANDOVER_FIELD`: `customfield_10282`
- `SLACK_MY_USER_ID`: `U02TBJZJJCB`
- `FIGMA_TEAM_IDS`: `918313147957225785,1092958592705332208`
- `FIGMA_MY_HANDLE`: `Garett MacGillivray`
- `CANVA_REDIRECT_URI`: `http://127.0.0.1:3000/api/auth/canva/callback`

---

## Canva Integration — Key Details

**Why Canva OAuth is non-trivial:**
- Requires PKCE (mandatory) — `code_challenge = BASE64URL(SHA256(code_verifier))`
- Token exchange uses **Basic auth header** (`Authorization: Basic base64(clientId:clientSecret)`), NOT body params
- Required scopes: `design:meta:read comment:read profile:read` (defined in `lib/canva.ts → CANVA_SCOPES`)
- Redirect URI **must use `127.0.0.1`** not `localhost` (Canva portal requirement)
- PKCE verifier stored in `token-store` (`canva.pkce_verifier`) to survive the localhost/127.0.0.1 domain split during the redirect

**Mention detection strategy (`lib/canva.ts → fetchMentions()`):**
1. List up to 200 designs sorted `modified_descending`, `ownership=any` (2 pages × 100)
2. Filter to designs updated in last 60 days
3. Fetch comments for each design
4. Filter comments where `comment.mentions[myUserId]` exists
5. Return as `CanvaMention[]` (type defined in `app/api/canva/route.ts`)

**Garett's Canva user ID:** `oUYiGArSHk3zJTeyOYfyWA` (auto-detected and stored in DB on first OAuth)

---

## Slack Thread Caching — Known Limitation & Fix

**Root cause:** The `xoxb-` bot token cannot read channel history on Canva's Enterprise Slack (`channel_not_found` / `not_in_channel`). The bot lacks `groups:history`/`im:history` scopes and isn't invited to channels. Live thread fetch always fails.

**The solution:** Use the **Slack MCP tool** (`mcp__...__slack_read_thread`) to fetch threads via Garett's user session, then write them to `data/slack-threads-cache.json`. The thread API route falls back to this disk cache.

**How to refresh threads in a new session (do this when threads are empty):**
1. Read `data/slack-mentions-cache.json` to get current mentions
2. Extract unique `channel:ts` pairs — use `m.thread_ts ?? m.ts` for each mention
3. For each pair, call `slack_read_thread` MCP tool with `channel` and `thread_ts`
4. Parse each response into `ThreadMessage[]` (see format below)
5. Write to `data/slack-threads-cache.json`: `{ "synced_at": "...", "threads": { "CHANNEL:TS": [...] } }`

**MCP response format:**
```
THREAD: <parent message text> [Author Name]

> Author Name: reply text
> Another Author: another reply
```

**ThreadMessage type** (from `app/api/slack/thread/route.ts`):
```typescript
type ThreadMessage = {
  author: string
  text: string
  ts: string          // parent ts for first msg; synthetic (parentTs + 0.001*i) for replies
  is_parent?: boolean // true on first message only
  is_me?: boolean     // true when author === "Garett MacGillivray"
  reactions?: { name: string; count: number }[]
  files?: { url: string; name: string; mimetype: string; thumb_url?: string }[]
}
```

**Cache key format:** `"${channel}:${ts}"` — e.g. `"C08FSPS24HX:1777942991.272989"`

**Garett's identity for `is_me`:** name `"Garett MacGillivray"`, Slack ID `U02TBJZJJCB`

**Working parse script:** `/tmp/build_thread_cache.py` — reuse if it exists. To recreate:
- Split MCP text on parent match: `re.match(r'^THREAD:\s*(.*?)\s*\[([^\]]+)\]', text, re.DOTALL)`
- Split replies on: `re.split(r'\n(?=> [^>][^:]*: )', remainder)`
- Match each reply: `re.match(r'^> ([^>][^:]*): (.+)', block, re.DOTALL)`

---

## Jira API Route — Actions

`POST /api/jira` handles multiple operations via fields in the JSON body:

```typescript
// Transition a ticket
{ action: 'transition', key: 'CNAV-123', transitionId: '31' }

// Create a single ticket (manual)
{ summary: '...', projectKey: 'CNAV', priority: 'Medium', dueDate: '2026-06-01',
  epicKey: 'CNAV-100', sprintId: 42, description: '...' }

// Create from template (with Canva-specific fields)
{ summary: '...', projectKey: 'CNAV', estimateSeconds: 3600,
  designStatus: 'In Design', categoryOfWork: 'New Capability',
  docLink: '...', prototypeLink: '...', initialStatus: 'In Progress' }

// Batch template creation
{ batch: true, tickets: [ ...templateTicket[] ] }
```

`POST /api/jira/[key]` handles ticket mutations:
```typescript
{ action: 'comment', body: AdfDoc }          // Add ADF comment
{ action: 'link', url: '...', title: '...' } // Add remote link
{ action: 'update', fields: {...} }           // Update fields
```

---

## Patterns & Conventions

### Credential resolution (DB > env var > empty string)
```typescript
export function getSomething(): string {
  return getConfig('integration.key') ?? process.env.INTEGRATION_KEY ?? ''
}
```
Always follow this pattern when reading credentials. Never hardcode.

### Disk cache pattern (JSON files)
```typescript
// Read
if (fs.existsSync(CACHE_PATH)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
}
// Write (always use DATA_DIR, never process.cwd())
import { DATA_DIR } from '@/lib/data-dir'
const CACHE_PATH = path.join(DATA_DIR, 'something-cache.json')
fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2))
```

### In-memory cache pattern (Jira/Slack)
```typescript
const memCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 min
// Bust cache: call bustCache() or pass ?bust=1 to GET /api/jira or /api/slack
```

### Merge-by-ID cache update
New items are added, existing items preserved. Never blow away the whole cache — always merge. Pattern: `{ ...existingById, ...newById }` keyed by a stable ID.

### Hydration safety
- Never read `window.*` or `document.*` in `useState` initialisers
- Use `useEffect` for anything browser-specific
- URL-based view routing lives in a `useEffect` in `app/page.tsx`

### After any Jira mutation
Call `refreshJira()` (in `page.tsx`) — does a lightweight `/api/jira?bust=1` without re-fetching Slack/Canva/Figma.

### Vercel filesystem
All file writes must use `DATA_DIR` from `lib/data-dir.ts`:
- Local: `data/` (relative to project root)
- Vercel: `/tmp/data/` (only `/tmp` is writable; ephemeral between cold starts)
- **Credentials must be env vars on Vercel** — DB doesn't persist across lambda invocations

---

## Theme System

Dark/light mode is managed by `ThemeProvider.tsx` which sets `data-theme="dark"|"light"` on `<html>`. Tailwind uses `darkMode: ['selector', '[data-theme="dark"]']`.

Styles use CSS custom properties from `styles/theme.css` which maps semantic tokens (`--color-bg`, `--color-text-primary`, etc.) to Canva design system variables (`--pdSurface0`, `--pdTextStrong`, etc.). **Edit `styles/theme.css` to restyle the app.**

Canva Sans is served locally from `public/fonts/` and set as the default font.

---

## Auth / Password Protection

`middleware.ts` gates all routes behind a password cookie.
- Set `DASHBOARD_PASSWORD` env var to enable. If unset, all traffic passes (dev mode).
- Cookie name: `pd_auth`, matches the password value directly, httpOnly
- Login page: `/login` → `POST /api/auth/login`
- Logout: `POST /api/auth/logout` (clears cookie)
- Always allowed through (no auth check): `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`

---

## AI Features

| Feature | Route | Model | Notes |
|---|---|---|---|
| Thread summary | `POST /api/slack/summarize` | gpt-4o-mini | Summarises a `ThreadMessage[]` array |
| Smart reply drafts | `POST /api/ai` | gpt-4o-mini | Generates reply suggestions |
| AI chat | `POST /api/chat` | Codex-3-5-haiku | Streaming; receives full context from `page.tsx` |

AI features gracefully degrade if keys are not set (buttons hidden or disabled).

---

## Vercel Deployment Guide

### 1. One-time Vercel setup
1. Push repo to GitHub
2. Import project in Vercel dashboard → auto-detects Next.js
3. In Vercel dashboard → Storage → Create a KV store → Link to project
   - Auto-provisions `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars
   - KV stores OAuth tokens (Canva, Google) + PKCE state across cold starts

### 2. Set environment variables in Vercel dashboard
```
# Required
NEXT_PUBLIC_JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEYS
SLACK_BOT_TOKEN, SLACK_CHANNEL_IDS, SLACK_MY_USER_ID
CANVA_CLIENT_ID, CANVA_CLIENT_SECRET
CANVA_REDIRECT_URI=https://your-app.vercel.app/api/auth/canva/callback
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
FIGMA_ACCESS_TOKEN, FIGMA_TEAM_IDS, FIGMA_MY_HANDLE
ANTHROPIC_API_KEY, OPENAI_API_KEY

# Optional
DASHBOARD_PASSWORD=some-secret   # enables login gate
JIRA_HANDOVER_FIELD=customfield_10282
JIRA_ACCOUNT_ID=                 # auto-detected if blank
```

### 3. Update OAuth redirect URIs before first deploy
- **Canva developer portal** (developers.canva.com): add `https://your-app.vercel.app/api/auth/canva/callback`
- **Google Cloud Console**: add `https://your-app.vercel.app/api/auth/google/callback`

### 4. After deploy
- Visit `/login`, set your password
- Go to Settings → connect Canva OAuth → connect Google Calendar OAuth
- Tokens stored in Vercel KV survive cold starts

### Vercel Cron Jobs
```json
{ "path": "/api/canva/sync", "schedule": "17 */4 * * *" }   // every 4 hours
{ "path": "/api/jira?bust=1", "schedule": "7 */1 * * *" }    // hourly
{ "path": "/api/slack?bust=1", "schedule": "13 */1 * * *" }  // hourly
```

---

## Jira Setup Reference

1. Go to `https://id.atlassian.com` → **Security** → **API tokens** → Create token
2. Set `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_BASE_URL`
3. `JIRA_PROJECT_KEYS`: comma-separated project keys visible in your Jira URL (e.g. `CNAV,CPAS`)
4. `JIRA_HANDOVER_FIELD`: find by inspecting a ticket's API response (`/rest/api/3/issue/KEY`) — look for `customfield_XXXXX` with your handover date
5. `JIRA_ACCOUNT_ID`: optional — your Jira user account ID (speeds up my-tickets query). Auto-detected via `/rest/api/3/myself` if blank.

## Slack Setup Reference

1. Go to `https://api.slack.com/apps` → Create App → From scratch
2. **Bot Token Scopes** (OAuth & Permissions): `channels:history`, `channels:read`, `chat:write`, `reactions:read`, `users:read`, `emoji:read`
3. Install to workspace → copy **Bot User OAuth Token** (`xoxb-...`)
4. `SLACK_CHANNEL_IDS`: find by right-clicking a channel → View channel details → bottom of About tab
5. `SLACK_MY_USER_ID`: click your name in Slack → View full profile → Copy member ID
6. **Enterprise Slack limitation**: bot token cannot read private channel threads. Use MCP to populate thread cache instead (see Slack Thread Caching section above).

## Figma Setup Reference

1. Go to `figma.com` → Settings → Security → **Personal access tokens** → Create new
2. `FIGMA_TEAM_IDS`: from Figma team URL `figma.com/files/team/XXXXXXXXX/...` — that number
3. `FIGMA_MY_HANDLE`: your exact display name in Figma (used for mention detection in comments)

## Canva Setup Reference

1. Go to `developers.canva.com` → Create integration
2. Required scopes: `design:meta:read`, `comment:read`, `profile:read`
3. Add redirect URI: `http://127.0.0.1:3000/api/auth/canva/callback` (must be 127.0.0.1, not localhost)
4. Copy Client ID + Client Secret → Settings UI or `.env.local`
5. Click Connect in Settings → completes OAuth → user ID auto-stored in DB

## Google Calendar Setup Reference

1. Go to `console.cloud.google.com` → Create/select project
2. Enable **Google Calendar API**
3. Create credentials → OAuth 2.0 Client ID → Web application
4. Add authorised redirect URI: `http://127.0.0.1:3000/api/auth/google/callback`
5. Copy Client ID + Client Secret → Settings UI or `.env.local`
6. Click Connect in Settings → completes OAuth

---

## Key People / Identity

| Identity | Value |
|---|---|
| Garett's Jira email | `garett@canva.com` |
| Garett's Slack user ID | `U02TBJZJJCB` |
| Garett's Slack display name | `Garett MacGillivray` |
| Garett's Canva user ID | `oUYiGArSHk3zJTeyOYfyWA` |
| Garett's Figma handle | `Garett MacGillivray` |
| Jira base URL | `https://canva.atlassian.net` |
| Jira projects | `CNAV`, `CPAS` |
| Figma team IDs | `918313147957225785`, `1092958592705332208` |

---

## Current State (last updated 2026-05-27)

- ✅ Jira — fully working; epics, my tickets, kanban, timeline, create/update/transition
- ✅ Slack mentions — working; 14-day window, @mention filter on public channels
- ✅ Slack threads — 93 cached threads in `data/slack-threads-cache.json` (last populated 2026-05-27); live fetch disabled due to Enterprise bot token limitation (see Slack Thread section)
- ✅ Canva OAuth — fully working; token stored, user ID auto-detected (`oUYiGArSHk3zJTeyOYfyWA`)
- ✅ Canva mentions — syncing; cached in `data/canva-mentions-cache.json`
- ✅ Figma — working; credentials read from DB or env var
- ✅ Google Calendar OAuth — flow complete end-to-end
- ✅ AI chat — streaming via Anthropic Codex-3-5-haiku
- ✅ Thread summaries — via OpenAI gpt-4o-mini
- ✅ Sync Now — fires Jira + Slack + Canva + Figma in parallel
- ✅ Dark/light mode — persisted in localStorage via ThemeProvider
- ✅ Onboarding wizard — shows on first run when no integrations connected
- ✅ Stakeholder export — pinned decisions → `/export` print page
- ✅ KanbanBoard — "Add ticket" pre-selects active project filter
- ✅ Creating/updating tickets — auto-busts Jira cache via `refreshJira()`
- ✅ Settings page — clear step-by-step setup instructions per integration
- ✅ Password protection — middleware.ts + cookie auth (disabled locally, enable via DASHBOARD_PASSWORD)

## Known Architecture Notes

- `lib/figma.ts` exports `getAccessToken()`, `getMyHandle()`, `getTeamIds()`, `isConfigured()` — always use these, never read env vars directly in figma-related code
- `TemplateTaskModal` accepts `defaultProjectKey?: string` prop to pre-select a project
- `openCreateModal()` in `page.tsx` accepts `{ tab?, sprint?, projectKey? }` — all optional
- `MyTasks.tsx` passes `filterProject` as `projectKey` when opening create modal from the board
- `refreshJira()` in `page.tsx` is the fast Jira-only refetch — use after any Jira mutation, not the full sync
- PKCE verifier stored via `setKvConfig('canva.pkce_verifier', verifier, 600)` (10-min TTL) — NOT cookies, to avoid localhost/127.0.0.1 domain split
- `CanvaMention` and `CanvaMentionsCache` types are exported from `app/api/canva/route.ts` (not lib/)
- `FigmaMention` type is exported from `app/api/figma/route.ts` (not lib/)
- `JiraEpic`, `JiraTicket`, `SprintInfo` etc. are exported from `lib/jira.ts`
- `SlackMessage` is exported from `lib/slack.ts`
- ADF (`lib/adf.ts`) is **browser-only** — do not import in API routes. `adf-renderer.tsx` works everywhere.
- `lib/slackMarkdown.ts` renders Slack mrkdwn to HTML strings (not React). Used by `SlackText.tsx`.
- `lib/avatarStore.ts` and `lib/emojiStore.ts` are browser singletons — do not use in API routes.

## Garett's Preferences (working with Codex)

- **Save credentials directly** to `.env.local` without asking
- **Auto-restart the dev server** after env var or code changes
- Goal is a **hosted, self-contained app** — no Codex or MCP dependencies at runtime
- Dev server runs on `http://127.0.0.1:3000` (not `localhost:3000`) for OAuth compatibility
- When threads are empty, use MCP to repopulate the cache (don't ask about user tokens)
