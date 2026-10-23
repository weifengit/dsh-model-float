/**
 * Model Float — data layer.
 *
 * Three readings, joined into one vendor table:
 *
 * 1. **the free lane roster** — `GET /api/our-free-model/summary`, the JSON API
 *    the Our Free Model plugin already serves. It answers "which models exist
 *    right now, and is each one usable from this machine?" (`available`,
 *    `region-blocked`, `unavailable`, `throttled`, `unknown`). This is the same
 *    list the 设置 → Our Free Model → 白嫖模型接入 page renders; the float is a
 *    glanceable version of it.
 *
 * 2. **per-vendor credit** — the Channel Pack RPC `credits.balances`, reached
 *    over the shell's own `/api/channel-pack` endpoint. It answers "how much
 *    credit does this vendor's account still have?", per vendor, in the
 *    vendor's own unit (积分 / credits / USD / tokens).
 *
 * 3. **the per-vendor model blacklist** — the Channel Pack RPC
 *    `model.list` plus `model.setDisabledMany`. It answers "which of this
 *    vendor's models are currently hidden from the model picker?", and it is
 *    also the *write* path: hiding a vendor's models here removes them from the
 *    chat composer's model picker, which is the whole point of the float.
 *
 * The readings are joined by *vendor*, not by model: a vendor can expose many
 * models, and a model can be reachable through several vendors. The vendor
 * axis is the one the user actually asks about ("厂商哪些接入了，哪些还有额度，
 * 哪些不可用").
 *
 * @module client/src/data.ts
 */

/** The Our Free Model plugin's own JSON API prefix, served by the same host. */
export const OFM_API = '/api/our-free-model'

/** The Channel Pack's management RPC endpoint, served by the same host. */
export const CHANNEL_PACK_API = '/api/channel-pack'

/**
 * The vendors Our Free Model's 白嫖模型接入 page offers, in the page's own
 * order. The pack's `provider.status` reports models and accounts per vendor;
 * the float needs the vendor *names* and their accent colours, which live only
 * in that page — so the roster is mirrored here.
 *
 * `unit` is how a vendor's balance is denominated, and decides how the number
 * is rendered. `credits` vendors show plain numbers; `dollars` show a currency;
 * `tokens` show a token count; `quota` shows whatever the upstream quota
 * endpoint reported (a percentage-like figure, rendered verbatim).
 */
export interface Vendor {
  readonly id: string
  readonly name: string
  readonly org: string
  readonly accent: string
  /** How this vendor's balance is denominated. */
  readonly unit: 'credits' | 'dollars' | 'tokens' | 'quota'
  /** Whether the pack can report a balance for this vendor at all. */
  readonly balance: boolean
  /** Whether the pack exposes a daily-credit claim for this vendor. */
  readonly claim: boolean
}

export const VENDORS: readonly Vendor[] = [
  { id: 'codearts', name: 'CodeArts', org: '华为云', accent: '#C7000B', unit: 'credits', balance: true, claim: true },
  { id: 'buddy', name: 'WorkBuddy 国内版', org: '腾讯 · copilot.tencent.com', accent: '#0A7AFF', unit: 'credits', balance: true, claim: true },
  { id: 'workbuddy', name: 'WorkBuddy 国际版', org: '腾讯 · workbuddy.ai', accent: '#0B63CE', unit: 'credits', balance: false, claim: false },
  { id: 'lobsterai', name: 'LobsterAI', org: '有道', accent: '#FF6A00', unit: 'credits', balance: true, claim: true },
  { id: 'qoder', name: 'Qoder', org: '阿里系', accent: '#615CED', unit: 'credits', balance: true, claim: true },
  { id: 'qodercn', name: 'Qoder 中国版', org: '阿里系', accent: '#7A6CF0', unit: 'credits', balance: true, claim: true },
  { id: 'trae', name: 'TRAE', org: '字节', accent: '#00BFA6', unit: 'credits', balance: true, claim: true },
  { id: 'cline', name: 'Cline', org: 'Cline', accent: '#5B5BD6', unit: 'dollars', balance: true, claim: false },
  { id: 'loomy', name: 'Loomy', org: '讯飞', accent: '#2F6BFF', unit: 'credits', balance: true, claim: true },
  { id: 'raccoon', name: 'Raccoon', org: '商汤', accent: '#00A6A6', unit: 'credits', balance: true, claim: false },
  { id: 'minimax', name: 'MiniMax Code', org: 'MiniMax', accent: '#E4007F', unit: 'credits', balance: true, claim: true },
  { id: 'zcode', name: 'ZCode', org: '智谱', accent: '#3B6EF6', unit: 'tokens', balance: true, claim: true },
  { id: 'gemini', name: 'Gemini', org: 'Google Code Assist', accent: '#4285F4', unit: 'quota', balance: true, claim: false },
]

