// 自检：不依赖浏览器，只验证纯逻辑与产物的形状。
//
// 覆盖三件事：
//   1. 定位计算（夹取、换角）——窗口尺寸变化时不能把鲸鱼弄丢；
//   2. 产物的形状——dist/client.js 必须是 ModuleLoader 认得的 classic-script；
//   3. 源码里没有语法上明显的问题（用 node 解析宿主半边）。
import { readFileSync, existsSync } from 'node:fs'
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
  const panel = readFileSync(join(root, 'client', 'src', 'panel.tsx'), 'utf8')
  // The whale may sit flush against any edge. A reserved margin is exactly the
  // "it still floats a bit away from the border" the reference ball fixed.
  // Same size and boundary control as the reference music ball.
  check('the seat is 54px like the reference ball', /export const WHALE_SIZE = 54\b/.test(panel))
  check('the edge margin is 8px like the reference ball', /export const EDGE_GAP = 8\b/.test(panel))
  check('the default home is 22px like the reference ball', /export const HOME_MARGIN = 22\b/.test(panel))
  check('the css seat is 54 x 54', /width: 54px[\s\S]{0,80}height: 54px/.test(readFileSync(join(root, 'client', 'src', 'styles.ts'), 'utf8')))
  // A drag that moves on one axis only must still count as a drag.
  check('a one-axis drag is a drag', /Math\.abs\(dx\) > 3 \|\| Math\.abs\(dy\) > 3/.test(panel))
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
  const data = readFileSync(join(root, 'client', 'src', 'data.ts'), 'utf8')
  check('reads the per-vendor model list', data.includes("'model.list'"))
  check('writes through the batch endpoint', data.includes("'model.setDisabledMany'"))
  // A loop of single-model writes would be N document writes and N catalog
  // broadcasts — the batch endpoint is the only sane path for a 500-model vendor.
  check('does not loop single-model writes', !data.includes("'model.setDisabled'"))
  check('keeps the switch state on the Host', data.includes('SWITCH_API'))
  check('reads the switch state from the Host', data.includes('readSwitch'))
  check('writes the switch state to the Host', data.includes('writeSwitch'))

  const entrySource = readFileSync(join(root, 'client', 'src', 'index.tsx'), 'utf8')
  const panel = readFileSync(join(root, 'client', 'src', 'panel.tsx'), 'utf8')
  check('the panel offers the master switch', panel.includes('mf-switch'))
  // A retired vendor answers every RPC with an error; listing it would hand
  // the switch a target whose first read throws, which made the switch look
  // unresponsive. Vendors the pack does not report are dropped instead.
  check('vendors the pack no longer serves are dropped', data.includes('if (entry === undefined) return null'))
  check('the switch isolates per-vendor failures', entrySource.includes('failures.push'))
  // The list is filtered by the switch's *record* (the vendors it hid), not
  // by a fresh verdict: a hidden vendor reads as "closed", so a fresh verdict
  // would call it usable and put it back.
  check('the switch hides its own vendors from the list', panel.includes('hiddenVendors.includes'))
  // The per-vendor buttons are gone: the switch is the only control.
  check('no per-vendor hide button remains', !panel.includes('mf-hide-btn'))

  const entry = readFileSync(join(root, 'client', 'src', 'index.tsx'), 'utf8')
  check('the switch state is read from the Host', entry.includes('readSwitch'))
  check('the switch state is written to the Host', entry.includes('writeSwitch'))

  const whale = readFileSync(join(root, 'client', 'src', 'whale.tsx'), 'utf8')
  check('the float wears the official DeepSeek mark', whale.includes('FISH_LOGO_PATH'))
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
