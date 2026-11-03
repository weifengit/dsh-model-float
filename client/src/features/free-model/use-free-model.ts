/**
 * Model Float — the free-model feature's state.
 *
 * The hook that owns everything the 白嫖模型 action needs: the readings, the
 * per-model verdicts, the probe sweep, the master switch, and the memory
 * release.
 *
 * It lives apart from the card so the ring can read the same state the card
 * renders — one reading, one switch, one source of truth.
 *
 * @module client/src/features/free-model/use-free-model.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  readSnapshot, readSwitch, writeSwitch, setVendorModelsDisabled, readVendorModels,
  readAvailabilityCache, isUnusable,
} from './data.ts'
import type { FloatSnapshot, VendorRow } from './data.ts'
import { bestVerdict, cachedVerdict, isRefused, isVendorFault, laneVerdict, probeKey } from './verdicts.ts'
import type { CachedProbe, Verdict, VerdictState } from './verdicts.ts'
import { readGatewayPort, runSweep as hostSweep } from './probe.ts'
import type { SweepVerdict } from './probe.ts'
import { applyProbe, gatewayModelId, planSweep } from './sweep.ts'
import type { VendorModelEntry } from './sweep.ts'
import { releaseMemory } from '../system/metrics-client.ts'
import type { MemoryRelease } from '../system/metrics-client.ts'

/** How often the readings are refreshed, in ms. */
export const POLL_MS = 90_000

/** What the free-model feature exposes to the float. */
export interface FreeModelState {
  /** The latest reading, or null before the first one lands. */
  readonly snapshot: FloatSnapshot | null
  /** The vendors from the latest reading. */
  readonly vendors: readonly VendorRow[]
  /** Whether a reading is in flight. */
  readonly loading: boolean
  /** The error of the last reading. */
  readonly error: string
  /** Whether the master switch is on. */
  readonly switchOn: boolean
  /** The vendors the switch hid — they are not listed while it is on. */
  readonly hiddenVendors: readonly string[]
  /** Whether the switch is mid-flight. */
  readonly switchPending: boolean
  /** Ask for a fresh reading. */
  readonly refresh: () => void
  /** Turn the master switch on or off. */
  readonly setSwitch: (on: boolean) => Promise<void>
  /** Ask the Host to release memory. */
  readonly releaseMemory: () => Promise<MemoryRelease>
  /** The per-model verdicts, keyed by probe key. */
  readonly verdicts: Readonly<Record<string, Verdict>>
  /** Whether a probe sweep is running. */
  readonly sweeping: boolean
  /** How far the running sweep has got. */
  readonly sweepProgress: { done: number, total: number }
  /** What the last sweep could not answer, for the card's line. */
  readonly sweepError: string
  /** Probe every model still without a verdict. */
  readonly runSweep: () => Promise<void>
  /** Stop the running sweep. */
  readonly stopSweep: () => void
}

/**
 * The free-model feature's state.
 *
 * @returns the state.
 */
