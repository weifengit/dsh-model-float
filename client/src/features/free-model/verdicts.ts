/**
 * Model Float — per-model verdicts.
 *
 * The card answers one question per model: *can this model answer a turn right
 * now?* Three readings contribute, and they are not equally strong:
 *
 * - the free lane's own verdict (`availability` on `/summary`) — a probe the
 *   lane already ran, or a listing that merely named the model;
 * - this plugin's cache (`~/.dsh/model-float/availability.json`) — a probe the
 *   card ran through the channel gateway, which the lane knows nothing about;
 * - nothing — an unknown, which is a question, not an answer.
 *
 * The rule the card applies: a negative verdict hides the model, an unknown is
 * probed, and only a positive one earns a place in the picker. "Listing named
 * it" is not evidence of usability — the lane's own docs say a flat id list
 * discloses nothing about egress.
 *
 * @module client/src/features/free-model/verdicts.ts
 */

/** What is known about one model, at the granularity of a single model. */
export type VerdictState =
  | 'available'
  | 'region-blocked'
  | 'unavailable'
  | 'throttled'
  | 'no-credit'
  | 'no-credential'
  | 'unknown'

/** Where a verdict came from, for the card's "why" tooltip. */
export type VerdictSource = 'lane-probe' | 'lane-manual' | 'gateway-probe' | 'listing' | 'none'

export interface Verdict {
  readonly state: VerdictState
  readonly source: VerdictSource
  readonly detail: string
  /** When the reading was taken; 0 when the source never timed it. */
  readonly at: number
}

/** A stored probe, as the Host's cache keeps it. */
export interface CachedProbe {
  readonly state: VerdictState
  readonly detail: string
  readonly at: number
}

/** The verdicts the card can act on without a fresh probe. */
export const POSITIVE: VerdictState = 'available'

/** The verdicts that mean "this model cannot answer a turn". */
const NEGATIVE = new Set<VerdictState>([
  'region-blocked', 'unavailable', 'throttled', 'no-credit', 'no-credential',
])

/**
 * How long a stored verdict is trusted, by what it says.
 *
 * A lane verdict is the Host's own and never expires here (the lane re-probes
 * on its own cadence and on an egress change). A gateway probe is this
 * plugin's sample against a paid account: a refusal is cheap to keep — it
 * costs nothing to leave a model out and the reason rarely flips within an
 * hour — while a positive is the one that goes stale (a free tier refills, a
 * balance empties), so it is re-asked sooner.
 */
export function probeTtl(state: VerdictState): number {
  return state === 'available' ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000
}

/** Whether a verdict says the model works. */
export function isUsable(verdict: Verdict): boolean {
  return verdict.state === POSITIVE
}

/** Whether a verdict says the model does not work — and should not be shown. */
export function isRefused(verdict: Verdict): boolean {
  return NEGATIVE.has(verdict.state)
}

/**
 * Whether a verdict is a fact about the *vendor* rather than the model.
 *
 * "No credential configured" answers every model of that vendor the same way,
 * so a sweep that sees it once can stop spending requests on the rest.
 */
export function isVendorFault(state: VerdictState): boolean {
  return state === 'no-credential' || state === 'no-credit'
}

/** Whether the card should spend a probe on this model. */
export function needsProbe(verdict: Verdict): boolean {
  return verdict.state === 'unknown'
}

/**
 * Fold the lane's own row into a verdict.
 *
 * `availabilitySource` distinguishes the two kinds of "the lane named it": a
 * probe/manual sample is an answer, a listing is not. A listing-sourced
 * `available` would be the lane saying it *advertises* the model, which is what
 * the picker already knew.
 */
export function laneVerdict(row: {
  availability?: string
  availabilitySource?: string
  detail?: string
  probedAt?: number
}): Verdict {
  const state = normalise(row.availability)
  const source = row.availabilitySource
  if (source === 'manual') return { state, source: 'lane-manual', detail: row.detail ?? '', at: row.probedAt ?? 0 }
  if (source === 'probe') return { state, source: 'lane-probe', detail: row.detail ?? '', at: row.probedAt ?? 0 }
  // A listing never answers: an unknown stays unknown, and a verdict the lane
  // reached by probing keeps its weight (the lane only probes what it can).
  if (state === 'unknown') return { state: 'unknown', source: 'listing', detail: row.detail ?? '', at: 0 }
  return { state, source: 'lane-probe', detail: row.detail ?? '', at: row.probedAt ?? 0 }
}

/**
 * Read a cached probe, honouring the TTL.
 *
 * @param cache - the Host's stored verdicts, keyed by probe id.
 * @param id - the probe id (a lane model id, or `provider/model` for a vendor model).
 * @param now - the clock, injectable for tests.
 */
export function cachedVerdict(
  cache: Readonly<Record<string, CachedProbe>>,
  id: string,
  now: number = Date.now(),
): Verdict | undefined {
  const row = cache[id]
  if (row === undefined) return undefined
  if (row.at <= 0 || now - row.at > probeTtl(row.state)) return undefined
  return { state: row.state, source: 'gateway-probe', detail: row.detail, at: row.at }
}

/**
 * The strongest verdict available for one model.
 *
 * A cache probe beats a listing (it is a real answer this plugin paid for), and
 * the freshest answer beats the staler one when both exist.
 */
export function bestVerdict(lane: Verdict | undefined, cached: Verdict | undefined): Verdict {
  if (lane === undefined && cached === undefined) return { state: 'unknown', source: 'none', detail: '', at: 0 }
  if (lane === undefined) return cached as Verdict
  if (cached === undefined) return lane
  // The lane's own probe is a sample against the free gateway; a cache probe is
  // a sample against the vendor's. They answer different questions, so the
  // fresher wins, and a positive beats a negative at equal age.
  if (cached.at > lane.at) return cached
  if (lane.at > cached.at) return lane
  return isUsable(lane) ? lane : cached
}

/** The id a vendor model is probed and cached under. */
export function probeKey(provider: string, modelId: string): string {
  return `${provider}/${modelId}`
}

/**
 * Read a gateway refusal's words.
 *
 * The gateway answers a dead account with 402 and its own words, a missing
 * credential with 502 + 「未配置凭据」, and a refused model with a status naming
 * the model. Only the last two are facts about *this model*: an unconfigured
 * vendor is a fact about the vendor, and the card shows it on the vendor row.
 *
 * The Host owns this rule (src/gateway.js) because the probe runs there; the
 * card only reads the state it recorded.
 */

/** Coerce anything the lane or the cache says into a known state. */
function normalise(value: string | undefined): VerdictState {
  switch (value) {
    case 'available': return 'available'
    case 'region-blocked': return 'region-blocked'
    case 'unavailable': return 'unavailable'
    case 'throttled': return 'throttled'
    case 'no-credit': return 'no-credit'
    case 'no-credential': return 'no-credential'
    default: return 'unknown'
  }
}
