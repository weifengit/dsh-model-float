/**
 * Model Float — the DSH storage card.
 *
 * What the harness home is holding and what can be reclaimed. The channel
 * answers with six fixed categories and a reclaimable count that is only
 * old log files, so the card shows the total and the reclaimable, and
 * offers the one action the channel exposes: prune logs older than a week.
 *
 * @module client/src/features/wall/cards/storage.ts
 */

import { formatBytes, fractionToPercent } from '../format.ts'
import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface StorageReading {
  readonly available: boolean
  readonly totalBytes: number
  readonly totalFiles: number
  readonly reclaimableBytes: number
  readonly reclaimableFiles: number
  readonly categories: readonly CategoryRow[]
  readonly at: number | null
}

export interface CategoryRow {
  readonly id: string
  readonly bytes: number
  readonly files: number
  readonly reclaimableBytes: number
  readonly reclaimableFiles: number
  readonly truncated: boolean
}

export function fold(payload: unknown): StorageReading {
  const categories = list<{
    id?: string, bytes?: number, files?: number,
    reclaimableBytes?: number, reclaimableFiles?: number, truncated?: boolean
  }>(payload, 'categories')
  return {
    available: pick<boolean>(payload, 'available') ?? false,
    totalBytes: pick<number>(payload, 'totalBytes') ?? 0,
    totalFiles: pick<number>(payload, 'totalFiles') ?? 0,
    reclaimableBytes: pick<number>(payload, 'reclaimableBytes') ?? 0,
    reclaimableFiles: pick<number>(payload, 'reclaimableFiles') ?? 0,
    categories: categories.map(row => ({
      id: row.id ?? '',
      bytes: row.bytes ?? 0,
      files: row.files ?? 0,
      reclaimableBytes: row.reclaimableBytes ?? 0,
      reclaimableFiles: row.reclaimableFiles ?? 0,
      truncated: row.truncated ?? false,
    })),
    at: pick<number>(payload, 'at') ?? null,
  }
}

export async function load(ctx: WallContext): Promise<StorageReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'hygiene', { options: {} })
  if (isFailure(answer)) return answer
  const folded = fold(answer)
  if (!folded.available) return { code: 'refused', message: pick<string>(answer, 'reason') ?? 'hygiene unavailable' }
  return folded
}

export function preview(data: StorageReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const reclaimFraction = data.totalBytes > 0 ? data.reclaimableBytes / data.totalBytes : null
  return {
    tone: data.reclaimableBytes > 100 * 1024 * 1024 ? 'warn' : 'ok',
    headline: formatBytes(data.totalBytes),
    caption: ctx.t('wall.storageFiles', { count: data.totalFiles }),
    figures: [
      { label: ctx.t('wall.storageReclaimable'), value: formatBytes(data.reclaimableBytes), percent: fractionToPercent(reclaimFraction) },
      ...(data.categories.slice(0, 3).map(row => ({
        label: ctx.t(`wall.storageCategory.${row.id}`),
        value: formatBytes(row.bytes),
      }))),
    ],
  }
}

export function detail(data: StorageReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.storageCategories'),
      rows: data.categories.map(row => ({
        label: ctx.t(`wall.storageCategory.${row.id}`),
        value: `${formatBytes(row.bytes)} · ${row.files} files`,
      })),
    }],
    actions: data.reclaimableFiles > 0 ? [{
      id: 'prune',
      label: ctx.t('wall.storagePrune', { count: data.reclaimableFiles }),
      method: 'act',
      args: { options: { action: 'hygiene.logs.prune', payload: { olderThanDays: 7 } } },
      confirm: true,
      report: (value: unknown) => ctx.t('wall.storagePruned', { bytes: formatBytes(pick<number>(value, 'bytes') ?? 0) }),
    }] : [],
  }
}

export const storageCard: CardDefinition<StorageReading> = {
  id: 'storage',
  title: ctx => ctx.t('wall.card.storage'),
  glyph: 'storage',
  span: [1, 1],
  refreshMs: 120_000,
  load,
  preview,
  detail,
}
