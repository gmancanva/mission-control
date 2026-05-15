import { getConfig } from './db'
export { CANVA_PRIORITIES, CANVA_DESIGN_STATUSES, CANVA_CATEGORIES_OF_WORK, CANVA_INITIAL_STATUSES } from './jira-constants'

export type SprintInfo = {
  id: number
  name: string
  state: 'active' | 'future' | 'closed'
  startDate?: string
  endDate?: string
}

export type SprintTicket = JiraTicket & {
  estimateHours: number
}

export type JiraSprint = {
  id: number
  name: string
  state: 'active' | 'closed' | 'future'
  startDate: string
  endDate: string
  goal: string
}

export type JiraEpic = {
  id: string
  key: string
  summary: string
  status: string
  project: string
  handoverDate: string | null
  startDate: string | null
  dueDate: string | null
  sprints: JiraSprint[]
  parentGoalKey: string | null
  parentGoalSummary: string | null
  openTickets: number
  blockers: number
  progress: number // 0-100
  comments: JiraComment[]
  myTickets: JiraTicket[]
}

export type JiraComment = {
  id: string
  author: string
  body: string
  created: string
  epicKey: string
}

export type JiraTicket = {
  id: string
  key: string
  summary: string
  status: string
  statusCategoryKey: string // 'new' | 'indeterminate' | 'done'
  dueDate: string | null
  project: string
  priority: string
  parentKey: string | null
  parentSummary: string | null
}

export type JiraAttachment = {
  id: string
  filename: string
  mimeType: string
  size: number
  created: string
  content: string   // download URL
  thumbnail?: string
  author: string
}

export type JiraIssueLink = {
  id: string
  type: string       // e.g. "blocks", "is blocked by", "relates to"
  key: string
  summary: string
  status: string
}

export type JiraDetailComment = {
  id: string
  author: string
  authorAvatar?: string
  created: string
  updated: string
  body: unknown      // raw ADF — rendered client-side
}

export type JiraTicketDetail = {
  key: string
  summary: string
  status: string
  statusCategoryKey: string
  priority: string
  project: string
  reporter: string | null
  assignee: string | null
  created: string
  updated: string
  dueDate: string | null
  startDate: string | null
  labels: string[]
  storyPoints: number | null
  designStatus: string | null
  categoryOfWork: string | null
  docLink: string | null
  prototypeLink: string | null
  slackChannelName: string | null
  parentKey: string | null
  parentSummary: string | null
  description: unknown  // raw ADF
  comments: JiraDetailComment[]
  attachments: JiraAttachment[]
  issueLinks: JiraIssueLink[]
}

const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let _myAccountId: string | null = null
async function getMyAccountId(): Promise<string> {
  if (_myAccountId) return _myAccountId
  // Allow hard-coding the account ID via env to avoid an extra API call
  const envId = process.env.JIRA_ACCOUNT_ID
  if (envId) { _myAccountId = envId; return _myAccountId }
  const me = (await jiraFetch('/rest/api/3/myself')) as { accountId: string }
  _myAccountId = me.accountId
  return _myAccountId
}

function commentMentionsUser(body: unknown, accountId: string): boolean {
  // ADF mentions appear as { type: 'mention', attrs: { id: '<accountId>' } }
  // Stringify is reliable enough since account IDs are unique
  return JSON.stringify(body).includes(accountId)
}

export function bustCache(): void {
  cache.clear()
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setInCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() })
}

function getAuthHeader(): string {
  const email = getConfig('jira.email') ?? process.env.JIRA_EMAIL ?? ''
  const token = getConfig('jira.apiToken') ?? process.env.JIRA_API_TOKEN ?? ''
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
}

function getBaseUrl(): string {
  return (getConfig('jira.baseUrl') ?? process.env.JIRA_BASE_URL ?? '').replace(/\/$/, '')
}

