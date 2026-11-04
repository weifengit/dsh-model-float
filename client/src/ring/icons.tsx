/**
 * Model Float — the ring's icons.
 *
 * Each action is a coloured glass chip: a rounded plate with a gradient, a
 * specular highlight along its top edge, and a white pictogram cut into it.
 *
 * The pictograms are *literal* — a whale for the free models, a padlock for
 * the lock screen, a broom for the memory sweep. The ring shows no labels, so
 * the glyph is the only thing saying what the wedge does, and it has to be
 * recognised at 38 px with nothing to lean on. An abstract mark looks designed
 * and reads as noise: an orbit is not "models", a horizon is not "lock".
 *
 * They are inline SVG rather than emoji for two reasons: an emoji is rendered
 * by the platform's own font, so it looks different on every machine; and it
 * cannot be given the ring's own light, so it sits on the arc as a pasted-on
 * sticker instead of belonging to it.
 *
 * @module client/src/ring/icons.tsx
 */

import React from 'react'
import { FISH_LOGO_PATH, VIEWBOX } from '../whale.tsx'

/** The icons the ring can show. */
export type IconName = 'whale' | 'lock' | 'broom' | 'chart' | 'clock' | 'note' | 'gear' | 'power'

/** The props an icon takes. */
export interface IconProps {
  /** Which icon to draw. */
  readonly name: IconName
  /** The rendered size in px. */
  readonly size?: number
}

/** A chip's colour, and the pictogram drawn on it. */
interface Chip {
  /** The gradient's two stops, top-lit: the lighter one reads as the glass. */
  readonly from: string
  readonly to: string
  /** The pictogram, on the same 24 × 24 grid as the plate. */
  readonly mark: React.ReactNode
}

/**
 * The pictogram's own weight: white strokes with round caps, so it reads as
 * cut into the glass rather than printed on it.
 */
const MARK = {
  stroke: '#ffffff', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none',
} as const

/**
 * The mark's box inside the plate.
 *
 * The plate is 21.6 across with a 7.2 corner radius, so a pictogram that
 * fills the grid reads as cropped at the corners. 16 px centred keeps every
 * glyph inside the flat part of the glass.
 */
const BOX = 16

/**
 * The official whale, scaled into the mark's box.
 *
 * Reused from `whale.tsx` rather than redrawn: the float's mark and this chip
 * are the same object, and two copies of the path would drift apart. It is
 * filled, not stroked — at 16 px an outlined whale loses the fluke and reads
 * as a blob.
 */
function fishMark(): React.ReactNode {
  const scale = BOX / Math.max(VIEWBOX.width, VIEWBOX.height)
  const offsetX = (24 - VIEWBOX.width * scale) / 2
  const offsetY = (24 - VIEWBOX.height * scale) / 2
  return (
    <path
      d={FISH_LOGO_PATH}
      transform={`translate(${offsetX.toFixed(3)} ${offsetY.toFixed(3)}) scale(${scale.toFixed(4)})`}
      fill="#ffffff"
      stroke="none"
    />
  )
}

