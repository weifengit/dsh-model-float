/**
 * Model Float — the free-model feature's state.
 *
 * The hook that owns everything the 白嫖模型 action needs: the readings, the
 * master switch, and the memory release.
 *
 * It lives apart from the card so the ring can read the same state the card
 * renders — one reading, one switch, one source of truth.
 *
 * @module client/src/features/free-model/use-free-model.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { readSnapshot, readSwitch, writeSwitch, setVendorModelsDisabled, readVendorModels, isUnusable } from './data.ts'
import type { FloatSnapshot, VendorRow } from './data.ts'
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
  const mounted = useRef(true)
  const snapshotRef = useRef<FloatSnapshot | null>(null)
  const hiddenRef = useRef<string[]>([])

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
    }
  }, [refresh])

  const setSwitch = useCallback(async (on: boolean) => {
    setSwitchPending(true)
    try {
      if (on) {
        // Hide the models of the vendors that cannot answer a turn right now,
        // and record exactly which ones so "off" restores them and nothing
        // else. The unusable set comes from the last reading — the same
        // verdict the card shows — so the switch and the list always agree.
        const current = snapshotRef.current
        const unusable = current === null ? [] : current.vendors.filter(isUnusable)
        const hidden: Record<string, string[]> = {}
        // One vendor's failure must not abort the sweep. A pack that retired a
        // vendor answers its reads with an error, and letting that propagate
        // would leave the switch looking unresponsive.
        const failures: string[] = []
        for (const row of unusable) {
          try {
            const models = await readVendorModels(row.vendor.id)
            const visible = models.filter(model => !model.disabled && !model.dead).map(model => model.id)
            if (visible.length === 0) continue
            const result = await setVendorModelsDisabled(row.vendor.id, visible, true)
            if (result.error !== '') { failures.push(`${row.vendor.name}：${result.error}`); continue }
            hidden[row.vendor.id] = visible
          } catch (error) {
            failures.push(`${row.vendor.name}：${error instanceof Error ? error.message : String(error)}`)
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
  }
}
