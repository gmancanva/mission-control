// Edge-safe (Web Crypto only) — shared by middleware.ts and the login route.
// The pd_auth cookie stores a SHA-256 hash of the password, never the password itself.

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`pd-tracker:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}
