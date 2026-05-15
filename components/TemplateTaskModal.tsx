'use client'

import { useState, useEffect, useRef } from 'react'
import type { JiraEpic, SprintInfo } from '@/lib/jira'
import RichEditor from '@/components/RichEditor'
import { htmlToAdf } from '@/lib/adf'

type Category = 'All' | 'Discovery' | 'Research' | 'Design' | 'Review' | 'Handoff'

type Template = {
  category: Exclude<Category, 'All'>
  name: string
  hours: number
}

const TEMPLATES: Template[] = [
  { category: 'Discovery', name: 'Kickoff & Brief Review', hours: 1 },
  { category: 'Discovery', name: 'Stakeholder Interviews', hours: 3 },
  { category: 'Discovery', name: 'Jobs-to-be-Done Workshop', hours: 2 },
  { category: 'Research', name: 'Competitive Analysis', hours: 4 },
  { category: 'Research', name: 'User Research Synthesis', hours: 3 },
  { category: 'Research', name: 'Usability Testing', hours: 4 },
  { category: 'Design', name: 'Information Architecture', hours: 3 },
  { category: 'Design', name: 'Lo-fi Wireframes', hours: 4 },
  { category: 'Design', name: 'Hi-fi Mockups', hours: 6 },
  { category: 'Design', name: 'Prototype / Interaction Design', hours: 4 },
  { category: 'Design', name: 'Responsive Variants', hours: 3 },
  { category: 'Design', name: 'Component Library Update', hours: 3 },
  { category: 'Review', name: 'Design Critique / Peer Review', hours: 1 },
  { category: 'Review', name: 'Stakeholder Review', hours: 1.5 },
  { category: 'Review', name: 'Accessibility Audit', hours: 2 },
  { category: 'Review', name: 'Design QA / Build Review', hours: 2 },
  { category: 'Handoff', name: 'Dev Handoff & Redlines', hours: 2 },
  { category: 'Handoff', name: 'Asset Export & Delivery', hours: 1 },
  { category: 'Handoff', name: 'Documentation / Design Rationale', hours: 2 },
]

const CATEGORIES: Category[] = ['All', 'Discovery', 'Research', 'Design', 'Review', 'Handoff']

const CATEGORY_ICONS: Record<Exclude<Category, 'All'>, string> = {
  Discovery: '🔍',
  Research: '📊',
  Design: '✏️',
  Review: '👁️',
  Handoff: '📦',
}

type SprintOption = 'backlog' | 'current' | 'next'

type Props = {
  isOpen: boolean
  onClose: () => void
  projectKeys: string[]
  epics: JiraEpic[]
  defaultTab?: 'template' | 'manual'
  defaultSprint?: SprintOption
  defaultProjectKey?: string   // pre-select a project (e.g. from the active kanban filter)
  onCreated?: () => void
  initialSummary?: string
}

const PRIORITIES = ['Must have', 'Should have', 'Nice to have', 'Someday']

const INITIAL_STATUSES = ['Backlog', 'In Progress', 'In Design', 'In Review']

const DESIGN_STATUSES = [
  'Not Started',
  'In Design',
  'Designs Approved',
  'Refining Designs',
  'Needs Sponsor Review',
  'Designs Not Required',
]

const CATEGORY_OF_WORK_OPTIONS = [
  'Efficiency',
  'KTLO',
  'New Capability',
  'Quality Improvements',
]

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  fontSize: 13,
  background: 'var(--pdSurface2)',
  border: '1px solid var(--pdBorder)',
  borderRadius: 8,
  padding: '6px 10px',
  color: 'var(--pdTextStrong)',
  fontFamily: 'inherit',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--pdTextMuted)',
  display: 'block',
  marginBottom: 6,
}

function SpinnerIcon() {
  return (
    <picture>
      <source srcSet="/loopi-loading.webp" type="image/webp" />
      <img src="/loopi-loading.gif" alt="" width={18} height={20} style={{ imageRendering: 'pixelated', verticalAlign: 'middle' }} />
    </picture>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" style={{ width: 12, height: 12 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TemplateFileZone({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list)
    const names = new Set(files.map((f) => f.name + f.size))
    onChange([...files, ...incoming.filter((f) => !names.has(f.name + f.size))])
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--pdAccent06)' : 'var(--pdBorder)'}`,
          borderRadius: 6,
          padding: '7px 12px',
          background: dragging ? 'var(--pdAccentA01)' : 'var(--pdSurface2)',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 5,
          minHeight: 36,
          transition: 'all 150ms',
        }}
      >
        {files.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--pdTextSubtle)' }}>📎 Attach files</span>
        ) : (
          <>
            {files.map((file, i) => (
              <span
                key={i}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '1px 6px 1px 8px',
                  background: 'var(--pdSurface3)', border: '1px solid var(--pdBorder)',
                  borderRadius: 'var(--pdRadiusPill)', fontSize: 11, color: 'var(--pdTextStrong)',
                  maxWidth: 160,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pdTextMuted)', padding: 0, fontSize: 12, lineHeight: 1, flexShrink: 0 }}
                >×</button>
              </span>
            ))}
            <span style={{ fontSize: 11, color: 'var(--pdTextSubtle)' }}>+ more</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files) addFiles(e.target.files) }} />
    </div>
  )
}

