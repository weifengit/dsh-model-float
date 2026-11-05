/**
 * Model Float — the card wall.
 *
 * The wall owns every pixel that renders a card. Cards are pure functions
 * that return a small fixed vocabulary; this component turns that vocabulary
 * into DOM. Because the vocabulary is tiny, the component stays small — the
 * whole wall is under three hundred lines.
 *
 * The wall ticks once a second so every "3 分钟前" on the screen agrees
 * with every other one. Each card re-reads its own payload on its own
 * schedule, and the wall keeps one timer per card rather than one for all
 * of them, so a slow endpoint does not hold up the others.
 *
 * @module client/src/features/wall/wall.tsx
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CardDefinition, Reading, Tone, WallContext, CardFailure, SessionRow } from './reading.ts'
import { CARDS } from './cards.ts'
import type { HomepageCall } from './reading.ts'
import { channelCallFrom } from '../homepage/rpc.ts'
import { createHomepageRpc } from '../homepage/rpc.ts'

/** The services the wall needs from the shell. */
export interface WallProps {
  /** The translator, bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
  /** The shell's session list hook. */
  readonly useSessions: (selector: (state: { ids: readonly string[], byId: Record<string, SessionRow> }) => unknown) => unknown
  /** The browser plugin context, for the shared RPC channel. */
  readonly ctx?: Record<string, any>
}

/** One card's current state. */
interface Slot {
  readonly data: unknown
  readonly at: number | null
  readonly failure: CardFailure | null
}

/** The initial state of one slot: no data, no failure. */
const EMPTY_SLOT: Slot = { data: null, at: null, failure: null }

/**
 * The card wall.
 *
 * @param props - see {@link WallProps}.
 */
