import fs from 'node:fs'
import * as G from './geometry.mjs'
import { chipSvg } from './chips.mjs'

const whaleSrc = fs.readFileSync('/Users/sonoma/code/modelfloat/client/src/whale.tsx', 'utf8')
const FISH = whaleSrc.match(/const FISH_LOGO_PATH = '([^']+)'/)[1]
const actions = [
  { id: 'free-model', glyph: 'whale', label: '白嫖模型' },
  { id: 'lock-screen', glyph: 'lock', label: '一键锁屏' },
  { id: 'memory', glyph: 'broom', label: '内存释放' },
]

function ring(h, v, hovered) {
  const wedges = G.layoutWedges(actions.map(a => a.id), h, v)
  const hit = G.arcPath(h, v, G.HIT_INNER_RADIUS, G.OUTER_RADIUS + G.HIT_OUTER_SLACK)
  const size = (G.OUTER_RADIUS + 6) * 2
  const glyphs = wedges.map((w, i) => {
    const a = actions.find(x => x.id === w.id)
    const active = hovered === w.id
    return `<g class="mf-ring-wedge-group"><path class="mf-ring-wedge ${active ? 'is-active' : ''}" d="${G.wedgePath(w)}"/>`
      + `<g class="mf-ring-glyph ${active ? 'is-active' : ''}" transform="translate(${(w.iconX - 19).toFixed(2)} ${(w.iconY - 19).toFixed(2)})">${chipSvg(a.glyph, i)}</g></g>`
  }).join('')
  return `<svg class="mf-ring" width="${size}" height="${size}" viewBox="${-size / 2} ${-size / 2} ${size} ${size}">`
    + `<path class="mf-ring-hit" d="${hit}"/><path class="mf-ring-band" d="${G.arcPath(h, v)}"/>`
    + `<path class="mf-ring-rim" d="${G.arcRimPath(h, v)}"/>`
    + `<path class="mf-ring-inner" d="${G.arcRimPath(h, v, G.INNER_RADIUS)}"/>${glyphs}</svg>`
}

function cell(name, h, v, hovered) {
  const left = h === 'left' ? 0 : h === 'right' ? 276 : 111
  const top = v === 'top' ? 0 : v === 'bottom' ? 276 : 111
  return `<div class="cell"><div class="mf-root" style="left:${left}px;top:${top}px">${ring(h, v, hovered)}<button class="mf-whale-btn"><svg class="mf-whale" width="54" height="${(54 * 17.04 / 23.16).toFixed(1)}" viewBox="0 0 23.16 17.04" fill="none"><path d="${FISH}" fill="currentColor"/></svg></button></div><div class="tag">${name}</div></div>`
}

const styleText = fs.readFileSync('/Users/sonoma/code/modelfloat/client/src/styles.ts', 'utf8')
  .match(/export const CSS = `([\s\S]*)`\s*$/m)[1]

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html{--dsw-alias-bg-layer-2:#2c2c2e;--dsw-alias-label-primary:#f9fafb;--dsw-alias-label-secondary:#979da6;--dsw-alias-border-l3:#ffffff29}
html,body{margin:0;background:#0b0d12;color:#f9fafb;font-family:-apple-system,"PingFang SC",sans-serif}
${styleText}
.cell{position:relative;width:330px;height:330px;overflow:hidden;background:linear-gradient(160deg,#1c2230,#0e1118);outline:1px solid #2a2f3d}
.cell .mf-root{position:absolute}
.mf-ring{animation:none !important}
.mf-whale{animation:none !important}
.grid{display:grid;grid-template-columns:repeat(3,330px);gap:6px;padding:6px}
.tag{position:absolute;right:6px;bottom:4px;color:#889;font:11px ui-monospace;z-index:9}
</style></head><body><div class="grid">
${cell('full', 'none', 'none', 'lock-screen')}
${cell('half-bottom', 'none', 'bottom')}
${cell('half-left', 'left', 'none')}
${cell('corner-tl', 'left', 'top')}
${cell('corner-tr', 'right', 'top', 'memory')}
${cell('corner-br', 'right', 'bottom')}
</div></body></html>`
fs.writeFileSync('/tmp/mf-h/cases.html', html)
console.log('written', html.length)
