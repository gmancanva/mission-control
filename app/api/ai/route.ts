import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  try {
    const { action, text, source, project, author } = await request.json() as {
      action: 'summarize' | 'draft'
      text: string
      source: string
      project: string
      author?: string
    }

    const client = new OpenAI({ apiKey })

    const prompt = action === 'summarize'
      ? `Summarise this ${source} comment in 1–2 sentences. State clearly what ${author ?? 'the person'} is asking for or discussing. Be direct and specific.\n\nComment:\n${text}`
      : `You are a Product Designer. Write a concise, professional reply to this ${source} comment from ${author ?? 'a colleague'} in ${project}. Be helpful, direct, and friendly. Max 3 sentences. Do not start with "Hi", "Hello", or "Thanks for reaching out".\n\nComment:\n${text}\n\nReply:`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = response.choices[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/ai POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
