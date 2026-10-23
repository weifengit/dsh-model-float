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
  hideVendorModels,
  restoreVendorModels,
  readPanelHidden,
  writePanelHidden,
  readVendorModels,
  VENDORS,
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
    const mounted = useRef(true)

    const refresh = useCallback(() => {
      setLoading(true)
      const controller = new AbortController()
      void readSnapshot(controller.signal)
        .then(result => {
          if (!mounted.current) return
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
     * Hide (or restore) one vendor's models in the chat composer's model picker.
     *
     * The write lands in the Channel Pack's model blacklist, which the picker
     * reads on every listing. The pack broadcasts `llm/adapters-updated` after
     * the write, so the composer refreshes on its own — no page reload.
     *
     * The panel keeps its own record of the ids it hid, so "restore" never
     * resurrects a model the user hid by hand in the settings page.
     */
    const setHidden = useCallback(async (provider: string, hidden: boolean) => {
      if (hidden) {
        // Read the catalog first, so the panel's own record is exactly the set
        // of models that were visible before the write — including the ones a
        // previous sweep already hid.
        const models = await readVendorModels(provider)
        const visible = models.filter(model => !model.disabled && !model.dead).map(model => model.id)
        const result = await hideVendorModels(provider)
        if (result.error !== '') throw new Error(result.error)
        writePanelHidden(provider, [...new Set([...readPanelHidden(provider), ...visible])])
        return
      }
      const result = await restoreVendorModels(provider)
      if (result.error !== '') throw new Error(result.error)
    }, [])

    /**
     * Reconcile the panel's record with the host's actual blacklist.
     *
     * The record lives in `localStorage` and the blacklist lives on the host,
     * so the two can drift: another browser, the settings page, or a wiped
     * profile can change the blacklist behind the panel's back. The record is
     * only ever used to *restore* what the panel hid, so it must not claim a
     * model the panel did not hide — or the restore would open a model the
     * user closed by hand.
     *
     * The reconciliation is: the record keeps only the ids that are still
     * hidden on the host.
     */
    const reconcileHidden = useCallback(async () => {
      for (const vendor of VENDORS) {
        const recorded = readPanelHidden(vendor.id)
        if (recorded.length === 0) continue
        try {
          const models = await readVendorModels(vendor.id)
          const disabledIds = new Set(models.filter(model => model.disabled).map(model => model.id))
          const stillHidden = recorded.filter(id => disabledIds.has(id))
          if (stillHidden.length !== recorded.length) writePanelHidden(vendor.id, stillHidden)
        } catch {
          /* the host is unreachable; keep the record and try again next time */
        }
      }
    }, [])

    useEffect(() => {
      mounted.current = true
      refresh()
      void reconcileHidden()
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
    }, [refresh, reconcileHidden])

    return (
      <ModelFloatPanel
        snapshot={snapshot}
        loading={loading}
        error={error}
        refresh={refresh}
        setHidden={setHidden}
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
