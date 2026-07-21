import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from '@/lib/db'

export const dynamic = 'force-dynamic'

type ThreadMessage = {
  author: string
  text: string
  is_parent?: boolean
  is_me?: boolean
}

export async function POST(request: NextRequest) {
  const apiKey = getConfig('anthropic.apiKey') || process.env.ANTHROPIC_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  try {
    const { messages } = await request.json() as { messages: ThreadMessage[] }
    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const transcript = messages
      .map(m => {
        const label = m.is_parent ? `[Original message] ${m.author}` : m.is_me ? `[You] ${m.author}` : m.author
        return `${label}: ${m.text}`
      })
      .join('\n\n')

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Summarise this Slack thread in 2–3 concise sentences. Focus on: what's being discussed, what action is needed, and any decisions made. Be direct and specific — no filler phrases.\n\n${transcript}`,
      }],
    })

    const summary = (response.content[0] as { type: string; text: string }).text?.trim() ?? ''
    return NextResponse.json({ summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/slack/summarize POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
