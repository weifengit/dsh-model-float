/**
 * Model Float — the card reading model.
 *
 * The wall shows eleven machines' facts, but it must show them in one
 * typography: a lock screen is read at a glance, and eleven bespoke card
 * layouts would be eleven chances to get the spacing wrong. So a card is not
 * a component. It is three **pure functions** — load, preview, detail — over
 * a small fixed vocabulary, and the wall owns every pixel that renders it.
 *
 * The vocabulary is deliberately tiny: a tone, one headline figure, a short
 * caption, up to four labelled figures, and an optional reason for emptiness.
 * What a card cannot say in that form belongs in its expanded detail, which
 * is the same vocabulary one level deeper: blocks of figures, plus the
 * actions the endpoint offers.
 *
 * Because cards are pure and their payloads are fixtures,
 * `scripts/check.mjs` can assert the sentences they produce with no browser
 * and no DOM.
 *
 * @module client/src/features/wall/reading.ts
 */

import type { HomepageAnswer } from '../homepage/rpc.ts'

/** How a card should colour its status light. */
export type Tone = 'ok' | 'warn' | 'bad' | 'idle'

/** Why a card has no payload. */
export type FailureCode = 'absent' | 'refused' | 'unreachable' | 'transport'

/** A call that produced nothing, with the reason still attached. */
export interface CardFailure {
  readonly code: FailureCode
  readonly message: string
}

/** One labelled value; `percent` draws the thin bar under it. */
export interface Figure {
  readonly label: string
  readonly value: string
  /** 0..100, clamped by the renderer. */
  readonly percent?: number
  /** A tone of its own, for a figure that disagrees with the card. */
  readonly tone?: Tone
}

/** What a card shows in the wall. */
export interface Reading {
  readonly tone: Tone
  /** The one fact: "3 个在跑", "78%", "v0.2.0". */
  readonly headline?: string
  /** The line under it: what the headline counts, in one breath. */
  readonly caption?: string
  /** At most four; anything longer belongs in the detail. */
  readonly figures?: readonly Figure[]
  /** Why there is nothing to show, in the user's language. */
  readonly note?: string
}

/** One block of the expanded detail page. */
export interface DetailGroup {
  readonly title: string
  readonly rows: readonly Figure[]
}

/** A button the expanded page offers. */
export interface DetailAction {
  readonly id: string
  readonly label: string
  /** The `homepage/*` method to call, without the namespace. */
  readonly method: string
  /** Its declared argument map, sent as-is. */
  readonly args?: Record<string, unknown>
  /** Ask for a second click first: the action changes the machine. */
  readonly confirm?: boolean
  /** Whether the action may run for this payload at all. */
  readonly enabled?: boolean
  /** The endpoint's answer as one line of text. */
  readonly report?: (value: unknown) => string
}

/** The expanded page: blocks, an optional note, optional actions. */
export interface Detail {
  readonly groups: readonly DetailGroup[]
  readonly note?: string
  readonly actions?: readonly DetailAction[]
}

/** The wall's live session rows, taken from the shell rather than an endpoint. */
export interface SessionRow {
  readonly id: string
  readonly title: string
  readonly running: boolean
}

/** The Host's own sampler, kept here so a fallback does not reach into a card's module. */
export interface SamplerReading {
  readonly at: number
  readonly cpu: number | null
  readonly systemUsed: number
  readonly systemTotal: number
  readonly heapUsed: number
  readonly heapTotal: number
  readonly netDown: number | null
  readonly netUp: number | null
}

/** The verb every card uses to reach the other plugin's endpoints. */
export type HomepageCall = <T = unknown>(method: string, args?: Record<string, unknown>) => Promise<HomepageAnswer<T>>

/** Everything a card may look at besides its own payload. */
export interface WallContext {
  /** The translator, bound to this plugin's namespace. */
  readonly t: (key: string, vars?: Record<string, string | number>) => string
  /** The clock the wall ticks on, so "3 分钟前" is stable within one frame. */
  readonly now: number
  /** The live session rows, for the card that reads the shell directly. */
  readonly sessions: readonly SessionRow[]
  /** Reach `homepage/*`. Resolved per call; may report the channel absent. */
  readonly call: HomepageCall
  /** This plugin's own sampler, for the one card that has a local fallback. */
  readonly sampler: (() => Promise<SamplerReading>) | null
}

/** One card in the wall. */
export interface CardDefinition<T = unknown> {
  /** Stable identity; the key the user's arrangement is stored under. */
  readonly id: string
  /** The caption above the card. */
  readonly title: (ctx: WallContext) => string
  /** The glyph drawn in the card's corner. */
  readonly glyph: WallGlyph
  /** The grid footprint asked for before the user overrides it. */
  readonly span: readonly [number, number]
  /** How often the wall re-reads it while the lock screen is open. */
  readonly refreshMs: number
  /** Where the payload comes from. */
  readonly load: (ctx: WallContext) => Promise<T | CardFailure>
  /** The card's glance. */
  readonly preview: (data: T | CardFailure, ctx: WallContext) => Reading
  /** The card's expanded page; omit it when there is nothing more to say. */
  readonly detail?: (data: T | CardFailure, ctx: WallContext) => Detail
}

/** The glyphs the wall knows how to draw. */
export type WallGlyph =
  | 'sessions' | 'device' | 'token' | 'network' | 'core' | 'storage'
  | 'projects' | 'tools' | 'skills' | 'groups' | 'audit'

/** Call one endpoint and keep either its payload or its reason. */
export async function through<T>(call: HomepageCall, method: string, args?: Record<string, unknown>): Promise<T | CardFailure> {
  const answer = await call<T>(method, args)
  if (answer.ok) return answer.value
  return { code: answer.code === 'transport' ? 'transport' : answer.code, message: answer.message }
}

/** A card's answer when the plugin behind the channel is not installed. */
export function absentCard(ctx: WallContext): Reading {
  return { tone: 'idle', caption: ctx.t('wall.needHomepage') }
}

/** A card's answer when the endpoint answered with a reason. */
export function failedCard(data: CardFailure, ctx: WallContext): Reading {
  if (data.code === 'absent' || data.code === 'transport') return absentCard(ctx)
  return { tone: 'bad', caption: ctx.t('wall.cardFailed'), note: data.message }
}

/** Read one optional nested field out of an untrusted payload. */
export function pick<T>(value: unknown, ...path: readonly string[]): T | undefined {
  let node: unknown = value
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node as T | undefined
}

/** Read a list out of an untrusted payload; anything else is empty. */
export function list<T = Record<string, unknown>>(value: unknown, ...path: readonly string[]): readonly T[] {
  const node = pick<unknown>(value, ...path)
  return Array.isArray(node) ? node as T[] : []
}

/** Whether a payload is a failure rather than a reading. */
export function isFailure(value: unknown): value is CardFailure {
  if (typeof value !== 'object' || value === null) return false
  const code = (value as Record<string, unknown>).code
  return typeof code === 'string' && ['absent', 'refused', 'unreachable', 'transport'].includes(code)
}

/** A usage fraction (0..1) turned into the tone a status light uses. */
export function loadTone(...fractions: readonly (number | null | undefined)[]): Tone {
  const worst = fractions.reduce((sum, value) => Math.max(sum, typeof value === 'number' && Number.isFinite(value) ? value : 0), 0)
  if (worst >= 0.9) return 'bad'
  if (worst >= 0.75) return 'warn'
  return 'ok'
}
