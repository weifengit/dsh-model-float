/**
 * Model Float — the network card.
 *
 * What the process environment says about how it reaches the outside world:
 * the proxies it inherits, the TLS bundles it trusts, and the redirectors
 * it has to go through. The channel answers these facts synchronously, so
 * the card reads them once and does not poll.
 *
 * @module client/src/features/wall/cards/network.ts
 */

import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

export interface NetworkReading {
  readonly proxies: readonly ProxyRow[]
  readonly tls: readonly { name: string, value: string }[]
  readonly redirectors: readonly { name: string, value: string }[]
  readonly platform: string
  readonly arch: string
  readonly node: string
  readonly capturedAt: number | null
}

export interface ProxyRow {
  readonly name: string
  readonly kind: 'proxy' | 'bypass'
  readonly masked: string
  readonly hasAuth: boolean
}

export function fold(payload: unknown): NetworkReading {
  return {
    proxies: list<{ name?: string, kind?: string, masked?: string, hasAuth?: boolean }>(payload, 'proxies').map(row => ({
      name: row.name ?? '',
      kind: row.kind === 'bypass' ? 'bypass' as const : 'proxy' as const,
      masked: row.masked ?? '',
      hasAuth: row.hasAuth ?? false,
    })),
    tls: list<{ name?: string, value?: string }>(payload, 'tls').map(row => ({ name: row.name ?? '', value: row.value ?? '' })),
    redirectors: list<{ name?: string, value?: string }>(payload, 'redirectors').map(row => ({ name: row.name ?? '', value: row.value ?? '' })),
    platform: pick<string>(payload, 'platform') ?? '',
    arch: pick<string>(payload, 'arch') ?? '',
    node: pick<string>(payload, 'node') ?? '',
    capturedAt: pick<number>(payload, 'capturedAt') ?? null,
  }
}

export async function load(ctx: WallContext): Promise<NetworkReading | CardFailure> {
  const answer = await through<unknown>(ctx.call, 'environment')
  return isFailure(answer) ? answer : fold(answer)
}

export function preview(data: NetworkReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const proxyCount = data.proxies.filter(row => row.kind === 'proxy').length
  return {
    tone: proxyCount > 0 ? 'warn' : 'ok',
    headline: String(proxyCount),
    caption: ctx.t('wall.networkProxies', { count: proxyCount }),
    figures: [
      ...(data.tls.length === 0 ? [] : [{ label: ctx.t('wall.networkTls'), value: String(data.tls.length) }]),
      ...(data.redirectors.length === 0 ? [] : [{ label: ctx.t('wall.networkRedirectors'), value: String(data.redirectors.length) }]),
      { label: ctx.t('wall.networkNode'), value: data.node || '—' },
    ],
  }
}

export function detail(data: NetworkReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [
      { title: ctx.t('wall.networkProxiesTitle'), rows: data.proxies.map(row => ({ label: row.name, value: row.masked || '—', tone: row.kind === 'bypass' ? 'idle' : 'warn' })) },
      { title: ctx.t('wall.networkTlsTitle'), rows: data.tls.map(row => ({ label: row.name, value: row.value || '—' })) },
      { title: ctx.t('wall.networkRedirectorsTitle'), rows: data.redirectors.map(row => ({ label: row.name, value: row.value || '—' })) },
    ],
  }
}

export const networkCard: CardDefinition<NetworkReading> = {
  id: 'network',
  title: ctx => ctx.t('wall.card.network'),
  glyph: 'network',
  span: [1, 1],
  refreshMs: 0,
  load,
  preview,
  detail,
}
