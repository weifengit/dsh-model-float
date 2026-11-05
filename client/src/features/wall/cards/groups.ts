/**
 * Model Float — the workspace groups card.
 *
 * How the sidebar is arranged: the groups the user has created, the members
 * assigned to them, and the view settings. The channel answers with the
 * full layout document, so the glance shows the count and the detail shows
 * the structure.
 *
 * @module client/src/features/wall/cards/groups.ts
 */

import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface GroupsReading {
  readonly mode: string
  readonly groups: readonly GroupRow[]
  readonly memberCount: number
  readonly at: number | null
}

export interface GroupRow {
  readonly id: string
  readonly title: string
  readonly color: string | null
  readonly collapsed: boolean
  readonly sort: string
}

export function fold(payload: unknown): GroupsReading {
  const layout = pick<{
    mode?: string, groups?: unknown[], members?: Record<string, unknown>, updatedAt?: number
  }>(payload, 'layout') ?? {}
  const groups = list<{
    id?: string, title?: string, color?: string | null, collapsed?: boolean, sort?: string
  }>(layout, 'groups')
  const members = layout.members ?? {}
  return {
    mode: layout.mode ?? 'grouped',
    groups: groups.map(row => ({
      id: row.id ?? '',
      title: row.title ?? '',
      color: row.color ?? null,
      collapsed: row.collapsed ?? false,
      sort: row.sort ?? 'manual',
    })),
    memberCount: Object.keys(members).length,
    at: pick<number>(payload, 'at') ?? layout.updatedAt ?? null,
  }
}

export async function load(ctx: WallContext): Promise<GroupsReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'sidebarLayout')
  return isFailure(answer) ? answer : fold(answer)
}

export function preview(data: GroupsReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  return {
    tone: data.groups.length > 0 ? 'ok' : 'idle',
    headline: String(data.groups.length),
    caption: ctx.t('wall.groupsCaption', { mode: data.mode }),
    figures: [
      { label: ctx.t('wall.groupsMode'), value: data.mode },
      { label: ctx.t('wall.groupsMembers'), value: String(data.memberCount) },
    ],
  }
}

export function detail(data: GroupsReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.groupsAll'),
      rows: data.groups.map(row => ({
        label: row.title || row.id,
        value: `${row.sort}${row.collapsed ? ' · collapsed' : ''}`,
        tone: row.collapsed ? 'idle' : 'ok',
      })),
    }],
  }
}

export const groupsCard: CardDefinition<GroupsReading> = {
  id: 'groups',
  title: ctx => ctx.t('wall.card.groups'),
  glyph: 'groups',
  span: [1, 1],
  refreshMs: 0,
  load,
  preview,
  detail,
}
