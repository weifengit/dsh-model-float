/**
 * Model Float — the floating panel.
 *
 * The panel is two pieces that live in one container:
 *
 * - the **whale button**, always on screen, draggable to any position on the
 *   screen and remembered across reloads;
 * - the **hover card**, which opens on hover (or focus, or a click, for touch
 *   and keyboard users) and lists every vendor with its state and its
 *   remaining credit.
 *
 * The card's content is a *vendor* table. Each row carries the vendor's own
 * accent colour, its connection state, and its remaining balance in the
 * vendor's own unit. Vendors that are switched off, not logged in, or out of
 * credit are all visible — the point of the panel is to answer "which vendors
 * are usable right now" at a glance, so a row that is *not* usable must be as
 * legible as one that is.
 *
 * @module client/src/panel.tsx
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { WhaleMark } from './whale.tsx'
import type { FloatSnapshot, VendorRow, ModelRow } from './data.ts'

/** Where the float can be snapped to. */
export type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

/** The persisted placement of the float. */
export interface Placement {
  /** The whale's left edge, in viewport px. */
  readonly x: number
  /** The whale's top edge, in viewport px. */
  readonly y: number
}

/** The localStorage key holding the placement. */
export const PLACEMENT_KEY = 'dsh-model-float:placement:v1'

/** The whale's edge length in px — the size a placement is measured against. */
export const WHALE_SIZE = 62

/** The gap kept between the whale and the viewport edge, in px. */
export const EDGE_GAP = 24

/** The polling interval for the readings, in ms. */
export const POLL_MS = 90_000

/**
 * Clamp a position so the whale always stays reachable: never fully off any
 * edge, and never beyond the viewport's far side.
 */
export function clampPlacement(placement: Placement, viewportWidth: number, viewportHeight: number): Placement {
  const maxX = Math.max(EDGE_GAP, viewportWidth - WHALE_SIZE - EDGE_GAP)
  const maxY = Math.max(EDGE_GAP, viewportHeight - WHALE_SIZE - EDGE_GAP)
  return {
    x: Math.min(maxX, Math.max(EDGE_GAP, placement.x)),
    y: Math.min(maxY, Math.max(EDGE_GAP, placement.y)),
  }
}

/** The position of one corner of the viewport. */
export function cornerPlacement(corner: Corner, viewportWidth: number, viewportHeight: number): Placement {
  const right = viewportWidth - WHALE_SIZE - EDGE_GAP
  const bottom = viewportHeight - WHALE_SIZE - EDGE_GAP
  switch (corner) {
    case 'bottom-left': return { x: EDGE_GAP, y: bottom }
    case 'top-right': return { x: right, y: EDGE_GAP }
    case 'top-left': return { x: EDGE_GAP, y: EDGE_GAP }
    default: return { x: right, y: bottom }
  }
}

/**
 * Read the persisted placement.
 *
 * A stored position is interpreted against the viewport it was stored in; on a
 * different screen size it is clamped back into view rather than discarded, so
 * the float is never lost off-screen.
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

/** Persist the placement; failures are non-fatal (private mode, quota). */
export function writePlacement(placement: Placement): void {
  try {
    window.localStorage.setItem(PLACEMENT_KEY, JSON.stringify(placement))
  } catch {
    /* placement is a convenience, not state that must persist */
  }
}

