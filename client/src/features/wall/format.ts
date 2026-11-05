/**
 * Model Float — the wall's typography helpers.
 *
 * Every card speaks the same five shapes: a byte count, a fraction, an
 * amount of money, a duration and a relative time. The endpoints disagree
 * about units — the channel reports fractions as 0..1 and bytes as plain
 * integers, money as both a string and an integer of millionths — so the
 * conversion happens once, here, and a card never formats a raw number.
 *
 * @module client/src/features/wall/format.ts
 */

/** A byte count, in the largest unit that still shows two useful digits. */
export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (value < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let node = value
  let index = 0
  while (node >= 1024 && index < units.length - 1) {
    node /= 1024
    index += 1
  }
  const digits = index === 0 ? 0 : node >= 100 ? 0 : node >= 10 ? 1 : 2
  return `${node.toFixed(digits)} ${units[index]}`
}

/** A fraction reported as 0..1, as a whole-percentage string. */
export function formatFraction(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

/** The same fraction as a bar can draw it: 0..100. */
export function fractionToPercent(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(100, Math.round(value * 100)))
}

/**
 * One money value from the ledger.
 *
 * The channel gives the same amount twice: a rounded string for reading and
 * an integer count of millionths for maths. This takes the string when it is
 * there and falls back to the units, so a card never shows `NaN`.
 *
 * @param text - the amount as the ledger wrote it.
 * @param units - the same amount in millionths.
 * @param currency - the currency code, when the ledger knows it.
 * @returns the amount, with its currency when there is one.
 */
export function formatMoney(text: string | null | undefined, units?: number | null, currency?: string | null): string {
  const asNumber = Number.parseFloat(text ?? '')
  if (Number.isFinite(asNumber)) return withCurrency(roundMoney(asNumber), currency)
  if (typeof units === 'number' && Number.isFinite(units)) return withCurrency(roundMoney(units / 1_000_000), currency)
  return '—'
}

/** Two decimals under 100, one under 10 000, none above: the money ladder. */
function roundMoney(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 10_000) return Math.round(value).toLocaleString('en-US')
  if (absolute >= 100) return value.toFixed(1)
  return value.toFixed(2)
}

/** Put the currency in front of an amount, or leave it off when unknown. */
function withCurrency(value: string, currency: string | null | undefined): string {
  if (currency === null || currency === undefined || currency === '') return value
  return `${currency} ${value}`
}

/** A duration in milliseconds, shortened to the two units that matter. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`
  const minutes = seconds / 60
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`
  const hours = minutes / 60
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`
  return `${(hours / 24).toFixed(1)} d`
}

/**
 * How long ago, in the shortest honest phrase.
 *
 * @param at - the moment, in epoch ms.
 * @param now - the wall's current tick, so one frame never disagrees with itself.
 * @returns "刚刚", "3 分钟前", "昨天" or the date.
 */
export function formatAgo(at: number | null | undefined, now: number): string {
  if (at === null || at === undefined || !Number.isFinite(at)) return '—'
  const delta = Math.max(0, now - at)
  if (delta < 45_000) return '刚刚'
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)} 分钟前`
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)} 小时前`
  if (delta < 7 * 86_400_000) return `${Math.round(delta / 86_400_000)} 天前`
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** A clock time from epoch ms, for the wall's "更新于" line. */
export function formatClock(at: number | null | undefined): string {
  if (at === null || at === undefined || !Number.isFinite(at)) return '—'
  return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** A rate: bytes per second, or a count per second when the unit is given. */
export function formatRate(value: number | null | undefined, per = '/s'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (value < 1) return `${value.toFixed(2)}${per}`
  return `${Math.round(value).toLocaleString('en-US')}${per}`
}

/** A whole count with thousands separators, and a dash for nothing. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return Math.round(value).toLocaleString('en-US')
}

/** A date string the endpoint already formatted, shortened to what fits a row. */
export function formatDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** An abbreviation of a filesystem path, home as "~". */
export function shortenPath(value: string | null | undefined, home: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof home === 'string' && home !== '' && value.startsWith(home)) return `~${value.slice(home.length)}`
  return value
}
