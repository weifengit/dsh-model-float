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
import { isUnusable } from './data.ts'
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

/**
 * The mark's native aspect, from its own viewBox (23.16 : 17.04).
 */
export const WHALE_ASPECT = 17.04 / 23.16

/**
 * The float's edge in px — the same 54 px as the reference music ball.
 *
 * A square seat, with the wide mark filling it horizontally and centred
 * vertically. Matching the reference's seat (rather than the mark's own
 * aspect) keeps the float the same visual size as the ball next to it and
 * keeps a stable drag hitbox whatever the artwork's shape.
 */
export const WHALE_SIZE = 54

/**
 * The mark's rendered width in px — the seat's full width, so the whale itself
 * is the same 54 px across as the reference ball.
 */
export const WHALE_WIDTH = WHALE_SIZE

/** The gap kept between the float and the viewport edge, in px. */
export const EDGE_GAP = 8

/** The margin the float starts with, inside the viewport corner. */
export const HOME_MARGIN = 22

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
  // The reference ball's own first-run position: 22 px in from the corner,
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
  /** Whether the master switch is on. */
  readonly switchOn: boolean
  /** The vendor ids the switch hid — they are not in the list while it is on. */
  readonly hiddenVendors: readonly string[]
  /** Whether the switch is mid-flight. */
  readonly switchPending: boolean
  /** Turn the master switch on or off. */
  readonly setSwitch: (on: boolean) => Promise<void>
  /** The translator, already bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
}

/**
 * The floating panel.
 *
 * @param props - see {@link PanelProps}.
 */