/** The props the panel needs from its host. */
export interface PanelProps {
  /** The current readings. */
  readonly snapshot: FloatSnapshot | null
  /** Whether a reading is in flight. */
  readonly loading: boolean
  /** The error of the last reading, if any. */
  readonly error: string
  /** Ask the host for a fresh reading. */
  readonly refresh: () => void
  /** The translator, already bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
}

/**
 * The floating panel.
 *
 * @param props - see {@link PanelProps}.
 */
export function ModelFloatPanel(props: PanelProps): React.ReactElement {
  const { snapshot, loading, error, refresh, t } = props
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [placement, setPlacement] = useState<Placement>(() => readPlacement(window.innerWidth, window.innerHeight))
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    moved: boolean
    offsetX: number
    offsetY: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // ── viewport ──────────────────────────────────────────────────────────────
  // The float is positioned in viewport pixels, so a resize has to re-clamp it:
  // a placement stored on a wide screen would otherwise leave the whale off
  // the bottom of a narrow one.
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

  // ── drag ──────────────────────────────────────────────────────────────────
  // The whale follows the pointer: the pointer's position minus the grab
  // offset is the whale's new top-left. A pointer that ends without moving
  // far enough is a click, not a drag — the panel must not open (and the
  // corner must not cycle) under a user who meant to look at the numbers.
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const root = rootRef.current
    if (root === null) return
    const rect = root.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    // Capture the pointer so the drag survives the pointer leaving the whale.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* capture is a nicety, not a requirement */
    }
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.offsetX
    const dy = event.clientY - drag.offsetY
    if (!drag.moved && Math.abs(dx - placement.x) > 3 && Math.abs(dy - placement.y) > 3) drag.moved = true
    if (!drag.moved) return
    setPlacement(current => clampPlacement(
      { x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY },
      window.innerWidth,
      window.innerHeight,
    ))
  }, [placement.x, placement.y])

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
      // A drag moved the whale: keep it where it was dropped.
      setPlacement(current => {
        const clamped = clampPlacement(current, window.innerWidth, window.innerHeight)
        writePlacement(clamped)
        return clamped
      })
      return
    }
    // A click toggles the card — the touch and keyboard path.
    setOpen(current => !current)
  }, [])

  // ── hover ─────────────────────────────────────────────────────────────────
  // Hover opens the card after a beat; leaving closes it. The delay keeps the
  // card from flickering while the pointer crosses the whale.
  const hoverTimer = useRef<number | undefined>(undefined)

  const openSoon = useCallback(() => {
    if (hoverTimer.current !== undefined) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setOpen(true), 220)
  }, [])

  const closeSoon = useCallback(() => {
    if (hoverTimer.current !== undefined) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setOpen(false), 260)
  }, [])

  useEffect(() => () => {
    if (hoverTimer.current !== undefined) window.clearTimeout(hoverTimer.current)
  }, [])

  // Escape closes the card, so a keyboard user is never trapped in it.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // ── corner snapping ───────────────────────────────────────────────────────
  // The "换个角落" button is the keyboard- and touch-accessible way to move
  // the float without dragging it.
  const cycleCorner = useCallback(() => {
    setPlacement(current => {
      const corners: Corner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
      const nearest = nearestCorner(current, viewport.width, viewport.height)
      const index = corners.indexOf(nearest)
      const next = cornerPlacement(corners[(index + 1) % corners.length], viewport.width, viewport.height)
      writePlacement(next)
      return next
    })
  }, [viewport.width, viewport.height])

  const lane = snapshot?.lane
  const vendors = snapshot?.vendors ?? []
  const usable = vendors.filter(row => row.state === 'on').length
  const withCredit = vendors.filter(row => row.balance !== null && row.balance > 0).length

  // The card opens *beside* the whale: on whichever side has room, and upward
  // from a whale in the lower half so it never runs off the top of the screen.
  const cardSide = placement.x > viewport.width / 2 ? 'left' : 'right'
  const cardVertical = placement.y > viewport.height / 2 ? 'up' : 'down'

  return (
    <div
      className="mf-root"
      ref={rootRef}
      style={{ left: `${placement.x}px`, top: `${placement.y}px` }}
      data-mf-side={cardSide}
      data-mf-vertical={cardVertical}
    >
      <div
        className={`mf-card-shell ${open ? 'is-open' : ''}`}
        onPointerEnter={openSoon}
        onPointerLeave={closeSoon}
      >
        <div
          className="mf-card"
          role="dialog"
          aria-label={t('card.title')}
          aria-hidden={!open}
        >
          <header className="mf-card-head">
            <div className="mf-card-head-text">
              <strong>{t('card.title')}</strong>
              <span className="mf-card-sub">
                {lane === undefined
                  ? t('card.loading')
                  : t('card.summary', {
                    usable,
                    vendors: vendors.length,
                    credit: withCredit,
                    models: lane.available,
                    total: lane.total,
                  })}
              </span>
            </div>
            <div className="mf-card-actions">
              <button
                type="button"
                className="mf-icon-btn"
                onClick={refresh}
                disabled={loading}
                title={t('card.refresh')}
                aria-label={t('card.refresh')}
              >
                {loading ? '…' : '⟳'}
              </button>
              <button
                type="button"
                className="mf-icon-btn"
                onClick={cycleCorner}
                title={t('card.move')}
                aria-label={t('card.move')}
              >
                ⇄
              </button>
            </div>
          </header>

          {error !== '' ? (
            <p className="mf-error" role="alert">{error}</p>
          ) : null}

          <div className="mf-vendor-list">
            {vendors.map(row => (
              <VendorRowView key={row.vendor.id} row={row} t={t} />
            ))}
          </div>

          <footer className="mf-card-foot">
            <button
              type="button"
              className="mf-text-btn"
              onClick={() => setExpanded(current => !current)}
              aria-expanded={expanded}
            >
              {expanded ? t('card.hideModels') : t('card.showModels')}
            </button>
            <span className="mf-foot-time">
              {snapshot === null ? '' : t('card.updated', { time: formatTime(snapshot.at) })}
            </span>
          </footer>

          {expanded ? (
            <ModelList models={snapshot?.models ?? []} t={t} />
          ) : null}
        </div>

        <button
          type="button"
          className="mf-whale-btn"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onMouseEnter={openSoon}
          onMouseLeave={closeSoon}
          onFocus={openSoon}
          onBlur={closeSoon}
          onClick={event => event.preventDefault()}
          aria-label={t('float.label')}
          aria-expanded={open}
          title={t('float.label')}
        >
          <WhaleMark size={WHALE_SIZE} />
          <span className="mf-whale-badge" aria-hidden="true">
            {usable > 0 ? usable : '—'}
          </span>
        </button>
      </div>
    </div>
  )
}

