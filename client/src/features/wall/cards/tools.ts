/**
 * Model Float — the tool usage card.
 *
 * How many times the model has called each tool, how often those calls
 * failed, and how much argument and output they produced. The channel
 * answers with a global total and a per-tool breakdown, so the glance shows
 * the total and the detail shows the breakdown.
 *
 * @module client/src/features/wall/cards/tools.ts
 */

import { formatCount, fractionToPercent } from '../format.ts'
import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface ToolsReading {
  readonly available: boolean
  readonly calls: number
  readonly errors: number
  readonly errorRate: number
  readonly argChars: number
  readonly outChars: number
  readonly argTokens: number
  readonly outTokens: number
  readonly ms: number
  readonly tools: readonly ToolRow[]
  readonly at: number | null
}

export interface ToolRow {
  readonly name: string
  readonly calls: number
  readonly errors: number
  readonly errorRate: number
  readonly ms: number
}

export function fold(payload: unknown): ToolsReading {
  const totals = pick<{
    calls?: number, errors?: number, errorRate?: number,
    argChars?: number, outChars?: number, argTokens?: number, outTokens?: number, ms?: number
  }>(payload, 'totals') ?? {}
  const tools = list<{
    name?: string, calls?: number, errors?: number, errorRate?: number, ms?: number
  }>(payload, 'tools')
  return {
    available: pick<boolean>(payload, 'available') ?? false,
    calls: totals.calls ?? 0,
    errors: totals.errors ?? 0,
    errorRate: totals.errorRate ?? 0,
    argChars: totals.argChars ?? 0,
    outChars: totals.outChars ?? 0,
    argTokens: totals.argTokens ?? 0,
    outTokens: totals.outTokens ?? 0,
    ms: totals.ms ?? 0,
    tools: tools.map(row => ({
      name: row.name ?? '',
      calls: row.calls ?? 0,
      errors: row.errors ?? 0,
      errorRate: row.errorRate ?? 0,
      ms: row.ms ?? 0,
    })),
    at: pick<number>(payload, 'at') ?? null,
  }
}

export async function load(ctx: WallContext): Promise<ToolsReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'toolUsage', { options: {} })
  if (isFailure(answer)) return answer
  const folded = fold(answer)
  if (!folded.available) return { code: 'refused', message: pick<string>(answer, 'reason') ?? 'tool usage unavailable' }
  return folded
}

export function preview(data: ToolsReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  return {
    tone: data.errorRate >= 0.1 ? 'warn' : 'ok',
    headline: formatCount(data.calls),
    caption: ctx.t('wall.toolsCalls', { errors: data.errors }),
    figures: [
      { label: ctx.t('wall.toolsErrorRate'), value: `${(data.errorRate * 100).toFixed(1)}%`, percent: fractionToPercent(data.errorRate) },
      { label: ctx.t('wall.toolsArgTokens'), value: `≈ ${formatCount(data.argTokens)}` },
      { label: ctx.t('wall.toolsOutTokens'), value: `≈ ${formatCount(data.outTokens)}` },
      { label: ctx.t('wall.toolsDuration'), value: `${(data.ms / 1000).toFixed(0)} s` },
    ],
  }
}

export function detail(data: ToolsReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.toolsAll'),
      rows: data.tools.slice(0, 20).map(row => ({
        label: row.name,
        value: `${formatCount(row.calls)} · ${(row.errorRate * 100).toFixed(0)}%`,
        percent: fractionToPercent(row.errorRate),
        tone: row.errorRate >= 0.1 ? 'warn' : 'ok',
      })),
    }],
  }
}

export const toolsCard: CardDefinition<ToolsReading> = {
  id: 'tools',
  title: ctx => ctx.t('wall.card.tools'),
  glyph: 'tools',
  span: [2, 1],
  refreshMs: 60_000,
  load,
  preview,
  detail,
}
