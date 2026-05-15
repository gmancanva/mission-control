import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { DATA_DIR } from './data-dir'

export type OAuthToken = {
  provider: string
  access_token: string
  refresh_token: string | null
  expiry: number | null   // Unix ms
  email: string | null
}

export type PinnedDecision = {
  id: number
  source: 'jira' | 'slack' | 'canva'
  source_id: string
  project: string | null
  summary: string
  note: string | null
  link: string | null
  pinned_at: string
}

const DB_DIR = DATA_DIR
const DB_PATH = path.join(DB_DIR, 'hub.db')

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  _db = new Database(DB_PATH)

  // Enable WAL mode for better concurrent reads
  _db.pragma('journal_mode = WAL')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS pinned_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL UNIQUE,
      project TEXT,
      summary TEXT NOT NULL,
      note TEXT,
      link TEXT,
      pinned_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expiry INTEGER,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  return _db
}

export function pinDecision(
  entry: Omit<PinnedDecision, 'id'>
): PinnedDecision {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO pinned_decisions (source, source_id, project, summary, note, link, pinned_at)
    VALUES (@source, @source_id, @project, @summary, @note, @link, @pinned_at)
    ON CONFLICT(source_id) DO UPDATE SET
      summary = excluded.summary,
      note = excluded.note,
      link = excluded.link,
      pinned_at = excluded.pinned_at
  `)
  const result = stmt.run(entry)
  const id =
    typeof result.lastInsertRowid === 'bigint'
      ? Number(result.lastInsertRowid)
      : (result.lastInsertRowid as number)

  const saved = getPinnedDecisions().find((d) => d.source_id === entry.source_id)
  if (!saved) throw new Error(`Failed to read back pinned decision for source_id: ${entry.source_id}`)
  return saved
}

export function unpinDecision(sourceId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM pinned_decisions WHERE source_id = ?').run(sourceId)
}

export function getPinnedDecisions(): PinnedDecision[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM pinned_decisions ORDER BY pinned_at DESC')
    .all() as PinnedDecision[]
}

export function updateNote(sourceId: string, note: string): void {
  const db = getDb()
  db.prepare('UPDATE pinned_decisions SET note = ? WHERE source_id = ?').run(
    note,
    sourceId
  )
}

export function saveOAuthToken(token: OAuthToken): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO oauth_tokens (provider, access_token, refresh_token, expiry, email)
    VALUES (@provider, @access_token, @refresh_token, @expiry, @email)
    ON CONFLICT(provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, oauth_tokens.refresh_token),
      expiry = excluded.expiry,
      email = excluded.email
  `).run(token)
}

export function getOAuthToken(provider: string): OAuthToken | null {
  const db = getDb()
  return (db.prepare('SELECT * FROM oauth_tokens WHERE provider = ?').get(provider) as OAuthToken | undefined) ?? null
}

export function deleteOAuthToken(provider: string): void {
  const db = getDb()
  db.prepare('DELETE FROM oauth_tokens WHERE provider = ?').run(provider)
}

export function getConfig(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setConfig(key: string, value: string): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO app_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

export function deleteConfig(key: string): void {
  const db = getDb()
  db.prepare('DELETE FROM app_config WHERE key = ?').run(key)
}
