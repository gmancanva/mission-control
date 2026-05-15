// Browser-only: converts contentEditable HTML → Atlassian Document Format (ADF)

type AdfMark = {
  type: string
  attrs?: Record<string, unknown>
}

type AdfNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: AdfNode[]
  marks?: AdfMark[]
  text?: string
}

function collectMarks(el: HTMLElement, inherited: AdfMark[]): AdfMark[] {
  const marks = [...inherited]
  const tag = el.tagName.toLowerCase()
  const style = el.getAttribute('style') ?? ''

  if ((tag === 'b' || tag === 'strong' || style.includes('font-weight')) && !marks.some(m => m.type === 'strong')) {
    marks.push({ type: 'strong' })
  }
  if ((tag === 'em' || tag === 'i' || style.includes('font-style: italic')) && !marks.some(m => m.type === 'em')) {
    marks.push({ type: 'em' })
  }
  if (tag === 'code' && !marks.some(m => m.type === 'code')) {
    marks.push({ type: 'code' })
  }
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? ''
    if (href && !marks.some(m => m.type === 'link')) {
      marks.push({ type: 'link', attrs: { href } })
    }
  }
  return marks
}

function childNodes(el: HTMLElement, marks: AdfMark[]): AdfNode[] {
  return Array.from(el.childNodes).flatMap(n => nodeToAdf(n, marks))
}

function nodeToAdf(node: Node, marks: AdfMark[] = []): AdfNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text) return []
    const n: AdfNode = { type: 'text', text }
    if (marks.length) n.marks = marks
    return [n]
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return []
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  if (tag === 'br') return [{ type: 'hardBreak' }]

  // Inline marks — pass marks down, don't create block nodes
  if (['b', 'strong', 'em', 'i', 'code', 'a', 'span', 'u', 's'].includes(tag)) {
    return childNodes(el, collectMarks(el, marks))
  }

  // Headings
  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1])
    const content = childNodes(el, [])
    if (!content.length) return []
    return [{ type: 'heading', attrs: { level }, content }]
  }

  // Code block
  if (tag === 'pre') {
    const codeEl = el.querySelector('code')
    const text = (codeEl ?? el).textContent ?? ''
    if (!text.trim()) return []
    return [{ type: 'codeBlock', attrs: {}, content: [{ type: 'text', text }] }]
  }

  // Lists
  if (tag === 'ul' || tag === 'ol') {
    const listType = tag === 'ul' ? 'bulletList' : 'orderedList'
    const items = Array.from(el.children)
      .filter(c => c.tagName.toLowerCase() === 'li')
      .map(li => {
        const content = childNodes(li as HTMLElement, [])
        const allInline = content.every(n => n.type === 'text' || n.type === 'hardBreak')
        return {
          type: 'listItem',
          content: allInline ? [{ type: 'paragraph', content }] : content,
        }
      })
    if (!items.length) return []
    return [{ type: listType, content: items }]
  }

  // Paragraph / div — only wrap in paragraph if content is inline
  if (tag === 'p' || tag === 'div') {
    const content = childNodes(el, marks)
    if (!content.length) return []
    const allInline = content.every(n => n.type === 'text' || n.type === 'hardBreak')
    if (allInline) return [{ type: 'paragraph', content }]
    return content
  }

  // Fallback: recurse into children
  return childNodes(el, marks)
}

export function htmlToAdf(html: string): unknown | null {
  if (!html.trim() || html === '<br>') return null
  if (typeof DOMParser === 'undefined') return null

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const content = Array.from(doc.body.childNodes)
    .flatMap(n => nodeToAdf(n))
    .filter(n => {
      if (n.type === 'paragraph') return !!n.content?.length
      return true
    })

  if (!content.length) return null
  return { version: 1, type: 'doc', content }
}
