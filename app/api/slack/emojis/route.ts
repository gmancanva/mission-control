import { NextResponse } from 'next/server'
import { getBotToken } from '@/lib/slack'

let cache: Record<string, string> | null = null
let cacheTs = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const token = getBotToken()
  if (!token) return NextResponse.json({ emoji: {} })

  // Return in-memory cache if fresh
  if (cache && Date.now() - cacheTs < CACHE_TTL) {
    return NextResponse.json({ emoji: cache })
  }

  try {
    const res = await fetch('https://slack.com/api/emoji.list', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as { ok: boolean; emoji?: Record<string, string> }
    if (data.ok && data.emoji) {
      cache = data.emoji
      cacheTs = Date.now()
      return NextResponse.json({ emoji: data.emoji })
    }
  } catch {
    // emoji:read scope not granted — return empty, standard emojis still work
  }

  return NextResponse.json({ emoji: {} })
}
