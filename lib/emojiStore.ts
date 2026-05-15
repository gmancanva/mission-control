let globalEmoji: Record<string, string> | null = null
let fetchPromise: Promise<Record<string, string>> | null = null
const LOCAL_KEY = 'slack-custom-emoji'

export function loadEmoji(): Promise<Record<string, string>> {
  if (globalEmoji) return Promise.resolve(globalEmoji)
  if (fetchPromise) return fetchPromise

  try {
    const cached = localStorage.getItem(LOCAL_KEY)
    if (cached) {
      globalEmoji = JSON.parse(cached) as Record<string, string>
      return Promise.resolve(globalEmoji)
    }
  } catch { /* ignore */ }

  fetchPromise = fetch('/api/slack/emojis')
    .then(r => r.json() as Promise<{ emoji: Record<string, string> }>)
    .then(({ emoji }) => {
      globalEmoji = emoji ?? {}
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(globalEmoji)) } catch { /* ignore */ }
      return globalEmoji!
    })
    .catch(() => {
      globalEmoji = {}
      return globalEmoji!
    })
    .finally(() => { fetchPromise = null })

  return fetchPromise
}

export function getGlobalEmoji(): Record<string, string> {
  return globalEmoji ?? {}
}
