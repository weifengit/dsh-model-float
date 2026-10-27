/**
 * Model Float — the float's placement.
 *
 * Where the whale sits on the screen, and the arithmetic that keeps it there.
 *
 * The numbers match the reference music ball exactly: a 54 px seat, an 8 px
 * margin from the viewport edge, and a 22 px inset for the first-run position.
 * The whale can be dragged to any point, including flush against an edge.
 *
 * @module client/src/features/free-model/placement.ts
 */

/** The localStorage key holding the placement. */
export const PLACEMENT_KEY = 'dsh-model-float:placement:v1'

/**
 * The float's edge in px — the same 54 px as the reference music ball.
 *
 * A square seat, with the wide mark filling it horizontally and centred
 * vertically. Matching the reference's seat (rather than the mark's own
 * aspect) keeps the float the same visual size as the ball next to it and
 * keeps a stable drag hitbox whatever the artwork's shape.
 */
export const WHALE_SIZE = 54

/** The gap kept between the float and the viewport edge, in px. */
export const EDGE_GAP = 8

/** The margin the float starts with, inside the viewport corner. */
export const HOME_MARGIN = 22

/** The persisted placement of the float. */
export interface Placement {
  /** The float's left edge, in viewport px. */
  readonly x: number
  /** The float's top edge, in viewport px. */
  readonly y: number
}

/**
 * Clamp a position so the float always stays reachable: never fully off any
 * edge, and never beyond the viewport's far side.
 *
 * @param placement - the position.
 * @param viewportWidth - the viewport width.
 * @param viewportHeight - the viewport height.
 * @returns the clamped position.
 */
export function clampPlacement(
  placement: Placement,
  viewportWidth: number,
  viewportHeight: number,
): Placement {
  const maxX = Math.max(EDGE_GAP, viewportWidth - WHALE_SIZE - EDGE_GAP)
  const maxY = Math.max(EDGE_GAP, viewportHeight - WHALE_SIZE - EDGE_GAP)
  return {
    x: Math.min(maxX, Math.max(EDGE_GAP, placement.x)),
    y: Math.min(maxY, Math.max(EDGE_GAP, placement.y)),
  }
}

/**
 * The position of one corner of the viewport.
 *
 * @param corner - the corner.
 * @param viewportWidth - the viewport width.
 * @param viewportHeight - the viewport height.
 * @returns the position.
 */
export function cornerPlacement(
  corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
  viewportWidth: number,
  viewportHeight: number,
): Placement {
  // The reference ball's first-run position: 22 px in from the corner,
  // measured to the seat's edge (not to the 8 px clamp margin).
  const home = HOME_MARGIN
  const right = viewportWidth - WHALE_SIZE - home
  const bottom = viewportHeight - WHALE_SIZE - home
  switch (corner) {
    case 'bottom-left': return { x: home, y: bottom }
    case 'top-right': return { x: right, y: home }
    case 'top-left': return { x: home, y: home }
    default: return { x: right, y: bottom }
  }
}

/**
 * Read the persisted placement.
 *
 * A stored position is interpreted against the viewport it was stored in; on a
 * different screen size it is clamped back into view rather than discarded, so
 * the float is never lost off-screen.
 *
 * @param viewportWidth - the viewport width.
 * @param viewportHeight - the viewport height.
 * @returns the placement.
 */
export function readPlacement(viewportWidth: number, viewportHeight: number): Placement {
  try {
    const raw = window.localStorage.getItem(PLACEMENT_KEY)
    if (raw === null) return cornerPlacement('bottom-right', viewportWidth, viewportHeight)
    const parsed = JSON.parse(raw) as Partial<Placement>
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return cornerPlacement('bottom-right', viewportWidth, viewportHeight)
    }
    return clampPlacement({ x: parsed.x, y: parsed.y }, viewportWidth, viewportHeight)
  } catch {
    return cornerPlacement('bottom-right', viewportWidth, viewportHeight)
  }
}

/**
 * Persist the placement; failures are non-fatal (private mode, quota).
 *
 * @param placement - the placement.
 */
export function writePlacement(placement: Placement): void {
  try {
    window.localStorage.setItem(PLACEMENT_KEY, JSON.stringify(placement))
  } catch {
    /* placement is a convenience, not state that must persist */
  }
}
