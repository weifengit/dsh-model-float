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
import { createPortal } from 'react-dom'
import { Ring } from './ring/ring.tsx'
import { WhaleMark } from './whale.tsx'
import { OUTER_RADIUS } from './ring/geometry.ts'
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
    // Long enough to cross to the ring at a walking pace, and long enough to
    // think between two wedges. The ring's own enter cancels this anyway, so
    // the only thing a long delay can do is be forgiving.
    timerRef.current = window.setTimeout(() => { setRingOpen(false); setHovered(undefined) }, 700)
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

  // A click anywhere outside the float dismisses the card.
  //
  // The card is opened by an action, not by hovering, so once it is up the
  // pointer is free to wander into the page — and there it has no way back:
  // the card only closed by running the same action again, which reads as a
  // panel that cannot be dismissed. A pointerdown outside the float is the
  // gesture everyone already expects.
  useEffect(() => {
    if (!cardOpen) return undefined
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current
      if (root === null) return
      const target = event.target
      // The card and the whale are both inside the root; the ring too. A
      // press on any of them is the float's own, and belongs to it.
      if (target instanceof Node && root.contains(target)) return
      setCardOpen(false)
    }
    // Capture, so the card closes on the press rather than after whatever the
    // page does with the click.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [cardOpen])

  // A press *inside* an iframe never reaches this document — the frame has its
  // own — so the handler above cannot see it. The browser still announces the
  // focus change: the window blurs, and the element that took focus is the
  // frame. Without this, clicking a plugin's embedded preview would leave the
  // card hanging open with no way to dismiss it.
  useEffect(() => {
    if (!cardOpen) return undefined
    const onBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) setCardOpen(false)
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [cardOpen])

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
  // more than a hundred px from the centre while the whale is 54 across, so a
  // float parked a short way from the bottom already has part of its ring
  // unreachable, so the actions have to be laid out along what is left.
  const edges = useMemo(() => {
    // The ring is centred on the whale's centre.
    const centreX = placement.x + WHALE_SEAT / 2
    const centreY = placement.y + WHALE_SEAT / 2
    return {
      horizontal: centreX - OUTER_RADIUS <= 0
        ? 'left' as const
        : centreX + OUTER_RADIUS >= viewport.width ? 'right' as const : 'none' as const,
      vertical: centreY - OUTER_RADIUS <= 0
        ? 'top' as const
        : centreY + OUTER_RADIUS >= viewport.height ? 'bottom' as const : 'none' as const,
    }
  }, [placement.x, placement.y, viewport.width, viewport.height])

  // The card opens on the side with room, and the ring's wedges on the arc
  // that is on screen.
  const cardSide = placement.x > viewport.width / 2 ? 'left' : 'right'
  const cardVertical = placement.y > viewport.height / 2 ? 'up' : 'down'

  // Portalled onto the document body.
  //
  // The float is handed a seat in the shell's overlay layer, and that layer
  // has a z-index of its own — a stacking context. Everything inside it,
  // whatever its own z-index, is confined below whatever the app puts above
  // that context. The workbench has splitters at 99, pane resizers at 100 and
  // a title bar at 40, so a whale dragged over any of them became unreachable
  // and could not be dragged again. On the body there is no such ancestor, and
  // the float is free to sit above the app's chrome — which is what a floating
  // widget is for. The lock screen is portalled for the same reason.
  return createPortal(
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
    </>,
    document.body,
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

/** The whale's rendered width in px. */
const WHALE_WIDTH = 54
