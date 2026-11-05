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
import { ComposerModelPicker } from './features/free-model/composer-model-picker.tsx'

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
    'vendor.modelsUsable': '· 可用 {usable} · 选择器 {visible}/{total}',
    'vendor.modelsHidden': '· 已隐藏 {count} 个模型',
    'vendor.hideModels': '从模型选择器隐藏这家厂商的模型',
    'vendor.restoreModels': '把这家厂商的模型放回模型选择器',
    'vendor.hideUnusableShort': '清理',
    'vendor.hideUnusable': '隐藏 {count} 个不可用厂商的模型，让模型选择器清爽一点',
    'vendor.idle': '未登录',
    'vendor.closed': '已关闭',
    'vendor.hidden': '已隐藏',
    'vendor.empty': '无额度',
    'vendor.broken': '模型全不可用',
    'vendor.error': '查询失败',
    'vendor.unknown': '未知',
    'vendor.readFailed': '读取失败',
    'vendor.noBalance': '无余额接口',
    'switch.onShort': '已清理',
    'switch.offShort': '未清理',
    'picker.menu': '模型',
    'picker.open': '选择模型',
    'picker.account': 'DeepSeek 账号',
    'picker.loading': '读取中…',
    'picker.placeholder': '选择模型',
    'picker.search': '搜索模型',
    'picker.emptyModels': '没有读到模型清单。',
    'picker.emptySearch': '没有匹配的模型。',
    'picker.untested': '未探测：可用性还不知道',
    'picker.effort': '思考强度',
    'picker.providerDefault': '跟随模型默认',
    'picker.groupFailed': '{name} 读取失败：{message}',
    'picker.failed': '切换模型失败',
    'picker.sessionInUse': '这个会话正在写入，稍后再切换模型',
    'picker.retry': '重试',
    'picker.clean': '清理不可用',
    'picker.restore': '恢复隐藏',
    'picker.refresh': '刷新',
    'picker.probe': '探测未验证',
    'picker.stop': '停止探测',
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
    'model.noCredit': '无额度',
    'model.noCredential': '未登录',
    'model.untested': '未探测',
    'sweep.start': '探测 {count} 个未验证模型（含厂商模型）',
    'sweep.progress': '探测中 {done}/{total}…（点击停止）',
    'sweep.stop': '停止探测',
    'sweep.allTested': '模型都已探测',
    'sweep.no-gateway': '本机没有可用的渠道网关，无法探测。',
    'sweep.no-gateway-key': '读不到渠道网关密钥，无法探测。',
    'sweep.sweep-request-failed': '探测请求没送出去，稍后再试。',
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
    'vendor.modelsUsable': '· {usable} usable · {visible}/{total} in picker',
    'vendor.hideModels': "Hide this vendor's models from the model picker",
    'vendor.restoreModels': "Put this vendor's models back into the model picker",
    'vendor.hideUnusableShort': 'Clean up',
    'vendor.hideUnusable': "Hide {count} unusable vendors' models, so the model picker gets shorter",
    'vendor.idle': 'Not signed in',
    'vendor.closed': 'Turned off',
    'vendor.hidden': 'Hidden',
    'vendor.empty': 'No credit',
    'vendor.broken': 'Models unusable',
    'vendor.error': 'Read failed',
    'vendor.unknown': 'Unknown',
    'vendor.readFailed': 'Read failed',
    'vendor.noBalance': 'No balance endpoint',
    'switch.onShort': 'Cleaned',
    'switch.offShort': 'Not cleaned',
    'picker.menu': 'Model',
    'picker.open': 'Select a model',
    'picker.account': 'DeepSeek account',
    'picker.loading': 'Reading…',
    'picker.placeholder': 'Select a model',
    'picker.search': 'Search models',
    'picker.emptyModels': 'No model roster was read.',
    'picker.emptySearch': 'No model matches.',
    'picker.untested': 'Untested: availability is not known yet',
    'picker.effort': 'Thinking effort',
    'picker.providerDefault': 'Model default',
    'picker.groupFailed': '{name} failed to load: {message}',
    'picker.failed': 'Could not switch models',
    'picker.sessionInUse': 'This session is busy writing; try switching models in a moment',
    'picker.retry': 'Retry',
    'picker.clean': 'Clean up unusable models',
    'picker.restore': 'Restore hidden models',
    'picker.refresh': 'Refresh',
    'picker.probe': 'Probe untested models',
    'picker.stop': 'Stop probing',
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
    'model.noCredit': 'No credit',
    'model.noCredential': 'Not signed in',
    'model.untested': 'Untested',
    'sweep.start': 'Probe {count} untested models (vendors included)',
    'sweep.progress': 'Probing {done}/{total}… (click to stop)',
    'sweep.stop': 'Stop probing',
    'sweep.allTested': 'Every model has a verdict',
    'sweep.no-gateway': 'No channel gateway on this host, so probing is unavailable.',
    'sweep.no-gateway-key': 'The gateway key could not be read, so probing is unavailable.',
    'sweep.sweep-request-failed': 'The probe request did not reach the Host; try again.',
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
eE:
  // The composer's model seat is a `single` slot: one occupant, and the shell's
  // own picker is the default one. Registering at a lower priority shadows it
  // with this plugin's list, which shows the same directory the shell renders
  // with each model's probe verdict beside it. The seat is the only place the
  // user actually picks a model, so it is the only place the answer belongs.
  //
  // The slot's injected face carries the whole directory contract; the plugin
  // speaks it structurally (see composer-model-face.ts) rather than importing
  // another package's private types.
  ctx.inject(['slots', 'modelDirectories', 'sessions'], (scope: Record<string, any>) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    scope.slots.inject('conversation.input.model', () => scope.slots.register({
      name: 'conversation.input.model',
      priority: -100,
      locale: NS,
      inject: (sessionId: string) => {
        const directory = models.directoryFor(sessionId)
        // A subagent session cannot inspect or select a model: the shell's own
        // seat renders nothing there, and shadowing it must not change that.
        const available = sessions.subagentAddress(sessionId) === undefined
        return {
          available,
          directory: directory.store,
          load: () => {
            if (available) directory.load().catch(() => {})
          },
          select: (selection: unknown) => available
            ? directory.select(selection)
            : Promise.resolve(undefined),
        }
      },
    }, ComposerModelPicker))
  })
}