/** The corner a position is closest to. */
function nearestCorner(placement: Placement, viewportWidth: number, viewportHeight: number): Corner {
  const right = placement.x > viewportWidth / 2
  const bottom = placement.y > viewportHeight / 2
  if (right && bottom) return 'bottom-right'
  if (right) return 'top-right'
  if (bottom) return 'bottom-left'
  return 'top-left'
}

/** One vendor row of the card. */
function VendorRowView({ row, t }: { row: VendorRow, t: PanelProps['t'] }): React.ReactElement {
  const state = stateOf(row)
  const balanceText = balanceTextOf(row, t)
  return (
    <div className={`mf-vendor is-${state}`} title={row.error === '' ? undefined : row.error}>
      <span className="mf-vendor-stripe" style={{ background: row.vendor.accent }} aria-hidden="true" />
      <div className="mf-vendor-main">
        <span className="mf-vendor-name">{row.vendor.name}</span>
        <span className="mf-vendor-org">{row.vendor.org}</span>
      </div>
      <div className="mf-vendor-meta">
        <span className={`mf-vendor-state is-${state}`}>{stateLabel(state, t)}</span>
        <span className="mf-vendor-balance">{balanceText}</span>
      </div>
    </div>
  )
}

/** The per-model list, shown when the user expands the card. */
function ModelList({ models, t }: { models: readonly ModelRow[], t: PanelProps['t'] }): React.ReactElement {
  if (models.length === 0) {
    return <p className="mf-empty">{t('card.noModels')}</p>
  }
  return (
    <div className="mf-model-list">
      {models.map(model => (
        <div key={model.id} className={`mf-model is-${model.availability}`}>
          <span className="mf-model-name" title={model.id}>{model.name}</span>
          <span className="mf-model-state">{availabilityLabel(model.availability, t)}</span>
          {model.detail !== '' ? (
            <span className="mf-model-detail" title={model.detail}>{model.detail}</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/** The states a vendor row can be in, collapsed from {@link VendorRow}. */
type RowState = 'on' | 'idle' | 'closed' | 'unknown' | 'empty' | 'error'

/** Collapse a vendor row into the state the UI shows. */
function stateOf(row: VendorRow): RowState {
  if (row.state === 'closed') return 'closed'
  if (row.state === 'on' && row.balance !== null && row.balance <= 0) return 'empty'
  if (row.state === 'on') return 'on'
  if (row.state === 'idle') return 'idle'
  if (row.error !== '') return 'error'
  return 'unknown'
}

/** The label of a row state. */
function stateLabel(state: RowState, t: PanelProps['t']): string {
  switch (state) {
    case 'on': return t('vendor.on')
    case 'idle': return t('vendor.idle')
    case 'closed': return t('vendor.closed')
    case 'empty': return t('vendor.empty')
    case 'error': return t('vendor.error')
    default: return t('vendor.unknown')
  }
}

/** The label of a model's availability state. */
function availabilityLabel(availability: string, t: PanelProps['t']): string {
  switch (availability) {
    case 'available': return t('model.available')
    case 'region-blocked': return t('model.regionBlocked')
    case 'unavailable': return t('model.unavailable')
    case 'throttled': return t('model.throttled')
    default: return t('model.unknown')
  }
}

/** The balance text of a vendor row, in the vendor's own unit. */
function balanceTextOf(row: VendorRow, t: PanelProps['t']): string {
  if (row.balance === null) {
    if (row.vendor.balance && row.error !== '') return t('vendor.readFailed')
    if (!row.vendor.balance) return t('vendor.noBalance')
    return t('vendor.unknown')
  }
  const unit = row.vendor.unit
  if (unit === 'dollars') {
    return `$${row.balance.toFixed(2)}`
  }
  if (unit === 'tokens') {
    return `${formatNumber(row.balance)} tok`
  }
  if (unit === 'quota') {
    return `${formatNumber(row.balance)}`
  }
  return formatNumber(row.balance)
}

/** A compact number: thousands separated, at most two decimals. */
function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** A local clock time for the "last read" stamp. */
function formatTime(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return '—'
  try {
    return new Date(at).toLocaleTimeString()
  } catch {
    return '—'
  }
}
