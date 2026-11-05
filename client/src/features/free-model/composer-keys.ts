/**
 * Model Float — which probe key a picker row answers to.
 *
 * The picker groups models by provider route; the probe keys this plugin stores
 * are addressed differently per route, because the lane and the Channel Pack
 * learn about a model in two different ways:
 *
 * - the free lane publishes its own roster (`/summary`): a row's `id` is the key
 *   the lane's probe already uses, and the gateway forwards it under the
 *   provider route alone (`our-free-model/<id>`). The lane publishes two routes
 *   — the usable set and the region-gated one — and both carry the same ids;
 * - every other route is a Channel Pack vendor: its models are keyed
 *   `provider/model`, which is exactly what the sweep probes and the cache
 *   stores (`probeKey`).
 *
 * A model this mapping cannot address is *unknown*, not available: an unknown is
 * a question the sweep can still answer, while a wrong key would read as "no
 * verdict" forever and quietly disguise a refusal.
 *
 * @module client/src/features/free-model/composer-keys.ts
 */

import { probeKey } from './verdicts.ts'

/** The free lane's provider routes — the two the adapter publishes. */
export const LANE_ROUTES: readonly string[] = ['our-free-model', 'our-free-model-region']

/** Whether a provider route is the free lane rather than a Channel Pack vendor. */
export function isLaneRoute(provider: string): boolean {
  return LANE_ROUTES.includes(provider)
}

/**
 * The probe key for one picker row.
 *
 * @param provider - the provider group's id (`group.id`).
 * @param model - the model's provider-owned id (`model.id`).
 * @returns the key the verdict table and the availability cache use.
 */
export function pickerProbeKey(provider: string, model: string): string {
  return isLaneRoute(provider) ? model : probeKey(provider, model)
}

/**
 * The probe key for the model the session currently has selected, when that
 * model is no longer in the loaded catalog.
 *
 * A saved selection can outlive the group it came from (a vendor retired, a
 * catalog read failed). The trigger still names it, and it should read as
 * unknown rather than as available.
 *
 * @param current - the directory's saved selection.
 * @returns the key, or '' when nothing is selected.
 */
export function currentProbeKey(current: { provider: string, model: string } | null): string {
  return current === null ? '' : pickerProbeKey(current.provider, current.model)
}