/** How a vendor's models are reachable right now. */
export type VendorState =
  /** The vendor is switched off entirely (all its models disabled). */
  | 'closed'
  /** The vendor has accounts but none of them is enabled. */
  | 'idle'
  /** The vendor is live and serving models. */
  | 'on'
  /** This panel hid the vendor's models; they are not in the picker. */
  | 'hidden'
  /** The reading failed; the reason is carried alongside. */
  | 'unknown'

/** One vendor row of the float's table. */
export interface VendorRow {
  readonly vendor: Vendor
  readonly state: VendorState
  /** How many models this vendor currently offers (including hidden ones). */
  readonly modelCount: number
  /** How many of those models are hidden from the model picker. */
  readonly disabledCount: number
  /** How many of this vendor's models are currently visible in the picker. */
  readonly visibleModelCount: number
  /** How many accounts this vendor has, and how many are enabled. */
  readonly accountCount: number
  readonly enabledAccountCount: number
  /** The summed remaining balance, in the vendor's own unit. `null` when unknown. */
  readonly balance: number | null
  /** The summed total grant, when the upstream reports one. */
  readonly total: number | null
  /** Per-account breakdown, for the expanded list. */
  readonly accounts: readonly VendorAccount[]
  /** Why the balance could not be read. */
  readonly error: string
  /** When this row's reading was taken. */
  readonly at: number
}

/** One account of a vendor. */
export interface VendorAccount {
  readonly accountId: string
  readonly nickname: string
  readonly balance: number | null
  readonly total: number | null
  readonly error: string
}

/** The free-lane roster, as read from Our Free Model's `/summary`. */
export interface LaneSummary {
  /** Total models on the roster. */
  readonly total: number
  /** How many are usable right now. */
  readonly available: number
  /** How many are blocked by region. */
  readonly regionBlocked: number
  /** How many are unavailable (upstream refused). */
  readonly unavailable: number
  /** How many are throttled. */
  readonly throttled: number
  /** How many have no reading yet. */
  readonly unknown: number
  /** Whether the Channel Pack is mounted on this host. */
  readonly channelsReady: boolean
  /** Whether the pack failed to mount, and why. */
  readonly channelsError: string
  /** When the availability probe last ran. */
  readonly probedAt: number
}

/** One model's availability, as reported by the probe. */
export interface ModelRow {
  readonly id: string
  readonly name: string
  readonly availability: string
  readonly detail: string
  readonly route: string
}

/** One model of a vendor, as the Channel Pack reports it. */
export interface VendorModel {
  readonly id: string
  readonly name: string
  /** Whether the model is currently hidden from the model picker. */
  readonly disabled: boolean
  /** Whether the upstream dropped the model (it is hidden either way). */
  readonly dead: boolean
}

/** The result of one hide/restore operation. */
export interface HideResult {
  /** How many models the operation actually changed. */
  readonly changed: number
  /** The error, when the operation failed. */
  readonly error: string
}