export function Wall(props: WallProps): React.ReactElement {
  const { t, useSessions, ctx } = props
  const [now, setNow] = useState(() => Date.now())
  const [slots, setSlots] = useState<Record<string, Slot>>(() => Object.fromEntries(CARDS.map(card => [card.id, EMPTY_SLOT])))
  const [expanded, setExpanded] = useState<string | null>(null)

  // The wall ticks once a second so every relative time agrees.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // The shell's session list, read through the hook it provides.
  const sessions = useSessions(state => state) as { ids: readonly string[], byId: Record<string, SessionRow> }
  const sessionRows = useMemo<readonly SessionRow[]>(() => {
    if (sessions === null || sessions === undefined) return []
    return sessions.ids.map(id => sessions.byId[id]).filter((row): row is SessionRow => row !== undefined)
  }, [sessions])

  // The RPC channel, resolved per call so a late-offered service still works.
  const rpc = useMemo(() => createHomepageRpc(() => channelCallFrom(ctx ?? null)), [ctx])

  // The sampler, for the device card's local fallback.
  const sampler = useCallback(async () => {
    const response = await fetch('/api/model-float/metrics', { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return response.json() as Promise<{
      at: number, cpu: number | null, systemUsed: number, systemTotal: number,
      heapUsed: number, heapTotal: number, netDown: number | null, netUp: number | null
    }>
  }, [])

  // The context every card sees.
  const wallCtx = useMemo<WallContext>(() => ({
    t,
    now,
    sessions: sessionRows,
    call: rpc.call,
    sampler,
  }), [t, now, sessionRows, rpc, sampler])

  // Re-read one card's payload.
  const refresh = useCallback(async (card: CardDefinition) => {
    try {
      const data = await card.load(wallCtx)
      setSlots(previous => ({ ...previous, [card.id]: { data, at: Date.now(), failure: null } }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSlots(previous => ({ ...previous, [card.id]: { data: null, at: Date.now(), failure: { code: 'unreachable', message } } }))
    }
  }, [wallCtx])

  // Each card re-reads on its own schedule.
  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = []
    for (const card of CARDS) {
      void refresh(card)
      if (card.refreshMs > 0) {
        const timer = setInterval(() => { void refresh(card) }, card.refreshMs)
        timers.push(timer)
      }
    }
    return () => { timers.forEach(timer => clearInterval(timer)) }
  }, [refresh])

  // Escape closes the expanded card.
  useEffect(() => {
    if (expanded === null) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  return (
    <div className="mf-wall">
      {CARDS.map(card => {
        const slot = slots[card.id] ?? EMPTY_SLOT
        const reading = card.preview(slot.failure ?? slot.data, wallCtx)
        return (
          <button
            key={card.id}
            type="button"
            className={`mf-wall-card is-${reading.tone}`}
            onClick={() => card.detail !== undefined && setExpanded(card.id)}
          >
            <WallGlyph name={card.glyph} />
            <div className="mf-wall-card-title">{card.title(wallCtx)}</div>
            <div className="mf-wall-card-headline">{reading.headline ?? '—'}</div>
            {reading.caption !== undefined && <div className="mf-wall-card-caption">{reading.caption}</div>}
            {reading.figures !== undefined && reading.figures.length > 0 && (
              <div className="mf-wall-card-figures">
                {reading.figures.map((figure, index) => (
                  <div key={index} className="mf-wall-card-figure">
                    <span className="mf-wall-card-figure-label">{figure.label}</span>
                    <span className="mf-wall-card-figure-value">{figure.value}</span>
                    {figure.percent !== undefined && (
                      <span className="mf-wall-card-figure-bar">
                        <span className="mf-wall-card-figure-fill" style={{ width: `${Math.max(0, Math.min(100, figure.percent))}%` }} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {reading.note !== undefined && <div className="mf-wall-card-note">{reading.note}</div>}
          </button>
        )
      })}
      {expanded !== null && (() => {
        const card = CARDS.find(c => c.id === expanded)
        if (card === undefined || card.detail === undefined) return null
        const slot = slots[card.id] ?? EMPTY_SLOT
        const detail = card.detail(slot.failure ?? slot.data, wallCtx)
        return (
          <div className="mf-wall-detail" role="dialog" aria-modal="true" onClick={() => setExpanded(null)}>
            <div className="mf-wall-detail-inner" onClick={event => event.stopPropagation()}>
              <button type="button" className="mf-wall-detail-close" onClick={() => setExpanded(null)}>×</button>
              <div className="mf-wall-detail-title">{card.title(wallCtx)}</div>
              {detail.note !== undefined && <div className="mf-wall-detail-note">{detail.note}</div>}
              {detail.groups.map((group, index) => (
                <div key={index} className="mf-wall-detail-group">
                  <div className="mf-wall-detail-group-title">{group.title}</div>
                  {group.rows.map((row, rowIndex) => (
                    <div key={rowIndex} className={`mf-wall-detail-row${row.tone !== undefined ? ` is-${row.tone}` : ''}`}>
                      <span className="mf-wall-detail-row-label">{row.label}</span>
                      <span className="mf-wall-detail-row-value">{row.value}</span>
                    </div>
                  ))}
                </div>
              ))}
              {detail.actions !== undefined && detail.actions.length > 0 && (
                <div className="mf-wall-detail-actions">
                  {detail.actions.map(action => (
                    <button
                      key={action.id}
                      type="button"
                      className={`mf-wall-detail-action${action.confirm ? ' is-confirm' : ''}`}
                      onClick={async () => {
                        if (action.confirm && !window.confirm(action.label)) return
                        try {
                          const answer = await rpc.call(action.method, action.args)
                          if (answer.ok && action.report !== undefined) {
                            const message = action.report(answer.value)
                            if (message !== '') window.alert(message)
                          }
                          void refresh(card)
                        } catch (error) {
                          window.alert(error instanceof Error ? error.message : String(error))
                        }
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/** A line-art glyph for the card's corner. */
function WallGlyph({ name }: { name: string }): React.ReactElement {
  const paths: Record<string, React.ReactElement> = {
    sessions: <path d="M3 6h18M3 12h18M3 18h12" />,
    device: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7v10M12 7v10M17 7v10" /></>,
    token: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10h6M9 14h6" /></>,
    network: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M8 7l4 9M16 7l-4 9" /></>,
    core: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 4v16" /></>,
    storage: <><path d="M3 7c0-1.5 4-3 9-3s9 1.5 9 3v10c0 1.5-4 3-9 3s-9-1.5-9-3z" /><path d="M3 12c0 1.5 4 3 9 3s9-1.5 9-3" /></>,
    projects: <><path d="M3 7h6l2 2h10v10H3z" /></>,
    tools: <><path d="M14.7 6.3a4 4 0 0 1 0 5.4L10 16.4l-3-3 4.7-4.7a4 4 0 0 1 3-2.4z" /><path d="M5 19l4-4" /></>,
    skills: <><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" /></>,
    groups: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    audit: <><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  }
  return (
    <svg className="mf-wall-glyph" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] ?? paths.device}
    </svg>
  )
}
