import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

type ThreadMessage = {
  author: string
  text: string
  is_parent?: boolean
  is_me?: boolean
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
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

    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Summarise this Slack thread in 2–3 concise sentences. Focus on: what's being discussed, what action is needed, and any decisions made. Be direct and specific — no filler phrases.\n\n${transcript}`,
      }],
    })

    const summary = response.choices[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/slack/summarize POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