/**
 * Is this vendor's model set worth hiding right now?
 *
 * "Unusable" means the models are in the picker but cannot answer a turn:
 *
 * - the vendor is not connected at all (switched off, not signed in, or no
 *   account) — its models are listed but every call would fail;
 * - the vendor is connected but its credit is spent (balance ≤ 0).
 *
 * A vendor whose balance could not be *read* is NOT unusable — that is an
 * unknown, and hiding on an unknown would take away models that work. The user
 * can still hide such a vendor by hand.
 */
export function isUnusable(row: VendorRow): boolean {
  if (row.visibleModelCount === 0) return false
  if (row.state === 'closed' || row.state === 'idle' || row.state === 'unknown') return true
  if (row.balance === null) return false
  return row.balance <= 0
}

/** Everything the float's panel renders. */
export interface FloatSnapshot {
  readonly lane: LaneSummary
  readonly vendors: readonly VendorRow[]
  /** The per-model availability list, for the expanded panel. */
  readonly models: readonly ModelRow[]
  readonly at: number
  readonly error: string
}

/** A JSON error carrying the server's own message. */
class HttpError extends Error {}

/**
 * Fetch one JSON document, with the response's own error text when it fails.
 *
 * The Host serves these routes on the same origin as the page, so a plain
 * same-origin `fetch` is correct and needs no credential juggling.
 */
async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    headers: { accept: 'application/json' },
    ...(signal === undefined ? {} : { signal }),
  })
  if (!response.ok) {
    throw new HttpError(`${response.status} ${response.statusText}`.trim())
  }
  return response.json()
}

/**
 * Call one Channel Pack RPC method.
 *
 * The pack speaks the shell's connection envelope: a `client-request` frame in,
 * a `server-response` frame out. The result frame carries `ok: true` with a
 * `value`, or `ok: false` with a structured error — the latter is a *method*
 * failure (an unknown vendor, a refused quota endpoint), not a transport
 * failure, so it is returned rather than thrown.
 */
