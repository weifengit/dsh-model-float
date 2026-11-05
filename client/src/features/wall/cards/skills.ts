/**
 * Model Float — the skills card.
 *
 * How many skills are installed, how many are enabled, and where they came
 * from. The channel answers with a count and a list, so the glance shows
 * the count and the detail shows the list.
 *
 * @module client/src/features/wall/cards/skills.ts
 */

import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface SkillsReading {
  readonly counts: { total: number, enabled: number, disabled: number, writable: number }
  readonly skills: readonly SkillRow[]
  readonly generatedAt: number | null
}

export interface SkillRow {
  readonly name: string
  readonly description: string
  readonly source: string
  readonly modelInvocable: boolean
  readonly userInvocable: boolean
  readonly writable: boolean
}

export function fold(payload: unknown): SkillsReading {
  const counts = pick<{
    total?: number, enabled?: number, disabled?: number, writable?: number
  }>(payload, 'counts') ?? {}
  const skills = list<{
    name?: string | null, description?: string, source?: string,
    modelInvocable?: boolean, userInvocable?: boolean, writable?: boolean
  }>(payload, 'skills')
  return {
    counts: {
      total: counts.total ?? 0,
      enabled: counts.enabled ?? 0,
      disabled: counts.disabled ?? 0,
      writable: counts.writable ?? 0,
    },
    skills: skills.map(row => ({
      name: row.name ?? '',
      description: row.description ?? '',
      source: row.source ?? '',
      modelInvocable: row.modelInvocable ?? false,
      userInvocable: row.userInvocable ?? false,
      writable: row.writable ?? false,
    })),
    generatedAt: pick<number>(payload, 'generatedAt') ?? null,
  }
}

export async function load(ctx: WallContext): Promise<SkillsReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'skillList', { options: {} })
  return isFailure(answer) ? answer : fold(answer)
}

export function preview(data: SkillsReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  return {
    tone: data.counts.enabled > 0 ? 'ok' : 'idle',
    headline: String(data.counts.enabled),
    caption: ctx.t('wall.skillsCaption', { total: data.counts.total }),
    figures: [
      { label: ctx.t('wall.skillsTotal'), value: String(data.counts.total) },
      { label: ctx.t('wall.skillsDisabled'), value: String(data.counts.disabled) },
      { label: ctx.t('wall.skillsWritable'), value: String(data.counts.writable) },
    ],
  }
}

export function detail(data: SkillsReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [{
      title: ctx.t('wall.skillsAll'),
      rows: data.skills.slice(0, 30).map(row => ({
        label: row.name,
        value: row.description || row.source,
        tone: row.modelInvocable || row.userInvocable ? 'ok' : 'idle',
      })),
    }],
  }
}

export const skillsCard: CardDefinition<SkillsReading> = {
  id: 'skills',
  title: ctx => ctx.t('wall.card.skills'),
  glyph: 'skills',
  span: [1, 1],
  refreshMs: 0,
  load,
  preview,
  detail,
}