export function ModelFloatPanel(props: PanelProps): React.ReactElement {
  const { snapshot, loading, error, refresh, switchOn, hiddenVendors, switchPending, setSwitch, t } = props
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [placement, setPlacement] = useState<Placement>(() => readPlacement(window.innerWidth, window.innerHeight))
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  /** The error of the last switch action, shown on the card. */
  const [actionError, setActionError] = useState('')
  const dragRef = useRef<{
    pointerId: number
    moved: boolean
    /** Where the pointer went down, in viewport px. */
    startX: number
    startY: number
    /** Where the float sat when the drag started, in viewport px. */
    originX: number
    originY: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  /** The card element, so focus moving inside it can be told apart from focus leaving. */
  const cardRef = useRef<HTMLDivElement | null>(null)

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
      // Anchored to where the drag *started*, not to the live placement: the
      // placement is React state and lags a frame behind the pointer, so
      // deriving the offset from it makes a slow drag jitter and a one-axis
      // drag look like it never started.
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
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
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    // Either axis passing the threshold is a drag. Requiring both would make a
    // purely horizontal or purely vertical drag read as a click — the whale
    // could never be pushed straight into a side or the top/bottom edge.
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
  // Two hoverable pieces, one timer. Both the whale and the card must call
  // `openSoon` on enter — not just the whale — because crossing the 10 px gap
  // between them fires a `pointerleave` on the whale, and without a matching
  // enter on the card that leave's close timer is never cancelled. That is
  // what used to shut the card down while the pointer was on its way to (or
  // resting on) the switch.
  const hoverTimer = useRef<number | undefined>(undefined)

  const openSoon = useCallback(() => {
    if (hoverTimer.current !== undefined) window.clearTimeout(hoverTimer.current)
    // Short enough to feel immediate, long enough that merely passing over the
    // whale does not pop the card open.
    hoverTimer.current = window.setTimeout(() => setOpen(true), 140)
  }, [])

  const closeSoon = useCallback(() => {
    if (hoverTimer.current !== undefined) window.clearTimeout(hoverTimer.current)
    // Forgiving on purpose: the pointer may cross the gap to the card slowly,
    // and the card's own enter cancels this anyway.
    hoverTimer.current = window.setTimeout(() => setOpen(false), 320)
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
  // ── the master switch ─────────────────────────────────────────────────────
  // One switch hides every unusable vendor's models, and turns them back. The
  // write lands in the Channel Pack's model blacklist, which the model picker
  // reads on every listing — so the change lands in the composer without a
  // reload (the pack broadcasts `llm/adapters-updated` after the write).
  const onToggleSwitch = useCallback(async () => {
    setActionError('')
    try {
      await setSwitch(!switchOn)
      refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }, [setSwitch, switchOn, refresh])

  const lane = snapshot?.lane
  const vendors = snapshot?.vendors ?? []
  const usable = vendors.filter(row => row.state === 'on').length
  const withCredit = vendors.filter(row => row.balance !== null && row.balance > 0).length
  // How many models are still cluttering the picker across every vendor.
  const visibleModels = vendors.reduce((sum, row) => sum + row.visibleModelCount, 0)
  // The vendors whose models are in the picker but cannot answer a turn.
  //
  // While the switch is on, the ones it hid are no longer in the picker, so
  // they are not counted here — the count answers "how many are still listed
  // but useless", which is what the user can still act on.
  const unusable = vendors.filter(isUnusable)
  const unusableModels = unusable.reduce((sum, row) => sum + row.visibleModelCount, 0)
  // With the switch on, the vendors it hid are gone from the list — the list
  // only shows what can still answer a turn.
  //
  // The set is the switch's *record*, not a fresh verdict: once the switch has
  // hidden a vendor's models, that vendor reads as "closed" (the pack derives
  // it from the blacklist) and a fresh verdict would call it usable again.
  // The record is what the switch actually did, and it is what "off" restores.
  const listed = switchOn
    ? vendors.filter(row => !hiddenVendors.includes(row.vendor.id))
    : vendors
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
      <div className={`mf-card-shell ${open ? 'is-open' : ''}`}>
        <div
          className="mf-card"
          ref={cardRef}
          role="dialog"
          aria-label={t('card.title')}
          aria-hidden={!open}
          onPointerEnter={openSoon}
          onPointerLeave={closeSoon}
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
              {visibleModels > 0 ? (
                <span className="mf-card-sub">
                  {t('card.pickerModels', { count: visibleModels })}
                </span>
              ) : null}
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
                role="switch"
                aria-checked={switchOn}
                className={`mf-switch ${switchOn ? 'is-on' : ''}`}
                disabled={switchPending}
                onClick={() => { void onToggleSwitch() }}
                title={switchOn
                  ? t('switch.off')
                  : t('switch.on', { count: unusableModels })}
                aria-label={switchOn ? t('switch.off') : t('switch.on', { count: unusableModels })}
              >
                <span className="mf-switch-knob" aria-hidden="true" />
                <span className="mf-switch-text">{switchOn ? t('switch.onShort') : t('switch.offShort')}</span>
              </button>
            </div>
          </header>

          {error !== '' ? (
            <p className="mf-error" role="alert">{error}</p>
          ) : null}

          {actionError !== '' ? (
            <p className="mf-error" role="alert">{actionError}</p>
          ) : null}

          {switchOn && unusable.length > 0 ? (
            <p className="mf-note">
              {t('switch.hidden', { count: unusable.length, models: unusableModels })}
            </p>
          ) : null}

          <div className="mf-vendor-list">
            {listed.map(row => (
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
          onPointerEnter={openSoon}
          onPointerLeave={closeSoon}
          onFocus={openSoon}
          onBlur={event => {
            // Focus moving into the card — onto the switch, say — is still
            // inside the float, so it must not close it.
            const next = event.relatedTarget
            if (next instanceof Node && cardRef.current?.contains(next) === true) return
            closeSoon()
          }}
          onClick={event => event.preventDefault()}
          aria-label={t('float.label')}
          aria-expanded={open}
          title={t('float.label')}
        >
          <WhaleMark size={WHALE_WIDTH} />
        </button>
      </div>
    </div>
  )
}

/** One vendor row of the card. */
function VendorRowView({ row, t }: { row: VendorRow, t: PanelProps['t'] }): React.ReactElement {
  const state = stateOf(row)
  const balanceText = balanceTextOf(row, t)
  // A vendor whose models are all hidden is one the picker no longer lists.
  const allHidden = row.modelCount > 0 && row.visibleModelCount === 0
  const hasModels = row.modelCount > 0
  return (
    <div className={`mf-vendor is-${state} ${allHidden ? 'is-hidden-models' : ''}`} title={row.error === '' ? undefined : row.error}>
      <span className="mf-vendor-stripe" style={{ background: row.vendor.accent }} aria-hidden="true" />
      <div className="mf-vendor-main">
        <span className="mf-vendor-name">{row.vendor.name}</span>
        <span className="mf-vendor-org">
          {row.vendor.org}
          {hasModels ? (
            <span className="mf-vendor-models">
              {allHidden
                ? t('vendor.modelsHidden', { count: row.modelCount })
                : t('vendor.modelsVisible', { visible: row.visibleModelCount, total: row.modelCount })}
            </span>
          ) : null}
        </span>
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
type RowState = 'on' | 'idle' | 'closed' | 'hidden' | 'unknown' | 'empty' | 'error'

/** Collapse a vendor row into the state the UI shows. */
function stateOf(row: VendorRow): RowState {
  if (row.state === 'hidden') return 'hidden'
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
    case 'hidden': return t('vendor.hidden')
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
