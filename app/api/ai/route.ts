import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const apiKey = getConfig('anthropic.apiKey') || process.env.ANTHROPIC_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  try {
    const { action, text, source, project, author } = await request.json() as {
      action: 'summarize' | 'draft'
      text: string
      source: string
      project: string
      author?: string
    }

    const prompt = action === 'summarize'
      ? `Summarise this ${source} comment in 1–2 sentences. State clearly what ${author ?? 'the person'} is asking for or discussing. Be direct and specific.\n\nComment:\n${text}`
      : `You are a Product Designer. Write a concise, professional reply to this ${source} comment from ${author ?? 'a colleague'} in ${project}. Be helpful, direct, and friendly. Max 3 sentences. Do not start with "Hi", "Hello", or "Thanks for reaching out".\n\nComment:\n${text}\n\nReply:`

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = (response.content[0] as { type: string; text: string }).text?.trim() ?? ''
    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/ai POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