export function getProjectKeys(): string[] {
  return (getConfig('jira.projectKeys') ?? process.env.JIRA_PROJECT_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

function getHandoverField(): string {
  return process.env.JIRA_HANDOVER_FIELD ?? 'customfield_10234'
}

function extractCommentBody(body: unknown): string {
  if (typeof body === 'string') return body
  if (body && typeof body === 'object') {
    const doc = body as { content?: Array<{ content?: Array<{ text?: string }> }> }
    if (doc.content) {
      return doc.content
        .flatMap((block) => block.content ?? [])
        .map((inline) => inline.text ?? '')
        .join('')
    }
  }
  return ''
}

const JIRA_TIMEOUT_MS = 15_000

async function jiraFetch(path: string): Promise<unknown> {
  const baseUrl = getBaseUrl()
  const signal = AbortSignal.timeout(JIRA_TIMEOUT_MS)
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error: ${res.status} ${res.statusText} — ${path} — ${text}`)
  }
  return res.json()
}

async function jiraPost(path: string, body: unknown): Promise<unknown> {
  const baseUrl = getBaseUrl()
  const signal = AbortSignal.timeout(JIRA_TIMEOUT_MS)
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error: ${res.status} ${res.statusText} — ${path} — ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function fetchEpics(): Promise<JiraEpic[]> {
  const cacheKey = 'epics'
  const cached = getFromCache<JiraEpic[]>(cacheKey)
  if (cached) return cached

  const keys = getProjectKeys()
  if (keys.length === 0) return []

  const [handoverField, myAccountId] = [getHandoverField(), await getMyAccountId()]
  const jql = `project in (${keys.join(',')}) AND issuetype in (Epic, Milestone) ORDER BY updated DESC`
  const fields = `summary,status,project,${handoverField},duedate,customfield_10015,customfield_10020,parent,comment`

  const searchData = (await jiraFetch(
    `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${encodeURIComponent(fields)}&maxResults=200`
  )) as {
    issues?: Array<{
      id: string
      key: string
      fields: Record<string, unknown>
    }>
  }

  // Fetch all tickets assigned to the current user in these projects (one query)
  const myTicketsJql = `project in (${keys.join(',')}) AND assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`
  const myTicketsData = (await jiraFetch(
    `/rest/api/3/search/jql?jql=${encodeURIComponent(myTicketsJql)}&fields=summary,status,priority,duedate,project,parent&maxResults=200`
  )) as {
    issues?: Array<{
      id: string
      key: string
      fields: {
        summary?: string
        status?: { name?: string; statusCategory?: { key?: string } }
        priority?: { name?: string }
        duedate?: string | null
        project?: { key?: string }
        parent?: { key?: string; fields?: { summary?: string; issuetype?: { name?: string } } }
      }
    }>
  }

  // Index my tickets by their parent epic key
  const myTicketsByEpic = new Map<string, JiraTicket[]>()
  for (const t of myTicketsData.issues ?? []) {
    const parentKey = t.fields.parent?.key
    if (!parentKey) continue
    const ticket: JiraTicket = {
      id: t.id,
      key: t.key,
      summary: t.fields.summary ?? '',
      status: t.fields.status?.name ?? 'Unknown',
      statusCategoryKey: t.fields.status?.statusCategory?.key ?? 'new',
      dueDate: t.fields.duedate ?? null,
      project: t.fields.project?.key ?? '',
      priority: t.fields.priority?.name ?? 'Medium',
      parentKey: t.fields.parent?.key ?? null,
      parentSummary: t.fields.parent?.fields?.summary ?? null,
    }
    if (!myTicketsByEpic.has(parentKey)) myTicketsByEpic.set(parentKey, [])
    myTicketsByEpic.get(parentKey)!.push(ticket)
  }

  const epics: JiraEpic[] = await Promise.all(
    (searchData.issues ?? []).map(async (issue) => {
      const statusObj = issue.fields.status as { name?: string } | undefined
      const status = statusObj?.name ?? 'Unknown'

      const handoverRaw = issue.fields[handoverField]
      const handoverDate =
        typeof handoverRaw === 'string' && handoverRaw ? handoverRaw : null

      const startDate = typeof issue.fields.customfield_10015 === 'string' && issue.fields.customfield_10015
        ? issue.fields.customfield_10015 : null
      const dueDate = typeof issue.fields.duedate === 'string' && issue.fields.duedate
        ? issue.fields.duedate : null

      const sprintRaw = issue.fields.customfield_10020
      const sprints: JiraSprint[] = Array.isArray(sprintRaw)
        ? sprintRaw
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map(s => ({
            id: s.id as number,
            name: String(s.name ?? ''),
            state: (s.state as JiraSprint['state']) ?? 'closed',
            startDate: String(s.startDate ?? '').slice(0, 10),
            endDate: String(s.endDate ?? '').slice(0, 10),
            goal: String(s.goal ?? ''),
          }))
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
        : []

      const parentRaw = issue.fields.parent as { key?: string; fields?: { summary?: string } } | undefined
      const parentGoalKey = parentRaw?.key ?? null
      const parentGoalSummary = parentRaw?.fields?.summary ?? null

      const projectRaw = issue.fields.project as { key?: string } | undefined
      const project = projectRaw?.key ?? issue.key.split('-')[0]

      // Fetch child issues
      let openTickets = 0
      let blockers = 0
      let progress = 0
      try {
        const childJql = `("Epic Link" = ${issue.key} OR parent = ${issue.key})`
        const childData = (await jiraFetch(
          `/rest/api/3/search/jql?jql=${encodeURIComponent(childJql)}&fields=status,priority&maxResults=100`
        )) as {
          issues: Array<{ fields: { status?: { statusCategory?: { key?: string } }; priority?: { name?: string } } }>
        }
        const children = childData.issues ?? []
        const total = children.length
        const done = children.filter(
          (c) => c.fields.status?.statusCategory?.key === 'done'
        ).length
        openTickets = children.filter(
          (c) => c.fields.status?.statusCategory?.key !== 'done'
        ).length
        blockers = children.filter(
          (c) => c.fields.priority?.name === 'Blocker' && c.fields.status?.statusCategory?.key !== 'done'
        ).length
        progress = total > 0 ? Math.round((done / total) * 100) : 0
      } catch {
        // sub-query may fail for some configurations; leave defaults
      }

      // Parse last 5 comments
      const commentField = issue.fields.comment as
        | { comments?: Array<{ id: string; author?: { displayName?: string }; body: unknown; created: string }> }
        | undefined
      const rawComments = commentField?.comments ?? []
      const comments: JiraComment[] = rawComments
        .filter((c) => commentMentionsUser(c.body, myAccountId))
        .slice(-5)
        .reverse()
        .map((c) => ({
          id: c.id,
          author: c.author?.displayName ?? 'Unknown',
          body: extractCommentBody(c.body).slice(0, 500),
          created: c.created,
          epicKey: issue.key,
        }))

      return {
        id: issue.id,
        key: issue.key,
        summary: (issue.fields.summary as string) ?? '',
        status,
        project,
        handoverDate,
        startDate,
        dueDate,
        sprints,
        parentGoalKey,
        parentGoalSummary,
        openTickets,
        blockers,
        progress,
        comments,
        myTickets: myTicketsByEpic.get(issue.key) ?? [],
      }
    })
  )

  // Sort by numeric ticket suffix descending so newest (highest-numbered) projects appear first
  epics.sort((a, b) => {
    const numA = parseInt(a.key.split('-')[1] ?? '0', 10)
    const numB = parseInt(b.key.split('-')[1] ?? '0', 10)
    return numB - numA
  })

  setInCache(cacheKey, epics)
  return epics
}

export async function fetchMyTickets(): Promise<JiraTicket[]> {
  const cacheKey = 'myTickets'
  const cached = getFromCache<JiraTicket[]>(cacheKey)
  if (cached) return cached

  const jql = `assignee = currentUser() AND statusCategory != Done ORDER BY due ASC`

  const data = (await jiraFetch(
    `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,status,duedate,project,priority,parent&maxResults=100`
  )) as {
    issues?: Array<{
      id: string
      key: string
      fields: {
        summary?: string
        status?: { name?: string; statusCategory?: { key?: string } }
        duedate?: string | null
        project?: { key?: string }
        priority?: { name?: string }
        parent?: { key?: string; fields?: { summary?: string } }
      }
    }>
  }

  const tickets: JiraTicket[] = (data.issues ?? []).map((issue) => ({
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary ?? '',
    status: issue.fields.status?.name ?? 'Unknown',
    statusCategoryKey: issue.fields.status?.statusCategory?.key ?? 'new',
    dueDate: issue.fields.duedate ?? null,
    project: issue.fields.project?.key ?? '',
    priority: issue.fields.priority?.name ?? 'Medium',
    parentKey: issue.fields.parent?.key ?? null,
    parentSummary: issue.fields.parent?.fields?.summary ?? null,
  }))

  setInCache(cacheKey, tickets)
  return tickets
}

type CanvaTicketFields = {
  summary: string
  projectKey: string
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

function applyCanvaFields(fields: Record<string, unknown>, params: CanvaTicketFields): void {
  if (params.priority) fields.priority = { name: params.priority }
  if (params.dueDate) fields.duedate = params.dueDate
  if (params.epicKey) fields.parent = { key: params.epicKey }
  if (params.description) fields.description = params.description
  if (params.startDate) fields.customfield_10015 = params.startDate
  if (params.labels?.length) fields.labels = params.labels
  if (params.designStatus) fields.customfield_10725 = { value: params.designStatus }
  if (params.categoryOfWork) fields.customfield_10107 = { value: params.categoryOfWork }
  if (params.docLink) fields.customfield_10105 = params.docLink
  if (params.prototypeLink) fields.customfield_10724 = params.prototypeLink
  if (params.slackChannelName) fields.customfield_10103 = params.slackChannelName
  if (params.storyPoints) fields.customfield_10060 = params.storyPoints
}

export async function createTicket(params: CanvaTicketFields): Promise<JiraTicket> {
  const myAccountId = await getMyAccountId()

  const fields: Record<string, unknown> = {
    project: { key: params.projectKey },
    summary: params.summary,
    issuetype: { name: 'Story' },
    assignee: { id: myAccountId },
  }
  applyCanvaFields(fields, params)

  const created = (await jiraPost('/rest/api/3/issue', { fields })) as {
    id: string
    key: string
  }

  if (params.initialStatus && params.initialStatus !== 'Backlog') {
    try { await transitionTicket(created.key, params.initialStatus) } catch { /* non-fatal */ }
  }

  bustCache()

  return {
    id: created.id,
    key: created.key,
    summary: params.summary,
    status: params.initialStatus ?? 'Backlog',
    statusCategoryKey: 'new',
    dueDate: params.dueDate ?? null,
    project: params.projectKey,
    priority: params.priority ?? 'Nice to have',
    parentKey: params.epicKey ?? null,
    parentSummary: null,
  }
}

export async function transitionTicket(
  issueKey: string,
  transitionName: string | string[]
): Promise<void> {
  const candidates = Array.isArray(transitionName)
    ? transitionName.map((n) => n.toLowerCase())
    : [transitionName.toLowerCase()]

  const transitionsData = (await jiraFetch(
    `/rest/api/3/issue/${issueKey}/transitions`
  )) as { transitions: Array<{ id: string; name: string }> }

  const match = (transitionsData.transitions ?? []).find(
    (t) => candidates.includes(t.name.toLowerCase())
  )

  if (!match) {
    throw new Error(
      `No matching transition for "${candidates.join('", "')}" on ${issueKey}. Available: ${(transitionsData.transitions ?? []).map((t) => t.name).join(', ')}`
    )
  }

  await jiraPost(`/rest/api/3/issue/${issueKey}/transitions`, {
    transition: { id: match.id },
  })

  // Bust cache so next fetch is fresh
  bustCache()
}

export async function fetchTicketDetails(key: string): Promise<JiraTicketDetail> {
  const fields = [
    'summary', 'description', 'status', 'assignee', 'reporter',
    'priority', 'labels', 'comment', 'attachment', 'issuelinks',
    'parent', 'duedate', 'created', 'updated', 'project',
    'customfield_10015', 'customfield_10060', 'customfield_10103',
    'customfield_10105', 'customfield_10107', 'customfield_10724', 'customfield_10725',
  ].join(',')

  const data = (await jiraFetch(
    `/rest/api/3/issue/${key}?fields=${fields}`
  )) as {
    key: string
    fields: {
      summary?: string
      description?: unknown
      status?: { name?: string; statusCategory?: { key?: string } }
      priority?: { name?: string }
      project?: { key?: string }
      reporter?: { displayName?: string }
      assignee?: { displayName?: string }
      created?: string
      updated?: string
      duedate?: string | null
      labels?: string[]
      parent?: { key?: string; fields?: { summary?: string } }
      customfield_10015?: string | null
      customfield_10060?: number | null
      customfield_10103?: string | null
      customfield_10105?: string | null
      customfield_10107?: { value?: string } | null
      customfield_10724?: string | null
      customfield_10725?: { value?: string } | null
      comment?: {
        comments?: Array<{
          id: string
          author?: { displayName?: string; avatarUrls?: { '24x24'?: string } }
          created: string
          updated: string
          body?: unknown
        }>
      }
      attachment?: Array<{
        id: string
        filename?: string
        mimeType?: string
        size?: number
        created?: string
        content?: string
        thumbnail?: string
        author?: { displayName?: string }
      }>
      issuelinks?: Array<{
        id: string
        type?: { inward?: string; outward?: string; name?: string }
        inwardIssue?: { key?: string; fields?: { summary?: string; status?: { name?: string } } }
        outwardIssue?: { key?: string; fields?: { summary?: string; status?: { name?: string } } }
      }>
    }
  }

  const f = data.fields

  const comments: JiraDetailComment[] = (f.comment?.comments ?? []).map((c) => ({
    id: c.id,
    author: c.author?.displayName ?? 'Unknown',
    authorAvatar: c.author?.avatarUrls?.['24x24'],
    created: c.created,
    updated: c.updated,
    body: c.body ?? null,
  }))

  const attachments: JiraAttachment[] = (f.attachment ?? []).map((a) => ({
    id: a.id,
    filename: a.filename ?? 'Untitled',
    mimeType: a.mimeType ?? '',
    size: a.size ?? 0,
    created: a.created ?? '',
    content: a.content ?? '',
    thumbnail: a.thumbnail,
    author: a.author?.displayName ?? 'Unknown',
  }))

  const issueLinks: JiraIssueLink[] = (f.issuelinks ?? []).flatMap((l) => {
    const linked = l.inwardIssue ?? l.outwardIssue
    if (!linked?.key) return []
    const typeName = l.inwardIssue
      ? (l.type?.inward ?? l.type?.name ?? 'relates to')
      : (l.type?.outward ?? l.type?.name ?? 'relates to')
    return [{
      id: l.id,
      type: typeName,
      key: linked.key,
      summary: linked.fields?.summary ?? '',
      status: linked.fields?.status?.name ?? '',
    }]
  })

  return {
    key: data.key,
    summary: f.summary ?? '',
    status: f.status?.name ?? 'Unknown',
    statusCategoryKey: f.status?.statusCategory?.key ?? 'new',
    priority: f.priority?.name ?? 'Medium',
    project: f.project?.key ?? '',
    reporter: f.reporter?.displayName ?? null,
    assignee: f.assignee?.displayName ?? null,
    created: f.created ?? '',
    updated: f.updated ?? '',
    dueDate: f.duedate ?? null,
    startDate: f.customfield_10015 ?? null,
    labels: f.labels ?? [],
    storyPoints: f.customfield_10060 ?? null,
    designStatus: f.customfield_10725?.value ?? null,
    categoryOfWork: f.customfield_10107?.value ?? null,
    docLink: f.customfield_10105 ?? null,
    prototypeLink: f.customfield_10724 ?? null,
    slackChannelName: f.customfield_10103 ?? null,
    parentKey: f.parent?.key ?? null,
    parentSummary: f.parent?.fields?.summary ?? null,
    description: f.description ?? null,
    comments,
    attachments,
    issueLinks,
  }
}

export async function addComment(issueKey: string, text: string): Promise<void> {
  await jiraPost(`/rest/api/3/issue/${issueKey}/comment`, {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        },
      ],
    },
  })
}

export async function addRemoteLink(
  issueKey: string,
  url: string,
  title: string
): Promise<void> {
  await jiraPost(`/rest/api/3/issue/${issueKey}/remotelink`, {
    object: { url, title: title || url },
  })
}

export async function fetchSprintData(): Promise<{
  active: SprintInfo | null
  next: SprintInfo | null
  sprintTickets: SprintTicket[]
}> {
  const cacheKey = 'sprintData'
  const cached = getFromCache<{ active: SprintInfo | null; next: SprintInfo | null; sprintTickets: SprintTicket[] }>(cacheKey)
  if (cached) return cached

  const keys = getProjectKeys()
  let active: SprintInfo | null = null
  let next: SprintInfo | null = null

  for (const key of keys) {
    if (active && next) break
    try {
      const boardsData = await jiraFetch(
        `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(key)}&maxResults=10`
      )
      const boards = boardsData as { values?: Array<{ id: number; type: string }> }

      for (const board of (boards.values ?? [])) {
        if (active && next) break
        try {
          const sprintsData = await jiraFetch(
            `/rest/agile/1.0/board/${board.id}/sprint?state=active,future&maxResults=5`
          )
          const sprints = sprintsData as {
            values?: Array<{ id: number; name: string; state: string; startDate?: string; endDate?: string }>
          }
          for (const sprint of sprints.values ?? []) {
            if (sprint.state === 'active' && !active) {
              active = { id: sprint.id, name: sprint.name, state: 'active', startDate: sprint.startDate, endDate: sprint.endDate }
            } else if (sprint.state === 'future' && !next) {
              next = { id: sprint.id, name: sprint.name, state: 'future', startDate: sprint.startDate, endDate: sprint.endDate }
            }
          }
        } catch { /* board may not support sprints */ }
      }
    } catch { /* project may not have boards */ }
  }

  let sprintTickets: SprintTicket[] = []
  try {
    const jql = `assignee = currentUser() AND sprint in openSprints() AND statusCategory != Done ORDER BY status ASC`
    const data = await jiraFetch(
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,status,priority,duedate,project,parent,timetracking&maxResults=100`
    ) as {
      issues?: Array<{
        id: string
        key: string
        fields: {
          summary?: string
          status?: { name?: string; statusCategory?: { key?: string } }
          priority?: { name?: string }
          duedate?: string | null
          project?: { key?: string }
          parent?: { key?: string; fields?: { summary?: string } }
          timetracking?: { originalEstimateSeconds?: number }
        }
      }>
    }

    sprintTickets = (data.issues ?? []).map((issue) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary ?? '',
      status: issue.fields.status?.name ?? 'Unknown',
      statusCategoryKey: issue.fields.status?.statusCategory?.key ?? 'new',
      dueDate: issue.fields.duedate ?? null,
      project: issue.fields.project?.key ?? '',
      priority: issue.fields.priority?.name ?? 'Medium',
      parentKey: issue.fields.parent?.key ?? null,
      parentSummary: issue.fields.parent?.fields?.summary ?? null,
      estimateHours: Math.round((issue.fields.timetracking?.originalEstimateSeconds ?? 0) / 3600),
    }))
  } catch { /* openSprints() JQL may not be available */ }

  const result = { active, next, sprintTickets }
  setInCache(cacheKey, result)
  return result
}

