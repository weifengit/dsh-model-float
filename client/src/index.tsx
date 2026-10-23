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
import { readSnapshot } from './data.ts'
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
    'card.refresh': '刷新',
    'card.move': '换个角落',
    'card.showModels': '展开模型可用性',
    'card.hideModels': '收起模型可用性',
    'card.updated': '更新于 {time}',
    'card.noModels': '没有读到模型清单。',
    'vendor.on': '已接入',
    'vendor.idle': '未登录',
    'vendor.closed': '已关闭',
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
    'card.refresh': 'Refresh',
    'card.move': 'Move to another corner',
    'card.showModels': 'Show model availability',
    'card.hideModels': 'Hide model availability',
    'card.updated': 'updated {time}',
    'card.noModels': 'No model roster was read.',
    'vendor.on': 'Connected',
    'vendor.idle': 'Not signed in',
    'vendor.closed': 'Turned off',
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

    useEffect(() => {
      mounted.current = true
      refresh()
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
