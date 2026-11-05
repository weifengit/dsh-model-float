/**
 * Model Float — the one verdict table.
 *
 * Two surfaces show the same per-model answer: the vendor card, and the
 * composer's model list (where the user actually picks a model). Both must read
 * one table folded by one rule, or the card would say 限流 about a model the list
 * draws as untested.
 *
 * The table is folded from three readings, strongest last:
 *
 * - the free lane's own roster (`/summary`) — a probe the lane ran, or a listing
 *   that merely named the model;
 * - this plugin's cache (`~/.dsh/model-float/availability.json`) — a probe it
 *   paid a real request for, which a reload must not spend twice;
 * - a probe that landed during this page's lifetime, so the picker updates
 *   mid-sweep without waiting for the cache write to be read back.
 *
 * Reading lives here rather than in either consumer, so neither surface owns the
 * other and mounting order does not matter: the card publishes the roster it
 * already reads, and the store reads the roster itself when the card is not
 * mounted at all. Published identity only changes when an answer does, so the
 * picker's subscription is quiet between polls.
 *
 * @module client/src/features/free-model/verdict-store.ts
 */

import { useSyncExternalStore } from 'react'
import { readAvailabilityCache, readLaneModels } from './data.ts'
import type { ModelRow } from './data.ts'
import { bestVerdict, cachedVerdict, laneVerdict, normalise } from './verdicts.ts'
import type { CachedProbe, Verdict } from './verdicts.ts'
import { applyProbe } from './sweep.ts'
import type { SweepVerdict } from './probe.ts'

/** The published table until the first read lands. */
const EMPTY: Readonly<Record<string, Verdict>> = Object.freeze({})

/** How recent a read has to be before a second ask is not worth a request. */
const MIN_READ_GAP_MS = 5_000

/** The lane's roster, as last read or published. */
let laneRows: readonly ModelRow[] = []

/** This plugin's cached probes, keyed by probe id. */
let cache: Readonly<Record<string, CachedProbe>> = {}

/** Probes that landed in this page's lifetime, keyed by probe id. */
let probes: Readonly<Record<string, Verdict>> = {}

/** The folded table both surfaces render. */
let snapshot: Readonly<Record<string, Verdict>> = EMPTY

const listeners = new Set<() => void>()

/** The read in flight, shared so two mounts cost one request. */
let inflight: Promise<void> | null = null

/** When the last read landed. */
let lastReadAt = 0

/**
 * Fold the three readings into one table.
 *
 * The order is the precedence: the lane names a model, the cache answers for it,
 * and a probe taken this session beats both — which is why a sweep's verdict
 * shows up while its write is still in flight.
 */
function fold(): Record<string, Verdict> {
  const table: Record<string, Verdict> = {}
  for (const row of laneRows) {
    table[row.id] = bestVerdict(laneVerdict(row), cachedVerdict(cache, row.id))
  }
  // Vendor models live only in the cache: the lane's roster does not know them,
  // and the sweep's key for them is `provider/model`.
  for (const key of Object.keys(cache)) {
    if (table[key] !== undefined) continue
    const fresh = cachedVerdict(cache, key)
    if (fresh !== undefined) table[key] = fresh
  }
  for (const [key, verdict] of Object.entries(probes)) table[key] = verdict
  return table
}

/** Whether two tables say the same thing, so a publish can be skipped. */
function sameAnswers(a: Readonly<Record<string, Verdict>>, b: Readonly<Record<string, Verdict>>): boolean {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  for (const key of keys) {
    const left = a[key]
    const right = b[key]
    if (right === undefined) return false
    if (left.state !== right.state || left.at !== right.at || left.detail !== right.detail) return false
  }
  return true
}

/**
 * Refold and publish, unless nothing changed.
 *
 * Identity stability is the store's contract: a subscriber that re-renders on
 * every 90-second poll for no reason is a subscription that should not have been
 * needed.
 */
function reflow(): void {
  const next = fold()
  if (sameAnswers(snapshot, next)) return
  snapshot = next
  for (const listener of listeners) listener()
}

/**
 * Take the lane roster from a caller that already read it.
 *
 * The vendor card reads `/summary` for its counts and passes the rows along, so a
 * mounted card and the picker cost one roster read rather than two.
 *
 * @param rows - the roster's per-model rows.
 */
export function publishLaneModels(rows: readonly ModelRow[]): void {
  laneRows = rows
  reflow()
}


/** The table as it reads now, for code outside a render. */
export function getVerdicts(): Readonly<Record<string, Verdict>> {
  return snapshot
}

/** The cached probes as they read now, for the sweep's plan. */
export function getCache(): Readonly<Record<string, CachedProbe>> {
  return cache
}

/**
 * Read the roster and the cache, then publish.
 *
 * Only what is missing is read: a card that published the roster already means
 * this asks for the cache alone, and a store with neither asks for both.
 *
 * @param force - read even when a read just landed. A sweep finishing uses this:
 *   its verdicts are on the Host by then, and the answer must not be served from
 *   the gap rule.
 * @returns the shared read.
 */
export function refreshReadings(force = false): Promise<void> {
  if (inflight !== null) return inflight
  if (!force && Date.now() - lastReadAt < MIN_READ_GAP_MS) return Promise.resolve()
  const needsLane = laneRows.length === 0
  inflight = Promise.all([
    needsLane ? readLaneModels().catch((): ModelRow[] => []) : Promise.resolve(undefined),
    readAvailabilityCache().catch((): Record<string, CachedProbe> => ({})),
  ])
    .then(([rows, stored]) => {
      if (rows !== undefined) laneRows = rows
      cache = stored
      lastReadAt = Date.now()
      reflow()
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/**
 * Fold the verdicts of probes that just landed.
 *
 * The Host persists each one as it lands; folding them in here as well keeps the
 * open picker honest mid-sweep without a second read.
 *
 * @param landed - the sweep's answers, keyed by probe id.
 */
export function recordProbes(landed: Readonly<Record<string, SweepVerdict>>): void {
  const next: Record<string, Verdict> = { ...probes }
  for (const [key, row] of Object.entries(landed)) {
    // An unknown is not an answer: recording it would overwrite a verdict a
    // later read could still supply.
    if (row.state === 'unknown') continue
    applyProbe(next, key, normalise(row.state), row.detail, row.at)
  }
  probes = next
  reflow()
}

/**
 * Subscribe to table changes.
 *
 * @param fn - the change callback.
 * @returns the unsubscribe.
 */
export function subscribeVerdicts(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** The published table, unchanged until an answer changes. */
export function verdictSnapshot(): Readonly<Record<string, Verdict>> {
  return snapshot
}

/**
 * The verdict table, as a React hook.
 *
 * @returns the table, keyed by probe id.
 */
export function useVerdicts(): Readonly<Record<string, Verdict>> {
  return useSyncExternalStore(subscribeVerdicts, verdictSnapshot)
}
