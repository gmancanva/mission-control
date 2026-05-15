import { NextRequest, NextResponse } from 'next/server'
import {
  fetchEpics,
  fetchMyTickets,
  transitionTicket,
  createTicket,
  createTicketFromTemplate,
  bustCache,
  getProjectKeys,
} from '@/lib/jira'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    if (searchParams.get('bust') === '1') {
      bustCache()
    }

    const [epics, myTickets] = await Promise.all([
      fetchEpics(),
      fetchMyTickets(),
    ])

    return NextResponse.json({ epics, myTickets, projectKeys: getProjectKeys() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/jira GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      // Batch template creation
      batch?: boolean
      tickets?: Array<{
        summary: string
        projectKey: string
        estimateSeconds: number
        epicKey?: string | null
        sprintId?: number | null
        description?: unknown
        startDate?: string
        labels?: string[]
        designStatus?: string
        categoryOfWork?: string
        docLink?: string
        prototypeLink?: string
        slackChannelName?: string
        storyPoints?: number
        priority?: string
        initialStatus?: string
      }>
      // Single ticket creation
      summary?: string
      projectKey?: string
      priority?: string
      dueDate?: string
      epicKey?: string
      description?: unknown
      startDate?: string
      labels?: string[]
      designStatus?: string
      categoryOfWork?: string
      docLink?: string
      prototypeLink?: string
      slackChannelName?: string
      storyPoints?: number
      initialStatus?: string
    }

    if (body.batch && Array.isArray(body.tickets)) {
      const created: Array<{ key: string; summary: string }> = []
      const failed: Array<{ summary: string; error: string }> = []
      for (const t of body.tickets) {
        try {
          const result = await createTicketFromTemplate({ ...t, epicKey: t.epicKey ?? null })
          created.push({ key: result.key, summary: t.summary })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          console.error('[/api/jira POST batch]', msg)
          failed.push({ summary: t.summary, error: msg })
        }
      }
      bustCache()
      return NextResponse.json({ created, failed })
    }

    if (body.summary && body.projectKey) {
      const ticket = await createTicket({
        summary: body.summary,
        projectKey: body.projectKey,
        priority: body.priority,
        dueDate: body.dueDate,
        epicKey: body.epicKey,
        description: body.description,
        startDate: body.startDate,
        labels: body.labels,
        designStatus: body.designStatus,
        categoryOfWork: body.categoryOfWork,
        docLink: body.docLink,
        prototypeLink: body.prototypeLink,
        slackChannelName: body.slackChannelName,
        storyPoints: body.storyPoints,
        initialStatus: body.initialStatus,
      })
      return NextResponse.json({ ticket })
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/jira POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: string
      issueKey: string
      transition: string | string[]
    }

    if (body.action === 'transition') {
      await transitionTicket(body.issueKey, body.transition)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/jira PUT]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
