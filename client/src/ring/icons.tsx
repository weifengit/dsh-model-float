/**
 * Model Float — the ring's icons.
 *
 * Line art, drawn in the same hand as the whale: one path per icon, stroked
 * rather than filled, so the ring reads as a set of the same objects.
 *
 * They are inline SVG rather than emoji for two reasons: an emoji is rendered
 * by the platform's own font, so it looks different on every machine and
 * nothing like the whale beside it; and a glyph cannot be given the ring's
 * stroke weight, so it sits on the arc as a pasted-on sticker instead of
 * belonging to it.
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

/**
 * The path data of every icon, on a 24 × 24 grid.
 *
 * The stroke is drawn with `currentColor`, so an icon takes the ring's colour
 * and the theme's changes follow.
 */
const PATHS: Record<IconName, string[]> = {
  // A whale, drawn the way the float wears it: a rounded body, a fluke and
  // an eye. The line weight matches the mark's own silhouette.
  whale: [
    'M4.2 14.6c0-4.2 3.6-7.1 8.3-7.1 2.9 0 5.3 1 6.8 2.8.7-1.3 1.1-2.6 1.1-3.9.5 1.5.3 3-.6 4.2-1.6 2.2-4.4 5.6-7.7 8.4',
    'M3.4 12.2C2 11.4.9 10 .9 8.3c1.4 1 2.9 1.6 4.4 1.9',
    'M7.4 16.8c1.4 1.2 3.3 1.8 5.3 1.6 1.7-.1 3.2-.9 4.4-2.1',
    'M6.6 16.1c-.6 1.2-.7 2.3-.3 3.3 1.2-.3 2.1-1 2.7-2',
    'M14.3 12.1a.95.95 0 1 0 0-1.9.95.95 0 0 0 0 1.9z',
  ],
  // A padlock, drawn as a body plus its shackle.
  lock: [
    'M6 10.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z',
    'M8 10.5V7.4a4 4 0 0 1 8 0v3.1',
    'M12 14.2v2.6',
  ],
  // A broom, for the memory release.
  broom: [
    'M14.6 3.6 20.4 9.4',
    'M16.4 7.6 9 15',
    'M9 15c-1.7 1-2.6 3-3 6 3-.4 5-1.3 6-3',
    'M11.4 13.6 6 19',
  ],
  // A small chart, for the metrics.
  chart: [
    'M4 20h16',
    'M7 20v-6',
    'M12 20V7',
    'M17 20v-9',
  ],
  // A clock face.
  clock: [
    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    'M12 7.4V12l3 1.8',
  ],
  // A note, for a future action.
  note: [
    'M6 3.5h9l3.5 3.5v13.5H6z',
    'M15 3.5V7h3.5',
    'M9 12h6',
    'M9 15.5h6',
  ],
  // A gear.
  gear: [
    'M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z',
    'M19.3 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9z',
  ],
  // A power symbol.
  power: [
    'M12 3.5v8',
    'M17.4 6.6a7.5 7.5 0 1 1-10.8 0',
  ],
}

/**
 * One of the ring's icons.
 *
 * @param props - see {@link IconProps}.
 */
export function RingIcon({ name, size = 18 }: IconProps): React.ReactElement {
  const paths = PATHS[name]
  if (paths === undefined) return <></>
  return (
    <svg
      className="mf-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, index) => <path key={index} d={d} />)}
    </svg>
  )
}
