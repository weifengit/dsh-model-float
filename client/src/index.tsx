/**
 * Model Float — browser half.
 *
 * Contributes one entry to the shell's frame-wide floating layer
 * (`shell.overlay`): a whale-girl that floats over the DSH window, with a
 * ring of actions around it.
 *
 * The panel reads two same-origin surfaces the Host already serves:
 *
 * - `GET /api/our-free-model/summary` — the free-lane model roster with live
 *   availability (the data behind 设置 → Our Free Model → 白嫖模型接入);
 * - `POST /api/channel-pack` — the Channel Pack's management RPC, which owns
 *   the per-vendor account pools and their balances.
 *
 * plus its own Host routes for the switch's durable state and the system
 * metrics the lock screen shows.
 *
 * Nothing here needs a Host service of its own, so the plugin stays
 * browser-only: its node half is small but not empty — it owns the state that
 * has to outlive a restart.
 *
 * @module client/src/index.tsx
 */

import React from 'react'
import { ModelFloat } from './float.tsx'
import { CSS } from './styles.ts'

/** The locale namespace this plugin registers its copy under. */
const NS = 'modelFloat'

/** The copy, in both languages the shell ships. */
const DICT = {
  zh: {
    'float.label': '白嫖模型额度 · 悬停查看各厂商余额',
    'ring.label': '浮动面板功能',
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
    'vendor.restoreModels': '把这家厂商的模型放回模型选择器',
    'vendor.hideUnusableShort': '清理',
    'vendor.hideUnusable': '隐藏 {count} 个不可用厂商的模型，让模型选择器清爽一点',
    'vendor.idle': '未登录',
    'vendor.closed': '已关闭',
    'vendor.hidden': '已隐藏',
    'vendor.empty': '无额度',
    'vendor.error': '查询失败',
    'vendor.unknown': '未知',
    'vendor.readFailed': '读取失败',
    'vendor.noBalance': '无余额接口',
    'switch.onShort': '已清理',
    'switch.offShort': '未清理',
    'switch.on': '隐藏 {count} 个不可用厂商的模型，让模型选择器清爽一点',
    'switch.off': '把之前隐藏的模型放回模型选择器',
    'switch.hidden': '已隐藏 {count} 家不可用厂商的 {models} 个模型',
    'lock.title': '锁屏',
    'lock.close': '关闭锁屏',
    'lock.cpu': 'CPU',
    'lock.memory': '内存',
    'lock.heap': '进程堆',
    'lock.net': '网速',
    'lock.metricsLoading': '正在读取系统状态…',
    'lock.weatherLoading': '正在读取天气…',
    'lock.weatherUnavailable': '天气不可用',
    'lock.activeSessions': '活跃对话',
    'lock.noActiveSessions': '当前没有运行中的对话',
    'memory.collected': 'V8 已回收，释放 {mb} MB',
    'memory.done': '内存释放已完成',
    'memory.expose-gc-missing': '宿主未以 --expose-gc 启动，无法按需回收',
    'model.available': '可用',
    'model.regionBlocked': '地区限制',
    'model.unavailable': '不可用',
    'model.throttled': '限流',
    'model.unknown': '未知',
  },
  en: {
    'float.label': 'Free-model credit — hover for each vendor’s balance',
    'ring.label': 'Float actions',
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
    'vendor.restoreModels': "Put this vendor's models back into the model picker",
    'vendor.hideUnusableShort': 'Clean up',
    'vendor.hideUnusable': "Hide {count} unusable vendors' models, so the model picker gets shorter",
    'vendor.idle': 'Not signed in',
    'vendor.closed': 'Turned off',
    'vendor.hidden': 'Hidden',
    'vendor.empty': 'No credit',
    'vendor.error': 'Read failed',
    'vendor.unknown': 'Unknown',
    'vendor.readFailed': 'Read failed',
    'vendor.noBalance': 'No balance endpoint',
    'switch.onShort': 'Cleaned',
    'switch.offShort': 'Not cleaned',
    'switch.on': "Hide {count} unusable vendors' models, so the model picker gets shorter",
    'switch.off': 'Put the hidden models back into the model picker',
    'switch.hidden': '{models} models of {count} unusable vendors are hidden',
    'lock.title': 'Lock screen',
    'lock.close': 'Close the lock screen',
    'lock.cpu': 'CPU',
    'lock.memory': 'Memory',
    'lock.heap': 'Process heap',
    'lock.net': 'Network',
    'lock.metricsLoading': 'Reading the system state…',
    'lock.weatherLoading': 'Reading the weather…',
    'lock.weatherUnavailable': 'Weather unavailable',
    'lock.activeSessions': 'Active conversations',
    'lock.noActiveSessions': 'No conversation is running',
    'memory.collected': 'V8 collected, freeing {mb} MB',
    'memory.done': 'Memory release finished',
    'memory.expose-gc-missing': 'the Host was not started with --expose-gc, so it cannot collect on demand',
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

  // The shell's frame-wide floating layer is the additive seat for exactly
  // this kind of widget: above every column, outside their scroll containers,
  // and click-through unless the occupant opts back in.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-model-float',
    order: 40,
  }, (props: Record<string, any>) => (
    <ModelFloat t={t} useSessions={props.useSessions} />
  )))
}
