import { NextRequest, NextResponse } from 'next/server'
import { fetchTicketDetails, addComment, addRemoteLink, addAttachment, updateTicketFields } from '@/lib/jira'

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const detail = await fetchTicketDetails(params.key)
    return NextResponse.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

      const jiraForm = new FormData()
      jiraForm.append('file', file, file.name)
      await addAttachment(params.key, jiraForm)
      return NextResponse.json({ ok: true })
    }

    const body = (await req.json()) as {
      action: 'comment' | 'link'
      text?: string
      url?: string
      title?: string
    }

    if (body.action === 'comment') {
      if (!body.text?.trim()) return NextResponse.json({ error: 'Empty comment' }, { status: 400 })
      await addComment(params.key, body.text.trim())
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'link') {
      if (!body.url?.trim()) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
      await addRemoteLink(params.key, body.url.trim(), body.title?.trim() ?? '')
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const body = (await req.json()) as { fields: Record<string, unknown> }
    await updateTicketFields(params.key, body.fields)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
