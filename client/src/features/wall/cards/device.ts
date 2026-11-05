/**
 * Model Float — the device card.
 *
 * What the machine is doing right now: CPU, memory, and — when the channel
 * can answer — the drive, the graphics card and the temperature.
 *
 * The reading is `homepage/device` when `dsh-homepage` is installed. When it
 * is not, the card falls back to this plugin's own sampler, which answers CPU
 * and system memory but knows nothing about a GPU or a filesystem, so those
 * rows are left off rather than drawn as zeros for a question nobody
 * answered.
 *
 * Units: every ratio the endpoints speak is a 0..1 fraction and every size is
 * bytes; this card keeps them exactly that way and lets `format.ts` decide
 * how they read.
 *
 * @module client/src/features/wall/cards/device.ts
 */

import { fractionToPercent, formatBytes, formatFraction } from '../format.ts'
import { failedCard, isFailure, list, loadTone, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

/** The card's own shape, whichever side of the fallback produced it. */
export interface DeviceReading {
  readonly at: number
  /** 0..1, or null when nobody sampled it. */
  readonly cpu: number | null
  readonly cores: number
  readonly memoryUsed: number
  readonly memoryTotal: number
  /** 0..1. */
  readonly memory: number | null
  /** 0..1, only the channel can answer. */
  readonly disk: number | null
  readonly diskFree: number | null
  /** 0..1, only the channel can answer. */
  readonly gpu: number | null
  readonly gpuName: string
  /** Degrees celsius, only the channel can answer. */
  readonly temperature: number | null
  /** Bytes per second, only this plugin's sampler can answer. */
  readonly netDown: number | null
  readonly netUp: number | null
  readonly hostname: string
  readonly platform: string
  readonly uptime: number | null
  /** Which side produced the reading, so the caption can be honest. */
  readonly local: boolean
}

/** Fold `homepage/device` into the card's shape. */
export function fromHomepage(payload: unknown): DeviceReading {
  return {
    at: pick<number>(payload, 'at') ?? Date.now(),
    cpu: pick<number>(payload, 'cpu', 'usage') ?? null,
    cores: pick<number>(payload, 'cpu', 'count') ?? 0,
    memoryUsed: pick<number>(payload, 'memory', 'used') ?? 0,
    memoryTotal: pick<number>(payload, 'memory', 'total') ?? 0,
    memory: pick<number>(payload, 'memory', 'usage') ?? null,
    disk: pick<number>(payload, 'disk', 'usage') ?? null,
    diskFree: pick<number>(payload, 'disk', 'free') ?? null,
    gpu: pick<number>(payload, 'gpu', 'usage') ?? null,
    gpuName: pick<string>(payload, 'gpu', 'name') ?? '',
    temperature: pick<number>(payload, 'temperature', 'celsius') ?? null,
    netDown: null,
    netUp: null,
    hostname: pick<string>(payload, 'system', 'hostname') ?? '',
    platform: pick<string>(payload, 'system', 'platform') ?? '',
    uptime: pick<number>(payload, 'system', 'uptime') ?? null,
    local: false,
  }
}

/** Fold this plugin's sampler into the same shape, with what it cannot know left null. */
export function fromSampler(sample: {
  readonly at: number
  readonly cpu: number | null
  readonly systemUsed: number
  readonly systemTotal: number
  readonly netDown: number | null
  readonly netUp: number | null
}): DeviceReading {
  return {
    at: sample.at,
    cpu: sample.cpu,
    cores: 0,
    memoryUsed: sample.systemUsed,
    memoryTotal: sample.systemTotal,
    memory: sample.systemTotal > 0 ? sample.systemUsed / sample.systemTotal : null,
    disk: null,
    diskFree: null,
    gpu: null,
    gpuName: '',
    temperature: null,
    netDown: sample.netDown,
    netUp: sample.netUp,
    hostname: '',
    platform: '',
    uptime: null,
    local: true,
  }
}

/** Read the card's payload, or the reason there is none. */
export async function load(ctx: WallContext): Promise<DeviceReading | CardFailure> {
  const answer = await ctx.call<unknown>('device')
  if (answer.ok) return fromHomepage(answer.value)
  if (ctx.sampler === null) return { code: answer.code, message: answer.message }
  try {
    return fromSampler(await ctx.sampler())
  } catch (error) {
    return { code: 'unreachable', message: error instanceof Error ? error.message : String(error) }
  }
}

/** What the card says at a glance. */
export function preview(data: DeviceReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const figures = [
    {
      label: ctx.t('wall.memory'),
      value: `${formatBytes(data.memoryUsed)} / ${formatBytes(data.memoryTotal)}`,
      percent: fractionToPercent(data.memory),
    },
    ...(data.disk === null ? [] : [{ label: ctx.t('wall.disk'), value: formatFraction(data.disk), percent: fractionToPercent(data.disk) }]),
    ...(data.gpu === null ? [] : [{ label: ctx.t('wall.gpu'), value: formatFraction(data.gpu), percent: fractionToPercent(data.gpu) }]),
    ...(data.temperature === null ? [] : [{ label: ctx.t('wall.temperature'), value: `${data.temperature.toFixed(0)}°C` }]),
    ...(data.netDown === null && data.netUp === null ? [] : [{
      label: ctx.t('wall.net'),
      value: `${formatBytes(data.netDown ?? 0)}/s ↓ ${formatBytes(data.netUp ?? 0)}/s ↑`,
    }]),
  ]
  return {
    tone: loadTone(data.cpu, data.memory),
    headline: data.cpu === null ? '—' : formatFraction(data.cpu),
    caption: ctx.t(data.local ? 'wall.cpuLocal' : 'wall.cpuOf', { cores: data.cores > 0 ? ` · ${data.cores}c` : '' }),
    figures: figures.slice(0, 4),
  }
}

/** The expanded page: the per-core picture and what the glance had to drop. */
export function detail(data: DeviceReading | CardFailure, ctx: WallContext): ReturnType<NonNullable<CardDefinition['detail']>> {
  if (isFailure(data)) return { groups: [], note: data.message }
  const perCore = list<number>(data, '__cores')
  return {
    groups: [
      {
        title: ctx.t('wall.machine'),
        rows: [
          { label: ctx.t('wall.hostname'), value: data.hostname || '—' },
          { label: ctx.t('wall.platform'), value: data.platform || '—' },
          { label: ctx.t('wall.memory'), value: `${formatBytes(data.memoryUsed)} / ${formatBytes(data.memoryTotal)}`, percent: fractionToPercent(data.memory) },
          ...(data.disk === null ? [] : [{ label: ctx.t('wall.diskFree'), value: formatBytes(data.diskFree) }]),
          ...(data.uptime === null ? [] : [{ label: ctx.t('wall.uptime'), value: `${Math.round(data.uptime / 36) / 24} d` }]),
        ],
      },
      ...(perCore.length === 0 ? [] : [{
        title: ctx.t('wall.cores'),
        rows: perCore.map((value, index) => ({
          label: `#${index + 1}`,
          value: formatFraction(typeof value === 'number' ? value : null),
          percent: fractionToPercent(typeof value === 'number' ? value : null),
        })),
      }]),
    ],
    note: data.local ? ctx.t('wall.deviceLocalNote') : undefined,
  }
}

/** The card. */
export const deviceCard: CardDefinition<DeviceReading> = {
  id: 'device',
  title: ctx => ctx.t('wall.card.device'),
  glyph: 'device',
  span: [1, 1],
  refreshMs: 2000,
  load,
  preview,
  detail,
}