export async function callChannelPack<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: true, value: T } | { ok: false, error: string }> {
  const rpcId = `mf-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  const response = await fetch(CHANNEL_PACK_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: 'channel-pack',
      payload: { method, payload },
    }),
    ...(signal === undefined ? {} : { signal }),
  })
  if (!response.ok) throw new HttpError(`${response.status} ${response.statusText}`.trim())
  const frame = await response.json() as {
    result?: { ok?: boolean, value?: T, error?: { message?: string, code?: string } }
  }
  const result = frame.result
  if (result === undefined) throw new HttpError('malformed rpc envelope')
  if (result.ok === true) return { ok: true, value: result.value as T }
  const error = result.error
  return { ok: false, error: error?.message ?? error?.code ?? 'rpc failed' }
}

/** One account row as the pack reports it. */
interface RawAccount {
  accountId?: string
  nickname?: string
  balance?: { total?: number, packages?: unknown[] } | null
  error?: string
}

/** The `credits.balances` result. */
interface RawBalances {
  accounts?: RawAccount[]
}

/** The `provider.status` result. */
interface RawProviderStatus {
  statuses?: Record<string, {
    models?: { total?: number, disabled?: number }
    accounts?: { total?: number, enabled?: number }
    closed?: boolean
  }>
}

/** The Our Free Model `/summary` payload, as far as the float reads it. */
interface RawSummary {
  catalog?: Array<{
    id?: string
    name?: string
    availability?: string
    detail?: string
    route?: string
  }>
  probedAt?: number
  channels?: { state?: string, error?: string }
}

/** Read the free-lane roster and per-vendor credit in one pass. */
export async function readSnapshot(signal?: AbortSignal): Promise<FloatSnapshot> {
  const [laneResult, vendorRows] = await Promise.all([
    readLane(signal),
    readVendors(signal),
  ])

  if (laneResult.error !== '' && vendorRows.length === 0) {
    return {
      lane: EMPTY_LANE,
      vendors: [],
      models: [],
      at: Date.now(),
      error: laneResult.error,
    }
  }

  return {
    lane: laneResult.lane,
    vendors: vendorRows,
    models: laneResult.models,
    at: Date.now(),
    error: laneResult.error,
  }
}

/** The empty lane, used when the roster could not be read at all. */
const EMPTY_LANE: LaneSummary = {
  total: 0,
  available: 0,
  regionBlocked: 0,
  unavailable: 0,
  throttled: 0,
  unknown: 0,
  channelsReady: false,
  channelsError: '',
  probedAt: 0,
}

/** Read the roster and fold it into counts plus a per-model list. */
async function readLane(signal?: AbortSignal): Promise<{
  lane: LaneSummary
  models: ModelRow[]
  error: string
}> {
  try {
    const payload = await getJson(`${OFM_API}/summary`, signal) as RawSummary
    const catalog = payload.catalog ?? []
    const models: ModelRow[] = catalog.map(entry => ({
      id: String(entry.id ?? ''),
      name: String(entry.name ?? entry.id ?? ''),
      availability: String(entry.availability ?? 'unknown'),
      detail: String(entry.detail ?? ''),
      route: String(entry.route ?? ''),
    }))
    const counts = { available: 0, regionBlocked: 0, unavailable: 0, throttled: 0, unknown: 0 }
    for (const entry of models) {
      switch (entry.availability) {
        case 'available': counts.available += 1; break
        case 'region-blocked': counts.regionBlocked += 1; break
        case 'unavailable': counts.unavailable += 1; break
        case 'throttled': counts.throttled += 1; break
        default: counts.unknown += 1; break
      }
    }
    const channels = payload.channels ?? {}
    return {
      lane: {
        total: models.length,
        ...counts,
        channelsReady: channels.state === 'ready',
        channelsError: String(channels.error ?? ''),
        probedAt: Number(payload.probedAt ?? 0),
      },
      models,
      error: '',
    }
  } catch (error) {
    return { lane: EMPTY_LANE, models: [], error: messageOf(error) }
  }
}

/** Read every vendor's status and balance. */
async function readVendors(signal?: AbortSignal): Promise<VendorRow[]> {

  // A transport failure (the pack is not mounted, the socket dropped) is not a
  // per-vendor fact: it would blank the whole table, so it is caught here and
  // every row reports the same reason.
  let statuses: RawProviderStatus['statuses'] = {}
  let statusError = ''
  try {
    const status = await callChannelPack<RawProviderStatus>(
      'provider.status',
      { providers: VENDORS.map(vendor => vendor.id) },
      signal,
    )
    if (status.ok) {
      statuses = status.value.statuses ?? {}
    } else {
      statusError = status.error
    }
  } catch (error) {
    statusError = messageOf(error)
  }

  // Balances are read per vendor: the pack has no "all vendors" balance
  // endpoint, and a vendor with no accounts answers with an empty list rather
  // than an error — so a vendor that is simply not logged in costs nothing.
  const rows = await Promise.all(VENDORS.map(async vendor => {
    const entry = statuses[vendor.id]
    const base: VendorRow = {
      vendor,
      state: 'unknown',
      modelCount: Number(entry?.models?.total ?? 0),
      disabledCount: Number(entry?.models?.disabled ?? 0),
      visibleModelCount: Math.max(0, Number(entry?.models?.total ?? 0) - Number(entry?.models?.disabled ?? 0)),
      accountCount: Number(entry?.accounts?.total ?? 0),
      enabledAccountCount: Number(entry?.accounts?.enabled ?? 0),
      balance: null,
      total: null,
      accounts: [],
      error: '',
      at: Date.now(),
    }

    if (entry === undefined) {
      return {
        ...base,
        state: 'unknown' as const,
        error: statusError === '' ? 'vendor status unavailable' : statusError,
      }
    }
    // A vendor whose every model is hidden is reported as `closed` by the pack —
    // but that verdict is the *blacklist* talking, not the vendor's health. When
    // this panel is the one that hid them, the honest label is "hidden", not
    // "turned off": the vendor is still connected, its models are just not in the
    // picker.
    if (entry.closed === true) {
      const hiddenByPanel = readPanelHidden(vendor.id)
      const state: VendorState = hiddenByPanel.length > 0 ? 'hidden' : 'closed'
      return { ...base, state }
    }

    if (!vendor.balance) {
      const state: VendorState = base.enabledAccountCount > 0 ? 'on' : base.accountCount > 0 ? 'idle' : 'unknown'
      return { ...base, state }
    }

    // One vendor's failure must not take the whole table down: the read is
    // per-vendor, and a vendor whose upstream is down is a fact about that
    // vendor, not about the panel.
    let balances: Awaited<ReturnType<typeof callChannelPack<RawBalances>>>
    try {
      balances = await callChannelPack<RawBalances>('credits.balances', { provider: vendor.id }, signal)
    } catch (error) {
      balances = { ok: false, error: messageOf(error) }
    }
    if (!balances.ok) {
      // A vendor that reports "unsupported provider" simply has no balance
      // endpoint — that is a fact about the vendor, not a failure of the read.
      const unsupported = balances.error.includes('unsupported provider')
      return {
        ...base,
        state: (base.enabledAccountCount > 0 ? 'on' : base.accountCount > 0 ? 'idle' : 'unknown') as VendorState,
        error: unsupported ? '' : balances.error,
      }
    }

    const accounts: VendorAccount[] = (balances.value.accounts ?? []).map(account => ({
      accountId: String(account.accountId ?? ''),
      nickname: String(account.nickname ?? ''),
      balance: numeric(account.balance?.total),
      total: numeric(account.balance?.total),
      error: String(account.error ?? ''),
    }))
    const known = accounts.filter(account => account.balance !== null)
    const failed = accounts.filter(account => account.error !== '')
    const balance = known.length === 0 ? null : known.reduce((sum, account) => sum + (account.balance ?? 0), 0)
    const total = known.length === 0 ? null : known.reduce((sum, account) => sum + (account.total ?? 0), 0)

    const state: VendorState = base.enabledAccountCount > 0
      ? 'on'
      : base.accountCount > 0 ? 'idle' : 'unknown'

    return {
      ...base,
      state,
      balance,
      total,
      accounts,
      error: failed.length === 0 ? '' : failed[0]?.error ?? '',
    }
  }))

  return rows
}

/**
 * Read one vendor's model list, with each model's hidden flag.
 *
 * The Channel Pack's `model.list` is the same directory the model picker
 * renders, including the models the user has hidden — so it is the only place
 * that can answer "which models are hidden?".
 */
export async function readVendorModels(provider: string): Promise<VendorModel[]> {
  const result = await callChannelPack<{ models?: Array<{ id?: string, name?: string, disabled?: boolean, dead?: boolean }> }>(
    'model.list',
    { provider },
  )
  if (!result.ok) throw new Error(result.error)
  return (result.value.models ?? []).map(model => ({
    id: String(model.id ?? ''),
    name: String(model.name ?? model.id ?? ''),
    disabled: model.disabled === true,
    dead: model.dead === true,
  }))
}

/**
 * Hide (or restore) a set of one vendor's models.
 *
 * The write goes through `model.setDisabledMany` rather than a loop of
 * `model.setDisabled`: the batch endpoint writes the document once and
 * broadcasts the catalog change once, so a 500-model vendor does not
 * produce 500 writes and 500 catalog refreshes.
 *
 * @param provider - the vendor id.
 * @param modelIds - the exact model ids to change.
 * @param disabled - true hides them, false restores them.
 */
export async function setVendorModelsDisabled(
  provider: string,
  modelIds: readonly string[],
  disabled: boolean,
): Promise<HideResult> {
  const ids = [...new Set(modelIds.filter(id => id !== ''))]
  if (ids.length === 0) return { changed: 0, error: '' }
  try {
    const result = await callChannelPack('model.setDisabledMany', {
      provider,
      modelIds: ids,
      disabled,
    })
    if (!result.ok) return { changed: 0, error: result.error }
    return { changed: ids.length, error: '' }
  } catch (error) {
    return { changed: 0, error: messageOf(error) }
  }
}

/**
 * Hide every model of a vendor that is currently visible.
 *
 * The models that are *already* hidden are left alone: restoring them later
 * must not resurrect a model the user hid by hand in the settings page.
 */
export async function hideVendorModels(provider: string): Promise<HideResult> {
  const models = await readVendorModels(provider)
  const visible = models.filter(model => !model.disabled && !model.dead).map(model => model.id)
  return setVendorModelsDisabled(provider, visible, true)
}

/**
 * Restore every model of a vendor that this panel hid.
 *
 * ⚠️ The blacklist is shared with the settings page: the user may have hidden
 * models by hand there, and a blanket "restore everything" would undo those too.
 * So the panel keeps its own record of what *it* hid, and only ever restores
 * that set. The record lives in `localStorage` — the blacklist itself lives on
 * the host, and the panel's own actions are what this record tracks.
 *
 * ⚠️ The record can be missing — a fresh browser, a cleared site data, or a
 * profile wiped between the hide and the restore. Then the panel cannot tell
 * "the user hid this by hand" from "this panel hid it", and the honest answer is
 * to restore *everything* that is hidden: the models were hidden by *some*
 * action, and leaving them hidden forever is the worse failure. The user can
 * always re-hide what they actually wanted hidden.
 */
export async function restoreVendorModels(provider: string): Promise<HideResult> {
  const hidden = readPanelHidden(provider)
  let targets: string[]
  try {
    const models = await readVendorModels(provider)
    const disabledIds = models.filter(model => model.disabled).map(model => model.id)
    if (hidden.length === 0) {
      // No record: restore every hidden model of this vendor.
      targets = disabledIds
    } else {
      // With a record: restore only the models the panel hid that are *still*
      // hidden — a model the user re-opened by hand must not be touched.
      const recorded = new Set(hidden)
      targets = disabledIds.filter(id => recorded.has(id))
    }
  } catch (error) {
    if (hidden.length === 0) return { changed: 0, error: messageOf(error) }
    targets = hidden
  }
  if (targets.length === 0) {
    writePanelHidden(provider, [])
    return { changed: 0, error: '' }
  }
  const result = await setVendorModelsDisabled(provider, targets, false)
  if (result.error === '') {
    // Keep the ids that failed to open (a model that vanished from the catalog)
    // out of the record, and drop the ones we just opened.
    const opened = new Set(targets)
    writePanelHidden(provider, hidden.filter(id => !opened.has(id)))
  }
  return result
}
/** The localStorage key prefix holding the models this panel hid. */
const PANEL_HIDDEN_PREFIX = 'dsh-model-float:hidden:v1:'

/** The models this panel hid from one vendor. */
export function readPanelHidden(provider: string): string[] {
  try {
    const raw = window.localStorage.getItem(PANEL_HIDDEN_PREFIX + provider)
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Record (or clear) the models this panel hid from one vendor. */
export function writePanelHidden(provider: string, modelIds: readonly string[]): void {
  try {
    if (modelIds.length === 0) {
      window.localStorage.removeItem(PANEL_HIDDEN_PREFIX + provider)
      return
    }
    window.localStorage.setItem(PANEL_HIDDEN_PREFIX + provider, JSON.stringify([...modelIds]))
  } catch {
    /* the record is a convenience; the blacklist itself is on the host */
  }
}

/** Forget the models this panel hid from one vendor. */
export function clearPanelHidden(provider: string): void {
  writePanelHidden(provider, [])
}

/** Coerce a possibly-absent number into a number or null. */
function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Best-effort message for a thrown value. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
