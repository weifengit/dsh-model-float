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
    // ── 锁屏卡片墙翻译 ──────────────────────────────────────────
    'wall.auditAll': '历史审计',
    'wall.auditNone': '暂无审计记录',
    'wall.auditState': '状态',
    'wall.auditUpdated': '更新于',
    'wall.card.audit': '插件审计',
    'wall.card.core': 'DSH 核心',
    'wall.card.device': '设备',
    'wall.card.groups': '工作区组',
    'wall.card.network': '网络',
    'wall.card.projects': '项目',
    'wall.card.sessions': '会话',
    'wall.card.skills': '技能',
    'wall.card.storage': '存储',
    'wall.card.token': 'Token 用量',
    'wall.card.tools': '工具调用',
    'wall.cardFailed': '读取失败',
    'wall.coreAuthor': '作者',
    'wall.coreBehind': '有新版本可用',
    'wall.coreBranch': '分支',
    'wall.coreCommit': '提交',
    'wall.coreDate': '日期',
    'wall.coreHead': '最新提交',
    'wall.coreLocal': '本地安装',
    'wall.coreMessage': '提交信息',
    'wall.coreNetworkNote': '离线读取，可能不准确',
    'wall.coreRelease': '发行版本',
    'wall.coreReleaseDate': '发布日期',
    'wall.coreReleaseTag': '标签',
    'wall.cores': '各核心使用率',
    'wall.coreUnknown': '未知状态',
    'wall.coreUpstream': '上游仓库',
    'wall.coreUpToDate': '已是最新',
    'wall.coreVersion': '版本',
    'wall.deviceLocalNote': 'dsh-homepage 未安装，显示本地采样',
    'wall.disk': '磁盘使用率',
    'wall.diskFree': '磁盘可用',
    'wall.gpu': 'GPU 使用率',
    'wall.groupsAll': '所有工作区组',
    'wall.groupsCaption': '{mode} 模式',
    'wall.groupsMembers': '成员数',
    'wall.groupsMode': '模式',
    'wall.hostname': '主机名',
    'wall.machine': '机器信息',
    'wall.memory': '内存',
    'wall.needHomepage': '需要安装 dsh-homepage',
    'wall.cpuOf': 'CPU 负载{cores}',
    'wall.cpuLocal': 'CPU 负载 · 本机采样器',
    'wall.net': '网络速率',
    'wall.networkNode': 'Node.js',
    'wall.networkProxies': '{count} 个代理',
    'wall.networkProxiesTitle': '代理',
    'wall.networkRedirectors': '重定向',
    'wall.networkRedirectorsTitle': '重定向',
    'wall.networkTls': 'TLS',
    'wall.networkTlsTitle': 'TLS 证书',
    'wall.platform': '平台',
    'wall.projectsAll': '所有项目',
    'wall.projectsCaption': '{dirty} 个脏 · {running} 个运行中',
    'wall.projectsDirty': '脏改动',
    'wall.projectsMissing': '缺失目录',
    'wall.projectsRunning': '运行中',
    'wall.projectsWorktrees': '工作树',
    'wall.sessionsAgents': '根代理',
    'wall.sessionsAll': '所有对话',
    'wall.sessionsIdle': '空闲',
    'wall.sessionsNone': '暂无对话',
    'wall.sessionsNotStopped': '未停止',
    'wall.sessionsOn': '运行中',
    'wall.sessionsRoots': '根会话',
    'wall.sessionsRunning': '{count} 个运行中',
    'wall.sessionsStop': '停止',
    'wall.sessionsStopped': '已停止',
    'wall.sessionsTotal': '对话总数',
    'wall.skillsAll': '所有技能',
    'wall.skillsCaption': '{total} 个已安装',
    'wall.skillsDisabled': '已禁用',
    'wall.skillsTotal': '已安装',
    'wall.skillsWritable': '可写入',
    'wall.storageCategories': '分类',
    'wall.storageFiles': '{count} 个文件',
    'wall.storagePrune': '清理 {count} 个日志',
    'wall.storagePruned': '已释放 {bytes}',
    'wall.storageReclaimable': '可回收',
    'wall.temperature': '温度',
    'wall.tokenBonus': '奖励',
    'wall.tokenCaption': '账户状态：{status}',
    'wall.tokenHistory': '最近 14 天',
    'wall.tokenRefresh': '刷新',
    'wall.tokenRefreshed': '已刷新',
    'wall.tokenToday': '今日支出',
    'wall.tokenUpdated': '更新于 {time}',
    'wall.tokenYesterday': '昨日支出',
    'wall.toolsAll': '所有工具',
    'wall.toolsArgTokens': '入参 Tokens',
    'wall.toolsCalls': '调用总数',
    'wall.toolsDuration': '总耗时',
    'wall.toolsErrorRate': '错误率',
    'wall.toolsOutTokens': '出参 Tokens',
    'wall.uptime': '运行时长',
    'wall.storageCategory.sessions': '会话',
    'wall.storageCategory.storages': '存储',
    'wall.storageCategory.logs': '日志',
    'wall.storageCategory.cache': '缓存',
    'wall.storageCategory.attachments': '附件',
    'wall.storageCategory.profiles': '配置'
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
    // ── lock-screen wall ─────────────────────────────────────
    'wall.auditAll': 'Audit history',
    'wall.auditNone': 'No audits recorded',
    'wall.auditState': 'State',
    'wall.auditUpdated': 'Updated',
    'wall.card.audit': 'Plugin audit',
    'wall.card.core': 'DSH core',
    'wall.card.device': 'Device',
    'wall.card.groups': 'Workspace groups',
    'wall.card.network': 'Network',
    'wall.card.projects': 'Projects',
    'wall.card.sessions': 'Sessions',
    'wall.card.skills': 'Skills',
    'wall.card.storage': 'Storage',
    'wall.card.token': 'Token usage',
    'wall.card.tools': 'Tool usage',
    'wall.cardFailed': 'Read failed',
    'wall.coreAuthor': 'Author',
    'wall.coreBehind': 'A newer core is available',
    'wall.coreBranch': 'Branch',
    'wall.coreCommit': 'Commit',
    'wall.coreDate': 'Date',
    'wall.coreHead': 'Latest commit',
    'wall.coreLocal': 'Local install',
    'wall.coreMessage': 'Message',
    'wall.coreNetworkNote': 'Read offline, may be stale',
    'wall.coreRelease': 'Release',
    'wall.coreReleaseDate': 'Released',
    'wall.coreReleaseTag': 'Tag',
    'wall.cores': 'Per-core load',
    'wall.coreUnknown': 'Status unknown',
    'wall.coreUpstream': 'Upstream',
    'wall.coreUpToDate': 'Up to date',
    'wall.coreVersion': 'Version',
    'wall.cpuLocal': 'CPU load · local sampler',
    'wall.cpuOf': 'CPU load{cores}',
    'wall.deviceLocalNote': 'dsh-homepage is not installed, so this is the local sampler',
    'wall.disk': 'Disk used',
    'wall.diskFree': 'Disk free',
    'wall.gpu': 'GPU used',
    'wall.groupsAll': 'All groups',
    'wall.groupsCaption': '{mode} mode',
    'wall.groupsMembers': 'Members',
    'wall.groupsMode': 'Mode',
    'wall.hostname': 'Hostname',
    'wall.machine': 'Machine',
    'wall.memory': 'Memory',
    'wall.needHomepage': 'Needs dsh-homepage',
    'wall.net': 'Network rate',
    'wall.networkNode': 'Node.js',
    'wall.networkProxies': '{count} proxies',
    'wall.networkProxiesTitle': 'Proxies',
    'wall.networkRedirectors': 'Redirectors',
    'wall.networkRedirectorsTitle': 'Redirectors',
    'wall.networkTls': 'TLS',
    'wall.networkTlsTitle': 'TLS bundles',
    'wall.platform': 'Platform',
    'wall.projectsAll': 'All projects',
    'wall.projectsCaption': '{dirty} dirty · {running} running',
    'wall.projectsDirty': 'Dirty',
    'wall.projectsMissing': 'Missing dirs',
    'wall.projectsRunning': 'Running',
    'wall.projectsWorktrees': 'Worktrees',
    'wall.sessionsAgents': 'Agents',
    'wall.sessionsAll': 'All conversations',
    'wall.sessionsIdle': 'Idle',
    'wall.sessionsNone': 'No conversations',
    'wall.sessionsNotStopped': 'Not stopped',
    'wall.sessionsOn': 'Running',
    'wall.sessionsRoots': 'Root sessions',
    'wall.sessionsRunning': '{count} running',
    'wall.sessionsStop': 'Stop',
    'wall.sessionsStopped': 'Stopped',
    'wall.sessionsTotal': 'Sessions',
    'wall.skillsAll': 'All skills',
    'wall.skillsCaption': '{total} installed',
    'wall.skillsDisabled': 'Disabled',
    'wall.skillsTotal': 'Installed',
    'wall.skillsWritable': 'Writable',
    'wall.storageCategories': 'Categories',
    'wall.storageFiles': '{count} files',
    'wall.storagePrune': 'Prune {count} logs',
    'wall.storagePruned': 'Freed {bytes}',
    'wall.storageReclaimable': 'Reclaimable',
    'wall.temperature': 'Temperature',
    'wall.tokenBonus': 'Bonus',
    'wall.tokenCaption': 'Account: {status}',
    'wall.tokenHistory': 'Last 14 days',
    'wall.tokenRefresh': 'Refresh',
    'wall.tokenRefreshed': 'Refreshed',
    'wall.tokenToday': 'Spent today',
    'wall.tokenUpdated': 'updated {time}',
    'wall.tokenYesterday': 'Spent yesterday',
    'wall.toolsAll': 'All tools',
    'wall.toolsArgTokens': 'Arg tokens',
    'wall.toolsCalls': 'Calls',
    'wall.toolsDuration': 'Time',
    'wall.toolsErrorRate': 'Error rate',
    'wall.toolsOutTokens': 'Out tokens',
    'wall.uptime': 'Uptime',
    'wall.storageCategory.sessions': 'Sessions',
    'wall.storageCategory.storages': 'Storages',
    'wall.storageCategory.logs': 'Logs',
    'wall.storageCategory.cache': 'Cache',
    'wall.storageCategory.attachments': 'Attachments',
    'wall.storageCategory.profiles': 'Profiles'
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
    <ModelFloat t={t} useSessions={props.useSessions} ctx={ctx} />
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
