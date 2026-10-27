/**
 * Model Float — the ring's geometry.
 *
 * The ring around the whale is an annulus: a disc with a hole in the middle,
 * where the whale sits. It is cut by the viewport edge when the float is
 * parked against one, so what the user sees is a half ring or a quarter ring
 * rather than a full one.
 *
 * The cutting is not a decoration — it decides *which* actions are reachable.
 * A wedge whose body is off-screen cannot be pointed at, so the geometry has
 * to report it, and the ring has to lay the actions out along the visible arc
 * instead of along the whole circle.
 *
 * Keeping the geometry here (pure functions, no React) means the same
 * numbers can be tested without a browser.
 *
 * @module client/src/ring/geometry.ts
 */

/**
 * The ring's inner radius, in px.
 *
 * Must clear the whale's *corners*, not its edge: the seat is a 54 px square,
 * so its corners sit 27·√2 ≈ 38 px from the centre. An inner radius below that
 * lets the ring's inner edge cut across the whale, and the band shows through
 * the gaps in the mark as a grey crescent.
 */
export const INNER_RADIUS = 40

/** The ring's outer radius, in px. */
export const OUTER_RADIUS = 66

/**
 * The radius the pointer is measured from, in px.
 *
 * Deliberately smaller than {@link INNER_RADIUS}: the drawn ring starts at
 * 40 px so it clears the whale, but if the *hit* area started there too, the
 * few px between the whale's edge and the band would be dead space. Moving
 * the pointer off the whale would cross that gap, land on nothing, and the
 * ring would close before it could be reached — which is why the lock-screen
 * wedge in a half ring was so hard to hit.
 */
export const HIT_INNER_RADIUS = 22

/** How far past the rim the pointer still counts as on the ring, in px. */
export const HIT_OUTER_SLACK = 6

/**
 * The four edges a float can be parked against.
 *
 * The edge decides which part of the ring is visible: parked against the
 * bottom edge, the ring shows its upper half; parked in a corner, a quarter.
 */
export type Edge = 'none' | 'top' | 'right' | 'bottom' | 'left'

/**
 * How much of the ring is visible.
 *
 * - `full` — the whole circle;
 * - `half` — one edge cuts it in two;
 * - `quarter` — two edges cut it to a corner.
 */
export type Arc = 'full' | 'half' | 'quarter'

/**
 * One action's place on the ring.
 */
export interface Wedge {
  /** The action's id. */
  readonly id: string
  /** The wedge's start angle, in radians, measured clockwise from 12 o'clock. */
  readonly start: number
  /** The wedge's end angle, in radians. */
  readonly end: number
  /** The angle of the wedge's middle, in radians. */
  readonly middle: number
  /** The wedge's middle point, in px, relative to the ring's centre. */
  readonly x: number
  readonly y: number
  /** The distance from the centre to the wedge's middle, in px. */
  readonly radius: number
}

/**
 * The visible arc for a placement.
 *
 * @param edge - the edge the float is parked against.
 * @returns the visible arc.
 */
export function arcFor(edge: Edge): Arc {
  if (edge === 'none') return 'full'
  if (edge === 'top' || edge === 'right' || edge === 'bottom' || edge === 'left') return 'half'
  return 'full'
}

/**
 * The visible arc for a placement in a corner.
 *
 * @param horizontal - 'left' or 'right', which side of the screen.
 * @param vertical - 'top' or 'bottom', which side of the screen.
 * @returns the visible arc.
 */
export function arcForCorner(horizontal: 'left' | 'right' | 'none', vertical: 'top' | 'bottom' | 'none'): Arc {
  // A corner cuts away two quarters, so what is left is a quarter.
  return horizontal !== 'none' && vertical !== 'none' ? 'quarter' : 'half'
}

/**
 * The start and end angles of the visible arc, in radians clockwise from
 * 12 o'clock.
 *
 * The arc is always the part of the circle that points *away* from the edges
 * the float is parked against, because that is the part that is on screen.
 *
 * @param horizontal - 'left', 'right' or 'none'.
 * @param vertical - 'top', 'bottom' or 'none'.
 * @returns the arc's bounds.
 */
