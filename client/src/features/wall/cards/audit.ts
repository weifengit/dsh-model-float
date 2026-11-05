/**
 * Model Float — the plugin audit card.
 *
 * What the latest plugin audit decided. The channel answers with a list of
 * audits, so the glance shows the latest one's verdict and the detail shows
 * the full list.
 *
 * @module client/src/features/wall/cards/audit.ts
 */

import { formatAgo } from '../format.ts'
import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, Tone, WallContext } from '../reading.ts'

export interface AuditReading {
  readonly audits: readonly AuditRow[]
  readonly latest: AuditRow | null
}

export interface AuditRow {
  readonly auditId: string
  readonly state: string
  readonly verdict: string | null
  readonly pluginName: string
  readonly pluginVersion: string
  readonly startedAt: number
  readonly updatedAt: number
  readonly summary: string
}

function toneOf(state: string, verdict: string | null): Tone {
  if (verdict === 'unsafe') return 'bad'
  if (verdict === 'warn') return 'warn'
  if (verdict === 'safe') return 'ok'
  if (state === 'running' || state === 'installing') return 'idle'
  return 'idle'
}

export function fold(payload: unknown): AuditReading {
  const audits = list<{
    auditId?: string, state?: string, verdict?: string | null,
    plugin?: { name?: string, version?: string }, startedAt?: number, updatedAt?: number, summary?: string
  }>(payload, 'audits')
  const rows = audits.map(row => ({
    auditId: row.auditId ?? '',
    state: row.state ?? '',
    verdict: row.verdict ?? null,
    pluginName: row.plugin?.name ?? '',
    pluginVersion: row.plugin?.version ?? '',
    startedAt: row.startedAt ?? 0,
    updatedAt: row.updatedAt ?? 0,
    summary: row.summary ?? '',
  }))
  return {
    audits: rows,
    latest: rows[0] ?? null,
  }
}

export async function load(ctx: WallContext): Promise<AuditReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'pluginAuditList')
  return isFailure(answer) ? answer : fold(answer)
}

export function preview(data: AuditReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const latest = data.latest
  if (latest === null) {
    return { tone: 'idle', caption: ctx.t('wall.auditNone') }
  }
  return {
    tone: toneOf(latest.state, latest.verdict),
    headline: latest.verdict ?? latest.state,
    caption: latest.pluginName || '—',
    figures: [
      { label: ctx.t('wall.auditState'), value: latest.state },
      { label: ctx.t('wall.auditUpdated'), value: formatAgo(latest.updatedAt, ctx.now) },
    ],
  }
}

export function detail(data: AuditReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.auditAll'),
      rows: data.audits.slice(0, 10).map(row => ({
        label: row.pluginName || row.auditId,
        value: `${row.verdict ?? row.state} · ${formatAgo(row.updatedAt, ctx.now)}`,
        tone: toneOf(row.state, row.verdict),
      })),
    }],
  }
}

export const auditCard: CardDefinition<AuditReading> = {
  id: 'audit',
  title: ctx => ctx.t('wall.card.audit'),
  glyph: 'audit',
  span: [1, 1],
  refreshMs: 0,
  load,
  preview,
  detail,
}
