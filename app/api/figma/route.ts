import { NextResponse } from 'next/server'
import { fetchFigmaMentions, isConfigured } from '@/lib/figma'
import { readCache, mergeAndWrite } from '@/lib/json-cache'
import type { FigmaMention } from '@/lib/figma'

export type { FigmaMention, FigmaReply } from '@/lib/figma'

export const dynamic = 'force-dynamic'

export type FigmaMentionsCache = {
  synced_at: string
  mentions: FigmaMention[]
}

const CACHE_FILE = 'figma-mentions-cache.json'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Full resync only when explicitly requested (bust=1) — scanning 100+ files is too slow for page load
  if (searchParams.get('bust') === '1' && isConfigured()) {
    try {
      const mentions = await fetchFigmaMentions()
      // mergeAndWrite only writes when mentions.length > 0 — prevents clobbering a
      // populated cache if Figma returns nothing due to a transient API error
      const cache = mergeAndWrite<FigmaMentionsCache, FigmaMention>(
        CACHE_FILE,
        mentions,
        (c) => c.mentions,
        (merged) => ({ synced_at: new Date().toISOString(), mentions: merged }),
      )
      return NextResponse.json({ available: true, ...cache })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[/api/figma GET bust]', message)
    }
  }

  // Normal load: serve from pre-fetched cache
  const cached = readCache<FigmaMentionsCache>(CACHE_FILE)
  if (cached) return NextResponse.json({ available: true, ...cached })

  return NextResponse.json({ available: false, mentions: [] })
}
