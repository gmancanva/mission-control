import path from 'path'

/**
 * Runtime data directory — writable on both local dev and Vercel.
 *
 * Vercel's project filesystem is read-only everywhere except /tmp.
 * On Vercel we use /tmp/data to mirror the local `data/` layout so all
 * SQLite and JSON cache writes succeed. Note: /tmp is ephemeral on Vercel
 * (wiped between cold starts), so credentials should be set via env vars
 * rather than relying on the DB persisting across lambda invocations.
 */
export const DATA_DIR: string = process.env.VERCEL
  ? '/tmp/data'
  : path.join(process.cwd(), 'data')