export function visibleArc(
  horizontal: 'left' | 'right' | 'none',
  vertical: 'top' | 'bottom' | 'none',
): { start: number, span: number } {
  const TAU = Math.PI * 2
  // Angles are measured clockwise from 12 o'clock, so "up" is 0 and "right"
  // is a quarter turn.
  const up = 0
  const right = Math.PI / 2
  const down = Math.PI
  const left = Math.PI * 1.5
  const half = Math.PI
  const quarter = Math.PI / 2

  if (horizontal === 'none' && vertical === 'none') return { start: up, span: TAU }
  if (horizontal === 'none') {
    // Against the top edge, the ring reaches *down* into the screen (90°..270°).
    // Against the bottom edge, it reaches up (270°..90°, through 12 o'clock).
    return vertical === 'top' ? { start: right, span: half } : { start: left, span: half }
  }
  if (vertical === 'none') {
    // Against the left edge, the ring reaches right (0°..180°).
    // Against the right edge, it reaches left (180°..360°).
    return horizontal === 'left' ? { start: up, span: half } : { start: down, span: half }
  }
  // A corner: the visible quarter reaches diagonally into the screen, away
  // from both edges it is parked against.
  if (horizontal === 'left' && vertical === 'top') return { start: right, span: quarter }
  if (horizontal === 'right' && vertical === 'top') return { start: down, span: quarter }
  if (horizontal === 'left' && vertical === 'bottom') return { start: up, span: quarter }
  return { start: left, span: quarter }
}

/**
 * The place of each action on the ring.
 *
 * The actions are laid out along the *visible* arc, evenly spaced, so a
 * half ring shows the same three actions as a full ring — just packed into
 * the half that is on screen.
 *
 * @param ids - the action ids, in ring order.
 * @param horizontal - 'left', 'right' or 'none'.
 * @param vertical - 'top', 'bottom' or 'none'.
 * @returns one wedge per action.
 */
export function layoutWedges(
  ids: readonly string[],
  horizontal: 'left' | 'right' | 'none',
  vertical: 'top' | 'bottom' | 'none',
): Wedge[] {
  const { start, span } = visibleArc(horizontal, vertical)
  const count = ids.length
  if (count === 0) return []
  const step = span / count
  const radius = (INNER_RADIUS + OUTER_RADIUS) / 2
  return ids.map((id, index) => {
    const from = start + step * index
    const to = from + step
    const middle = (from + to) / 2
    return {
      id,
      start: from,
      end: to,
      middle,
      // Angles run clockwise from 12 o'clock, so x grows with the sine and y
      // with the cosine.
      x: Math.sin(middle) * radius,
      y: -Math.cos(middle) * radius,
      radius,
    }
  })
}

/**
 * The angle of a point relative to a centre, in radians clockwise from
 * 12 o'clock.
 *
 * @param dx - the point's horizontal offset from the centre.
 * @param dy - the point's vertical offset from the centre.
 * @returns the angle.
 */
export function angleOf(dx: number, dy: number): number {
  const angle = Math.atan2(dx, -dy)
  return angle < 0 ? angle + Math.PI * 2 : angle
}

/**
 * The action under a point, if any.
 *
 * A point is inside a wedge when it is between the radii *and* its angle falls
 * in the wedge's span. The span test is what makes the off-screen part of a
 * cut ring unclickable.
 *
 * @param wedges - the laid-out wedges.
 * @param dx - the pointer's horizontal offset from the ring's centre.
 * @param dy - the pointer's vertical offset from the ring's centre.
 * @returns the action id under the pointer, or undefined.
 */
export function wedgeAt(wedges: readonly Wedge[], dx: number, dy: number): string | undefined {
  const distance = Math.hypot(dx, dy)
  // The hit area is more generous than the drawing, at both ends: inward so
  // leaving the whale leads straight onto the ring, outward so the rim is not
  // a one-pixel target.
  if (distance < HIT_INNER_RADIUS || distance > OUTER_RADIUS + HIT_OUTER_SLACK) return undefined
  const angle = angleOf(dx, dy)
  for (const wedge of wedges) {
    // The angle is measured *relative to the wedge's start*, so a wedge that
    // runs past 12 o'clock is found without splitting it in two.
    const offset = (angle - wedge.start + Math.PI * 4) % (Math.PI * 2)
    if (offset <= wedge.end - wedge.start) return wedge.id
  }
  return undefined
}

