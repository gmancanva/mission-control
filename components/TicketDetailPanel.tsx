'use client'

import { useEffect, useRef, useState } from 'react'
import type { JiraTicketDetail } from '@/lib/jira'
import { CANVA_PRIORITIES, CANVA_DESIGN_STATUSES, CANVA_CATEGORIES_OF_WORK } from '@/lib/jira-constants'
import { renderAdf, type AdfAttachment } from '@/lib/adf-renderer'

type Props = {
  ticketKey: string | null
  jiraBaseUrl: string
  onClose: () => void
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusBadge({ status, categoryKey }: { status: string; categoryKey: string }) {
  const statusKey =
    categoryKey === 'done' ? 'done' :
    categoryKey === 'indeterminate' ? 'progress' :
    status.toLowerCase().includes('review') ? 'review' : 'todo'
  return <span className={`StatusPill StatusPill--${statusKey}`}>{status}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase()
  const color =
    p === 'must have' || p === 'blocker' || p === 'critical' ? 'var(--pdPrioBlocker)' :
    p === 'should have' || p === 'high' ? 'var(--pdPrioHigh)' :
    p === 'nice to have' || p === 'medium' ? 'var(--pdPrioMedium)' : 'var(--pdPrioLow)'
  return <span style={{ fontSize: 12, fontWeight: 600, color }}>{priority}</span>
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Edit"
      style={{
        background: 'none', border: '1px solid var(--pdBorder)', padding: '2px 6px',
        cursor: 'pointer', color: 'var(--pdTextSubtle)', borderRadius: 4,
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        fontSize: 11, fontFamily: 'inherit',
      }}
    >
      <svg viewBox="0 0 16 16" fill="none" style={{ width: 11, height: 11 }}>
        <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
      Edit
    </button>
  )
}

function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== 'object') return ''
  function extractText(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as { type?: string; text?: string; content?: unknown[] }
    if (n.type === 'text' && n.text) return n.text
    if (Array.isArray(n.content)) {
      const inner = n.content.map(extractText).join('')
      // Add line break after block-level nodes
      if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'bulletList' || n.type === 'orderedList') {
        return inner + '\n'
      }
      if (n.type === 'listItem') return inner
      return inner
    }
    return ''
  }
  const doc = adf as { content?: unknown[] }
  return (doc.content ?? []).map(extractText).join('').trim()
}

function textToAdf(text: string): unknown {
  const lines = text.split('\n')
  const content = lines
    .map((line) => ({
      type: 'paragraph',
      content: line.trim() ? [{ type: 'text', text: line }] : [],
    }))
  return { type: 'doc', version: 1, content: content.length ? content : [{ type: 'paragraph', content: [] }] }
}

