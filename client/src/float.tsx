/**
 * Model Float — the float itself.
 *
 * The whale, the ring around it, the vendor card beside it and the lock
 * screen over everything. This component owns the *arrangement*; each surface
 * owns its own content:
 *
 * - the **ring** (`ring/ring.tsx`) draws the actions and reports which one the
 *   pointer is over;
 * - the **vendor card** (`features/free-model/vendor-card.tsx`) shows the free
 *   models' vendors and their credit;
 * - the **lock screen** (`features/lockscreen/lock-screen.tsx`) is the overlay.
 *
 * The float is what the user sees, and it is deliberately thin: the placement
 * and the hover timing live here, because both are about the float as a whole
 * rather than about any one surface.
 *
 * @module client/src/float.tsx
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ring } from './ring/ring.tsx'
import { ringOffset } from './ring/geometry.ts'
import { WhaleMark } from './whale.tsx'
import { VendorCard } from './features/free-model/vendor-card.tsx'
import { LockScreen } from './features/lockscreen/lock-screen.tsx'
import { ACTIONS } from './features/registry.ts'
import type { Action } from './features/registry.ts'
import { clampPlacement, cornerPlacement, readPlacement, writePlacement } from './features/free-model/placement.ts'
import type { Placement } from './features/free-model/placement.ts'
import { useFreeModel } from './features/free-model/use-free-model.ts'

/** The props the float needs. */
export interface FloatProps {
  /** The translator, bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
  /** The shell's session list hook, handed down to the lock screen. */
  readonly useSessions: (selector: (state: never) => unknown) => unknown
}

/**
 * The floating whale and everything around it.
 *
 * @param props - see {@link FloatProps}.
 */
