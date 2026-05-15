'use client'
import { useEffect, useState } from 'react'
import { slackToHtml } from '@/lib/slackMarkdown'
import { loadEmoji, getGlobalEmoji } from '@/lib/emojiStore'

export default function SlackText({ text, className }: { text: string; className?: string }) {
  const [emoji, setEmoji] = useState<Record<string, string>>(getGlobalEmoji())

  useEffect(() => {
    const current = getGlobalEmoji()
    if (Object.keys(current).length > 0) { setEmoji(current); return }
    let active = true
    loadEmoji().then(e => { if (active) setEmoji(e) })
    return () => { active = false }
  }, [])

  const html = slackToHtml(text, emoji)
  return <div className={`slack-text${className ? ` ${className}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
}
