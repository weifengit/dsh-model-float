/**
 * Model Float — the sessions card.
 *
 * The one card that does not need the channel: the shell already hands the
 * float its live session list, and that is the freshest answer to "is
 * anything still running?" — fresher than any endpoint could be, because it
 * is the same snapshot the sidebar is drawing.
 *
 * `homepage/collect` with `runtime` is read alongside it for the numbers the
 * page cannot see — the total session count and how many belong to root
 * agents — and when the channel is absent those figures are simply left off.
 *
 * @module client/src/features/wall/cards/sessions.ts
 */

import { failedCard, isFailure, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

/** What the channel adds on top of the shell's own list. */
export interface SessionReading {
  readonly running: number
  readonly titles: readonly { id: string, title: string, running: boolean }[]
  readonly total: number | null
  readonly agents: number | null
  readonly roots: number | null
}

/** Fold the shell's rows and one collector entry into the card's shape. */
export function fold(sessions: readonly WallContext['sessions'][number][], runtime: unknown): SessionReading {
  return {
    running: sessions.filter(row => row.running).length,
    titles: sessions.map(row => ({ id: row.id, title: row.title, running: row.running })),
    total: pick<number>(runtime, 'sessions', 'total') ?? null,
    agents: pick<number>(runtime, 'agents', 'total') ?? null,
    roots: pick<number>(runtime, 'agents', 'roots') ?? null,
  }
}

/** Read the card. The live half is always there; the counted half may not be. */
export async function load(ctx: WallContext): Promise<SessionReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'collect', { options: { names: ['runtime'] } })
  const runtime = isFailure(answer) ? null : answer
  return fold(ctx.sessions, runtime)
}

/** What the card says at a glance. */
export function preview(data: SessionReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const figures = [
    ...(data.total === null ? [] : [{ label: ctx.t('wall.sessionsTotal'), value: String(data.total) }]),
    ...(data.agents === null ? [] : [{ label: ctx.t('wall.sessionsAgents'), value: String(data.agents) }]),
    ...(data.roots === null ? [] : [{ label: ctx.t('wall.sessionsRoots'), value: String(data.roots) }]),
  ]
  return {
    tone: data.running > 0 ? 'ok' : 'idle',
    headline: ctx.t('wall.sessionsRunning', { count: data.running }),
    caption: data.titles.length === 0
      ? ctx.t('wall.sessionsNone')
      : data.titles.slice(0, 2).map(row => row.title).join(' · ') + (data.titles.length > 2 ? ' …' : ''),
    figures,
  }
}

/** The expanded page: every session, with the one thing the channel lets us do to it. */
export function detail(data: SessionReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.sessionsAll'),
      rows: data.titles.map(row => ({
        label: row.title,
        value: row.running ? ctx.t('wall.sessionsOn') : ctx.t('wall.sessionsIdle'),
        tone: row.running ? 'ok' : 'idle',
      })),
    }],
    actions: data.titles.filter(row => row.running).map(row => ({
      id: `stop-${row.id}`,
      label: `${ctx.t('wall.sessionsStop')} · ${row.title}`,
      method: 'act',
      args: { options: { action: 'session.stop', payload: { sessionId: row.id } } },
      confirm: true,
      report: (value: unknown) => (pick<boolean>(value, 'stopped') ? ctx.t('wall.sessionsStopped') : ctx.t('wall.sessionsNotStopped')),
    })),
  }
}

/** The card. */
export const sessionsCard: CardDefinition<SessionReading> = {
  id: 'sessions',
  title: ctx => ctx.t('wall.card.sessions'),
  glyph: 'sessions',
  span: [2, 1],
  refreshMs: 5000,
  load,
  preview,
  detail,
}
