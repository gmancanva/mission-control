'use client'

import { useRef, useEffect } from 'react'

type Props = {
  initialHtml?: string
  onHtmlChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

export default function RichEditor({ initialHtml = '', onHtmlChange, placeholder = 'Add a description…', minHeight = 140 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml
  }, []) // intentionally mount-only — contentEditable owns its own DOM

  function notify() {
    onHtmlChange(ref.current?.innerHTML ?? '')
  }

  function exec(cmd: string, value?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, value)
    notify()
  }

  function formatBlock(tag: string) {
    ref.current?.focus()
    // Toggle: if already in this block type, revert to paragraph
    const sel = window.getSelection()
    const block = sel?.anchorNode?.parentElement?.closest('h1,h2,h3,h4,pre,p,div')
    if (block && block.tagName.toLowerCase() === tag) {
      document.execCommand('formatBlock', false, 'p')
    } else {
      document.execCommand('formatBlock', false, tag)
    }
    notify()
  }

  function insertInlineCode() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const text = range.toString()
    if (!text) return
    const code = document.createElement('code')
    code.textContent = text
    range.deleteContents()
    range.insertNode(code)
    // Move cursor past the code element
    const r = document.createRange()
    r.setStartAfter(code)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)
    notify()
  }

  function insertLink() {
    const sel = window.getSelection()
    const text = sel?.toString() ?? ''
    const href = window.prompt('URL', 'https://')
    if (!href) return
    if (text) {
      exec('createLink', href)
    } else {
      // No selection — insert a link with the URL as text
      const a = document.createElement('a')
      a.href = href
      a.textContent = href
      const range = sel?.getRangeAt(0)
      if (range) {
        range.insertNode(a)
        range.setStartAfter(a)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      notify()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key === 'b') { e.preventDefault(); exec('bold') }
    else if (mod && e.key === 'i') { e.preventDefault(); exec('italic') }
    else if (mod && e.key === 'k') { e.preventDefault(); insertLink() }
    else if (mod && e.key === '`') { e.preventDefault(); insertInlineCode() }
  }

  function Btn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
    return (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); onClick() }}
        style={{
          padding: '2px 8px',
          fontSize: 12,
          fontWeight: 600,
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 4,
          color: 'var(--pdTextStrong)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: '20px',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--pdSurface3)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {label}
      </button>
    )
  }

  function Divider() {
    return <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--pdBorder)', margin: '4px 2px' }} />
  }

  return (
    <div style={{ border: '1px solid var(--pdBorder)', borderRadius: 8, overflow: 'hidden', background: 'var(--pdSurface1)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '4px 6px',
        borderBottom: '1px solid var(--pdBorder)',
        background: 'var(--pdSurface2)',
        flexWrap: 'wrap',
      }}>
        <Btn label="B" title="Bold (⌘B)" onClick={() => exec('bold')} />
        <Btn label="I" title="Italic (⌘I)" onClick={() => exec('italic')} />
        <Divider />
        <Btn label="H2" title="Heading 2" onClick={() => formatBlock('h2')} />
        <Btn label="H3" title="Heading 3" onClick={() => formatBlock('h3')} />
        <Divider />
        <Btn label="•  List" title="Bullet list" onClick={() => exec('insertUnorderedList')} />
        <Btn label="1. List" title="Numbered list" onClick={() => exec('insertOrderedList')} />
        <Divider />
        <Btn label="`code`" title="Inline code (⌘`)" onClick={insertInlineCode} />
        <Btn label="```" title="Code block" onClick={() => formatBlock('pre')} />
        <Divider />
        <Btn label="🔗 Link" title="Insert link (⌘K)" onClick={insertLink} />
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={notify}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className="RichEditor__body"
        style={{
          minHeight,
          padding: '10px 12px',
          fontSize: 13,
          lineHeight: 1.65,
          color: 'var(--pdTextStrong)',
          outline: 'none',
        }}
      />
    </div>
  )
}