export async function createTicketFromTemplate(params: {
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
}): Promise<{ key: string }> {
  const myAccountId = await getMyAccountId()

  const fields: Record<string, unknown> = {
    project: { key: params.projectKey },
    summary: params.summary,
    issuetype: { name: 'Story' },
  }

  if (myAccountId) fields.assignee = { id: myAccountId }
  applyCanvaFields(fields, { ...params, epicKey: params.epicKey ?? undefined })

  const created = (await jiraPost('/rest/api/3/issue', { fields })) as { id: string; key: string }

  if (params.initialStatus && params.initialStatus !== 'Backlog') {
    try { await transitionTicket(created.key, params.initialStatus) } catch { /* non-fatal */ }
  }

  return { key: created.key }
}

async function jiraPut(path: string, body: unknown): Promise<void> {
  const baseUrl = getBaseUrl()
  const signal = AbortSignal.timeout(JIRA_TIMEOUT_MS)
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error: ${res.status} ${res.statusText} — ${path} — ${text}`)
  }
}

export async function updateTicketFields(
  key: string,
  updates: Record<string, unknown>
): Promise<void> {
  await jiraPut(`/rest/api/3/issue/${key}`, { fields: updates })
  bustCache()
}

export async function addAttachment(
  issueKey: string,
  formData: FormData
): Promise<void> {
  const baseUrl = getBaseUrl()
  const res = await fetch(
    `${baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Attachment upload failed: ${res.status} — ${text}`)
  }
}
