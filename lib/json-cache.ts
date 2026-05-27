/**
 * Shared JSON disk-cache helpers.
 *
 * All writes target DATA_DIR (resolves to `data/` locally, `/tmp/data/` on Vercel).
 * Every function is non-throwing — errors are swallowed so cache failures never
 * break the live request path.
 */
import fs from 'fs'
import path from 'path'
import { DATA_DIR } from './data-dir'

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Read and parse a JSON cache file. Returns `null` on any error (missing file,
 * invalid JSON, etc.) so callers never need a try/catch.
 */
export function readCache<T>(filename: string): T | null {
  const filePath = path.join(DATA_DIR, filename)
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Write `data` to a JSON cache file. Creates DATA_DIR if it doesn't exist.
 * Non-fatal — silently ignores write errors.
 */
export function writeCache<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch { /* non-fatal */ }
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/**
 * Merge `newItems` into `existing` by a stable ID field.
 *
 * - Items in `newItems` overwrite matching items in `existing` (same key).
 * - Items in `existing` not present in `newItems` are preserved.
 * - Result order: existing items first (preserving their order), then truly new
 *   items appended at the end.
 *
 * This prevents overwriting a full cache with an empty or partial live result.
 */
export function mergeById<T extends Record<string, unknown>>(
  existing: T[],
  newItems: T[],
  idField: keyof T = 'id' as keyof T,
): T[] {
  const newMap = new Map<unknown, T>()
  for (const item of newItems) newMap.set(item[idField], item)

  const merged: T[] = []
  const seen = new Set<unknown>()

  // Existing items — overwrite with new version if present
  for (const item of existing) {
    const key = item[idField]
    merged.push(newMap.has(key) ? newMap.get(key)! : item)
    seen.add(key)
  }

  // Truly new items not in existing
  for (const item of newItems) {
    if (!seen.has(item[idField])) merged.push(item)
  }

  return merged
}

/**
 * Convenience: read an existing array cache, merge new items in, write back.
 *
 * Only writes if `newItems.length > 0` (prevents overwriting a populated cache
 * with an empty live result when the API returns nothing).
 *
 * @param filename      Cache filename (relative to DATA_DIR)
 * @param newItems      Fresh items from the live API
 * @param getArray      Extract the item array from the cached shape
 * @param buildPayload  Build the full cache payload from the merged array
 * @param idField       Field used as the stable unique key (default: 'id')
 */
export function mergeAndWrite<Cache, Item extends Record<string, unknown>>(
  filename: string,
  newItems: Item[],
  getArray: (cache: Cache) => Item[],
  buildPayload: (merged: Item[]) => Cache,
  idField: keyof Item = 'id' as keyof Item,
): Cache {
  const existing = readCache<Cache>(filename)
  const existingItems = existing ? getArray(existing) : []
  const merged = mergeById(existingItems, newItems, idField)
  const payload = buildPayload(merged)
  if (newItems.length > 0) writeCache(filename, payload)
  return payload
}
