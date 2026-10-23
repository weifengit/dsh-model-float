/**
 * Model Float — browser half.
 *
 * Contributes one entry to the shell's frame-wide floating layer
 * (`shell.overlay`): a whale-girl that floats over the DSH window and, on
 * hover, lists every free-model vendor with its connection state and its
 * remaining credit.
 *
 * The panel reads two same-origin surfaces the Host already serves:
 *
 * - `GET /api/our-free-model/summary` — the free-lane model roster with live
 *   availability (the data behind 设置 → Our Free Model → 白嫖模型接入);
 * - `POST /api/channel-pack` — the Channel Pack's management RPC, which owns
 *   the per-vendor account pools and their balances.
 *
 * Nothing here needs a Host service of its own, so the plugin stays
 * browser-only: its node half is empty.
 *
 * @module client/src/index.tsx
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ModelFloatPanel, POLL_MS } from './panel.tsx'
import {
  readSnapshot,
  isUnusable,
  readVendorModels,
  setVendorModelsDisabled,
  readSwitch,
  writeSwitch,
} from './data.ts'
import type { FloatSnapshot } from './data.ts'
import { CSS } from './styles.ts'

/** The locale namespace this plugin registers its copy under. */
const NS = 'modelFloat'

/** The copy, in both languages the shell ships. */
const DICT = {
  zh: {
    'float.label': '白嫖模型额度 · 悬停查看各厂商余额',
    'card.title': '白嫖模型 · 厂商额度',
    'card.loading': '读取中…',
    'card.summary': '{usable}/{vendors} 家厂商可用 · {credit} 家有余额 · 模型 {models}/{total} 可用',
    'card.pickerModels': '模型选择器里还有 {count} 个条目',
    'card.refresh': '刷新',
    'card.move': '换个角落',
    'card.showModels': '展开模型可用性',
    'card.hideModels': '收起模型可用性',
    'card.updated': '更新于 {time}',
    'card.noModels': '没有读到模型清单。',
    'vendor.on': '已接入',
    'switch.onShort': '已清理',
    'switch.offShort': '未清理',
    'switch.on': '隐藏 {count} 个不可用厂商的模型，让模型选择器清爽一点',
    'switch.off': '把之前隐藏的模型放回模型选择器',
    'switch.hidden': '已隐藏 {count} 家不可用厂商的 {models} 个模型',
    'vendor.modelsVisible': '· {visible}/{total} 个模型',
    'vendor.modelsHidden': '· 已隐藏 {count} 个模型',
    'vendor.hideModels': '从模型选择器隐藏这家厂商的模型',
    'vendor.hideUnusableShort': '清理',
    'vendor.hideUnusable': '隐藏 {count} 个不可用厂商的模型，让模型选择器清爽一点',
    'vendor.restoreModels': '把这家厂商的模型放回模型选择器',
    'vendor.idle': '未登录',
    'vendor.closed': '已关闭',
    'vendor.hidden': '已隐藏',
    'vendor.empty': '无额度',
    'vendor.error': '查询失败',
    'vendor.unknown': '未知',
    'vendor.readFailed': '读取失败',
    'vendor.noBalance': '无余额接口',
    'model.available': '可用',
    'model.regionBlocked': '地区限制',
    'model.unavailable': '不可用',
    'model.throttled': '限流',
    'model.unknown': '未知',
  },
  en: {
    'float.label': 'Free-model credit — hover for each vendor’s balance',
    'card.title': 'Free models · vendor credit',
    'card.loading': 'Reading…',
    'card.summary': '{usable}/{vendors} vendors live · {credit} with credit · {models}/{total} models usable',
    'card.pickerModels': '{count} entries still in the model picker',
    'card.refresh': 'Refresh',
    'card.move': 'Move to another corner',
    'card.showModels': 'Show model availability',
    'card.hideModels': 'Hide model availability',
    'card.updated': 'updated {time}',
    'card.noModels': 'No model roster was read.',
    'vendor.on': 'Connected',
    'switch.onShort': 'Cleaned',
    'switch.offShort': 'Not cleaned',
    'switch.on': "Hide {count} unusable vendors' models, so the model picker gets shorter",
    'switch.off': 'Put the hidden models back into the model picker',
    'switch.hidden': '{models} models of {count} unusable vendors are hidden',
    'vendor.modelsVisible': '· {visible}/{total} models',
    'vendor.modelsHidden': '· {count} models hidden',
    'vendor.hideModels': "Hide this vendor's models from the model picker",
    'vendor.hideUnusableShort': 'Clean up',
    'vendor.hideUnusable': 'Hide {count} models of unusable vendors, so the model picker gets shorter',
    'vendor.restoreModels': "Put this vendor's models back into the model picker",
    'vendor.idle': 'Not signed in',
    'vendor.closed': 'Turned off',
    'vendor.hidden': 'Hidden',
    'vendor.empty': 'No credit',
    'vendor.error': 'Read failed',
    'vendor.unknown': 'Unknown',
    'vendor.readFailed': 'Read failed',
    'vendor.noBalance': 'No balance endpoint',
    'model.available': 'Available',
    'model.regionBlocked': 'Region blocked',
    'model.unavailable': 'Unavailable',
    'model.throttled': 'Throttled',
    'model.unknown': 'Unknown',
  },
}

/** The services this plugin's browser half needs. */
export const inject = ['slots', 'locale']

