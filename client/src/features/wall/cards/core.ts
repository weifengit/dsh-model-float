/**
 * Model Float — the DSH core card.
 *
 * What the upstream repository says about the core the user is running: the
 * latest commit, the latest release, and whether the installed copy matches.
 * The channel also reports the local install when it can find one, so the
 * card folds both answers into one glance.
 *
 * @module client/src/features/wall/cards/core.ts
 */

import { formatAgo, formatDate } from '../format.ts'
import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface CoreReading {
  readonly head: { sha: string, short: string, message: string, author: string, date: string, url: string } | null
  readonly release: { tag: string, name: string, url: string, publishedAt: string } | null
  readonly localVersion: string | null
  readonly localBranch: string | null
  readonly localCommit: string | null
  readonly at: number | null
  readonly reason: string | null
  readonly upToDate: boolean | null
}

export function fold(upstream: unknown, local: unknown): CoreReading {
  const head = pick<{ sha?: string, short?: string, message?: string, author?: string, date?: string, url?: string }>(upstream, 'head')
  const release = pick<{ tag?: string, name?: string, url?: string, publishedAt?: string }>(upstream, 'release')
  const versions = list<{ version?: string | null, branch?: string | null, short?: string | null }>(local, 'versions')
  const installed = versions[0]
  const localVersion = installed?.version ?? null
  const localBranch = installed?.branch ?? null
  const localCommit = installed?.short ?? null
  const upToDate = head?.short !== undefined && installed?.short !== undefined && installed.short !== null && head.short !== null && head.short !== undefined
    ? installed.short === head.short
    : null
  return {
    head: head === null || head === undefined ? null : {
      sha: head.sha ?? '',
      short: head.short ?? '',
      message: head.message ?? '',
      author: head.author ?? '',
      date: head.date ?? '',
      url: head.url ?? '',
    },
    release: release === null || release === undefined ? null : {
      tag: release.tag ?? '',
      name: release.name ?? '',
      url: release.url ?? '',
      publishedAt: release.publishedAt ?? '',
    },
    localVersion,
    localBranch,
    localCommit,
    at: pick<number>(upstream, 'at') ?? null,
    reason: pick<string>(upstream, 'reason') ?? null,
    upToDate,
  }
}

export async function load(ctx: WallContext): Promise<CoreReading | CardFailure> {
  const [upstream, local] = await Promise.all([
    through<unknown>(ctx.call, 'dsh'),
    through<unknown>(ctx.call, 'dshLocal', { options: {} }),
  ])
  if (isFailure(upstream) && isFailure(local)) return upstream
  return fold(isFailure(upstream) ? {} : upstream, isFailure(local) ? {} : local)
}

export function preview(data: CoreReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const versionLabel = data.localVersion ?? data.release?.tag ?? data.head?.short ?? '—'
  return {
    tone: data.upToDate === false ? 'warn' : data.upToDate === true ? 'ok' : 'idle',
    headline: versionLabel,
    caption: data.upToDate === false
      ? ctx.t('wall.coreBehind')
      : data.upToDate === true
        ? ctx.t('wall.coreUpToDate')
        : ctx.t('wall.coreUnknown'),
    figures: [
      ...(data.release === null ? [] : [{ label: ctx.t('wall.coreRelease'), value: data.release.tag || '—' }]),
      ...(data.localBranch === null ? [] : [{ label: ctx.t('wall.coreBranch'), value: data.localBranch }]),
    ],
  }
}

export function detail(data: CoreReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [
      {
        title: ctx.t('wall.coreLocal'),
        rows: [
          { label: ctx.t('wall.coreVersion'), value: data.localVersion ?? '—' },
          { label: ctx.t('wall.coreBranch'), value: data.localBranch ?? '—' },
          { label: ctx.t('wall.coreCommit'), value: data.localCommit ?? '—' },
        ],
      },
      {
        title: ctx.t('wall.coreUpstream'),
        rows: [
          { label: ctx.t('wall.coreHead'), value: data.head?.short ?? '—' },
          { label: ctx.t('wall.coreMessage'), value: data.head?.message ?? '—' },
          { label: ctx.t('wall.coreAuthor'), value: data.head?.author ?? '—' },
          { label: ctx.t('wall.coreDate'), value: formatDate(data.head?.date) },
          ...(data.release === null ? [] : [
            { label: ctx.t('wall.coreReleaseTag'), value: data.release.tag },
            { label: ctx.t('wall.coreReleaseDate'), value: formatDate(data.release.publishedAt) },
          ]),
        ],
      },
    ],
    note: data.reason === 'network' ? ctx.t('wall.coreNetworkNote') : undefined,
  }
}

export const coreCard: CardDefinition<CoreReading> = {
  id: 'core',
  title: ctx => ctx.t('wall.card.core'),
  glyph: 'core',
  span: [1, 1],
  refreshMs: 300_000,
  load,
  preview,
  detail,
}
