/**
 * Model Float — the ring's icons.
 *
 * Each action is a small glass chip: a rounded plate with a coloured gradient,
 * a specular highlight along its top edge, and an abstract mark cut into it.
 * The marks are deliberately *not* pictures of things (no padlock, no broom) —
 * an action is a verb, and a verb reads better as a gesture than as the tool
 * you might use to perform it.
 *
 * They are inline SVG rather than emoji for two reasons: an emoji is rendered
 * by the platform's own font, so it looks different on every machine; and it
 * cannot be given the ring's own light, so it sits on the arc as a pasted-on
 * sticker instead of belonging to it.
 *
 * @module client/src/ring/icons.tsx
 */

import React from 'react'

/** The icons the ring can show. */
export type IconName = 'whale' | 'lock' | 'broom' | 'chart' | 'clock' | 'note' | 'gear' | 'power'

/** The props an icon takes. */
export interface IconProps {
  /** Which icon to draw. */
  readonly name: IconName
  /** The rendered size in px. */
  readonly size?: number
}

/** A chip's colour, and the mark drawn on it. */
interface Chip {
  /** The gradient's two stops, top-lit: the lighter one reads as the glass. */
  readonly from: string
  readonly to: string
  /** The abstract mark, on the same 24 × 24 grid as the plate. */
  readonly mark: React.ReactNode
}

/**
 * The white mark is drawn at a fixed weight and opacity: it is a cut in the
 * glass, not a line on top of it, so it never changes with the chip's colour.
 */
const MARK = { stroke: '#ffffff', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const

const CHIPS: Record<IconName, Chip> = {
  // The free lane: an orbit — the pool of models a turn can land on.
  whale: {
    from: '#6f8bff',
    to: '#2f4bd8',
    mark: (
      <>
        <circle cx="12" cy="12" r="2.4" fill="#ffffff" stroke="none" />
        <path d="M12 5.6a6.4 6.4 0 0 1 0 12.8" {...MARK} />
        <path d="M12 18.4A6.4 6.4 0 0 1 12 5.6" {...MARK} opacity="0.45" />
      </>
    ),
  },
  // The lock screen: a horizon closing over the display.
  lock: {
    from: '#b07bff',
    to: '#6b34d6',
    mark: (
      <>
        <circle cx="12" cy="12" r="6.4" {...MARK} />
        <path d="M6.2 13.4h11.6" {...MARK} />
        <path d="M12 16.6v2.2" {...MARK} opacity="0.5" />
      </>
    ),
  },
  // Memory release: a downward purge — weight leaving the plate.
  broom: {
    from: '#37e0b0',
    to: '#0d9f86',
    mark: (
      <>
        <path d="M12 5.4v8.2" {...MARK} />
        <path d="M8.6 10.4 12 13.8l3.4-3.4" {...MARK} />
        <path d="M6.4 17.6h11.2" {...MARK} opacity="0.5" />
      </>
    ),
  },
  // Metrics: three levels of load, no axis, no bars pretending to be a chart.
  chart: {
    from: '#ffb34d',
    to: '#e0721c',
    mark: (
      <>
        <path d="M7 15.6V9.4" {...MARK} />
        <path d="M12 15.6V6.6" {...MARK} />
        <path d="M17 15.6v-4" {...MARK} opacity="0.55" />
      </>
    ),
  },
  // Time: a hand and the arc it has travelled.
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
  // A note: two lines of weight, no page corners.
  note: {
    from: '#f472b6',
    to: '#c2257e',
    mark: (
      <>
        <path d="M7.4 9.6h9.2" {...MARK} />
        <path d="M7.4 14.4h6" {...MARK} opacity="0.55" />
      </>
    ),
  },
  // Settings: a ring with one notch — a dial, not a cog.
  gear: {
    from: '#a3aec4',
    to: '#5a6579',
    mark: (
      <>
        <circle cx="12" cy="12" r="5.8" {...MARK} />
        <path d="M12 6.2v2.2" {...MARK} />
      </>
    ),
  },
  // Power: an arc opening on a stem.
  power: {
    from: '#ff7a6e',
    to: '#d43b3b',
    mark: (
      <>
        <path d="M8.2 8.4a5.6 5.6 0 1 0 7.6 0" {...MARK} />
        <path d="M12 5.2v5.4" {...MARK} />
      </>
    ),
  },
}

/**
 * One of the ring's icons.
 *
 * @param props - see {@link IconProps}.
 */
export function RingIcon({ name, size = 30 }: IconProps): React.ReactElement {
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
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
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
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      {/* The highlight only covers the upper half: light falls on glass from
          above, and a full plate would read as flat colour. */}
      <rect x="2.6" y="2.2" width="18.8" height="10" rx="6" fill={`url(#${id}-gloss)`} />
      <g>{chip.mark}</g>
    </svg>
  )
}

