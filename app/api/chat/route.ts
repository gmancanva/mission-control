import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { messages, systemContext } = await request.json() as {
      messages: Message[]
      systemContext?: string
    }

    const system = [
      'You are an AI assistant embedded in a Mission Control dashboard for a Product Designer.',
      'You have access to their live work data: Jira tickets, Slack mentions, Figma comments, Canva comments, and calendar.',
      'Be concise, direct, and opinionated. Use markdown. Skip preamble — get straight to the point.',
      systemContext,
    ].filter(Boolean).join('\n\n')

    const client = new Anthropic({ apiKey })

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      messages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/chat POST]', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
