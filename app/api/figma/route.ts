import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { fetchFigmaMentions, isConfigured } from '@/lib/figma'
import { DATA_DIR } from '@/lib/data-dir'

export type { FigmaMention, FigmaReply } from '@/lib/figma'

const CACHE_PATH = path.join(DATA_DIR, 'figma-mentions-cache.json')

export type FigmaMentionsCache = {
  synced_at: string
  mentions: import('@/lib/figma').FigmaMention[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Full resync only when explicitly requested (bust=1) — scanning 100+ files is too slow for page load
  if (searchParams.get('bust') === '1' && isConfigured()) {
    try {
      const mentions = await fetchFigmaMentions()
      const cache: FigmaMentionsCache = { synced_at: new Date().toISOString(), mentions }
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
      return NextResponse.json({ available: true, ...cache })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[/api/figma GET bust]', message)
    }
  }

  // Normal load: serve from pre-fetched cache
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
      const data = JSON.parse(raw) as FigmaMentionsCache
      return NextResponse.json({ available: true, ...data })
    } catch {
      // Fall through
    }
  }

  return NextResponse.json({ available: false, mentions: [] })
}
