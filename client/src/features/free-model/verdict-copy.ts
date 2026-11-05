/**
 * Model Float — the words for a verdict.
 *
 * Two surfaces say the same thing about a model: the vendor card's row and the
 * composer picker's row. They must not drift, or a model the card calls 限流
 * reads as something else one click away, so the mapping from state to copy
 * lives here and both read it.
 *
 * @module client/src/features/free-model/verdict-copy.ts
 */

import type { VerdictState } from './verdicts.ts'

/** The translate function both surfaces are handed. */
export type Translate = (key: string, vars?: Record<string, string | number>) => string

/**
 * The label of one verdict state.
 *
 * @param state - the state to name.
 * @param t - the plugin's bound translator.
 * @returns the localized label.
 */
export function verdictLabel(state: VerdictState, t: Translate): string {
  switch (state) {
    case 'available': return t('model.available')
    case 'region-blocked': return t('model.regionBlocked')
    case 'unavailable': return t('model.unavailable')
    case 'throttled': return t('model.throttled')
    case 'no-credit': return t('model.noCredit')
    case 'no-credential': return t('model.noCredential')
    default: return t('model.untested')
  }
}

/**
 * How a verdict reads on the picker's status dot.
 *
 * Three buckets rather than seven: the dot is 6 px, and the distinction that
 * matters at that size is "works", "will not answer", and "not asked yet" —
 * the state's own name is the tooltip.
 */
export type VerdictTone = 'ok' | 'refused' | 'unknown'

/**
 * Collapse a verdict into the tone the dot paints.
 *
 * @param state - the verdict's state, or undefined when there is none.
 * @returns the tone.
 */
export function verdictTone(state: VerdictState | undefined): VerdictTone {
  if (state === 'available') return 'ok'
  if (state === undefined || state === 'unknown') return 'unknown'
  return 'refused'
}
