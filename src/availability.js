/**
 * Model Float — the per-model availability cache.
 *
 * The card probes models (the free lane's own bench, the channel gateway for
 * vendor models), and a probe is *spent*: it costs a real request and, on paid
 * lanes, real credit. So a verdict has to outlive the page: it lands here, on
 * the Host, the same way the switch's state does, and the next reload reads
 * the verdicts it already paid for.
 *
 * The shape is deliberately dumb — `{ id: { state, detail, at } }` — because
 * the interpretation (what counts as usable, how long a verdict stays fresh)
 * belongs to the card, next to the reading it qualifies.
 *
 * @module src/availability.js
 */

import fs from 'node:fs'
import path from 'node:path'

import { JsonStore, resolveDshHome, DATA_DIR_NAME } from './store.js'

/** The file the verdicts live in, under the plugin's data directory. */
export const AVAILABILITY_FILE = 'availability.json'

/** The states a probe may record. Anything else is dropped as noise. */
export const VERDICT_STATES = new Set([
  'available', 'unavailable', 'region-blocked', 'throttled', 'no-credit', 'no-credential',
])

/** The shape written to disk. */
export const INITIAL_AVAILABILITY = { version: 1, updatedAt: 0, results: {} }

/**
 * Open the availability store.
 *
 * @param {object} options
 * @param {{warn?: (message: string) => void}} [options.logger]
 * @returns {JsonStore}
 */
export function openAvailabilityStore({ logger = console } = {}) {
  const dataDir = path.resolve(resolveDshHome(), DATA_DIR_NAME)
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  return new JsonStore(path.join(dataDir, AVAILABILITY_FILE), structuredClone(INITIAL_AVAILABILITY), {
    log: message => logger.warn?.(`model-float: ${message}`),
  })
}

/**
 * Normalise a stored cache into the shape the API answers with.
 *
 * @param {unknown} value - the raw stored value
 * @returns {{version: number, updatedAt: number, results: Record<string, {state: string, detail: string, at: number}>}}
 */
export function normalizeAvailability(value) {
  const source = value !== null && typeof value === 'object' ? value : {}
  const results = {}
  for (const [id, row] of Object.entries(source.results ?? {})) {
    if (typeof id !== 'string' || id === '') continue
    if (row === null || typeof row !== 'object') continue
    if (!VERDICT_STATES.has(row.state)) continue
    results[id] = {
      state: row.state,
      detail: typeof row.detail === 'string' ? row.detail.slice(0, 200) : '',
      at: Number.isFinite(row.at) ? row.at : 0,
    }
  }
  return {
    version: 1,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : 0,
    results,
  }
}

/**
 * Merge probe results into the store and return the normalised value.
 *
 * @param {JsonStore} store
 * @param {unknown} patch - `{ results: { id: {state, detail?} } }` from the card.
 * @returns the normalised cache after the merge.
 */
export function mergeAvailability(store, patch) {
  const incoming = patch !== null && typeof patch === 'object' ? patch.results ?? patch : {}
  const now = Date.now()
  const next = store.edit(current => {
    const value = normalizeAvailability(current)
    for (const [id, row] of Object.entries(incoming)) {
      if (typeof id !== 'string' || id === '') continue
      if (row === null || typeof row !== 'object') continue
      if (!VERDICT_STATES.has(row.state)) continue
      value.results[id] = {
        state: row.state,
        detail: typeof row.detail === 'string' ? row.detail.slice(0, 200) : '',
        at: Number.isFinite(row.at) && row.at > 0 ? row.at : now,
      }
    }
    value.updatedAt = now
    return value
  })
  return normalizeAvailability(next)
}
