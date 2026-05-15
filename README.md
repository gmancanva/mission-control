# Mission Control — PD Tracker

A personal dashboard for Product Designers to track work across Jira, Slack, Figma, Canva, and Google Calendar — without switching tabs all day.

Built with Next.js 14, SQLite, and the Anthropic/OpenAI APIs.

---

## What it does

| Tab | What you get |
|---|---|
| **Updates** | Unified feed of Jira mentions, Slack messages, Figma comments, and Canva design mentions |
| **Kanban** | Board across all your Jira projects with drag-to-move and quick ticket creation |
| **Timeline** | Gantt-style view of epics and milestones from start to handover |
| **My Tasks** | All open Jira tickets assigned to you, filterable by project |
| **Comms Trail** | Chronological log of comments and messages; pin decisions for stakeholder export |
| **Export** | Clean, printable stakeholder report with project summaries and pinned decisions |
| **AI Chat** | Ask questions about your work — gets live context from all your integrations |

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/gmancanva/pd-tracker.git
cd pd-tracker
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your credentials. See the sections below for how to get each one.

> **Access at `http://127.0.0.1:3000`** — not `localhost:3000`. This matters for Canva OAuth.

### 3. Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:3000` — the onboarding wizard will guide you through connecting each integration.

---

## Integrations & setup

### Jira (~2 min)

1. Go to [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) → Security → Create API token
2. Add to `.env.local`:

```
JIRA_BASE_URL=https://yourorg.atlassian.net
NEXT_PUBLIC_JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@yourorg.com
JIRA_API_TOKEN=your-token-here
JIRA_PROJECT_KEYS=DESIGN,PLATFORM        # comma-separated project keys
JIRA_HANDOVER_FIELD=customfield_10234    # optional: custom field ID for handover date
JIRA_ACCOUNT_ID=                         # optional: auto-detected if blank
```

---

### Slack (~5 min)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
2. Under **OAuth & Permissions**, add Bot Token Scopes:
   `channels:history`, `channels:read`, `users:read`, `reactions:read`
3. Install to workspace, copy the Bot User OAuth Token (`xoxb-...`)
4. Invite the bot to each channel you want to track: `/invite @your-bot-name`
5. Find your Slack user ID: click your profile → More → copy Member ID
6. Add to `.env.local`:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_IDS=C012345,C067890        # comma-separated channel IDs
SLACK_MY_USER_ID=U012345678              # your Slack user ID (for mention filtering)
```

---

### Figma (~2 min)

1. Go to figma.com → click your avatar → Settings → Security → Personal access tokens
2. Create a token (starts with `figd_`)
3. Find your Team ID from the URL: `figma.com/files/team/{TEAM_ID}/...`
4. Add to `.env.local`:

```
FIGMA_ACCESS_TOKEN=figd_...
FIGMA_TEAM_IDS=123456789                 # comma-separated numeric team IDs
FIGMA_MY_HANDLE=Your Name               # your display name in Figma
```

---

### Canva (~5 min, requires OAuth)

1. Go to [developers.canva.com](https://www.canva.com/developers/) → Create an integration
2. Set type to **Web application**
3. Add scopes: `design:meta:read`, `comment:read`, `profile:read`
4. Add redirect URI: `http://127.0.0.1:3000/api/auth/canva/callback`
5. Copy your Client ID and Client Secret
6. Add to `.env.local`:

```
CANVA_CLIENT_ID=your-client-id
CANVA_CLIENT_SECRET=your-client-secret
CANVA_REDIRECT_URI=http://127.0.0.1:3000/api/auth/canva/callback
```

7. Restart the dev server, go to **Settings → Canva**, and click **Connect with Canva**

---

### Google Calendar (~5 min, requires OAuth)

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Add authorised redirect URI: `http://127.0.0.1:3000/api/auth/google/callback`
4. Enable the **Google Calendar API** in your project
5. Add to `.env.local`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/auth/google/callback
```

6. Restart the dev server, go to **Settings → Google Calendar**, and click **Connect Google Calendar**

---

### AI features (optional)

For AI thread summaries, smart replies, and the chat panel:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

---

## Password protection (optional)

To add a login gate when running on a shared server or deploying to Vercel:

```
DASHBOARD_PASSWORD=your-secret-password
```

When set, all routes require a password cookie. Visit `/login` to authenticate.

---

## Deploying to Vercel

1. Push to GitHub and import the project in the Vercel dashboard
2. Add all environment variables from `.env.local` in Vercel's project settings
3. For Canva and Google OAuth: update redirect URIs to your Vercel URL in the respective developer portals
4. Cron jobs are pre-configured in `vercel.json` to sync data every hour (Jira/Slack) or every 4 hours (Canva)

> Note: SQLite (`data/hub.db`) is ephemeral on Vercel. Credentials saved via the Settings UI won't persist between cold starts — always use environment variables on Vercel.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + CSS variables |
| Database | SQLite via `better-sqlite3` |
| AI | Anthropic Claude (chat) + OpenAI GPT-4o-mini (summaries) |
| Hosting | Vercel (with cron jobs) |
