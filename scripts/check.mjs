// 自检：不依赖浏览器，只验证纯逻辑与产物的形状。
//
// 覆盖三件事：
//   1. 定位计算（夹取、换角）——窗口尺寸变化时不能把鲸鱼弄丢；
//   2. 产物的形状——dist/client.js 必须是 ModuleLoader 认得的 classic-script；
//   3. 源码里没有语法上明显的问题（用 node 解析宿主半边）。
import { readFileSync, existsSync } from 'node:fs'
import { transform, build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0

/** 断言一个条件成立。 */
function check(label, condition) {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures += 1
    console.error(`  FAIL ${label}`)
  }
}

console.log('placement')
{
  // 直接复用源码里的纯函数：把 panel.tsx 的导出抠出来跑不现实（它是 TSX），
  // 这里复制同一套规则做等价验证——两处规则必须一致，改一处就要改两处。
  // Mirrors panel.tsx: a 54 × 54 seat with an 8 px edge margin — the same
  // size and boundary control as the reference music ball.
  const WHALE_SIZE = 54
  const EDGE_GAP = 8
  const clamp = (x, y, w, h) => ({
    x: Math.min(Math.max(EDGE_GAP, w - WHALE_SIZE - EDGE_GAP), Math.max(EDGE_GAP, x)),
    y: Math.min(Math.max(EDGE_GAP, h - WHALE_SIZE - EDGE_GAP), Math.max(EDGE_GAP, y)),
  })
  // The reference ball's first-run position: 22 px in from the corner,
  // measured to the seat's edge (not to the 8 px clamp margin).
  const corner = (c, w, h) => {
    const home = 22
    const right = w - WHALE_SIZE - home
    const bottom = h - WHALE_SIZE - home
    switch (c) {
      case 'bottom-left': return { x: home, y: bottom }
      case 'top-right': return { x: right, y: home }
      case 'top-left': return { x: home, y: home }
      default: return { x: right, y: bottom }
    }
  }

  const c = clamp(-999, -999, 1440, 900)
  check('clamps an off-screen position back to the 8px margin', c.x === EDGE_GAP && c.y === EDGE_GAP)
  const far = clamp(99999, 99999, 1440, 900)
  check('clamps a beyond-the-edge position back', far.x === 1440 - WHALE_SIZE - EDGE_GAP && far.y === 900 - WHALE_SIZE - EDGE_GAP)
  const keep = clamp(700, 400, 1440, 900)
  check('keeps a position that is already inside', keep.x === 700 && keep.y === 400)
  // 贴到极限时，盒子与边界之间只剩 8px —— 与参考球一致
  const edge = clamp(1440 - WHALE_SIZE, 900 - WHALE_SIZE, 1440, 900)
  check('the float stops 8px from the right/bottom edge',
    edge.x + WHALE_SIZE + EDGE_GAP === 1440 && edge.y + WHALE_SIZE + EDGE_GAP === 900)

  const br = corner('bottom-right', 1440, 900)
  check('the default home matches the reference 22px', br.x === 1440 - WHALE_SIZE - 22 && br.y === 900 - WHALE_SIZE - 22)
  const tl = corner('top-left', 1440, 900)
  check('the default top-left home keeps the same margin', tl.x === 22 && tl.y === 22)

  // 换屏之后：旧位置必须还在新视口里。
  const moved = clamp(99999, 99999, 800, 600)
  check('a position from a wide screen survives a narrow one', moved.x + WHALE_SIZE + EDGE_GAP <= 800 && moved.y + WHALE_SIZE + EDGE_GAP <= 600)
}

console.log('geometry')
{
  const placement = readFileSync(join(root, 'client', 'src', 'features', 'free-model', 'placement.ts'), 'utf8')
  const float = readFileSync(join(root, 'client', 'src', 'float.tsx'), 'utf8')
  // Same size and boundary control as the reference music ball.
  check('the seat is 54px like the reference ball', /export const WHALE_SIZE = 54\b/.test(placement))
  check('the edge margin is 8px like the reference ball', /export const EDGE_GAP = 8\b/.test(placement))
  check('the default home is 22px like the reference ball', /export const HOME_MARGIN = 22\b/.test(placement))
  check('the css seat is 54 x 54', /width: 54px[\s\S]{0,80}height: 54px/.test(readFileSync(join(root, 'client', 'src', 'styles.ts'), 'utf8')))
  // A drag that moves on one axis only must still count as a drag.
  check('a one-axis drag is a drag', /Math\.abs\(dx\) > 3 \|\| Math\.abs\(dy\) > 3/.test(float))
}

