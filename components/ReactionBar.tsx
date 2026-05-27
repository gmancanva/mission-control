'use client'
import { getGlobalEmoji } from '@/lib/emojiStore'
import { resolveEmoji } from '@/lib/slackMarkdown'

type Reaction = { name: string; count: number }

export default function ReactionBar({ reactions }: { reactions: Reaction[] }) {
  if (!reactions || reactions.length === 0) return null
  const emoji = getGlobalEmoji()

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map(r => {
        const resolved = resolveEmoji(r.name, emoji)
        const isImg = resolved.startsWith('<img')
        return (
          <span
            key={r.name}
            title={`:${r.name}:`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
            style={{ background: 'var(--pdSurface2)', border: '1px solid var(--pdBorder)', color: 'var(--pdTextMuted)' }}
          >
            {isImg
              ? <span dangerouslySetInnerHTML={{ __html: resolved }} />
              : <span>{resolved}</span>}
            <span className="font-medium ml-0.5">{r.count}</span>
          </span>
        )
      })}
    </div>
  )
}