export function useFreeModel(): FreeModelState {
  const [snapshot, setSnapshot] = useState<FloatSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [switchOn, setSwitchOn] = useState(false)
  const [hiddenVendors, setHiddenVendors] = useState<string[]>([])
  const [switchPending, setSwitchPending] = useState(false)
  const [cache, setCache] = useState<Record<string, CachedProbe>>({})
  const [probes, setProbes] = useState<Record<string, Verdict>>({})
  const [sweeping, setSweeping] = useState(false)
  const [sweepProgress, setSweepProgress] = useState({ done: 0, total: 0 })
  const [sweepError, setSweepError] = useState('')
  const mounted = useRef(true)
  const snapshotRef = useRef<FloatSnapshot | null>(null)
  const hiddenRef = useRef<string[]>([])
  const cacheRef = useRef<Record<string, CachedProbe>>({})
  const verdictsRef = useRef<Record<string, Verdict>>({})
  const sweepRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    const controller = new AbortController()
    // The switch's own vendor set goes along, so a vendor it hid reads as
    // "hidden" rather than "turned off".
    void readSnapshot(controller.signal, new Set(hiddenRef.current))
      .then(result => {
        if (!mounted.current) return
        snapshotRef.current = result
        setSnapshot(result)
        setError(result.error)
      })
      .catch((reason: unknown) => {
        if (!mounted.current) return
        setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
  }, [])

  // ── the verdict table ─────────────────────────────────────────────────────
  // One row per probe key: the lane's own answer if it has one, this plugin's
  // cached probe if that is stronger, and the live sweep's result on top of
  // both while a sweep runs.
  const verdicts = useMemo<Record<string, Verdict>>(() => {
    const table: Record<string, Verdict> = {}
    for (const row of snapshot?.models ?? []) {
      table[row.id] = bestVerdict(laneVerdict(row), cachedVerdict(cache, row.id))
    }
    // Vendor models live only in the cache: the lane's roster does not know
    // them, and the sweep's key is `provider/model`.
    for (const key of Object.keys(cache)) {
      if (table[key] !== undefined) continue
      const fresh = cachedVerdict(cache, key)
      if (fresh !== undefined) table[key] = fresh
    }
    for (const [key, verdict] of Object.entries(probes)) table[key] = verdict
    return table
  }, [snapshot, cache, probes])

  useEffect(() => {
    void readAvailabilityCache().then(stored => {
      if (!mounted.current) return
      cacheRef.current = stored
      setCache(stored)
    })
  }, [])

  /** Fold the sweep's verdicts into the table the UI reads. */
  const recordSweepVerdicts = useCallback((landed: Readonly<Record<string, SweepVerdict>>) => {
    const next: Record<string, Verdict> = {}
    for (const [key, row] of Object.entries(landed)) {
      if (row.state === 'unknown') continue
      applyProbe(verdictsRef.current, key, row.state as VerdictState, row.detail, row.at)
      next[key] = verdictsRef.current[key]
    }
    if (Object.keys(next).length === 0) return
    setProbes(current => ({ ...current, ...next }))
  }, [])

  const runSweep = useCallback(async () => {
    if (sweepRef.current !== null) return
    const current = snapshotRef.current
    if (current === null) return
    const port = await readGatewayPort()
    if (port === 0) {
      setSweepError('no-gateway')
      return
    }
    // The vendors' live model lists, read only for the vendors that still have
    // models in the picker — a vendor the switch emptied has nothing to ask.
    const vendorModels: Record<string, VendorModelEntry[]> = {}
    for (const row of current.vendors) {
      if (row.visibleModelCount === 0) continue
      try {
        const models = await readVendorModels(row.vendor.id)
        vendorModels[row.vendor.id] = models.map(model => ({
          id: model.id, name: model.name, disabled: model.disabled, dead: model.dead,
        }))
      } catch {
        // A vendor whose list cannot be read is a vendor with nothing to ask.
      }
    }
    // planSweep reads the folded table: the lane's own answers have to be in
    // it, or a model the lane already probed would be paid for twice.
    const table: Record<string, Verdict> = { ...verdictsRef.current }
    for (const model of current.models) {
      const folded = bestVerdict(laneVerdict(model), cachedVerdict(cacheRef.current, model.id))
      const mine = table[model.id]
      if (mine === undefined || folded.at > mine.at) table[model.id] = folded
    }
    const targets = planSweep(
      current.models.map(model => ({
        id: model.id, name: model.name, availability: model.availability,
        availabilitySource: model.availabilitySource, detail: model.detail,
        probedAt: model.probedAt, hiddenByUser: model.hiddenByUser,
      })),
      vendorModels,
      cacheRef.current,
      table,
    )
    if (targets.length === 0) {
      setSweepError('')
      return
    }
    const controller = new AbortController()
    sweepRef.current = controller
    setSweeping(true)
    setSweepError('')
    setSweepProgress({ done: 0, total: targets.length })
    const queue = targets.map(target => ({
      key: target.key,
      modelId: gatewayModelId(target.key, target.provider),
    }))
    const { error: sweepFailure } = await hostSweep(port, queue, {
      signal: controller.signal,
      onProgress: status => {
        setSweepProgress({ done: status.done, total: status.total })
        // The Host persists each verdict as it lands; folding them in here as
        // well keeps the open card honest mid-sweep without a second write.
        recordSweepVerdicts(status.results)
      },
    })
    // Pick the cache up again: the sweep's verdicts are on the Host now, and
    // reading them back is what makes them survive a reload.
    const stored = await readAvailabilityCache()
    if (mounted.current) {
      cacheRef.current = stored
      setCache(stored)
      setSweepError(sweepFailure)
      setSweeping(false)
    }
    sweepRef.current = null
    // A fresh reading so the lane's counts and the vendors agree with the
    // verdicts the sweep just collected.
    refresh()
  }, [recordSweepVerdicts, refresh])

  const stopSweep = useCallback(() => {
    sweepRef.current?.abort()
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    // The switch's durable state lives on the Host, so it survives a restart:
    // the models it hid are still hidden, and the panel must show the switch
    // as on, not off.
    void readSwitch().then(state => {
      if (!mounted.current) return
      setSwitchOn(state.enabled)
      hiddenRef.current = Object.keys(state.hidden)
      setHiddenVendors(hiddenRef.current)
    })
    // A slow heartbeat keeps the numbers honest: balances move whenever a
    // model is used elsewhere, and a stale count reads as "I have more quota
    // than I do".
    const timer = window.setInterval(() => {
      if (document.hidden) return
      refresh()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted.current = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      // A sweep that outlives the card is a sweep nobody is watching; the
      // verdicts it already landed are on the Host, so nothing is lost.
      sweepRef.current?.abort()
    }
  }, [refresh])

  const setSwitch = useCallback(async (on: boolean) => {
    setSwitchPending(true)
    try {
      if (on) {
        // Hide the models that cannot answer a turn right now — decided
        // *per model*, from the verdicts the sweep collected — and record
        // exactly which ones so "off" restores them and nothing else.
        const current = snapshotRef.current
        const table = verdictsRef.current
        const hidden: Record<string, string[]> = {}
        const failures: string[] = []
        for (const row of current?.vendors ?? []) {
          if (row.visibleModelCount === 0) continue
          // A vendor that is not connected at all hides under the vendor-level
          // rule: every one of its models fails for the same reason.
          const vendorDead = isUnusable(row)
          try {
            const models = await readVendorModels(row.vendor.id)
            const visible = models.filter(model => !model.disabled && !model.dead)
            const doomed = visible
              .filter(model => {
                if (vendorDead) return true
                const verdict = table[probeKey(row.vendor.id, model.id)]
                return verdict !== undefined
                  && (isRefused(verdict) || isVendorFault(verdict.state))
              })
              .map(model => model.id)
            if (doomed.length === 0) continue
            const result = await setVendorModelsDisabled(row.vendor.id, doomed, true)
            if (result.error !== '') { failures.push(`${row.vendor.name}：${result.error}`); continue }
            hidden[row.vendor.id] = doomed
          } catch (err) {
            failures.push(`${row.vendor.name}：${err instanceof Error ? err.message : String(err)}`)
          }
        }
        if (failures.length > 0 && Object.keys(hidden).length === 0) {
          // Nothing was hidden at all — that is a real failure worth showing.
          throw new Error(failures.join('；'))
        }
        await writeSwitch({ enabled: true, hidden })
        setSwitchOn(true)
        hiddenRef.current = Object.keys(hidden)
        setHiddenVendors(hiddenRef.current)
      } else {
        // Restore exactly what the switch hid. A provider that has since been
        // retired cannot be restored, and must not block the rest.
        const state = await readSwitch()
        const remaining: Record<string, string[]> = {}
        for (const [provider, ids] of Object.entries(state.hidden)) {
          const result = await setVendorModelsDisabled(provider, ids, false)
          if (result.error === '') continue
          const retired = /retired|已移除|不支持此渠道/i.test(result.error)
          if (!retired) remaining[provider] = [...ids]
        }
        await writeSwitch({ enabled: false, hidden: remaining })
        setSwitchOn(false)
        hiddenRef.current = Object.keys(remaining)
        setHiddenVendors(hiddenRef.current)
      }
      refresh()
    } finally {
      setSwitchPending(false)
    }
  }, [refresh])

  const doReleaseMemory = useCallback(async (): Promise<MemoryRelease> => {
    const result = await releaseMemory()
    refresh()
    return result
  }, [refresh])

  return {
    snapshot,
    vendors: snapshot?.vendors ?? [],
    loading,
    error,
    switchOn,
    hiddenVendors,
    switchPending,
    refresh,
    setSwitch,
    releaseMemory: doReleaseMemory,
    verdicts,
    sweeping,
    sweepProgress,
    sweepError,
    runSweep,
    stopSweep,
  }
}