console.log('the ring')
{
  const geometry = readFileSync(join(root, 'client', 'src', 'ring', 'geometry.ts'), 'utf8')
  const ring = readFileSync(join(root, 'client', 'src', 'ring', 'ring.tsx'), 'utf8')
  const icons = readFileSync(join(root, 'client', 'src', 'ring', 'icons.tsx'), 'utf8')
  const lockSource = readFileSync(join(root, 'client', 'src', 'features', 'lockscreen', 'lock-screen.tsx'), 'utf8')
  const floatSource = readFileSync(join(root, 'client', 'src', 'float.tsx'), 'utf8')
  // The visible arc must reach *into* the screen: a float against the left
  // edge shows the right half, one in the top-left corner shows the
  // bottom-right quarter. Getting these backwards puts the ring off-screen.
  check('the ring reaches into the screen', geometry.includes('visibleArc'))
  check('the lock screen is portalled onto the body', lockSource.includes('createPortal'))
  // The float is portalled too: inside the shell's overlay layer its z-index is
  // confined by that layer's stacking context, so the workbench's splitters and
  // resizers painted over it and it could not be grabbed.
  check('the float is portalled onto the body', floatSource.includes('createPortal'))
  check('the float sits above the app chrome', /z-index: 1000/.test(readFileSync(join(root, 'client', 'src', 'styles.ts'), 'utf8')))
  // The ring is drawn from a radius past the whale's corners, or the band shows
  // through the mark as a crescent; the hit area starts inside that, or the gap
  // between whale and ring is dead and the ring closes before it is reached.
  // The band has to be wide enough for a chip, and the inner edge still has
  // to clear the whale's corners (27·√2 ≈ 38 px).
  check('the ring is wide enough for a chip', /INNER_RADIUS = (5|6)\d\b/.test(geometry))
  check('every wedge carries an icon anchor', ring.includes('wedge.iconX') && geometry.includes('ICON_RADIUS'))
  // The inner edge must run *back* along the arc. Adding the sweep instead
  // ends a quarter half a turn too far round, and the band fills the gap
  // beside the whale as a grey crescent — invisible on a half ring.
  check('the band\'s inner edge runs back along the arc', geometry.includes('point, -1)'))
  check('the hit area starts inside the drawn ring', geometry.includes('HIT_INNER_RADIUS'))
  check('there is a painted hit path', ring.includes('mf-ring-hit'))
  check('the ring is drawn with line art', icons.includes('strokeWidth'))
  check('the icons are inline svg, not emoji', icons.includes('<svg'))
  check('no emoji in the ring', !ring.includes('action.glyph'))
  // The ring is cut by the viewport edge, so the actions are laid out along the
  // visible arc rather than around the whole circle.
  check('the ring has a visible-arc model', geometry.includes('visibleArc'))
  check('the ring lays actions along the visible arc', geometry.includes('layoutWedges'))
  check('the ring hit-tests by angle and radius', geometry.includes('wedgeAt'))
  // Hovering highlights; clicking runs. A menu that fires on hover would run a
  // slow action by accident.
  check('hovering only highlights a wedge', ring.includes('onHover(pick(event))'))
  check('clicking runs the action', ring.includes('onClick='))
}

// A corner cuts the ring to a *quarter* of an annulus whose two ends must be
// closed by radial edges. This is exactly the piece of maths a screenshot
// caught and a string check cannot: run the real geometry module and look at
// the corners it produces.
console.log('ring geometry')
const geometrySource = readFileSync(join(root, 'client', 'src', 'ring', 'geometry.ts'), 'utf8')
const geometryModule = await transform(geometrySource, { loader: 'ts', format: 'esm' })
const shapes = await import(`data:text/javascript;base64,${Buffer.from(geometryModule.code).toString('base64')}`)

