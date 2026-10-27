/**
 * Model Float — the lock screen.
 *
 * A full-viewport overlay that stands in for the machine's screen lock: it
 * covers the page, and it shows what the user would want to know at a glance
 * — the time, the weather, the system's live load, and the conversations that
 * are still running.
 *
 * It is deliberately *not* the OS's screen lock. A web page cannot lock a
 * machine; what it can do is get in the way, which is the useful half of the
 * idea (and the half that works on every platform).
 *
 * @module client/src/features/lockscreen/lock-screen.tsx
 */

import React, { useEffect, useMemo, useState } from 'react'
import { readMetrics } from '../system/metrics-client.ts'
import type { Metrics } from '../system/metrics-client.ts'
import { useWeather } from './weather.ts'
import type { Weather } from './weather.ts'

/** One row of the session list. */
export interface SessionSummary {
  /** The session's identity. */
  readonly id: string
  /** The session's human-facing name. */
  readonly displayTitle: string
  /** Whether the session is running a turn right now. */
  readonly running: boolean
}

/** The session list, as the shell's selector hook delivers it. */
export interface SessionListState {
  /** Every session id, in Host list order. */
  readonly ids: readonly string[]
  /** The row for each session id. */
  readonly byId: Readonly<Record<string, SessionSummary>>
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
}

/**
 * The lock screen.
 *
 * @param props - see {@link LockScreenProps}.
 */
export function LockScreen(props: LockScreenProps): React.ReactElement | null {
  const { open, onClose, t } = props
  const [now, setNow] = useState(() => new Date())
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [metricsError, setMetricsError] = useState('')
  const weather = useWeather(open)

  // The clock ticks on its own; the metrics are polled.
  useEffect(() => {
    if (!open) return undefined
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    const poll = async () => {
      try {
        const reading = await readMetrics()
        if (!alive) return
        setMetrics(reading)
        setMetricsError('')
      } catch (error) {
        if (!alive) return
        setMetricsError(error instanceof Error ? error.message : String(error))
      }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, 2000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
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

  return (
    <div className="mf-lock" role="dialog" aria-modal="true" aria-label={t('lock.title')}>
      <button type="button" className="mf-lock-close" onClick={onClose} aria-label={t('lock.close')}>
        ×
      </button>
      <Clock now={now} t={t} />
      <WeatherRow weather={weather} t={t} />
      <MetricsRow metrics={metrics} error={metricsError} t={t} />
      <ActiveSessions t={t} useSessions={props.useSessions} />
    </div>
  )
}

/** The clock and the date. */
function Clock({ now, t }: { now: Date, t: LockScreenProps['t'] }): React.ReactElement {
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  return (
    <div className="mf-lock-clock">
      <div className="mf-lock-time">{time}</div>
      <div className="mf-lock-date">{date}</div>
    </div>
  )
}

/** The weather, or the reason it is not there. */
function WeatherRow({ weather, t }: { weather: { state: 'loading' | 'ready' | 'failed', value?: Weather, error?: string }, t: LockScreenProps['t'] }): React.ReactElement {
  if (weather.state === 'loading') {
    return <div className="mf-lock-weather mf-lock-muted">{t('lock.weatherLoading')}</div>
  }
  if (weather.state === 'failed' || weather.value === undefined) {
    return <div className="mf-lock-weather mf-lock-muted" title={weather.error ?? ''}>{t('lock.weatherUnavailable')}</div>
  }
  const value = weather.value
  return (
    <div className="mf-lock-weather">
      <span className="mf-lock-weather-icon" aria-hidden="true">{value.icon}</span>
      <span className="mf-lock-weather-temp">{Math.round(value.temperature)}°</span>
      <span className="mf-lock-weather-desc">{value.description}</span>
      <span className="mf-lock-weather-place">{value.place}</span>
    </div>
  )
}

/** The system's live load. */
function MetricsRow({ metrics, error, t }: { metrics: Metrics | null, error: string, t: LockScreenProps['t'] }): React.ReactElement {
  if (metrics === null) {
    return <div className="mf-lock-metrics mf-lock-muted">{error === '' ? t('lock.metricsLoading') : error}</div>
  }
  const cpu = metrics.cpu === null ? null : Math.round(metrics.cpu * 100)
  const heap = metrics.heapUsed / 1024 / 1024
  const system = metrics.systemUsed / 1024 / 1024 / 1024
  return (
    <div className="mf-lock-metrics">
      <div className="mf-lock-metric">
        <span className="mf-lock-metric-label">{t('lock.cpu')}</span>
        <span className="mf-lock-metric-value">{cpu === null ? '—' : `${cpu}%`}</span>
        <Meter value={cpu === null ? 0 : cpu} />
      </div>
      <div className="mf-lock-metric">
        <span className="mf-lock-metric-label">{t('lock.memory')}</span>
        <span className="mf-lock-metric-value">{system.toFixed(1)} G</span>
        <Meter value={Math.min(100, (metrics.systemUsed / metrics.systemTotal) * 100)} />
      </div>
      <div className="mf-lock-metric">
        <span className="mf-lock-metric-label">{t('lock.heap')}</span>
        <span className="mf-lock-metric-value">{heap.toFixed(0)} M</span>
        <Meter value={Math.min(100, (metrics.heapUsed / Math.max(1, metrics.heapTotal)) * 100)} />
      </div>
      <div className="mf-lock-metric">
        <span className="mf-lock-metric-label">{t('lock.net')}</span>
        <span className="mf-lock-metric-value">
          {metrics.netDown === null ? '—' : `↓ ${formatRate(metrics.netDown)}`}
          {' '}
          {metrics.netUp === null ? '' : `↑ ${formatRate(metrics.netUp)}`}
        </span>
      </div>
    </div>
  )
}

/** A thin usage bar. */
function Meter({ value }: { value: number }): React.ReactElement {
  return (
    <span className="mf-lock-meter" aria-hidden="true">
      <span className="mf-lock-meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  )
}

/** The conversations that are still running. */
function ActiveSessions({ t, useSessions }: { t: LockScreenProps['t'], useSessions: LockScreenProps['useSessions'] }): React.ReactElement {
  const sessions = useSessions((state: SessionListState) => state) as SessionListState
  const running = useMemo(() => {
    const list = sessions.ids
      .map((id: string) => sessions.byId[id])
      .filter((row): row is SessionSummary => row !== undefined && row.running === true)
    return list.slice(0, 6)
  }, [sessions.ids, sessions.byId])

  if (running.length === 0) {
    return <div className="mf-lock-sessions mf-lock-muted">{t('lock.noActiveSessions')}</div>
  }
  return (
    <div className="mf-lock-sessions">
      <div className="mf-lock-sessions-title">{t('lock.activeSessions')}</div>
      <ul>
        {running.map(row => (
          <li key={row.id}>
            <span className="mf-lock-session-dot" aria-hidden="true" />
            <span className="mf-lock-session-title">{row.displayTitle}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A network rate, in a readable unit.
 *
 * @param bytesPerSecond - the rate.
 * @returns the formatted rate.
 */
export function formatRate(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
}
