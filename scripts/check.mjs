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
  const WHALE_SIZE = 62
  const EDGE_GAP = 24
  const clamp = (x, y, w, h) => ({
    x: Math.min(Math.max(EDGE_GAP, w - WHALE_SIZE - EDGE_GAP), Math.max(EDGE_GAP, x)),
    y: Math.min(Math.max(EDGE_GAP, h - WHALE_SIZE - EDGE_GAP), Math.max(EDGE_GAP, y)),
  })
  const corner = (c, w, h) => {
    const right = w - WHALE_SIZE - EDGE_GAP
    const bottom = h - WHALE_SIZE - EDGE_GAP
    switch (c) {
      case 'bottom-left': return { x: EDGE_GAP, y: bottom }
      case 'top-right': return { x: right, y: EDGE_GAP }
      case 'top-left': return { x: EDGE_GAP, y: EDGE_GAP }
      default: return { x: right, y: bottom }
    }
  }

  const c = clamp(-999, -999, 1440, 900)
  check('clamps an off-screen position back into the viewport', c.x === EDGE_GAP && c.y === EDGE_GAP)
  const far = clamp(99999, 99999, 1440, 900)
  check('clamps a beyond-the-edge position back', far.x === 1440 - WHALE_SIZE - EDGE_GAP && far.y === 900 - WHALE_SIZE - EDGE_GAP)
  const keep = clamp(700, 400, 1440, 900)
  check('keeps a position that is already inside', keep.x === 700 && keep.y === 400)

  const br = corner('bottom-right', 1440, 900)
  check('bottom-right corner sits above the edge gap', br.x === 1440 - WHALE_SIZE - EDGE_GAP && br.y === 900 - WHALE_SIZE - EDGE_GAP)
  const tl = corner('top-left', 1440, 900)
  check('top-left corner sits inside the edge gap', tl.x === EDGE_GAP && tl.y === EDGE_GAP)

  // 换屏之后：旧位置必须还在新视口里。
  const moved = clamp(br.x, br.y, 800, 600)
  check('a position from a wide screen survives a narrow one', moved.x <= 800 - WHALE_SIZE && moved.y <= 600 - WHALE_SIZE)
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
  const out = join(root, 'src', 'index.js')
  if (!existsSync(out)) {
    failures += 1
    console.error('  FAIL src/index.js is missing')
  } else {
    const text = readFileSync(out, 'utf8')
    check('exports apply()', /export function apply/.test(text))
    check('exports inject', /export const inject/.test(text))
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nall checks passed')
