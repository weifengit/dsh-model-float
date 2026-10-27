/**
 * Model Float — the ring menu.
 *
 * The ring that opens around the whale. It is an annulus of wedges, one per
 * action, laid out along whichever part of the circle is on screen.
 *
 * Two behaviours the user asked for:
 *
 * - **hovering a wedge highlights it**; the action runs on *click*, not on
 *   hover. A menu that fires the moment the pointer crosses it would run a
 *   slow action by accident, and there is no way to back out of that.
 * - **the ring is cut by the viewport edge** — a float parked at the bottom
 *   shows the ring's upper half, one in a corner shows a quarter. The cut is
 *   not cosmetic: the off-screen wedges are unreachable, so the actions are
 *   laid out along the *visible* arc instead.
 *
 * @module client/src/ring/ring.tsx
 */

import React, { useMemo, useRef, useState } from 'react'
import { arcPath, layoutWedges, wedgeAt, wedgePath, INNER_RADIUS, OUTER_RADIUS } from './geometry.ts'
import { RingIcon } from './icons.tsx'
import type { Action } from '../features/registry.ts'

/** The props the ring needs. */
export interface RingProps {
  /** The actions to offer. */
  readonly actions: readonly Action[]
  /** Whether the ring is showing. */
  readonly open: boolean
  /** 'left' | 'right' | 'none' — which side of the screen the float is on. */
  readonly horizontal: 'left' | 'right' | 'none'
  /** 'top' | 'bottom' | 'none' — which side of the screen the float is on. */
  readonly vertical: 'top' | 'bottom' | 'none'
  /** The ring's offset from the whale's centre, in px. */
  readonly offset: { x: number, y: number }
  /** The action the pointer is over, or undefined. */
  readonly hovered: string | undefined
  /** Report the action under the pointer. */
  readonly onHover: (id: string | undefined) => void
  /** The pointer entered the ring. */
  readonly onOpen: () => void
  /** The pointer left the ring. */
  readonly onClose: () => void
  /** Run an action. */
  readonly onRun: (id: string) => void
  /** The translator, bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
}

/**
 * The ring.
 *
 * @param props - see {@link RingProps}.
 */
export function Ring(props: RingProps): React.ReactElement | null {
  const { actions, open, horizontal, vertical, offset, hovered, onHover, onOpen, onClose, onRun, t } = props
  const svgRef = useRef<SVGSVGElement | null>(null)

  const wedges = useMemo(
    () => layoutWedges(actions.map(action => action.id), horizontal, vertical),
    [actions, horizontal, vertical],
  )

  if (!open) return null

  /**
   * The action under the pointer, read from the pointer's position relative
   * to the ring's centre.
   */
  const pick = (event: React.PointerEvent<SVGSVGElement>): string | undefined => {
    const svg = svgRef.current
    if (svg === null) return undefined
    const rect = svg.getBoundingClientRect()
    // The SVG is drawn around its own centre, so the centre is the middle of
    // its box.
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    return wedgeAt(wedges, dx, dy)
  }

  const band = arcPath(horizontal, vertical)
  const size = (OUTER_RADIUS + 6) * 2

  return (
    <svg
      ref={svgRef}
      className="mf-ring"
      style={{ marginLeft: offset.x, marginTop: offset.y }}
      width={size}
      height={size}
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      onPointerEnter={onOpen}
      onPointerMove={event => onHover(pick(event))}
      onPointerLeave={() => { onHover(undefined); onClose() }}
      aria-label={t('ring.label')}
    >
      {/* The band behind the wedges, so a gap between them still reads as
          part of the ring rather than as a hole. */}
      <path className="mf-ring-band" d={band} />
      {wedges.map(wedge => {
        const action = actions.find(candidate => candidate.id === wedge.id)
        if (action === undefined) return null
        const active = hovered === wedge.id
        // The click lives on the group, not on the path: the glyph is a
        // sibling of the path, so a click on the icon would miss the path's
        // handler entirely.
        return (
          <g
            key={wedge.id}
            className="mf-ring-wedge-group"
            onClick={() => { if (action.enabled !== false) onRun(wedge.id) }}
          >
            <path
              className={`mf-ring-wedge ${active ? 'is-active' : ''} ${action.enabled === false ? 'is-disabled' : ''}`}
              d={wedgePath(wedge)}
            />
            <g
              className={`mf-ring-glyph ${active ? 'is-active' : ''}`}
              transform={`translate(${wedge.x - 9} ${wedge.y - 9})`}
            >
              <RingIcon name={action.icon} size={18} />
            </g>
            <title>{action.label}</title>
          </g>
        )
      })}
    </svg>
  )
}
