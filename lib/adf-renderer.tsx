import React from 'react'

function safeUrl(href: string | undefined): string | undefined {
  if (!href) return undefined
  const lower = href.toLowerCase().trimStart()
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return undefined
  return href
}

type AdfNode = {
  type: string
  text?: string
  content?: AdfNode[]
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export type AdfAttachment = {
  id: string
  filename: string
  mimeType: string
  content: string
  thumbnail?: string
}

function applyMarks(text: string, marks: AdfNode['marks'] = []): React.ReactNode {
  let node: React.ReactNode = text
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        node = <strong className="font-semibold text-gray-900 dark:text-gray-100">{node}</strong>
        break
      case 'em':
        node = <em className="italic">{node}</em>
        break
      case 'code':
        node = <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-blue-700 dark:text-blue-300">{node}</code>
        break
      case 'strike':
        node = <s className="line-through text-gray-400 dark:text-gray-500">{node}</s>
        break
      case 'underline':
        node = <u>{node}</u>
        break
      case 'link': {
        const href = safeUrl(mark.attrs?.href as string | undefined)
        node = (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">{node}</a>
        )
        break
      }
    }
  }
  return node
}

let _attachments: AdfAttachment[] = []

function renderNode(node: AdfNode, idx: number): React.ReactNode {
  switch (node.type) {
    case 'text':
      return <React.Fragment key={idx}>{applyMarks(node.text ?? '', node.marks)}</React.Fragment>

    case 'hardBreak':
      return <br key={idx} />

    case 'rule':
      return <hr key={idx} className="border-gray-200 dark:border-gray-700 my-3" />

    case 'mention':
      return (
        <span key={idx} className="text-blue-600 dark:text-blue-400 font-medium">
          {node.attrs?.text as string ?? '@mention'}
        </span>
      )

    case 'emoji':
      return <span key={idx}>{node.attrs?.text as string ?? ''}</span>

    case 'inlineCard': {
      const url = safeUrl(node.attrs?.url as string | undefined)
      if (!url) return null
      // Try to extract a readable label from the URL
      let label = url
      try { label = new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? url } catch { /* noop */ }
      return (
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--pdAccent06)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--pdAccent04)', fontSize: 'inherit' }}>
          {label}
        </a>
      )
    }

    case 'blockCard': {
      const url = safeUrl(node.attrs?.url as string | undefined)
      if (!url) return null
      return (
        <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', margin: '4px 0',
            background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)', borderRadius: 8,
            color: 'var(--pdTextBase)', textDecoration: 'none', fontSize: 13,
          }}>
          <svg viewBox="0 0 12 12" fill="none" style={{ width: 12, height: 12, flexShrink: 0, color: 'var(--pdTextSubtle)' }}>
            <path d="M7 2h3v3M10 2L5.5 6.5M4 3H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
        </a>
      )
    }

    case 'paragraph':
      return (
        <p key={idx} className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-2 last:mb-0">
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </p>
      )

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2
      const classes = 'font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-1 ' +
        (level === 1 ? 'text-base' : level === 2 ? 'text-sm' : 'text-xs')
      return React.createElement(
        `h${Math.min(level, 6)}`,
        { key: idx, className: classes },
        (node.content ?? []).map((c, i) => renderNode(c, i))
      )
    }

    case 'bulletList':
      return (
        <ul key={idx} className="list-disc list-inside space-y-1 mb-2 text-sm text-gray-800 dark:text-gray-200 pl-2">
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </ul>
      )

    case 'orderedList':
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1 mb-2 text-sm text-gray-800 dark:text-gray-200 pl-2">
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </ol>
      )

    case 'listItem':
      return (
        <li key={idx}>
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </li>
      )

    case 'blockquote':
      return (
        <blockquote key={idx} className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 my-2 text-gray-600 dark:text-gray-400 italic text-sm">
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </blockquote>
      )

    case 'codeBlock':
      return (
        <pre key={idx} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-green-700 dark:text-green-300">
          <code>{(node.content ?? []).map((c) => c.text ?? '').join('')}</code>
        </pre>
      )

    case 'table':
      return (
        <div key={idx} className="overflow-x-auto my-3">
          <table className="text-xs text-gray-800 dark:text-gray-200 border-collapse w-full">
            <tbody>{(node.content ?? []).map((c, i) => renderNode(c, i))}</tbody>
          </table>
        </div>
      )

    case 'tableRow':
      return (
        <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </tr>
      )

    case 'tableCell':
    case 'tableHeader':
      return (
        <td key={idx} className={`px-3 py-1.5 align-top ${node.type === 'tableHeader' ? 'font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800' : ''}`}>
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </td>
      )

    case 'mediaSingle': {
      // Render child media nodes inside a block wrapper
      const children = (node.content ?? []).map((c, i) => renderNode(c, i))
      return <div key={idx} style={{ margin: '8px 0' }}>{children}</div>
    }

    case 'media': {
      const fileName = (node.attrs?.__fileName ?? node.attrs?.alt ?? '') as string
      const mediaType = node.attrs?.type as string | undefined

      // Try to find a matching attachment by filename
      let attachment: AdfAttachment | undefined
      if (fileName) {
        attachment = _attachments.find(a => a.filename === fileName)
      }

      const isImage = mediaType === 'file' && (
        attachment?.mimeType?.startsWith('image/') ||
        /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName)
      )

      if (isImage && attachment) {
        const proxied = `/api/jira/image?url=${encodeURIComponent(attachment.thumbnail ?? attachment.content)}`
        const fullUrl = `/api/jira/image?url=${encodeURIComponent(attachment.content)}`
        return (
          <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxied}
              alt={fileName}
              loading="lazy"
              style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--pdBorder)', display: 'block' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </a>
        )
      }

      // Fallback: styled file badge
      return (
        <div key={idx} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)',
          borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--pdTextMuted)', margin: '2px 0',
        }}>
          <svg style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {fileName || 'Attachment'}
        </div>
      )
    }

    case 'doc':
      return (
        <div key={idx}>
          {(node.content ?? []).map((c, i) => renderNode(c, i))}
        </div>
      )

    default:
      if (node.content?.length) {
        return <span key={idx}>{(node.content ?? []).map((c, i) => renderNode(c, i))}</span>
      }
      return null
  }
}

export function renderAdf(doc: unknown, attachments?: AdfAttachment[]): React.ReactNode {
  if (!doc || typeof doc !== 'object') return null
  _attachments = attachments ?? []
  return renderNode(doc as AdfNode, 0)
}
