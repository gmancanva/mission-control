export type FigmaReply = {
  id: string
  author: string
  author_avatar_url?: string
  text: string
  created_at: string
}

export type FigmaMention = {
  id: string
  file_key: string
  file_name: string
  file_url: string
  author: string
  author_avatar_url?: string
  text: string
  created_at: string
  node_id?: string
  frame_thumbnail_url?: string
  reply_count?: number
  replies?: FigmaReply[]
}

type FigmaComment = {
  id: string
  file_key: string
  user: { handle: string; id: string; img_url?: string }
  created_at: string
  resolved_at: string | null
  message: string
  client_meta?: { node_id?: string }
  parent_id?: string
}

type FigmaFile = {
  key: string
  name: string
  last_modified: string
  thumbnail_url: string
}

type FigmaProject = {
  id: string
  name: string
}

import { getConfig } from './db'

const BASE = 'https://api.figma.com/v1'

function authHeaders(token: string) {
  return { 'X-Figma-Token': token }
}

// Config helpers — DB values take precedence over env vars (same pattern as other integrations)
export function getAccessToken(): string {
  return getConfig('figma.accessToken') ?? process.env.FIGMA_ACCESS_TOKEN ?? ''
}

export function getMyHandle(): string {
  return getConfig('figma.myHandle') ?? process.env.FIGMA_MY_HANDLE ?? ''
}

export function getTeamIds(): string[] {
  const raw = getConfig('figma.teamIds') ?? process.env.FIGMA_TEAM_IDS ?? ''
  return raw.split(',').map(id => id.trim()).filter(Boolean)
}

export function isConfigured(): boolean {
  return !!getAccessToken()
}

async function getProjects(token: string, teamId: string): Promise<FigmaProject[]> {
  const res = await fetch(`${BASE}/teams/${teamId}/projects`, { headers: authHeaders(token) })
  if (!res.ok) return []
  const data = await res.json() as { projects: FigmaProject[] }
  return data.projects ?? []
}

async function getProjectFiles(token: string, projectId: string, since: Date): Promise<FigmaFile[]> {
  const res = await fetch(`${BASE}/projects/${projectId}/files`, { headers: authHeaders(token) })
  if (!res.ok) return []
  const data = await res.json() as { files: FigmaFile[] }
  return (data.files ?? []).filter(f => new Date(f.last_modified) >= since)
}

async function getFileComments(token: string, fileKey: string): Promise<FigmaComment[]> {
  const res = await fetch(`${BASE}/files/${fileKey}/comments`, { headers: authHeaders(token) })
  if (!res.ok) return []
  const data = await res.json() as { comments: FigmaComment[] }
  return data.comments ?? []
}

async function getFileByKey(token: string, fileKey: string): Promise<{ name: string } | null> {
  const res = await fetch(`${BASE}/files/${fileKey}?depth=1`, { headers: authHeaders(token) })
  if (!res.ok) return null
  const data = await res.json() as { name: string }
  return data
}

function mentionsUser(text: string, handle: string): boolean {
  const name = handle.toLowerCase()
  const first = name.split(' ')[0]
  const lower = text.toLowerCase()
  return lower.includes(`@${name}`) || lower.includes(`@${first}`)
}

export async function fetchFigmaMentions(): Promise<FigmaMention[]> {
  const token = getAccessToken()
  if (!token) return []

  const myHandle = getMyHandle()
  if (!myHandle) return [] // can't detect mentions without a handle configured
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days back
  const mentions: FigmaMention[] = []
  const seenFileKeys = new Set<string>()

  // Collect file keys from explicit list and team discovery
  const explicitKeys = (process.env.FIGMA_FILE_KEYS ?? '')
    .split(',').map(k => k.trim()).filter(Boolean)

  const teamIds = getTeamIds()

  const filesToScan: Array<{ key: string; name: string; url: string }> = []

  // Explicit file keys
  for (const key of explicitKeys) {
    if (seenFileKeys.has(key)) continue
    seenFileKeys.add(key)
    const meta = await getFileByKey(token, key)
    if (meta) filesToScan.push({ key, name: meta.name, url: `https://www.figma.com/design/${key}` })
  }

  // Team-based discovery
  for (const teamId of teamIds) {
    const projects = await getProjects(token, teamId)
    for (const project of projects) {
      const files = await getProjectFiles(token, project.id, since)
      for (const file of files) {
        if (seenFileKeys.has(file.key)) continue
        seenFileKeys.add(file.key)
        filesToScan.push({
          key: file.key,
          name: file.name,
          url: `https://www.figma.com/design/${file.key}`,
        })
      }
    }
  }

  // Fetch comments for each file
  for (const file of filesToScan) {
    const comments = await getFileComments(token, file.key)

    // Build reply map: parent_id → reply comments
    const replyMap = new Map<string, FigmaComment[]>()
    for (const c of comments) {
      if (!c.parent_id) continue
      const arr = replyMap.get(c.parent_id) ?? []
      arr.push(c)
      replyMap.set(c.parent_id, arr)
    }

    for (const c of comments) {
      if (c.parent_id) continue // skip replies here; they're collected via replyMap
      if (c.resolved_at) continue
      if (!mentionsUser(c.message, myHandle)) continue
      if (new Date(c.created_at) < since) continue

      const rawReplies = replyMap.get(c.id) ?? []
      const replies: FigmaReply[] = rawReplies.map(r => ({
        id: r.id,
        author: r.user.handle,
        author_avatar_url: r.user.img_url,
        text: r.message,
        created_at: r.created_at,
      }))

      mentions.push({
        id: c.id,
        file_key: file.key,
        file_name: file.name,
        file_url: file.url,
        author: c.user.handle,
        author_avatar_url: c.user.img_url,
        text: c.message,
        created_at: c.created_at,
        node_id: c.client_meta?.node_id,
        reply_count: replies.length,
        replies,
      })
    }
  }

  // Batch-fetch frame thumbnails grouped by file
  const byFile = new Map<string, FigmaMention[]>()
  for (const m of mentions) {
    if (!m.node_id) continue
    const arr = byFile.get(m.file_key) ?? []
    arr.push(m)
    byFile.set(m.file_key, arr)
  }
  for (const [fileKey, fileMentions] of byFile) {
    const ids = fileMentions.map(m => m.node_id!).join(',')
    try {
      const params = new URLSearchParams({ ids, format: 'png', scale: '1' })
      const res = await fetch(`${BASE}/images/${fileKey}?${params}`, { headers: authHeaders(token) })
      if (res.ok) {
        const data = await res.json() as { err: string | null; images: Record<string, string | null> }
        if (!data.err) {
          for (const m of fileMentions) {
            if (m.node_id) {
              m.frame_thumbnail_url = data.images[m.node_id] ?? undefined
            }
          }
        }
      }
    } catch { /* skip thumbnails on error */ }
  }

  mentions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return mentions
}