export default function TicketDetailPanel({ ticketKey, jiraBaseUrl, onClose }: Props) {
  const [detail, setDetail] = useState<JiraTicketDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [commentText, setCommentText] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [showLinkForm, setShowLinkForm] = useState(false)

  const [attachBusy, setAttachBusy] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Inline field editing
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingField, setSavingField] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Description editing
  const [editingDescription, setEditingDescription] = useState(false)
  const [descText, setDescText] = useState('')
  const [descSaving, setDescSaving] = useState(false)
  const [descSaveError, setDescSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketKey) { setDetail(null); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`/api/jira/${ticketKey}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setDetail(data as JiraTicketDetail)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [ticketKey])

  function loadDetail(key: string) {
    setLoading(true)
    setError(null)
    fetch(`/api/jira/${key}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setDetail(data as JiraTicketDetail)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  function startEdit(field: string, currentValue: string) {
    setEditingField(field)
    setEditValue(currentValue)
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingField(null)
    setEditValue('')
    setSaveError(null)
  }

  async function saveField(field: string, rawValue: string) {
    if (!ticketKey) return
    setSavingField(true)
    setSaveError(null)

    const fieldMap: Record<string, string> = {
      priority: 'priority',
      dueDate: 'duedate',
      startDate: 'customfield_10015',
      storyPoints: 'customfield_10060',
      slackChannelName: 'customfield_10103',
      docLink: 'customfield_10105',
      categoryOfWork: 'customfield_10107',
      prototypeLink: 'customfield_10724',
      designStatus: 'customfield_10725',
      labels: 'labels',
    }
    const jiraKey = fieldMap[field]
    if (!jiraKey) return

    let jiraValue: unknown
    switch (field) {
      case 'priority': jiraValue = rawValue ? { name: rawValue } : null; break
      case 'designStatus': jiraValue = rawValue ? { value: rawValue } : null; break
      case 'categoryOfWork': jiraValue = rawValue ? { value: rawValue } : null; break
      case 'storyPoints': jiraValue = rawValue ? parseFloat(rawValue) : null; break
      case 'labels': jiraValue = rawValue ? rawValue.split(',').map((s) => s.trim()).filter(Boolean) : []; break
      default: jiraValue = rawValue || null
    }

    try {
      const res = await fetch(`/api/jira/${ticketKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { [jiraKey]: jiraValue } }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setEditingField(null)
      loadDetail(ticketKey)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingField(false)
    }
  }

  async function saveDescription() {
    if (!ticketKey) return
    setDescSaving(true)
    setDescSaveError(null)
    try {
      const adf = textToAdf(descText)
      const res = await fetch(`/api/jira/${ticketKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { description: adf } }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setEditingDescription(false)
      loadDetail(ticketKey)
    } catch (err) {
      setDescSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setDescSaving(false)
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketKey || !commentText.trim()) return
    setCommentBusy(true)
    setCommentError(null)
    try {
      const res = await fetch(`/api/jira/${ticketKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', text: commentText }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setCommentText('')
      loadDetail(ticketKey)
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setCommentBusy(false)
    }
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketKey || !linkUrl.trim()) return
    setLinkBusy(true)
    setLinkError(null)
    try {
      const res = await fetch(`/api/jira/${ticketKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', url: linkUrl, title: linkTitle }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setLinkUrl('')
      setLinkTitle('')
      setShowLinkForm(false)
      loadDetail(ticketKey)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to add link')
    } finally {
      setLinkBusy(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !ticketKey) return
    setAttachBusy(true)
    setAttachError(null)
    try {
      await Promise.all(files.map((file) => {
        const form = new FormData()
        form.append('file', file)
        return fetch(`/api/jira/${ticketKey}`, { method: 'POST', body: form })
          .then((res) => res.ok ? res.json() : res.json().then((d: { error?: string }) => { throw new Error(d.error ?? 'Upload failed') }))
      }))
      loadDetail(ticketKey)
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setAttachBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingField) cancelEdit()
        else if (editingDescription) setEditingDescription(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, editingField, editingDescription])

  const inputStyle: React.CSSProperties = {
    fontSize: 13,
    background: 'var(--pdSurface2)',
    border: '1px solid var(--pdAccent06)',
    borderRadius: 6,
    padding: '4px 8px',
    color: 'var(--pdTextStrong)',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
  }

  // Inline editor row — shown in place of the value when editing
  function InlineInput({ field, type = 'text', options }: {
    field: string
    type?: 'text' | 'url' | 'number' | 'date' | 'select'
    options?: readonly string[]
  }) {
    if (editingField !== field) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {type === 'select' && options ? (
            <select value={editValue} onChange={(e) => setEditValue(e.target.value)} style={inputStyle} autoFocus>
              <option value="">— none —</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={inputStyle}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveField(field, editValue)
                if (e.key === 'Escape') cancelEdit()
              }}
            />
          )}
          <button
            type="button"
            onClick={() => saveField(field, editValue)}
            disabled={savingField}
            className="PdButton PdButton--primary PdButton--small"
            style={{ flexShrink: 0, opacity: savingField ? 0.5 : 1 }}
          >
            {savingField ? '…' : 'Save'}
          </button>
          <button type="button" onClick={cancelEdit} className="PdButton PdButton--tertiary PdButton--small" style={{ flexShrink: 0 }}>✕</button>
        </div>
        {saveError && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)' }}>{saveError}</p>}
      </div>
    )
  }

  // A read-only+editable field row: shows value + Edit button side by side
  function FieldEditable({
    label, field, display, type = 'text', options, initialValue,
  }: {
    label: string
    field: string
    display: React.ReactNode
    type?: 'text' | 'url' | 'number' | 'date' | 'select'
    options?: readonly string[]
    initialValue: string
  }) {
    return (
      <div className="FieldRow" style={{ alignItems: 'flex-start' }}>
        <span className="FieldRow__label" style={{ paddingTop: 2 }}>{label}</span>
        <div style={{ flex: 1 }}>
          {editingField === field ? (
            <InlineInput field={field} type={type} options={options} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--pdTextBase)' }}>{display}</span>
              <EditBtn onClick={() => startEdit(field, initialValue)} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {previewUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setPreviewUrl(null)}
        >
          <button onClick={() => setPreviewUrl(null)} className="IconButton" style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.7)' }}>
            <svg viewBox="0 0 16 16" fill="none" style={{ width: 20, height: 20 }}>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="Drawer" style={{ boxShadow: 'var(--pdShadowLg)' }}>
        <div className="Drawer__head">
          {detail && (
            <a className="JiraKey JiraKey--clickable" href={`${jiraBaseUrl}/browse/${detail.key}`} target="_blank" rel="noopener noreferrer">
              {detail.key}
            </a>
          )}
          {loading && <span style={{ fontSize: 13, color: 'var(--pdTextMuted)' }}>Loading…</span>}
          <div style={{ flex: 1 }} />
          <button className="IconButton" onClick={onClose} title="Close (Esc)">
            <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="Drawer__body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <p style={{ fontSize: 13, color: 'var(--pdPrioHigh)', background: 'var(--pdStatusReviewBg)', border: '1px solid var(--pdStatusReviewBorder)', borderRadius: 8, padding: '10px 14px' }}>{error}</p>
          )}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div className="PdSkeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            </div>
          )}

          {detail && (
            <>
              {/* Title + status pills */}
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: 'var(--pdTextStrong)', margin: '0 0 12px' }}>{detail.summary}</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={detail.status} categoryKey={detail.statusCategoryKey} />
                  <PriorityBadge priority={detail.priority} />
                </div>
              </div>

              {/* Metadata rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--pdBorder)', paddingTop: 16 }}>
                {detail.assignee && (
                  <div className="FieldRow">
                    <span className="FieldRow__label">Assignee</span>
                    <span className="FieldRow__value">{detail.assignee}</span>
                  </div>
                )}
                {detail.reporter && (
                  <div className="FieldRow">
                    <span className="FieldRow__label">Reporter</span>
                    <span className="FieldRow__value">{detail.reporter}</span>
                  </div>
                )}

                {/* Priority */}
                <FieldEditable
                  label="Priority"
                  field="priority"
                  initialValue={detail.priority}
                  type="select"
                  options={CANVA_PRIORITIES}
                  display={<PriorityBadge priority={detail.priority} />}
                />

                {/* Due date */}
                <FieldEditable
                  label="Due"
                  field="dueDate"
                  initialValue={detail.dueDate ?? ''}
                  type="date"
                  display={
                    detail.dueDate
                      ? <span style={{ color: new Date(detail.dueDate) < new Date() ? 'var(--pdPrioHigh)' : undefined }}>
                          {new Date(detail.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Start date */}
                <FieldEditable
                  label="Start date"
                  field="startDate"
                  initialValue={detail.startDate ?? ''}
                  type="date"
                  display={
                    detail.startDate
                      ? new Date(detail.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Story points */}
                <FieldEditable
                  label="Story points"
                  field="storyPoints"
                  initialValue={detail.storyPoints?.toString() ?? ''}
                  type="number"
                  display={
                    detail.storyPoints != null
                      ? String(detail.storyPoints)
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Design status */}
                <FieldEditable
                  label="Design status"
                  field="designStatus"
                  initialValue={detail.designStatus ?? ''}
                  type="select"
                  options={CANVA_DESIGN_STATUSES}
                  display={
                    detail.designStatus
                      ? <span className="EpicTag">{detail.designStatus}</span>
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Category of work */}
                <FieldEditable
                  label="Category"
                  field="categoryOfWork"
                  initialValue={detail.categoryOfWork ?? ''}
                  type="select"
                  options={CANVA_CATEGORIES_OF_WORK}
                  display={
                    detail.categoryOfWork
                      ? <span className="EpicTag">{detail.categoryOfWork}</span>
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Labels */}
                <FieldEditable
                  label="Labels"
                  field="labels"
                  initialValue={detail.labels.join(', ')}
                  type="text"
                  display={
                    detail.labels.length > 0
                      ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {detail.labels.map((l) => <span key={l} className="EpicTag">{l}</span>)}
                        </span>
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Doc link */}
                <FieldEditable
                  label="Doc link"
                  field="docLink"
                  initialValue={detail.docLink ?? ''}
                  type="url"
                  display={
                    detail.docLink
                      ? <a href={detail.docLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--pdAccent06)', wordBreak: 'break-all' }}>{detail.docLink}</a>
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Prototype link */}
                <FieldEditable
                  label="Prototype"
                  field="prototypeLink"
                  initialValue={detail.prototypeLink ?? ''}
                  type="url"
                  display={
                    detail.prototypeLink
                      ? <a href={detail.prototypeLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--pdAccent06)', wordBreak: 'break-all' }}>{detail.prototypeLink}</a>
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {/* Slack channel */}
                <FieldEditable
                  label="Slack channel"
                  field="slackChannelName"
                  initialValue={detail.slackChannelName ?? ''}
                  type="text"
                  display={
                    detail.slackChannelName
                      ? `#${detail.slackChannelName}`
                      : <span style={{ color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>Not set</span>
                  }
                />

                {detail.parentKey && (
                  <div className="FieldRow">
                    <span className="FieldRow__label">Epic</span>
                    <span className="FieldRow__value">
                      <a
                        className="EpicTag EpicTag--blue"
                        href={`${jiraBaseUrl}/browse/${detail.parentKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        {detail.parentKey}{detail.parentSummary ? ` · ${detail.parentSummary.slice(0, 35)}` : ''}
                      </a>
                    </span>
                  </div>
                )}
                <div className="FieldRow">
                  <span className="FieldRow__label">Created</span>
                  <span className="FieldRow__value" style={{ color: 'var(--pdTextMuted)' }}>{formatDate(detail.created)}</span>
                </div>
                <div className="FieldRow">
                  <span className="FieldRow__label">Updated</span>
                  <span className="FieldRow__value" style={{ color: 'var(--pdTextMuted)' }}>{formatDate(detail.updated)}</span>
                </div>
              </div>

              {/* Description */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', margin: 0 }}>Description</p>
                  {!editingDescription && (
                    <EditBtn onClick={() => {
                      setDescText(adfToPlainText(detail.description))
                      setEditingDescription(true)
                    }} />
                  )}
                </div>
                {editingDescription ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={descText}
                      onChange={(e) => setDescText(e.target.value)}
                      rows={8}
                      autoFocus
                      style={{
                        width: '100%', fontSize: 14,
                        background: 'var(--pdSurface2)',
                        border: '1px solid var(--pdAccent06)',
                        borderRadius: 8, padding: '10px 12px',
                        color: 'var(--pdTextStrong)', fontFamily: 'inherit',
                        outline: 'none', resize: 'vertical',
                        boxShadow: '0 0 0 3px var(--pdAccentA02)',
                      }}
                    />
                    {descSaveError && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)' }}>{descSaveError}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={saveDescription}
                        disabled={descSaving}
                        className="PdButton PdButton--primary PdButton--small"
                        style={{ opacity: descSaving ? 0.5 : 1 }}
                      >
                        {descSaving ? 'Saving…' : 'Save description'}
                      </button>
                      <button type="button" onClick={() => setEditingDescription(false)} className="PdButton PdButton--tertiary PdButton--small">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  detail.description ? (
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--pdTextBase)' }}>
                      {renderAdf(detail.description, detail.attachments as AdfAttachment[])}
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>No description.</p>
                  )
                )}
              </section>

              {/* Linked issues */}
              {detail.issueLinks.length > 0 && (
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', marginBottom: 10 }}>Linked Issues</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.issueLinks.map((link) => (
                      <a key={link.id} href={`${jiraBaseUrl}/browse/${link.key}`} target="_blank" rel="noopener noreferrer" className="Attachment" style={{ textDecoration: 'none' }}>
                        <div className="Attachment__thumb">
                          <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
                            <path d="M9 5h2.5a2.5 2.5 0 0 1 0 5H9M7 11H4.5a2.5 2.5 0 0 1 0-5H7M5.5 7.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div className="Attachment__body">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="JiraKey">{link.key}</span>
                            <span style={{ fontSize: 11, color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>{link.type}</span>
                          </div>
                          <p className="Attachment__name" style={{ marginTop: 2 }}>{link.summary}</p>
                        </div>
                        <span className="StatusPill" style={{ flexShrink: 0 }}>{link.status}</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Attachments */}
              {detail.attachments.length > 0 && (
                <section>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', marginBottom: 10 }}>
                    Files ({detail.attachments.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith('image/')
                      const inner = (
                        <>
                          <div className="Attachment__thumb">
                            {isImage && att.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={att.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16 }}>
                                <path d="M11 7.5L7 11.5a2.5 2.5 0 0 1-3.5-3.5l5-5a1.5 1.5 0 0 1 2 2L5.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className="Attachment__body">
                            <p className="Attachment__name">{att.filename}</p>
                            <p className="Attachment__meta">{formatBytes(att.size)} · {att.author}</p>
                          </div>
                        </>
                      )
                      return isImage ? (
                        <button key={att.id} type="button" onClick={() => setPreviewUrl(att.content)} className="Attachment" style={{ textAlign: 'left' }}>{inner}</button>
                      ) : (
                        <a key={att.id} href={att.content} target="_blank" rel="noopener noreferrer" className="Attachment" style={{ textDecoration: 'none' }}>{inner}</a>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Comments */}
              <section>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', marginBottom: 10 }}>
                  Comments{detail.comments.length > 0 && ` (${detail.comments.length})`}
                </p>
                {detail.comments.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--pdTextSubtle)', fontStyle: 'italic' }}>No comments yet.</p>
                ) : (
                  <div style={{ borderTop: '1px solid var(--pdBorder)' }}>
                    {detail.comments.map((c) => (
                      <div key={c.id} className="Comment">
                        <div className="UserAvatar UserAvatar--c2" style={{ flexShrink: 0, marginTop: 2 }}>
                          {c.authorAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.authorAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                          ) : c.author[0]?.toUpperCase()}
                        </div>
                        <div className="Comment__body">
                          <div className="Comment__head">
                            <span className="Comment__author">{c.author}</span>
                            <span className="Comment__time">{formatDate(c.created)}</span>
                          </div>
                          <div className="Comment__text">{renderAdf(c.body, detail.attachments as AdfAttachment[])}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Add comment */}
              <section>
                <form onSubmit={handleComment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    rows={3}
                    style={{
                      width: '100%', fontSize: 14,
                      background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)',
                      borderRadius: 8, padding: '10px 12px',
                      color: 'var(--pdTextStrong)', fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--pdAccent06)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--pdAccentA02)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pdBorder)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  {commentError && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)' }}>{commentError}</p>}
                  <div>
                    <button type="submit" disabled={commentBusy || !commentText.trim()} className="PdButton PdButton--primary PdButton--small" style={{ opacity: commentBusy || !commentText.trim() ? 0.5 : 1 }}>
                      {commentBusy ? 'Posting…' : 'Post comment'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Attach / link */}
              <section style={{ paddingBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pdTextSubtle)', marginBottom: 10 }}>Attach</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <label
                    htmlFor={`attach-file-${ticketKey}`}
                    className="PdButton PdButton--secondary PdButton--small"
                    style={{ cursor: attachBusy ? 'not-allowed' : 'pointer', opacity: attachBusy ? 0.5 : 1, userSelect: 'none' }}
                  >
                    {attachBusy ? 'Uploading…' : '📎 Attach file'}
                  </label>
                  <input
                    id={`attach-file-${ticketKey}`}
                    ref={fileInputRef}
                    type="file"
                    multiple
                    disabled={attachBusy}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button type="button" className="PdButton PdButton--secondary PdButton--small" onClick={() => setShowLinkForm((v) => !v)}>
                    🔗 Add link
                  </button>
                </div>
                {attachError && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)', marginTop: 8 }}>{attachError}</p>}
                {showLinkForm && (
                  <form onSubmit={handleLink} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="url" placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required
                      style={{ fontSize: 14, background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)', borderRadius: 8, padding: '8px 12px', color: 'var(--pdTextStrong)', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                    <input type="text" placeholder="Link title (optional)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)}
                      style={{ fontSize: 14, background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)', borderRadius: 8, padding: '8px 12px', color: 'var(--pdTextStrong)', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                    {linkError && <p style={{ fontSize: 12, color: 'var(--pdPrioHigh)' }}>{linkError}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" disabled={linkBusy || !linkUrl.trim()} className="PdButton PdButton--primary PdButton--small" style={{ opacity: linkBusy || !linkUrl.trim() ? 0.5 : 1 }}>
                        {linkBusy ? 'Adding…' : 'Add link'}
                      </button>
                      <button type="button" onClick={() => setShowLinkForm(false)} className="PdButton PdButton--tertiary PdButton--small">Cancel</button>
                    </div>
                  </form>
                )}
              </section>
            </>
          )}
        </div>

        {detail && (
          <div className="Drawer__foot">
            <a href={`${jiraBaseUrl}/browse/${detail.key}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--pdAccent06)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Open in Jira
              <svg viewBox="0 0 12 12" fill="none" style={{ width: 12, height: 12 }}>
                <path d="M7 2h3v3M10 2L5.5 6.5M4 3H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        )}
      </div>
    </>
  )
}