export default function TemplateTaskModal({
  isOpen,
  onClose,
  projectKeys,
  epics,
  defaultTab = 'template',
  defaultSprint = 'current',
  defaultProjectKey,
  onCreated,
  initialSummary,
}: Props) {
  const [tab, setTab] = useState<'template' | 'manual'>(defaultTab)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category>('All')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [projectKey, setProjectKey] = useState(projectKeys[0] ?? '')
  const [sprint, setSprint] = useState<SprintOption>(defaultSprint)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [failedTickets, setFailedTickets] = useState<Array<{ summary: string; error: string }>>([])

  const [sprintInfo, setSprintInfo] = useState<{ active: SprintInfo | null; next: SprintInfo | null } | null>(null)
  const [epicKey, setEpicKey] = useState('')

  // Per-template description + files
  const [taskDetails, setTaskDetails] = useState<Map<number, { descHtml: string; files: File[] }>>(new Map())
  const [expandedTask, setExpandedTask] = useState<number | null>(null)

  // Two-step flow state for template tab
  const [step, setStep] = useState<'select' | 'configure'>('select')
  const [shared, setShared] = useState({
    initialStatus: 'Backlog',
    priority: 'Nice to have',
    startDate: '',
    dueDate: '',
    labels: '',
    designStatus: '',
    categoryOfWork: '',
    docLink: '',
    prototypeLink: '',
    slackChannelName: '',
    storyPoints: '',
  })

  // Manual tab form state
  const [manualForm, setManualForm] = useState({
    summary: '',
    projectKey: projectKeys[0] ?? '',
    priority: 'Nice to have',
    dueDate: '',
    epicKey: '',
    initialStatus: 'Backlog',
    startDate: '',
    labels: '',
    designStatus: '',
    categoryOfWork: '',
    docLink: '',
    prototypeLink: '',
    slackChannelName: '',
    storyPoints: '',
  })
  const [manualDescHtml, setManualDescHtml] = useState('')
  const [manualFiles, setManualFiles] = useState<File[]>([])
  const [fileDragging, setFileDragging] = useState(false)
  const [manualCreating, setManualCreating] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  // Reset on open/defaultTab change
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab)
      setSprint(defaultSprint)
      setSelected(new Set())
      setSearch('')
      setCategoryFilter('All')
      setFailedTickets([])
      setManualError(null)
      setEpicKey('')
      setTaskDetails(new Map())
      setExpandedTask(null)
      setManualDescHtml('')
      setManualFiles([])
      setStep('select')
      setShared({
        initialStatus: 'Backlog',
        priority: 'Nice to have',
        startDate: '',
        dueDate: '',
        labels: '',
        designStatus: '',
        categoryOfWork: '',
        docLink: '',
        prototypeLink: '',
        slackChannelName: '',
        storyPoints: '',
      })
      const resolvedProjectKey = defaultProjectKey && projectKeys.includes(defaultProjectKey)
        ? defaultProjectKey
        : (projectKeys[0] ?? '')
      setManualForm((f) => ({
        ...f,
        projectKey: resolvedProjectKey,
        summary: initialSummary ?? '',
        dueDate: '',
        epicKey: '',
        priority: 'Nice to have',
        initialStatus: 'Backlog',
        startDate: '',
        labels: '',
        designStatus: '',
        categoryOfWork: '',
        docLink: '',
        prototypeLink: '',
        slackChannelName: '',
        storyPoints: '',
      }))
      if (resolvedProjectKey) setProjectKey(resolvedProjectKey)
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [isOpen, defaultTab, defaultSprint, defaultProjectKey, projectKeys])

  // Fetch sprint info on open
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/jira/sprint')
      .then((r) => r.json())
      .then((d: { active: SprintInfo | null; next: SprintInfo | null }) => setSprintInfo(d))
      .catch(() => { /* sprint info optional */ })
  }, [isOpen])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  if (!isOpen) return null

  const filteredTemplates = TEMPLATES.filter((t, _idx) => {
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false
    if (search.trim() && !t.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  // Group filtered templates by category preserving TEMPLATES order
  const grouped = CATEGORIES.filter((c): c is Exclude<Category, 'All'> => c !== 'All').reduce<
    Record<string, Array<{ template: Template; originalIndex: number }>>
  >((acc, cat) => {
    const items = TEMPLATES
      .map((t, i) => ({ template: t, originalIndex: i }))
      .filter(({ template }) => filteredTemplates.includes(template) && template.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  const selectedCount = selected.size
  const selectedHours = Array.from(selected).reduce((sum, idx) => sum + (TEMPLATES[idx]?.hours ?? 0), 0)

  const sprintLabel = (s: SprintOption) => {
    if (s === 'backlog') return 'Backlog'
    if (s === 'current') return sprintInfo?.active ? sprintInfo.active.name : 'Current Sprint'
    if (s === 'next') return sprintInfo?.next ? sprintInfo.next.name : 'Next Sprint'
    return s
  }

  // suppress unused variable warning
  void sprintLabel
  void sprint

  const canSubmit = selectedCount > 0 && !!projectKey && !creating

  async function handleTemplateSubmit() {
    if (!canSubmit) return
    setCreating(true)
    setFailedTickets([])

    const labelsArray = shared.labels
      ? shared.labels.split(',').map((l) => l.trim()).filter(Boolean)
      : []

    const tickets = Array.from(selected).map((idx) => {
      const details = taskDetails.get(idx)
      return {
        summary: TEMPLATES[idx].name,
        projectKey,
        estimateSeconds: Math.round(TEMPLATES[idx].hours * 3600),
        epicKey: epicKey || null,
        description: details?.descHtml ? htmlToAdf(details.descHtml) : null,
        initialStatus: shared.initialStatus || undefined,
        startDate: shared.startDate || undefined,
        dueDate: shared.dueDate || undefined,
        labels: labelsArray.length > 0 ? labelsArray : undefined,
        priority: shared.priority || undefined,
        designStatus: shared.designStatus || undefined,
        categoryOfWork: shared.categoryOfWork || undefined,
        docLink: shared.docLink || undefined,
        prototypeLink: shared.prototypeLink || undefined,
        slackChannelName: shared.slackChannelName || undefined,
        storyPoints: shared.storyPoints ? Number(shared.storyPoints) : undefined,
      }
    })

    try {
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, tickets }),
      })
      const data = await res.json() as {
        created: Array<{ key: string; summary: string }>
        failed: Array<{ summary: string; error: string }>
      }

      if (data.failed && data.failed.length > 0) {
        setFailedTickets(data.failed)
        setCreating(false)
        return
      }

      // Upload attachments for each created ticket
      const uploadPromises = (data.created ?? []).flatMap(({ key, summary }) => {
        const idx = TEMPLATES.findIndex((t) => t.name === summary)
        const files = idx >= 0 ? (taskDetails.get(idx)?.files ?? []) : []
        return files.map((file) => {
          const fd = new FormData()
          fd.append('issueKey', key)
          fd.append('file', file)
          return fetch('/api/jira/attach', { method: 'POST', body: fd })
        })
      })
      await Promise.allSettled(uploadPromises)

      const epicLabel = epicKey ? ` under ${epicKey}` : ''
      setToast(`${data.created.length} task${data.created.length === 1 ? '' : 's'} added to ${projectKey}${epicLabel}`)
      onCreated?.()
      onClose()
    } catch (err) {
      setFailedTickets([{ summary: 'Batch create', error: err instanceof Error ? err.message : 'Unknown error' }])
    } finally {
      setCreating(false)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualForm.summary.trim()) return
    setManualCreating(true)
    setManualError(null)
    try {
      const description = manualDescHtml ? htmlToAdf(manualDescHtml) : null
      const labelsArray = manualForm.labels
        ? manualForm.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : []
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: manualForm.summary.trim(),
          projectKey: manualForm.projectKey,
          priority: manualForm.priority,
          dueDate: manualForm.dueDate || undefined,
          epicKey: manualForm.epicKey || undefined,
          description,
          initialStatus: manualForm.initialStatus || undefined,
          startDate: manualForm.startDate || undefined,
          labels: labelsArray.length > 0 ? labelsArray : undefined,
          designStatus: manualForm.designStatus || undefined,
          categoryOfWork: manualForm.categoryOfWork || undefined,
          docLink: manualForm.docLink || undefined,
          prototypeLink: manualForm.prototypeLink || undefined,
          slackChannelName: manualForm.slackChannelName || undefined,
          storyPoints: manualForm.storyPoints ? Number(manualForm.storyPoints) : undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Failed to create task')
      }
      const data = await res.json() as { ticket?: { key?: string } }
      const issueKey = data.ticket?.key

      if (issueKey && manualFiles.length > 0) {
        await Promise.allSettled(manualFiles.map((file) => {
          const fd = new FormData()
          fd.append('issueKey', issueKey)
          fd.append('file', file)
          return fetch('/api/jira/attach', { method: 'POST', body: fd })
        }))
      }

      onCreated?.()
      onClose()
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setManualCreating(false)
    }
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files)
    setManualFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...incoming.filter((f) => !names.has(f.name + f.size))]
    })
  }

  const epicsByProject = epics.filter((e) =>
    !manualForm.projectKey || e.key.startsWith(manualForm.projectKey + '-')
  )

  const modalWidth = step === 'configure' ? 760 : 680

  return (
    <>
      <div className="ModalBackdrop" onClick={onClose}>
        <div
          className="Modal"
          onClick={(e) => e.stopPropagation()}
          style={{ width: modalWidth, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Head */}
          <div className="Modal__head">
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--pdTextStrong)' }}>
              Create task in Jira
            </span>
            <button className="IconButton" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--pdBorder)',
            padding: '0 20px',
            background: 'var(--pdSurface2)',
            gap: 0,
          }}>
            {(['template', 'manual'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setStep('select') }}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 500,
                  color: tab === t ? 'var(--pdAccent06)' : 'var(--pdTextMuted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid var(--pdAccent06)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: -1,
                  transition: 'color 150ms',
                }}
              >
                {t === 'template' ? 'From template' : 'Manual'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="Modal__body" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {tab === 'template' && step === 'select' && (
              <>
                {/* Search + filters */}
                <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--pdBorder)', flexShrink: 0 }}>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search templates…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 12px',
                      fontSize: 13,
                      background: 'var(--pdSurface2)',
                      border: '1px solid var(--pdBorder)',
                      borderRadius: 'var(--pdRadiusPill)',
                      color: 'var(--pdTextStrong)',
                      outline: 'none',
                      fontFamily: 'inherit',
                      marginBottom: 10,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`FilterChip${categoryFilter === cat ? ' is-active' : ''}`}
                        style={{ height: 26, padding: '0 10px', fontSize: 12 }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template list */}
                <div style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: '8px 0' }}>
                  {Object.keys(grouped).length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--pdTextMuted)', fontSize: 13 }}>
                      No templates match your search.
                    </div>
                  ) : (
                    Object.entries(grouped).map(([cat, items]) => (
                      <div key={cat} style={{ marginBottom: 4 }}>
                        <div style={{
                          padding: '6px 20px 4px',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--pdTextSubtle)',
                        }}>
                          {CATEGORY_ICONS[cat as Exclude<Category, 'All'>]} {cat}
                        </div>
                        {items.map(({ template, originalIndex }) => {
                          const isSelected = selected.has(originalIndex)
                          const isExpanded = expandedTask === originalIndex
                          const details = taskDetails.get(originalIndex)
                          const hasDetails = !!(details?.descHtml || (details?.files?.length ?? 0) > 0)

                          return (
                            <div key={originalIndex} style={{ background: isSelected ? 'var(--pdAccentA01)' : 'transparent', transition: 'background 100ms' }}>
                              {/* Row */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  width: '100%',
                                  padding: '8px 20px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  setSelected((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(originalIndex)) {
                                      next.delete(originalIndex)
                                      if (expandedTask === originalIndex) setExpandedTask(null)
                                    } else {
                                      next.add(originalIndex)
                                    }
                                    return next
                                  })
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--pdSurface2)'
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                                }}
                              >
                                {/* Checkbox */}
                                <div style={{
                                  width: 18, height: 18, borderRadius: 4,
                                  border: `1.5px solid ${isSelected ? 'var(--pdAccent06)' : 'var(--pdBorderStrong)'}`,
                                  background: isSelected ? 'var(--pdAccent06)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, color: '#fff', transition: 'all 150ms',
                                }}>
                                  {isSelected && <CheckIcon />}
                                </div>

                                {/* Name */}
                                <span style={{
                                  flex: 1, fontSize: 13, fontWeight: 500,
                                  color: isSelected ? 'var(--pdAccent08)' : 'var(--pdTextStrong)',
                                }}>
                                  {template.name}
                                </span>

                                {/* Details dot indicator */}
                                {isSelected && hasDetails && (
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pdAccent06)', flexShrink: 0 }} />
                                )}

                                {/* Hours badge */}
                                <span style={{
                                  fontSize: 11, fontWeight: 600, color: 'var(--pdTextMuted)',
                                  background: 'var(--pdSurface3)', padding: '2px 7px',
                                  borderRadius: 'var(--pdRadiusPill)', flexShrink: 0,
                                }}>
                                  {template.hours}h
                                </span>

                                {/* Expand toggle — only shown when selected */}
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandedTask(isExpanded ? null : originalIndex)
                                    }}
                                    style={{
                                      flexShrink: 0,
                                      padding: '2px 8px',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: isExpanded ? 'var(--pdAccentA02)' : 'var(--pdSurface3)',
                                      border: `1px solid ${isExpanded ? 'var(--pdAccent04)' : 'var(--pdBorder)'}`,
                                      borderRadius: 6,
                                      color: isExpanded ? 'var(--pdAccent06)' : 'var(--pdTextMuted)',
                                      cursor: 'pointer',
                                      fontFamily: 'inherit',
                                      lineHeight: '18px',
                                    }}
                                  >
                                    {isExpanded ? 'Done ▴' : '+ Details'}
                                  </button>
                                )}
                              </div>

                              {/* Inline detail panel */}
                              {isSelected && isExpanded && (
                                <div
                                  style={{ padding: '4px 20px 14px 50px', display: 'flex', flexDirection: 'column', gap: 10 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <RichEditor
                                    key={`editor-${originalIndex}`}
                                    onHtmlChange={(html) => setTaskDetails((prev) => {
                                      const next = new Map(prev)
                                      const existing = next.get(originalIndex) ?? { descHtml: '', files: [] }
                                      next.set(originalIndex, { ...existing, descHtml: html })
                                      return next
                                    })}
                                    placeholder="Add a description for this task…"
                                    minHeight={90}
                                  />
                                  <TemplateFileZone
                                    files={taskDetails.get(originalIndex)?.files ?? []}
                                    onChange={(files) => setTaskDetails((prev) => {
                                      const next = new Map(prev)
                                      const existing = next.get(originalIndex) ?? { descHtml: '', files: [] }
                                      next.set(originalIndex, { ...existing, files })
                                      return next
                                    })}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {tab === 'template' && step === 'configure' && (
              <div style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Selected tasks summary */}
                <div style={{
                  background: 'var(--pdSurface2)',
                  border: '1px solid var(--pdBorder)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', marginBottom: 2 }}>
                    {selectedCount} task{selectedCount !== 1 ? 's' : ''} · {selectedHours}h total
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                    {Array.from(selected).map((idx) => (
                      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--pdTextStrong)' }}>
                        <span style={{ color: 'var(--pdTextMuted)' }}>·</span>
                        {TEMPLATES[idx].name}
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--pdTextMuted)',
                          background: 'var(--pdSurface3)', padding: '1px 5px',
                          borderRadius: 'var(--pdRadiusPill)',
                        }}>
                          {TEMPLATES[idx].hours}h
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Shared fields form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Initial status */}
                  <div>
                    <label style={LABEL_STYLE}>Initial status</label>
                    <select
                      value={shared.initialStatus}
                      onChange={(e) => setShared((s) => ({ ...s, initialStatus: e.target.value }))}
                      style={INPUT_STYLE}
                    >
                      {INITIAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label style={LABEL_STYLE}>Priority</label>
                    <select
                      value={shared.priority}
                      onChange={(e) => setShared((s) => ({ ...s, priority: e.target.value }))}
                      style={INPUT_STYLE}
                    >
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* Start date */}
                  <div>
                    <label style={LABEL_STYLE}>Start date</label>
                    <input
                      type="date"
                      value={shared.startDate}
                      onChange={(e) => setShared((s) => ({ ...s, startDate: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Due date */}
                  <div>
                    <label style={LABEL_STYLE}>Due date</label>
                    <input
                      type="date"
                      value={shared.dueDate}
                      onChange={(e) => setShared((s) => ({ ...s, dueDate: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Design status */}
                  <div>
                    <label style={LABEL_STYLE}>Design status</label>
                    <select
                      value={shared.designStatus}
                      onChange={(e) => setShared((s) => ({ ...s, designStatus: e.target.value }))}
                      style={INPUT_STYLE}
                    >
                      <option value="">— None —</option>
                      {DESIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Category of work */}
                  <div>
                    <label style={LABEL_STYLE}>Category of work</label>
                    <select
                      value={shared.categoryOfWork}
                      onChange={(e) => setShared((s) => ({ ...s, categoryOfWork: e.target.value }))}
                      style={INPUT_STYLE}
                    >
                      <option value="">— None —</option>
                      {CATEGORY_OF_WORK_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Story points */}
                  <div>
                    <label style={LABEL_STYLE}>Story points</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 3"
                      value={shared.storyPoints}
                      onChange={(e) => setShared((s) => ({ ...s, storyPoints: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Labels */}
                  <div>
                    <label style={LABEL_STYLE}>Labels <span style={{ fontWeight: 400, color: 'var(--pdTextSubtle)' }}>(comma-separated)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. design, ux, q1"
                      value={shared.labels}
                      onChange={(e) => setShared((s) => ({ ...s, labels: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Doc link */}
                  <div>
                    <label style={LABEL_STYLE}>Doc link</label>
                    <input
                      type="url"
                      placeholder="https://…"
                      value={shared.docLink}
                      onChange={(e) => setShared((s) => ({ ...s, docLink: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Prototype link */}
                  <div>
                    <label style={LABEL_STYLE}>Prototype link</label>
                    <input
                      type="url"
                      placeholder="https://…"
                      value={shared.prototypeLink}
                      onChange={(e) => setShared((s) => ({ ...s, prototypeLink: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>

                  {/* Slack channel */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={LABEL_STYLE}>Slack channel name</label>
                    <input
                      type="text"
                      placeholder="e.g. #design-reviews"
                      value={shared.slackChannelName}
                      onChange={(e) => setShared((s) => ({ ...s, slackChannelName: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>
                </div>

                {/* Per-task description/attachment expanders */}
                {Array.from(selected).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)' }}>
                      Per-task details
                    </span>
                    {Array.from(selected).map((idx) => {
                      const isExpanded = expandedTask === idx
                      const details = taskDetails.get(idx)
                      const hasDetails = !!(details?.descHtml || (details?.files?.length ?? 0) > 0)
                      return (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid var(--pdBorder)',
                            borderRadius: 8,
                            background: 'var(--pdSurface2)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 14px',
                              cursor: 'pointer',
                            }}
                            onClick={() => setExpandedTask(isExpanded ? null : idx)}
                          >
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--pdTextStrong)' }}>
                              {TEMPLATES[idx].name}
                            </span>
                            {hasDetails && (
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pdAccent06)', flexShrink: 0 }} />
                            )}
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: 'var(--pdTextMuted)',
                              background: 'var(--pdSurface3)', padding: '2px 7px',
                              borderRadius: 'var(--pdRadiusPill)', flexShrink: 0,
                            }}>
                              {TEMPLATES[idx].hours}h
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--pdTextMuted)', flexShrink: 0 }}>
                              {isExpanded ? '▴' : '▾'}
                            </span>
                          </div>
                          {isExpanded && (
                            <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--pdBorder)' }}>
                              <RichEditor
                                key={`configure-editor-${idx}`}
                                onHtmlChange={(html) => setTaskDetails((prev) => {
                                  const next = new Map(prev)
                                  const existing = next.get(idx) ?? { descHtml: '', files: [] }
                                  next.set(idx, { ...existing, descHtml: html })
                                  return next
                                })}
                                placeholder="Add a description for this task…"
                                minHeight={90}
                              />
                              <TemplateFileZone
                                files={taskDetails.get(idx)?.files ?? []}
                                onChange={(files) => setTaskDetails((prev) => {
                                  const next = new Map(prev)
                                  const existing = next.get(idx) ?? { descHtml: '', files: [] }
                                  next.set(idx, { ...existing, files })
                                  return next
                                })}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Failed tickets */}
                {failedTickets.length > 0 && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--pdStatusReviewBg)',
                    border: '1px solid var(--pdStatusReviewBorder)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--pdStatusReviewFg)',
                  }}>
                    <strong>Some tickets failed to create:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                      {failedTickets.map((f, i) => (
                        <li key={i}>{f.summary}: {f.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === 'manual' && (
              <div style={{ padding: 20, overflow: 'auto' }}>
                <form onSubmit={handleManualSubmit} id="manual-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Summary */}
                  <input
                    type="text"
                    placeholder="Task summary *"
                    value={manualForm.summary}
                    onChange={(e) => setManualForm((f) => ({ ...f, summary: e.target.value }))}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      fontSize: 16,
                      fontWeight: 500,
                      border: 'none',
                      borderBottom: '2px solid var(--pdBorder)',
                      padding: '8px 0',
                      background: 'transparent',
                      color: 'var(--pdTextStrong)',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />

                  {/* Fields grid — base fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={LABEL_STYLE}>Project</label>
                      <select
                        value={manualForm.projectKey}
                        onChange={(e) => setManualForm((f) => ({ ...f, projectKey: e.target.value, epicKey: '' }))}
                        style={INPUT_STYLE}
                      >
                        {projectKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Priority</label>
                      <select
                        value={manualForm.priority}
                        onChange={(e) => setManualForm((f) => ({ ...f, priority: e.target.value }))}
                        style={INPUT_STYLE}
                      >
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Due date</label>
                      <input
                        type="date"
                        value={manualForm.dueDate}
                        onChange={(e) => setManualForm((f) => ({ ...f, dueDate: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Parent milestone / epic</label>
                      <select
                        value={manualForm.epicKey}
                        onChange={(e) => setManualForm((f) => ({ ...f, epicKey: e.target.value }))}
                        style={INPUT_STYLE}
                      >
                        <option value="">None</option>
                        {epicsByProject.map((e) => <option key={e.key} value={e.key}>{e.key} — {e.summary.slice(0, 38)}</option>)}
                      </select>
                    </div>

                    {/* Extended Canva fields */}
                    <div>
                      <label style={LABEL_STYLE}>Initial status</label>
                      <select
                        value={manualForm.initialStatus}
                        onChange={(e) => setManualForm((f) => ({ ...f, initialStatus: e.target.value }))}
                        style={INPUT_STYLE}
                      >
                        {INITIAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Start date</label>
                      <input
                        type="date"
                        value={manualForm.startDate}
                        onChange={(e) => setManualForm((f) => ({ ...f, startDate: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Design status</label>
                      <select
                        value={manualForm.designStatus}
                        onChange={(e) => setManualForm((f) => ({ ...f, designStatus: e.target.value }))}
                        style={INPUT_STYLE}
                      >
                        <option value="">— None —</option>
                        {DESIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Category of work</label>
                      <select
                        value={manualForm.categoryOfWork}
                        onChange={(e) => setManualForm((f) => ({ ...f, categoryOfWork: e.target.value }))}
                        style={INPUT_STYLE}
                      >
                        <option value="">— None —</option>
                        {CATEGORY_OF_WORK_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Story points</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 3"
                        value={manualForm.storyPoints}
                        onChange={(e) => setManualForm((f) => ({ ...f, storyPoints: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Labels <span style={{ fontWeight: 400, color: 'var(--pdTextSubtle)' }}>(comma-separated)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. design, ux, q1"
                        value={manualForm.labels}
                        onChange={(e) => setManualForm((f) => ({ ...f, labels: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Doc link</label>
                      <input
                        type="url"
                        placeholder="https://…"
                        value={manualForm.docLink}
                        onChange={(e) => setManualForm((f) => ({ ...f, docLink: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Prototype link</label>
                      <input
                        type="url"
                        placeholder="https://…"
                        value={manualForm.prototypeLink}
                        onChange={(e) => setManualForm((f) => ({ ...f, prototypeLink: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={LABEL_STYLE}>Slack channel name</label>
                      <input
                        type="text"
                        placeholder="e.g. #design-reviews"
                        value={manualForm.slackChannelName}
                        onChange={(e) => setManualForm((f) => ({ ...f, slackChannelName: e.target.value }))}
                        style={INPUT_STYLE}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={LABEL_STYLE}>Description</label>
                    <RichEditor
                      onHtmlChange={setManualDescHtml}
                      placeholder="Add a description…"
                      minHeight={120}
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label style={LABEL_STYLE}>Attachments</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setFileDragging(true) }}
                      onDragLeave={() => setFileDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setFileDragging(false)
                        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `1.5px dashed ${fileDragging ? 'var(--pdAccent06)' : 'var(--pdBorder)'}`,
                        borderRadius: 8,
                        padding: '10px 14px',
                        background: fileDragging ? 'var(--pdAccentA01)' : 'var(--pdSurface2)',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        minHeight: 44,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {manualFiles.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--pdTextSubtle)' }}>
                          Click or drag files to attach
                        </span>
                      ) : (
                        <>
                          {manualFiles.map((file, i) => (
                            <span
                              key={i}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '2px 8px 2px 10px',
                                background: 'var(--pdSurface3)',
                                border: '1px solid var(--pdBorder)',
                                borderRadius: 'var(--pdRadiusPill)',
                                fontSize: 12,
                                color: 'var(--pdTextStrong)',
                                maxWidth: 200,
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setManualFiles((prev) => prev.filter((_, j) => j !== i))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--pdTextMuted)',
                                  padding: '0 1px',
                                  fontSize: 13,
                                  lineHeight: 1,
                                  flexShrink: 0,
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <span style={{ fontSize: 11, color: 'var(--pdTextSubtle)', marginLeft: 2 }}>
                            + drop more
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => { if (e.target.files) addFiles(e.target.files) }}
                    />
                  </div>

                  {manualError && (
                    <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', background: 'var(--pdStatusReviewBg)', border: '1px solid var(--pdStatusReviewBorder)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                      {manualError}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="Modal__foot" style={{ justifyContent: tab === 'template' ? 'space-between' : 'flex-end' }}>
            {tab === 'template' && step === 'select' && (
              <>
                {/* Selection summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--pdTextMuted)' }}>
                    {selectedCount === 0 ? (
                      <span style={{ fontStyle: 'italic' }}>Select templates above</span>
                    ) : (
                      <><strong style={{ color: 'var(--pdTextStrong)' }}>{selectedCount}</strong> task{selectedCount !== 1 ? 's' : ''} · <strong style={{ color: 'var(--pdTextStrong)' }}>{selectedHours}h</strong> total</>
                    )}
                  </span>
                </div>

                {/* Right side controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Project */}
                  <select
                    value={projectKey}
                    onChange={(e) => { setProjectKey(e.target.value); setEpicKey('') }}
                    style={{
                      fontSize: 13,
                      background: 'var(--pdSurface1)',
                      border: `1px solid ${selectedCount > 0 && !projectKey ? 'var(--pdAccent04)' : 'var(--pdBorder)'}`,
                      borderRadius: 8,
                      padding: '6px 10px',
                      color: 'var(--pdTextStrong)',
                      fontFamily: 'inherit',
                      boxShadow: selectedCount > 0 && !projectKey ? '0 0 0 2px var(--pdAccentA02)' : undefined,
                    }}
                  >
                    <option value="" disabled>Project…</option>
                    {projectKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>

                  {/* Epic / Parent project */}
                  <select
                    value={epicKey}
                    onChange={(e) => setEpicKey(e.target.value)}
                    style={{
                      fontSize: 13,
                      background: 'var(--pdSurface1)',
                      border: '1px solid var(--pdBorder)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      color: epicKey ? 'var(--pdTextStrong)' : 'var(--pdTextMuted)',
                      fontFamily: 'inherit',
                      maxWidth: 200,
                    }}
                  >
                    <option value="">Parent milestone / epic</option>
                    {epics
                      .filter((e) => !projectKey || e.key.startsWith(projectKey + '-'))
                      .map((e) => (
                        <option key={e.key} value={e.key}>{e.key} — {e.summary.slice(0, 34)}</option>
                      ))}
                  </select>

                  {/* Review & set up CTA */}
                  <button
                    className="PdButton PdButton--primary PdButton--small"
                    onClick={() => setStep('configure')}
                    disabled={!canSubmit}
                    style={{ opacity: !canSubmit ? 0.5 : 1, minWidth: 160 }}
                  >
                    {selectedCount > 0 ? `Review & set up →` : 'Select tasks'}
                  </button>
                </div>
              </>
            )}

            {tab === 'template' && step === 'configure' && (
              <>
                <button
                  className="PdButton PdButton--tertiary PdButton--small"
                  type="button"
                  onClick={() => { setStep('select'); setFailedTickets([]) }}
                >
                  ← Back
                </button>
                <button
                  className="PdButton PdButton--primary PdButton--small"
                  onClick={handleTemplateSubmit}
                  disabled={!canSubmit}
                  style={{ opacity: !canSubmit ? 0.5 : 1, minWidth: 180 }}
                >
                  {creating ? (
                    <><SpinnerIcon /> Creating…</>
                  ) : (
                    `Create ${selectedCount} task${selectedCount !== 1 ? 's' : ''} in Jira`
                  )}
                </button>
              </>
            )}

            {tab === 'manual' && (
              <>
                <button
                  className="PdButton PdButton--tertiary PdButton--small"
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="PdButton PdButton--primary PdButton--small"
                  form="manual-form"
                  type="submit"
                  disabled={manualCreating || !manualForm.summary.trim()}
                  style={{ opacity: manualCreating || !manualForm.summary.trim() ? 0.5 : 1 }}
                >
                  {manualCreating ? 'Creating…' : 'Create in Jira'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
        }}>
          <div className="Toast">{toast}</div>
        </div>
      )}
    </>
  )
}