/** The browser half's entry point. */
export function apply(ctx: Record<string, any>): void {
  const t = ctx.locale.bind(NS) as (key: string, vars?: Record<string, string | number>) => string

  ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'model-float: dictionaries')

  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-plugin', 'dsh-model-float')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'model-float: styles')

  // The slot entry owns the polling loop and the readings; the panel below is
  // a pure function of them.
  const Float = () => {
    const [snapshot, setSnapshot] = useState<FloatSnapshot | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    /** Whether the master switch is on — read from the Host, so it survives a restart. */
    const [switchOn, setSwitchOn] = useState(false)
    /**
     * The vendors the switch hid.
     *
     * The record is the switch's own, not a fresh verdict: once a vendor's
     * models are hidden the pack reports that vendor as "closed", so a fresh
     * verdict would call it usable again and put it back into the list.
     */
    const [hiddenVendors, setHiddenVendors] = useState<string[]>([])
    /** The same set in a ref, so the polling callback can read it. */
    const hiddenVendorsRef = useRef<string[]>([])
    /** Whether the switch is mid-flight. */
    const [switchPending, setSwitchPending] = useState(false)
    const mounted = useRef(true)
    /**
     * The latest reading, kept in a ref so the switch callback can read it
     * without being re-created on every poll (which would remount the button
     * and drop a click in flight).
     */
    const snapshotRef = useRef<FloatSnapshot | null>(null)

    const refresh = useCallback(() => {
      setLoading(true)
      const controller = new AbortController()
      // The switch's own vendor set goes along, so a vendor it hid reads as
      // "hidden" rather than "turned off".
      void readSnapshot(controller.signal, new Set(hiddenVendorsRef.current))
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

    /**
     * Turn the master switch on or off.
     *
     * On: every vendor that cannot answer a turn right now (not connected, or
     * no credit left) has its models hidden from the chat composer's model
     * picker. Off: exactly the models the switch hid come back.
     *
     * The write lands in the Channel Pack's model blacklist, which the picker
     * reads on every listing. The pack broadcasts `llm/adapters-updated` after
     * the write, so the composer refreshes on its own — no page reload.
     *
     * The switch's own state (on/off, and which models it hid) lives on the
     * Host, so it survives a DSH restart: a browser-local switch would come
     * back "off" after a restart with the models still hidden.
     */
    const setSwitch = useCallback(async (on: boolean) => {
      setSwitchPending(true)
      try {
        if (on) {
          // Hide the models of the vendors that cannot answer a turn right now,
          // and record exactly which ones so "off" restores them and nothing
          // else. The unusable set comes from the last reading — the same
          // verdict the panel shows — so the switch and the list always agree.
          const current = snapshotRef.current
          const unusable = current === null ? [] : current.vendors.filter(isUnusable)
          const hidden: Record<string, string[]> = {}
          // One vendor's failure must not abort the sweep. A pack that retired
          // a vendor answers its reads with an error, and letting that
          // propagate would leave the switch looking unresponsive: every click
          // would die on the same vendor before hiding anything.
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
          // The switch's own state is what the panel shows; the write is the
          // only thing that flipped it.
          setSwitchOn(true)
          hiddenVendorsRef.current = Object.keys(hidden)
          setHiddenVendors(hiddenVendorsRef.current)
        } else {
          // Restore exactly what the switch hid. A provider that has since
          // been retired cannot be restored, and must not block the rest: its
          // entries are dropped from the record instead of retried forever.
          const state = await readSwitch()
          const remaining: Record<string, string[]> = {}
          for (const [provider, ids] of Object.entries(state.hidden)) {
            const result = await setVendorModelsDisabled(provider, ids, false)
            if (result.error === '') continue
            // A retired provider can never be restored; keeping its ids in the
            // record would make every later toggle retry a call that cannot
            // succeed, so the record forgets it. Any other failure is kept, and
            // the next toggle-off retries it.
            const retired = /retired|已移除|不支持此渠道/i.test(result.error)
            if (!retired) remaining[provider] = [...ids]
          }
          await writeSwitch({ enabled: false, hidden: remaining })
          setSwitchOn(false)
          hiddenVendorsRef.current = []
          setHiddenVendors([])
        }
      } finally {
        setSwitchPending(false)
      }
    }, [])

    useEffect(() => {
      mounted.current = true
      refresh()
      // Read the switch's durable state from the Host. When it is on, the
      // models it hid are *still* hidden — the blacklist lives on the Host
      // too, so a restart does not undo the switch — and the panel must show
      // the switch as on, not off.
      void readSwitch().then(state => {
        if (!mounted.current) return
        setSwitchOn(state.enabled)
        hiddenVendorsRef.current = Object.keys(state.hidden)
        setHiddenVendors(hiddenVendorsRef.current)
      })
      // A slow heartbeat keeps the numbers honest: balances move whenever a
      // model is used elsewhere, and a stale count reads as "I have more
      // quota than I do".
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

    return (
      <ModelFloatPanel
        snapshot={snapshot}
        loading={loading}
        error={error}
        refresh={refresh}
        switchOn={switchOn}
        hiddenVendors={hiddenVendors}
        switchPending={switchPending}
        setSwitch={setSwitch}
        t={t}
      />
    )
  }

  // The shell's frame-wide floating layer is the additive seat for exactly
  // this kind of widget: above every column, outside their scroll containers,
  // and click-through unless the occupant opts back in.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-model-float',
    order: 40,
  }, Float))
}