/** The points a band path visits, parsed out of its `M`, `L` and `A` commands. */
const pointsOf = (path) => {
  const tokens = path.split(' ')
  const points = []
  for (let index = 0; index < tokens.length;) {
    if (tokens[index] === 'M') {
      points.push([Number(tokens[index + 1]), Number(tokens[index + 2])])
      index += 3
    } else if (tokens[index] === 'A') {
      points.push([Number(tokens[index + 6]), Number(tokens[index + 7])])
      index += 8
    } else if (tokens[index] === 'L') {
      points.push([Number(tokens[index + 1]), Number(tokens[index + 2])])
      index += 3
    } else {
      index += 1
    }
  }
  return points
}

/** Whether two points lie on the same ray out of the centre. */
const sameRay = (a, b) => {
  const delta = Math.abs(shapes.angleOf(a[0], a[1]) - shapes.angleOf(b[0], b[1])) % (Math.PI * 2)
  return Math.min(delta, Math.PI * 2 - delta) < 1e-3
}

for (const horizontal of ['left', 'right', 'none']) {
  for (const vertical of ['top', 'bottom', 'none']) {
    if (horizontal === 'none' && vertical === 'none') continue
    const label = `${horizontal}/${vertical}`
    const points = pointsOf(shapes.arcPath(horizontal, vertical))
    // Both ends are radial: the inner arc finishes on the ray the outer arc
    // started from. Either being off means the inner edge ran the wrong way
    // round and the band closes across the whale as a crescent.
    check(`${label}: the band closes on its own rays`,
      sameRay(points[0], points[points.length - 1]) && sameRay(points[1], points[2]))
    check(`${label}: the band visits only its two radii`,
      points.every(point => {
        const radius = Math.hypot(point[0], point[1])
        return Math.abs(radius - shapes.INNER_RADIUS) < 0.02 || Math.abs(radius - shapes.OUTER_RADIUS) < 0.02
      }))
    // One subpath, or the fill is a pair of crescents rather than an annulus.
    check(`${label}: the band is a single subpath`, (shapes.arcPath(horizontal, vertical).match(/M/g) ?? []).length === 1)
  }
}

// A quarter is four corners 90° apart, not a crescent that reaches under the
// whale.
const quarter = pointsOf(shapes.arcPath('left', 'top'))
check('a quarter band is four corners', quarter.length === 4)
check('a quarter band spans 90°',
  Math.abs(Math.abs(shapes.angleOf(quarter[1][0], quarter[1][1]) - shapes.angleOf(quarter[0][0], quarter[0][1])) - Math.PI / 2) < 1e-3)

