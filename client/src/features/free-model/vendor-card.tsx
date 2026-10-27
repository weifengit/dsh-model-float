/**
 * Model Float — the vendor card.
 *
 * The card that lists every free-model vendor with its state and its
 * remaining credit. It is the content of the 白嫖模型 action, and nothing
 * else: the float owns the placement, the ring owns the actions, and this
 * module owns the table.
 *
 * Each row carries the vendor's own accent colour, its connection state, and
 * its remaining balance in the vendor's own unit. Vendors that are switched
 * off, not logged in, or out of credit are all visible — the point of the card
 * is to answer "which vendors are usable right now" at a glance, so a row that
 * is *not* usable must be as legible as one that is.
 *
 * @module client/src/features/free-model/vendor-card.tsx
 */

import React, { useEffect, useRef, useState } from 'react'
import { isUnusable } from './data.ts'
import type { VendorRow, ModelRow } from './data.ts'
import type { FreeModelState } from './use-free-model.ts'

/** The props the vendor card needs. */
export interface VendorCardProps {
  /** Whether the card is showing. */
  readonly open: boolean
  /** Which side of the whale the card opens on. */
  readonly side: 'left' | 'right'
  /** Whether the card opens up from the whale or down. */
  readonly vertical: 'up' | 'down'
  /** The free-model feature's state. */
  readonly freeModel: FreeModelState
  /** The pointer entered the card. */
  readonly onOpen: () => void
  /** The pointer left the card. */
  readonly onClose: () => void
  /** The translator, bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
}


/**
 * The floating panel.
 *
 * @param props - see {@link PanelProps}.
 */
/**
 * The vendor card.
 *
 * @param props - see {@link VendorCardProps}.
 */
export function VendorCard(props: VendorCardProps): React.ReactElement {
  const { open, side, vertical, freeModel, onOpen, onClose, t } = props
  const { snapshot, loading, error, refresh, switchOn, hiddenVendors, switchPending, setSwitch } = freeModel
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const lane = snapshot?.lane
  const vendors = snapshot?.vendors ?? []
  const usable = vendors.filter(row => row.state === 'on').length
  const withCredit = vendors.filter(row => row.balance !== null && row.balance > 0).length
  // How many models are still cluttering the picker across every vendor.
  const visibleModels = vendors.reduce((sum, row) => sum + row.visibleModelCount, 0)
  // The vendors whose models are in the picker but cannot answer a turn.
  const unusable = vendors.filter(isUnusable)
  const unusableModels = unusable.reduce((sum, row) => sum + row.visibleModelCount, 0)
  // With the switch on, those vendors are gone from the list — the list only
  // shows what can still answer a turn.
  const listed = switchOn
    ? vendors.filter(row => !hiddenVendors.includes(row.vendor.id))
    : vendors

  // Escape closes the card, so a keyboard user is never trapped in it.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <div
      className={`mf-card-shell ${open ? 'is-open' : ''}`}
      data-mf-side={side}
      data-mf-vertical={vertical}
    >
      <div
        className="mf-card"
        ref={cardRef}
        role="dialog"
        aria-label={t('card.title')}
        aria-hidden={!open}
        onPointerEnter={onOpen}
        onPointerLeave={onClose}
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
              onClick={() => { void setSwitch(!switchOn) }}
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
    </div>
  )
}

/** One vendor row of the card. */
function VendorRowView({ row, t }: { row: VendorRow, t: VendorCardProps['t'] }): React.ReactElement {
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
function ModelList({ models, t }: { models: readonly ModelRow[], t: VendorCardProps['t'] }): React.ReactElement {
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
function stateLabel(state: RowState, t: VendorCardProps['t']): string {
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
function availabilityLabel(availability: string, t: VendorCardProps['t']): string {
  switch (availability) {
    case 'available': return t('model.available')
    case 'region-blocked': return t('model.regionBlocked')
    case 'unavailable': return t('model.unavailable')
    case 'throttled': return t('model.throttled')
    default: return t('model.unknown')
  }
}

/** The balance text of a vendor row, in the vendor's own unit. */
function balanceTextOf(row: VendorRow, t: VendorCardProps['t']): string {
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
