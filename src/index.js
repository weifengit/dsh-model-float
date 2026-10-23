/**
 * Model Float — Host half.
 *
 * The feature is entirely a browser surface: a draggable whale-girl that floats
 * over the DSH shell and, on hover, lists every free-model vendor with its
 * connection state and remaining credit. There is nothing for the Host to do
 * beyond existing, so this half is deliberately empty.
 *
 * @module index.js
 */

/** No host services are required. */
export const inject = []

/**
 * Apply the (empty) node half.
 *
 * @param {unknown} _ctx - host context, unused.
 * @param {Record<string, unknown>} _config - plugin config, unused.
 */
export function apply(_ctx, _config = {}) {}