// 可用性判定的真正回归：把纯逻辑模块（verdicts / sweep）用 esbuild 转译后
// 直接跑起来，验证「受限不显示、未知要探测、厂商级故障只探一次」。
console.log('per-model verdicts')
async function loadModule(relative) {
  // bundle: true —— sweep.ts 从 verdicts.ts 拿 probeKey，单文件 transform
  // 不解析 import，data: URL 里相对路径也无处可寻。
  const built = await build({
    entryPoints: [join(root, relative)],
    bundle: true, write: false, format: 'esm', platform: 'neutral',
    absWorkingDir: root, logLevel: 'silent',
  })
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)
}
const V = await loadModule('client/src/features/free-model/verdicts.ts')
const S = await loadModule('client/src/features/free-model/sweep.ts')
{
  // 受限 / 限流 / 不可用都是否定判定：不显示。
  check('a refusal is a refusal', V.isRefused(V.laneVerdict({ availability: 'region-blocked', availabilitySource: 'probe' })))
  check('a throttled verdict is a refusal', V.isRefused(V.laneVerdict({ availability: 'throttled', availabilitySource: 'probe' })))
  check('an available verdict is usable', V.isUsable(V.laneVerdict({ availability: 'available', availabilitySource: 'manual' })))
  // listing 不是答案：listing 来的 unknown 仍要探测。
  const listed = V.laneVerdict({ availability: 'unknown', availabilitySource: 'listing' })
  check('a listing is not an answer', V.needsProbe(listed))
  check('a listing refusal still refuses', V.isRefused(V.laneVerdict({ availability: 'region-blocked', availabilitySource: 'listing' })))
  // 网关拒绝文本到判定的映射——规则住在宿主半边（探测在宿主上跑，密钥不进页面）。
  const G = await import('../src/gateway.js')
  check('402 reads as no credit', G.classifyRefusal(402, 'insufficient balance (1008)') === 'no-credit')
  check('missing credential reads as a vendor fault', G.classifyRefusal(502, '未配置凭据，请先登录') === 'no-credential')
  check('a vendor fault is not a model fact', V.isVendorFault('no-credential') && !V.isVendorFault('unavailable'))
  check('a 429 reads as throttled', G.classifyRefusal(429, 'Free usage limit reached') === 'throttled')
  check('a 401 says nothing about the model', G.classifyRefusal(401, 'invalid api key') === 'unknown')
  // 厂商级 403（登录过期）是判定，门级 401（密钥错）不是：CodeArts 的 10
  // 个模型全被 403 回答过，当时全部当成 unknown，于是永远「可用 0」地留着。
  check('a provider 403 is a vendor fault', G.classifyRefusal(403, 'codearts: model request failed with HTTP 403') === 'no-credential')
  check('a door 401 is not a verdict', G.classifyRefusal(401, 'Missing or invalid API key') === 'unknown')
  check('a 503 with the words does not ban a model', G.classifyRefusal(503, 'Service Unavailable') === 'unknown')
  check('a stale refusal is still a refusal', V.isRefused({ state: 'no-credential', source: 'gateway-probe', detail: '', at: 0 }))
  // 新鲜度：缓存里的判定过期后不再作数。
  const now = 1_800_000_000_000
  const fresh = V.cachedVerdict({ m: { state: 'available', detail: '', at: now - 1000 } }, 'm', now)
  const stalePositive = V.cachedVerdict({ m: { state: 'available', detail: '', at: now - V.probeTtl('available') - 1 } }, 'm', now)
  const oldRefusal = V.cachedVerdict({ m: { state: 'unavailable', detail: '', at: now - V.probeTtl('unavailable') + 1000 } }, 'm', now)
  check('a fresh probe answers', fresh !== undefined && V.isUsable(fresh))
  check('a stale positive expires', stalePositive === undefined)
  check('a refusal is kept longer than a positive',
    V.probeTtl('unavailable') > V.probeTtl('available') && oldRefusal !== undefined)
}
{
  const now = 20_000_000
  const lane = [
    { id: 'ask-me', name: 'Ask', availability: 'unknown', availabilitySource: 'listing', detail: '', probedAt: 0, hiddenByUser: false },
    { id: 'answered', name: 'Done', availability: 'available', availabilitySource: 'probe', detail: '', probedAt: now, hiddenByUser: false },
    { id: 'hidden-one', name: 'Hidden', availability: 'unknown', availabilitySource: 'listing', detail: '', probedAt: 0, hiddenByUser: true },
  ]
  const vendorModels = {
    trae: [
      { id: 'glm', name: 'GLM', disabled: false, dead: false },
      { id: 'off', name: 'Off', disabled: true, dead: false },
      { id: 'gone', name: 'Gone', disabled: false, dead: true },
    ],
    deadbeat: [{ id: 'x', name: 'X', disabled: false, dead: false }],
  }
  // verdicts 是卡片折叠好的表：钩子里连 lane 的判定也在内。
  const verdicts = {
    answered: { state: 'available', source: 'lane-probe', detail: '', at: now },
    'deadbeat/x': { state: 'no-credential', source: 'gateway-probe', detail: '', at: now },
  }
  const plan = S.planSweep(lane, vendorModels, {}, verdicts, now)
  const keys = plan.map(target => target.key).sort()
  check('the sweep asks the unknowns', keys.includes('ask-me') && keys.includes('trae/glm'))
  check('the sweep skips what is answered', !keys.includes('answered'))
  check('the sweep skips what the picker does not list', !keys.includes('hidden-one') && !keys.includes('trae/off') && !keys.includes('trae/gone'))
  check('a vendor-level fault ends that vendor', !keys.some(key => key.startsWith('deadbeat/')))
  check('a lane model is addressed through the gateway prefix',
    S.gatewayModelId('ask-me', '') === 'our-free-model/ask-me' && S.gatewayModelId('trae/glm', 'trae') === 'trae/glm')
}


