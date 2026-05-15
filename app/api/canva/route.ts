import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { DATA_DIR } from '@/lib/data-dir'

const CACHE_PATH = path.join(DATA_DIR, 'canva-mentions-cache.json')

export type CanvaReply = {
  id: string
  author: string
  author_avatar_url?: string
  text: string
  created_at: string
}

export type CanvaMention = {
  id: string
  design_id: string
  design_title: string
  design_url: string
  design_thumbnail_url?: string
  author: string
  author_avatar_url?: string
  text: string
  created_at: string
  reply_count?: number
  replies?: CanvaReply[]
}

export type CanvaMentionsCache = {
  synced_at: string
  mentions: CanvaMention[]
}

export async function GET() {
  if (!fs.existsSync(CACHE_PATH)) {
    return NextResponse.json({ available: false, mentions: [] })
  }

  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const data = JSON.parse(raw) as CanvaMentionsCache
    return NextResponse.json({ available: true, ...data })
  } catch {
    return NextResponse.json({ available: false, mentions: [] })
  }
}
