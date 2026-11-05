/**
 * Model Float — the token usage card.
 *
 * What the account holds and what today has cost, in whichever currency the
 * ledger knows about. The channel returns every number twice — once as a
 * human-readable two-decimal string and once as an integer of millionths —
 * and this card keeps the string for the wall and the integer for the math.
 *
 * @module client/src/features/wall/cards/token.ts
 */

import { formatAgo, formatMoney } from '../format.ts'
import { failedCard, isFailure, list, pick, through } from '../reading.ts'
import type { CardDefinition, CardFailure, Reading, WallContext } from '../reading.ts'

/** What `homepage/overview` carries. */
export interface TokenReading {
  readonly currency: string | null
  readonly balance: string
  readonly bonus: string | null
  readonly today: DayRecord | null
  readonly yesterday: DayRecord | null
  readonly history: readonly DayRecord[]
  readonly accountStatus: string
  readonly sampledAt: number | null
  readonly storage: string
}

export interface DayRecord {
  readonly day: string
  readonly spend: string
  readonly credit: string
  readonly samples: number
}

export function fold(payload: unknown): TokenReading {
  const wallets = list<{ currency?: string, balance?: string, units?: number | null }>(payload, 'wallets')
  const bonuses = list<{ balance?: string }>(payload, 'bonusWallets')
  const currency = pick<string>(payload, 'currency') ?? null
  const history = list<{ day?: string, spend?: string, credit?: string, samples?: number }>(payload, 'history')
  const today = history[0]
  const yesterday = history[1]
  const balanceWallet = wallets.find(wallet => (wallet.currency ?? null) === currency) ?? wallets[0]
  const bonusWallet = bonuses[0]
  return {
    currency,
    balance: formatMoney(balanceWallet?.balance, balanceWallet?.units, currency),
    bonus: bonusWallet === undefined ? null : formatMoney(bonusWallet.balance, null, currency),
    today: today === undefined ? null : {
      day: today.day ?? '—',
      spend: today.spend ?? '—',
      credit: today.credit ?? '—',
      samples: today.samples ?? 0,
    },
    yesterday: yesterday === undefined ? null : {
      day: yesterday.day ?? '—',
      spend: yesterday.spend ?? '—',
      credit: yesterday.credit ?? '—',
      samples: yesterday.samples ?? 0,
    },
    history: history.map(day => ({
      day: day.day ?? '—',
      spend: day.spend ?? '—',
      credit: day.credit ?? '—',
      samples: day.samples ?? 0,
    })),
    accountStatus: pick<string>(payload, 'account', 'status') ?? 'unknown',
    sampledAt: pick<number>(payload, 'sampledAt') ?? null,
    storage: pick<string>(payload, 'storage') ?? '',
  }
}

export async function load(ctx: WallContext): Promise<TokenReading | CardFailure> {
  return through<TokenReading>(ctx.call, 'overview', { options: { historyDays: 14 } }).then(answer => isFailure(answer) ? answer : fold(answer as unknown)) as Promise<TokenReading | CardFailure>
}

export function preview(data: TokenReading | CardFailure, ctx: WallContext): Reading {
  if (isFailure(data)) return failedCard(data, ctx)
  const figures = [
    ...(data.today === null ? [] : [{ label: ctx.t('wall.tokenToday'), value: data.today.spend }]),
    ...(data.yesterday === null ? [] : [{ label: ctx.t('wall.tokenYesterday'), value: data.yesterday.spend }]),
    ...(data.bonus === null ? [] : [{ label: ctx.t('wall.tokenBonus'), value: data.bonus }]),
  ]
  return {
    tone: data.accountStatus === 'signed-out' ? 'idle' : data.accountStatus === 'unknown' ? 'warn' : 'ok',
    headline: data.balance,
    caption: ctx.t('wall.tokenCaption', { status: data.accountStatus }),
    figures,
  }
}

export function detail(data: TokenReading | CardFailure, ctx: WallContext) {
  if (isFailure(data)) return { groups: [], note: data.message }
  return {
    groups: [
      {
        title: ctx.t('wall.tokenHistory'),
        rows: data.history.slice(0, 14).map(day => ({
          label: day.day,
          value: `${day.spend} / ${day.credit}`,
        })),
      },
    ],
    note: data.sampledAt === null ? undefined : ctx.t('wall.tokenUpdated', { time: formatAgo(data.sampledAt, ctx.now) }),
    actions: [{
      id: 'refresh',
      label: ctx.t('wall.tokenRefresh'),
      method: 'refresh',
      confirm: false,
      report: () => ctx.t('wall.tokenRefreshed'),
    }],
  }
}

export const tokenCard: CardDefinition<TokenReading> = {
  id: 'token',
  title: ctx => ctx.t('wall.card.token'),
  glyph: 'token',
  span: [2, 1],
  refreshMs: 30_000,
  load,
  preview,
  detail,
}
