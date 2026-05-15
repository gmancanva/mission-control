let globalAvatars: Record<string, string> | null = null
let fetchPromise: Promise<Record<string, string>> | null = null

export function loadAvatars(): Promise<Record<string, string>> {
  if (globalAvatars) return Promise.resolve(globalAvatars)
  if (fetchPromise) return fetchPromise

  fetchPromise = fetch('/api/slack/users')
    .then(r => r.json() as Promise<{ users: Record<string, string> }>)
    .then(({ users }) => {
      globalAvatars = users ?? {}
      return globalAvatars!
    })
    .catch(() => {
      globalAvatars = {}
      return globalAvatars!
    })
    .finally(() => { fetchPromise = null })

  return fetchPromise
}

export function getGlobalAvatars(): Record<string, string> | null {
  return globalAvatars
}
