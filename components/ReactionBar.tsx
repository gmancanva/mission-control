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
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
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
