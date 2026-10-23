/**
 * Model Float — Host half.
 *
 * The feature is a floating panel in the web shell, but one piece of it cannot
 * live in the browser: the master switch's state has to outlive a page reload
 * *and* a DSH restart, because the blacklist it mirrors lives on the host. A
 * browser-local switch would come back "off" after a restart with the models
 * still hidden — a state the user can neither explain nor undo.
 *
 * So the host owns the switch's state (a small JSON file under the harness
 * home) and serves it over one tiny same-origin route. The browser half reads
 * it on mount and writes it when the switch is toggled.
 *
 * @module index.js
 */

import fs from 'node:fs'
import path from 'node:path'
import { JsonStore, INITIAL_STATE, STATE_FILE, DATA_DIR_NAME, normalizeState, resolveDshHome } from './store.js'

export { name, version, inject, apply } from './host.js'

/** Re-exported for tests and for the host half's own use. */
export { JsonStore, INITIAL_STATE, STATE_FILE, DATA_DIR_NAME, normalizeState, resolveDshHome }
