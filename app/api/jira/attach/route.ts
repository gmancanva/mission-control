import { NextRequest, NextResponse } from 'next/server'
import { addAttachment } from '@/lib/jira'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const issueKey = formData.get('issueKey')

    if (!issueKey || typeof issueKey !== 'string') {
      return NextResponse.json({ error: 'Missing issueKey' }, { status: 400 })
    }

    const fileFormData = new FormData()
    for (const [key, value] of formData.entries()) {
      if (key !== 'issueKey') fileFormData.append('file', value)
    }

    await addAttachment(issueKey, fileFormData)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/jira/attach POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
