import { get as getEmoji } from 'node-emoji'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function resolveEmoji(name: string, custom: Record<string, string>, depth = 0): string {
  if (depth > 5) return `:${esc(name)}:`
  if (custom[name]) {
    const val = custom[name]
    // Custom emojis can alias other emoji
    if (val.startsWith('alias:')) return resolveEmoji(val.slice(6), custom, depth + 1)
    return `<img src="${esc(val)}" alt=":${esc(name)}:" class="slack-emoji" />`
  }
  const found = getEmoji(name)
  if (found && found !== `:${name}:`) return found
  return `:${esc(name)}:`
}

// Process inline formatting within a single line (no block structure)
function processInlineFormatting(text: string, custom: Record<string, string>): string {
  // Split on inline code spans — they're opaque
  const parts = text.split(/(`[^`\n]+`)/g)

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Inline code
      const code = part.slice(1, -1)
      return `<code class="sk-code">${esc(code)}</code>`
    }
    return processTokens(part, custom)
  }).join('')
}

function processTokens(text: string, custom: Record<string, string>): string {
  // Split on Slack angle-bracket tokens — <@uid>, <#cid|name>, <!here>, <url|label>, <url>
  const parts = text.split(/(<[^>]+>)/g)

  return parts.map((part, i) => {
    if (i % 2 === 1) return parseSlackToken(part, custom)
    return processFormatting(part, custom)
  }).join('')
}

function parseSlackToken(token: string, custom: Record<string, string>): string {
  const inner = token.slice(1, -1)

  if (inner === '!here') return '<span class="sk-mention">@here</span>'
  if (inner === '!channel') return '<span class="sk-mention">@channel</span>'
  if (inner === '!everyone') return '<span class="sk-mention">@everyone</span>'

  const userMatch = inner.match(/^@([A-Z0-9]+)(?:\|(.+))?$/)
  if (userMatch) {
    const name = userMatch[2] || 'user'
    return `<span class="sk-mention">@${esc(name)}</span>`
  }

  const chanMatch = inner.match(/^#([A-Z0-9]+)\|(.+)$/)
  if (chanMatch) {
    return `<span class="sk-channel">#${esc(chanMatch[2])}</span>`
  }

  const linkMatch = inner.match(/^(https?:\/\/[^|]+)(?:\|(.+))?$/)
  if (linkMatch) {
    const url = linkMatch[1]
    const label = linkMatch[2] || url
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="sk-link">${esc(label)}</a>`
  }

  // Unknown token — show as-is (escaped)
  return esc(token)
}

function processFormatting(text: string, custom: Record<string, string>): string {
  // Slack sends &amp; &lt; &gt; for literal & < > typed by users — pass through as-is since it's
  // already valid HTML entity form. Any stray literal < or > we escape.
  let t = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Restore Slack-encoded entities so they display correctly
    .replace(/&amp;/g, '&amp;')
    .replace(/&lt;/g, '&lt;')
    .replace(/&gt;/g, '&gt;')

  // Bold: *text*
  t = t.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
  // Italic: _text_
  t = t.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  // Strikethrough: ~text~
  t = t.replace(/~([^~\n]+)~/g, '<del>$1</del>')

  // Emoji: :name:
  t = t.replace(/:([a-z0-9_+\-]+):/g, (_, name) => resolveEmoji(name, custom))

  // Plain bare URLs (cache-decoded text won't have <url|label> tokens)
  t = t.replace(
    /(?<![">])(https?:\/\/[^\s<>"')\]]+)/g,
    (url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="sk-link">${esc(url)}</a>`
  )

  // Plain @mention fallback — cache-decoded text has @Name instead of <@UID|Name>
  t = t.replace(
    /(?<![a-zA-Z0-9_/-])@([a-zA-Z][a-zA-Z0-9._-]{1,})/g,
    (_, name) => `<span class="sk-mention">@${esc(name)}</span>`
  )

  return t
}

// Top-level: handle code blocks, then line/block structure
export function slackToHtml(text: string, custom: Record<string, string> = {}): string {
  if (!text) return ''

  // Split on fenced code blocks first (they're opaque)
  const segments = text.split(/(```[\s\S]*?```)/g)

  const html = segments.map((seg, i) => {
    if (i % 2 === 1) {
      const code = seg.replace(/^```|```$/g, '').replace(/^\n|\n$/g, '')
      return `<pre class="sk-pre"><code>${esc(code)}</code></pre>`
    }
    return processLines(seg, custom)
  }).join('')

  return html
}

function processLines(text: string, custom: Record<string, string>): string {
  const lines = text.split('\n')
  const out: string[] = []
  let listBuf: string[] = []
  let quoteBuf: string[] = []

  const flushList = () => {
    if (listBuf.length) {
      out.push(`<ul class="sk-list">${listBuf.map(l => `<li>${l}</li>`).join('')}</ul>`)
      listBuf = []
    }
  }
  const flushQuote = () => {
    if (quoteBuf.length) {
      out.push(`<blockquote class="sk-quote">${quoteBuf.join('<br>')}</blockquote>`)
      quoteBuf = []
    }
  }

  for (const line of lines) {
    // Blockquote: starts with &gt; or literal >
    if (/^(&gt;|>)\s?/.test(line)) {
      flushList()
      quoteBuf.push(processInlineFormatting(line.replace(/^(&gt;|>)\s?/, ''), custom))
      continue
    }
    flushQuote()

    // Unordered list: • or - or * at start
    if (/^[•\-\*]\s/.test(line)) {
      out.push(...[]) // no-op flush check
      listBuf.push(processInlineFormatting(line.replace(/^[•\-\*]\s/, ''), custom))
      continue
    }
    // Numbered list: 1. 2. etc
    if (/^\d+\.\s/.test(line)) {
      // Convert to <ol> — simpler: just accumulate as list items, wrap once
      listBuf.push(processInlineFormatting(line.replace(/^\d+\.\s/, ''), custom))
      continue
    }
    flushList()

    // Empty line — small gap
    if (!line.trim()) {
      out.push('<div class="sk-gap"></div>')
      continue
    }

    out.push(`<span class="sk-line">${processInlineFormatting(line, custom)}</span>`)
  }

  flushList()
  flushQuote()

  // Join lines with <br> between adjacent sk-line spans
  return out.join('\n')
    .replace(/(<\/span>)\n(<span class="sk-line">)/g, '$1<br>$2')
    .replace(/\n/g, '')
}