export function ModelFloat(props: FloatProps): React.ReactElement {
  const { t } = props
  const freeModel = useFreeModel()
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [placement, setPlacement] = useState<Placement>(() => readPlacement(window.innerWidth, window.innerHeight))
  const [ringOpen, setRingOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [hovered, setHovered] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const dragRef = useRef<{
    pointerId: number
    moved: boolean
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  // ── viewport ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setViewport({ width, height })
      setPlacement(current => {
        const clamped = clampPlacement(current, width, height)
        writePlacement(clamped)
        return clamped
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── the ring's actions ────────────────────────────────────────────────────
  // The registry declares the actions; their behaviour comes from the state
  // this component owns.
  const actions = useMemo<Action[]>(() => ACTIONS.map(action => {
    if (action.id === 'free-model') {
      return {
        ...action,
        detail: freeModel.vendors.length === 0 ? undefined : `${freeModel.vendors.length}`,
        run: () => { setCardOpen(current => !current); setRingOpen(false); return undefined },
      }
    }
    if (action.id === 'lock-screen') {
      return {
        ...action,
        run: () => { setLockOpen(true); setRingOpen(false); return undefined },
      }
    }
    if (action.id === 'memory') {
      return {
        ...action,
        // The Host answers with a reason code; the sentence is ours to write,
        // because only the page knows which language it is showing.
        run: async () => {
          const result = await freeModel.releaseMemory()
          // An unrecognised code must not leak its key into the toast: a Host
          // from a newer version can answer with one this page does not know.
          const key = result.reason === 'collected' || result.reason === 'expose-gc-missing'
            ? `memory.${result.reason}`
            : 'memory.done'
          setNotice(t(key, { mb: (result.freedBytes / 1024 / 1024).toFixed(1) }))
          return undefined
        },
      }
    }
    return action
  }), [freeModel, t])

  // ── hover ─────────────────────────────────────────────────────────────────
  // Hovering the whale opens the ring; leaving closes it. The delay keeps the
  // ring from popping up while the pointer merely crosses the whale.
  const openSoon = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setRingOpen(true), 160)
  }, [])

  const closeSoon = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { setRingOpen(false); setHovered(undefined) }, 320)
  }, [])

  useEffect(() => () => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
  }, [])

  // A result message is transient: it reports what an action just did, and
  // leaving it on screen forever would turn a toast into a stain.
  useEffect(() => {
    if (notice === '') return undefined
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Escape closes the ring and the card.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setRingOpen(false)
      setCardOpen(false)
      setHovered(undefined)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── drag ──────────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const root = rootRef.current
    if (root === null) return
    const rect = root.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* capture is a nicety */
    }
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    // Either axis passing the threshold is a drag: requiring both would make a
    // purely horizontal or purely vertical drag read as a click.
    if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) drag.moved = true
    if (!drag.moved) return
    setPlacement(clampPlacement(
      { x: drag.originX + dx, y: drag.originY + dy },
      window.innerWidth,
      window.innerHeight,
    ))
  }, [])

  const endDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* the capture may already be gone */
    }
    if (drag === null) return
    if (drag.moved) {
      setPlacement(current => {
        const clamped = clampPlacement(current, window.innerWidth, window.innerHeight)
        writePlacement(clamped)
        return clamped
      })
      return
    }
    // A click toggles the ring — the touch and keyboard path.
    setRingOpen(current => !current)
  }, [])

  // ── placement ─────────────────────────────────────────────────────────────
  // The ring is cut by the viewport edge, so it needs to know which edges cut
  // it. The test is on the *ring's* extent, not the whale's: the ring is
  // 132 px across while the whale is 54, so a float parked 20 px from the
  // bottom already has a third of its ring off-screen — and those wedges are
  // unreachable, so the actions have to be laid out along what is left.
  const edges = useMemo(() => {
    // The ring is centred on the whale's centre.
    const centreX = placement.x + WHALE_SEAT / 2
    const centreY = placement.y + WHALE_SEAT / 2
    return {
      horizontal: centreX - RING_OUTER <= 0
        ? 'left' as const
        : centreX + RING_OUTER >= viewport.width ? 'right' as const : 'none' as const,
      vertical: centreY - RING_OUTER <= 0
        ? 'top' as const
        : centreY + RING_OUTER >= viewport.height ? 'bottom' as const : 'none' as const,
    }
  }, [placement.x, placement.y, viewport.width, viewport.height])

  // The ring slides onto the edge the float is against, so the visible quarter
  // is exactly the quarter that fits on screen. Without this, a float in a
  // corner would have half its ring off-screen and those wedges unreachable.
  const ringShift = useMemo(
    () => ringOffset(edges.horizontal, edges.vertical, WHALE_SEAT),
    [edges.horizontal, edges.vertical],
  )

  // The card opens on the side with room, and the ring's wedges on the arc
  // that is on screen.
  const cardSide = placement.x > viewport.width / 2 ? 'left' : 'right'
  const cardVertical = placement.y > viewport.height / 2 ? 'up' : 'down'

  return (
    <>
      <div
        className="mf-root"
        ref={rootRef}
        style={{ left: `${placement.x}px`, top: `${placement.y}px` }}
        data-mf-side={cardSide}
        data-mf-vertical={cardVertical}
      >
        <Ring
          actions={actions}
          open={ringOpen}
          horizontal={edges.horizontal}
          vertical={edges.vertical}
          offset={ringShift}
          hovered={hovered}
          onHover={setHovered}
          onOpen={openSoon}
          onClose={closeSoon}
          onRun={id => { void runAction(id) }}
          t={t}
        />
        <VendorCard
          open={cardOpen}
          side={cardSide}
          vertical={cardVertical}
          freeModel={freeModel}
          onOpen={openSoon}
          onClose={closeSoon}
          t={t}
        />
        {notice !== '' ? (
          <div className="mf-notice" role="status">{notice}</div>
        ) : null}
        <button
          type="button"
          className="mf-whale-btn"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerEnter={openSoon}
          onPointerLeave={closeSoon}
          onFocus={openSoon}
          onBlur={() => { /* focus moving to the ring is still inside the float */ }}
          onClick={event => event.preventDefault()}
          aria-label={t('float.label')}
          aria-expanded={ringOpen}
          title={t('float.label')}
        >
          <WhaleMark size={WHALE_WIDTH} />
        </button>
      </div>
      <LockScreen
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        useSessions={props.useSessions as never}
        t={t}
      />
    </>
  )

  /**
   * Run an action from the ring.
   *
   * @param id - the action id.
   */
  async function runAction(id: string): Promise<void> {
    const action = actions.find(candidate => candidate.id === id)
    if (action === undefined) return
    const message = await action.run()
    if (typeof message === 'string') setNotice(message)
  }
}

/** The whale seat's edge in px — the same as the reference music ball. */
const WHALE_SEAT = 54

/** The ring's outer radius in px — how far the ring reaches past the whale. */
const RING_OUTER = 66

/** The whale's rendered width in px. */
const WHALE_WIDTH = 54