const CHIPS: Record<IconName, Chip> = {
  // 白嫖模型: the whale itself — the same silhouette the float wears, so the
  // wedge says "this is what the whale is".
  whale: { from: '#6f8bff', to: '#2f4bd8', mark: fishMark() },

  // 一键锁屏: a padlock. The shackle above the body and the keyhole in the
  // middle are what make it a lock rather than a box.
  lock: {
    from: '#b07bff',
    to: '#6b34d6',
    mark: (
      <>
        <path d="M8.6 10.6V8.2a3.4 3.4 0 0 1 6.8 0v2.4" {...MARK} />
        <rect x="6.4" y="10.6" width="11.2" height="8" rx="2.2" {...MARK} />
        <path d="M12 13.6v2.2" {...MARK} />
      </>
    ),
  },

  // 内存释放: a broom, standing upright — handle, collar, and a flared brush
  // with a middle seam. A diagonal solid wedge reads as a cursor arrow, and
  // a pointed triangle reads as a leaf; neither says "sweep".
  broom: {
    from: '#37e0b0',
    to: '#0d9f86',
    mark: (
      <>
        <path d="M12 4.6v6.6" {...MARK} />
        <rect x="9.6" y="11" width="4.8" height="2.2" rx="0.7" {...MARK} />
        <path d="M10.1 13.4 7.5 19.5h9L13.9 13.4" {...MARK} />
        <path d="M12 13.8v5.4" {...MARK} opacity="0.7" />
      </>
    ),
  },

  // 系统监控: three bars on a baseline — the shape everyone already reads as
  // load.
  chart: {
    from: '#ffb34d',
    to: '#e0721c',
    mark: (
      <>
        <path d="M5.6 18.4h12.8" {...MARK} />
        <path d="M8.6 18.4v-4" {...MARK} />
        <path d="M12 18.4V9.6" {...MARK} />
        <path d="M15.4 18.4v-6.4" {...MARK} />
      </>
    ),
  },

  // 时钟: a face, two hands, the pin in the middle.
  clock: {
    from: '#4ecbff',
    to: '#1f7fe0',
    mark: (
      <>
        <circle cx="12" cy="12" r="6.4" {...MARK} />
        <path d="M12 8.6V12l2.6 1.6" {...MARK} />
      </>
    ),
  },

  // 笔记: a page with a folded corner and two lines of text.
  note: {
    from: '#f472b6',
    to: '#c2257e',
    mark: (
      <>
        <path d="M7.2 5.2h6.6l3.4 3.4v10.2H7.2z" {...MARK} />
        <path d="M13.8 5.2v3.4h3.4" {...MARK} />
        <path d="M9.6 12.4h4.8M9.6 15.2h4.8" {...MARK} opacity="0.7" />
      </>
    ),
  },

  // 设置: a cog — a body ring, a hub and eight teeth reaching past the ring.
  // Teeth floating around a bare circle read as a sun.
  gear: {
    from: '#a3aec4',
    to: '#5a6579',
    mark: (
      <>
        <circle cx="12" cy="12" r="5" {...MARK} />
        <circle cx="12" cy="12" r="1.6" {...MARK} />
        <path
          d="M12 7v-2M12 17v2M7 12H5M17 12h2M15.5 8.5 17 7M8.5 15.5 7 17M15.5 15.5 17 17M8.5 8.5 7 7"
          {...MARK}
        />
      </>
    ),
  },

  // 电源: the power glyph — an arc open at the top with a stem through it.
  power: {
    from: '#ff7a6e',
    to: '#d43b3b',
    mark: (
      <>
        <path d="M7.8 8.2a5.6 5.6 0 1 0 8.4 0" {...MARK} />
        <path d="M12 4.8v6.2" {...MARK} />
      </>
    ),
  },
}

/**
 * One of the ring's icons.
 *
 * @param props - see {@link IconProps}.
 */
export function RingIcon({ name, size = 38 }: IconProps): React.ReactElement {
  const chip = CHIPS[name]
  // useId is stable across re-renders, so a hover does not rebuild the
  // gradients; it is also unique per instance, which matters because the ring
  // renders several chips and a shared id would make every one of them take
  // the first definition the browser met.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  if (chip === undefined) return <></>
  const id = `mfchip${uid}-${name}`
  return (
    <svg
      className="mf-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={chip.from} />
          <stop offset="1" stopColor={chip.to} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1.2" y="1.2" width="21.6" height="21.6" rx="7.2" fill={`url(#${id}-fill)`} />
      <rect
        x="1.2"
        y="1.2"
        width="21.6"
        height="21.6"
        rx="7.2"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.34"
        strokeWidth="0.8"
      />
      {/* The highlight covers the upper half only: light falls on glass from
          above, and a full plate would read as flat colour. */}
      <rect x="2.6" y="2.2" width="18.8" height="9.6" rx="5.6" fill={`url(#${id}-gloss)`} />
      <g>{chip.mark}</g>
    </svg>
  )
}