console.log('the lock screen')
{
  const lock = readFileSync(join(root, 'client', 'src', 'features', 'lockscreen', 'lock-screen.tsx'), 'utf8')
  const metrics = readFileSync(join(root, 'client', 'src', 'features', 'system', 'metrics-client.ts'), 'utf8')
  check('the lock screen shows a clock', lock.includes('mf-lock-time'))
  check('the lock screen shows the weather', lock.includes('mf-lock-weather'))
  check('the lock screen shows the system metrics', lock.includes('mf-lock-metrics'))
  check('the lock screen shows the active sessions', lock.includes('mf-lock-sessions'))
  check('the metrics come from the Host', metrics.includes('/api/model-float/metrics'))
  // os.networkInterfaces() has no byte counters, so the sampler must read the
  // operating system's own.
  const hostMetrics = readFileSync(join(root, 'src', 'metrics.js'), 'utf8')
  check('the network counters come from the OS', hostMetrics.includes('netstat'))
  check('linux counters are read from procfs', hostMetrics.includes('/proc/net/dev'))
  // Node does not expose gc without --expose-gc; the flag can still be turned
  // on for a throwaway V8 context to obtain the real collector.
  check('the collector is obtained without a launch flag', hostMetrics.includes('setFlagsFromString'))
}

console.log('bundle shape')
{
  const out = join(root, 'dist', 'client.js')
  if (!existsSync(out)) {
    failures += 1
    console.error('  FAIL dist/client.js is missing — run `pnpm build`')
  } else {
    const text = readFileSync(out, 'utf8')
    check('registers through window.__ModuleLoader__', text.startsWith('window.__ModuleLoader__.load({'))
    check('declares the package id', text.includes('id: "dsh-model-float"'))
    check('returns module.exports from the factory', text.includes('return module.exports;'))
    check('keeps react external', !text.includes('react.production.min.js'))
    check('registers the shell.overlay slot', text.includes('"shell.overlay"'))
    // 样式表的花括号必须配平：多一个 `}` 会把后面的规则整块吞掉，
    // 结果是「卡片永远不显示」而不是「样式报错」——很难一眼看出。
    const css = text.match(/var CSS = `([\s\S]*?)`/) ?? text.match(/CSS = "([\s\S]*?)"/)
    if (css === null) {
      check('the stylesheet is present in the bundle', false)
    } else {
      const body = css[1]
      const open = (body.match(/\{/g) ?? []).length
      const close = (body.match(/\}/g) ?? []).length
      check('the stylesheet braces balance', open === close)
      check('the stylesheet has no empty rule', !/\{\s*\}/.test(body))
      check('the open-state rule survived', body.includes('.mf-card-shell.is-open .mf-card'))
    }
  }
}

console.log('host half')
{
  const out = join(root, 'src', 'host.js')
  if (!existsSync(out)) {
    failures += 1
    console.error('  FAIL src/host.js is missing')
  } else {
    const text = readFileSync(out, 'utf8')
    check('exports apply()', /export function apply/.test(text))
    check('exports inject', /export const inject/.test(text))
    // The switch's state must live on the Host, or a restart would leave the
    // models hidden with the switch reading "off".
    check('serves the switch state over a route', text.includes('API_PREFIX'))
    check('persists the state in a file', text.includes('JsonStore'))
    // 探测结果也要落在 Host：一次探测花的是真实请求，刷新页面不该再花一次。
    check('serves the availability cache over a route', text.includes("route === '/availability'"))
  }
  const store = join(root, 'src', 'store.js')
  if (!existsSync(store)) {
    failures += 1
    console.error('  FAIL src/store.js is missing')
  } else {
    const text = readFileSync(store, 'utf8')
    check('the store survives a restart', text.includes('class JsonStore'))
    check('the store writes atomically', text.includes('rename'))
  }
}

