/**
 * Model Float — the projects card.
 *
 * Every workspace the user has open, with its branch, its dirty count, and
 * whether anything is running inside it. The channel answers with a summary
 * and the full list, so the glance shows the summary and the detail shows
 * the list.
 *
 * @module client/src/features/wall/cards/projects.ts
 */

import { formatAgo } from '../format.ts'
import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface ProjectsReading {
  readonly summary: { total: number, dirty: number, live: number, running: number, worktrees: number, missing: number }
  readonly projects: readonly ProjectRow[]
  readonly at: number | null
}

export interface ProjectRow {
  readonly id: string
  readonly title: string
  readonly path: string
  readonly sessions: number
  readonly running: number
  readonly branch: string | null
  readonly dirty: number | null
  readonly ahead: number | null
  readonly behind: number | null
  readonly lastCommit: string | null
  readonly lastCommitAt: number | null
}

export function fold(payload: unknown): ProjectsReading {
  const summary = pick<{
    total?: number, dirty?: number, live?: number, running?: number, worktrees?: number, missing?: number
  }>(payload, 'summary') ?? {}
  const projects = list<{
    id?: string, title?: string, path?: string, sessions?: number, running?: number,
    git?: { repo?: boolean, branch?: string, dirty?: number, ahead?: number, behind?: number, lastCommit?: { hash?: string, at?: number, subject?: string } | null } | null
  }>(payload, 'projects')
  return {
    summary: {
      total: summary.total ?? 0,
      dirty: summary.dirty ?? 0,
      live: summary.live ?? 0,
      running: summary.running ?? 0,
      worktrees: summary.worktrees ?? 0,
      missing: summary.missing ?? 0,
    },
    projects: projects.map(row => {
      const git = row.git
      const isRepo = git !== null && git !== undefined && git.repo === true
      return {
        id: row.id ?? '',
        title: row.title ?? '',
        path: row.path ?? '',
        sessions: row.sessions ?? 0,
        running: row.running ?? 0,
        branch: isRepo ? (git.branch ?? null) : null,
        dirty: isRepo ? (git.dirty ?? null) : null,
        ahead: isRepo ? (git.ahead ?? null) : null,
        behind: isRepo ? (git.behind ?? null) : null,
        lastCommit: isRepo ? (git.lastCommit?.subject ?? null) : null,
        lastCommitAt: isRepo ? (git.lastCommit?.at ?? null) : null,
      }
    }),
    at: pick<number>(payload, 'at') ?? null,
  }
}

export async function load(ctx: WallContext): Promise<ProjectsReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'projects', { options: {} })
  if (isFailure(answer)) return answer
  const folded = fold(answer)
  if (pick<boolean>(answer, 'available') === false) {
    return { code: 'refused', message: pick<string>(answer, 'reason') ?? 'projects unavailable' }
  }
  return folded
}

export function preview(data: ProjectsReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const s = data.summary
  return {
    tone: s.dirty > 0 ? 'warn' : s.running > 0 ? 'ok' : 'idle',
    headline: String(s.total),
    caption: ctx.t('wall.projectsCaption', { dirty: s.dirty, running: s.running }),
    figures: [
      { label: ctx.t('wall.projectsDirty'), value: String(s.dirty) },
      { label: ctx.t('wall.projectsRunning'), value: String(s.running) },
      { label: ctx.t('wall.projectsWorktrees'), value: String(s.worktrees) },
      { label: ctx.t('wall.projectsMissing'), value: String(s.missing) },
    ],
  }
}

export function detail(data: ProjectsReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.projectsAll'),
      rows: data.projects.slice(0, 20).map(row => ({
        label: row.title || row.path,
        value: row.branch === null ? '—' : `${row.branch}${row.dirty !== null && row.dirty > 0 ? ` · +${row.dirty}` : ''}`,
        tone: row.running > 0 ? 'ok' : row.dirty !== null && row.dirty > 0 ? 'warn' : 'idle',
      })),
    }],
  }
}

export const projectsCard: CardDefinition<ProjectsReading> = {
  id: 'projects',
  title: ctx => ctx.t('wall.card.projects'),
  glyph: 'projects',
  span: [2, 1],
  refreshMs: 15_000,
  load,
  preview,
  detail,
}
