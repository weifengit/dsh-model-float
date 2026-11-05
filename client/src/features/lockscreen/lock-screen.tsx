/**
 * Model Float — the lock screen.
 *
 * A full-viewport overlay that stands in for the machine's screen lock. It
 * shows the time and a wall of cards that read from the homepage channel.
 *
 * @module client/src/features/lockscreen/lock-screen.tsx
 */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Wall } from '../wall/wall.tsx'

/** The session list, as the shell's selector hook delivers it. */
export interface SessionListState {
  /** Every session id, in Host list order. */
  readonly ids: readonly string[]
  /** The row for each session id. */
  readonly byId: Readonly<Record<string, { id: string, displayTitle: string, running: boolean }>>
}

/** The props the lock screen needs. */
export interface LockScreenProps {
  /** Whether the lock screen is showing. */
  readonly open: boolean
  /** Close the lock screen. */
  readonly onClose: () => void
  /**
   * The shell's session list hook.
   *
   * It arrives as a slot prop rather than an import: the harness hands every
   * slot occupant the same standard props, and a plugin that imported the
   * hook instead would be reading a *different* module instance's copy.
   */
  readonly useSessions: (selector: (state: SessionListState) => unknown) => unknown
  /** The translator, bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
  /** The browser plugin context, for the shared RPC channel. */
  readonly ctx?: Record<string, any>
}

/**
 * The lock screen.
 *
 * @param props - see {@link LockScreenProps}.
 */
export function LockScreen(props: LockScreenProps): React.ReactElement | null {
  const { open, onClose, t, ctx } = props
  const [now, setNow] = useState(() => new Date())

  // The clock ticks on its own.
  useEffect(() => {
    if (!open) return undefined
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [open])

  // Escape leaves the lock screen — a user must never be trapped by it.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  // Portalled onto the document body, not left inside the float.
  return createPortal(
    <div className="mf-lock" role="dialog" aria-modal="true" aria-label={t('lock.title')} onClick={onClose}>
      <div className="mf-lock-inner" onClick={event => event.stopPropagation()}>
        <button type="button" className="mf-lock-close" onClick={onClose} aria-label={t('lock.close')}>
          ×
        </button>
        <Clock now={now} />
        <Wall t={t} useSessions={props.useSessions as never} ctx={ctx} />
      </div>
    </div>,
    document.body,
  )
}

/** The clock. */
function Clock({ now }: { now: Date }): React.ReactElement {
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  return (
    <div className="mf-lock-clock">
      <div className="mf-lock-time">{time}</div>
      <div className="mf-lock-date">{date}</div>
    </div>
  )
}