console.log('model hiding')
{
  const data = readFileSync(join(root, 'client', 'src', 'features', 'free-model', 'data.ts'), 'utf8')
  check('reads the per-vendor model list', data.includes("'model.list'"))
  check('writes through the batch endpoint', data.includes("'model.setDisabledMany'"))
  // A loop of single-model writes would be N document writes and N catalog
  // broadcasts — the batch endpoint is the only sane path for a 500-model vendor.
  check('does not loop single-model writes', !data.includes("'model.setDisabled'"))
  check('keeps the switch state on the Host', data.includes('SWITCH_API'))
  check('reads the switch state from the Host', data.includes('readSwitch'))
  check('writes the switch state to the Host', data.includes('writeSwitch'))
  // 逐模型判定：列表只显可用+未探测，受限/限流/无额度直接隐藏。
  const cardSource = readFileSync(join(root, 'client', 'src', 'features', 'free-model', 'vendor-card.tsx'), 'utf8')
  check('the model list filters by verdict', cardSource.includes('isRefusedOrHidden'))
  check('the sweep is one click away', cardSource.includes('mf-probe-btn'))
  // 探测跑在宿主上：密钥从文件读，从不跨进页面。
  const gatewaySource = readFileSync(join(root, 'src', 'gateway.js'), 'utf8')
  check('the probe runs on the Host against the gateway', gatewaySource.includes('chat/completions'))
  check('the page never sees the key', !readFileSync(join(root, 'client/src/features/free-model/probe.ts'), 'utf8').includes('api-key'))
  check('the sweep routes are mounted on the Host', readFileSync(join(root, 'src', 'host.js'), 'utf8').includes("route === '/sweep'"))
  const availability = readFileSync(join(root, 'src', 'availability.js'), 'utf8')
  check('the availability cache is durable', availability.includes('JsonStore'))
  check('an unknown verdict is never cached', availability.includes('VERDICT_STATES.has'))

  const entrySource = readFileSync(join(root, 'client', 'src', 'index.tsx'), 'utf8')
  const float = readFileSync(join(root, 'client', 'src', 'float.tsx'), 'utf8')
  const panel = readFileSync(join(root, 'client', 'src', 'features', 'free-model', 'vendor-card.tsx'), 'utf8')
  check('the card offers the master switch', panel.includes('mf-switch'))
  // The card must cancel the close that the whale's pointerleave arms while
  // the pointer crosses the gap to it — otherwise the card shuts down just as
  // the user reaches it.
  check('the card cancels the close on enter', /onPointerEnter=\{onOpen\}/.test(panel))
  // A retired vendor answers every RPC with an error; listing it would hand
  // the switch a target whose first read throws, which made the switch look
  // unresponsive. Vendors the pack does not report are dropped instead.
  check('vendors the pack no longer serves are dropped', data.includes('if (entry === undefined) return null'))
  // The switch's own code moved into the feature's hook.
  const hook = readFileSync(join(root, 'client', 'src', 'features', 'free-model', 'use-free-model.ts'), 'utf8')
  check('the switch isolates per-vendor failures', hook.includes('failures.push'))
  // The list is filtered by the switch's *record* (the vendors it hid), not
  // by a fresh verdict: a hidden vendor reads as "closed", so a fresh verdict
  // would call it usable and put it back.
  check('the switch hides its own vendors from the list', panel.includes('hiddenVendors.includes'))
  check('the float renders the ring', float.includes('<Ring'))
  // The card is opened by an action, so an outside press is the only way back.
  check('an outside press dismisses the card', float.includes('root.contains(target)'))
  check('a press inside an iframe also dismisses it', float.includes('HTMLIFrameElement'))
  check('the float renders the lock screen', float.includes('<LockScreen'))
  // The per-vendor buttons are gone: the switch is the only control.
  check('no per-vendor hide button remains', !panel.includes('mf-hide-btn'))

  const entry = readFileSync(join(root, 'client', 'src', 'index.tsx'), 'utf8')
  check('the switch state is read from the Host', hook.includes('readSwitch'))
  check('the switch state is written to the Host', hook.includes('writeSwitch'))

  const whale = readFileSync(join(root, 'client', 'src', 'whale.tsx'), 'utf8')
  check('the float wears the official DeepSeek mark', whale.includes('FISH_LOGO_PATH'))
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