/**
 * The SVG path of one wedge, as an annular sector.
 *
 * @param wedge - the wedge.
 * @param inner - the inner radius.
 * @param outer - the outer radius.
 * @returns the path data.
 */
export function wedgePath(wedge: Wedge, inner = INNER_RADIUS, outer = OUTER_RADIUS): string {
  const point = (radius: number, angle: number): [number, number] => [
    Math.sin(angle) * radius,
    -Math.cos(angle) * radius,
  ]
  const [x1, y1] = point(outer, wedge.start)
  const [x2, y2] = point(outer, wedge.end)
  const [x3, y3] = point(inner, wedge.end)
  const [x4, y4] = point(inner, wedge.start)
  const large = wedge.end - wedge.start > Math.PI ? 1 : 0
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ')
}

/**
 * The SVG path of the whole visible arc, as a filled band.
 *
 * @param horizontal - 'left', 'right' or 'none'.
 * @param vertical - 'top', 'bottom' or 'none'.
 * @param inner - the inner radius.
 * @param outer - the outer radius.
 * @returns the path data.
 */
export function arcPath(
  horizontal: 'left' | 'right' | 'none',
  vertical: 'top' | 'bottom' | 'none',
  inner = INNER_RADIUS,
  outer = OUTER_RADIUS,
): string {
  const { start, span } = visibleArc(horizontal, vertical)
  const point = (radius: number, angle: number): [number, number] => [
    Math.sin(angle) * radius,
    -Math.cos(angle) * radius,
  ]
  const outerRing = sectorArc(outer, start, span, true, point)
  const innerRing = sectorArc(inner, start + span, span, false, point)
  return [outerRing, innerRing, 'Z'].join(' ')
}

/**
 * One radius of an annular sector, as a sequence of arcs.
 *
 * @param radius - the radius to draw at.
 * @param from - the starting angle.
 * @param sweep - how far the arc runs.
 * @param clockwise - which way round.
 * @param point - maps an angle to a coordinate.
 * @returns the path data.
 */
function sectorArc(
  radius: number,
  from: number,
  sweep: number,
  clockwise: boolean,
  point: (radius: number, angle: number) => [number, number],
): string {
  const parts = [`M ${point(radius, from).map(n => n.toFixed(2)).join(' ')}`]
  let angle = from
  // A full circle cannot be one arc: its endpoints coincide, and an SVG arc
  // with identical endpoints draws nothing at all. Two half turns are the
  // usual way round it.
  for (const each of (sweep >= Math.PI * 2 - 1e-6 ? [Math.PI, Math.PI] : [sweep])) {
    const [x, y] = point(radius, angle + each)
    parts.push(`A ${radius} ${radius} 0 ${each > Math.PI ? 1 : 0} ${clockwise ? 1 : 0} ${x.toFixed(2)} ${y.toFixed(2)}`)
    angle += each
  }
  return parts.join(' ')
}

/**
 * The outer edge of the visible arc, as an *open* path.
 *
 * The band's own outline includes its two radial closing edges, and stroking
 * those draws a straight line from the inner radius to the outer one at each
 * end — a visible seam above the whale. A rim drawn as an arc alone has no
 * such edges, so the ring gets its outline without the seam.
 *
 * @param horizontal - 'left', 'right' or 'none'.
 * @param vertical - 'top', 'bottom' or 'none'.
 * @param radius - the radius to draw at.
 * @returns the path data.
 */
export function arcRimPath(
  horizontal: 'left' | 'right' | 'none',
  vertical: 'top' | 'bottom' | 'none',
  radius = OUTER_RADIUS,
): string {
  const { start, span } = visibleArc(horizontal, vertical)
  const point = (angle: number): [number, number] => [
    Math.sin(angle) * radius,
    -Math.cos(angle) * radius,
  ]
  const parts = [`M ${point(start).map(n => n.toFixed(2)).join(' ')}`]
  let angle = start
  for (const each of (span >= Math.PI * 2 - 1e-6 ? [Math.PI, Math.PI] : [span])) {
    const [x, y] = point(angle + each)
    parts.push(`A ${radius} ${radius} 0 ${each > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`)
    angle += each
  }
  return parts.join(' ')
}

