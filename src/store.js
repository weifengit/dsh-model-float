/**
 * Model Float — durable state.
 *
 * The master switch's state must outlive a page reload *and* a DSH restart, so
 * it cannot live in the browser's `localStorage` alone: the blacklist it
 * mirrors lives on the host, and a restarted host would come back with the
 * models hidden but the switch reading "off" — a state the user cannot explain
 * or undo.
 *
 * So the host owns the truth: a small JSON file under the harness home, plus
 * a tiny JSON API the browser half reads and writes.
 *
 * @module src/store.js
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Same resolution the harness home-paths helper uses: `$DSH_HOME` else `~/.dsh`. */
export function resolveDshHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim()
  return path.join(os.homedir(), '.dsh')
}

/** The directory this plugin owns under the harness home. */
export const DATA_DIR_NAME = 'model-float'

/** The file the switch's state lives in. */
export const STATE_FILE = 'switch.json'

/** The shape written to disk. */
export const INITIAL_STATE = {
  version: 1,
  /** Whether the switch is on: unusable vendors' models are hidden. */
  enabled: false,
  /**
   * The models the switch hid, per vendor id.
   *
   * The record is what makes "off" reversible *precisely*: the blacklist is
   * shared with the settings page, so a blanket "restore everything" would
   * reopen models the user closed by hand. Only the ids listed here were
   * hidden by the switch, so only they are restored.
   */
  hidden: {},
  /** When the state was last written, for diagnostics. */
  updatedAt: 0,
}

/**
 * A tiny durable JSON store.
 *
 * Writes are coalesced and land through a temp file + rename, so a crash
 * mid-write cannot leave a truncated state file. A file the plugin owns
 * behaves identically across harness versions, and this state is neither
 * configuration nor telemetry — it is a user decision the plugin must be
 * able to honour after a restart.
 */
export class JsonStore {
  /**
   * @param {string} file - absolute path
   * @param {object} initial - value used when the file does not exist yet
   * @param {{log?: (message: string) => void}} [options] - write-failure channel
   */
  constructor(file, initial, { log } = {}) {
    this.file = file
    this.value = initial
    this.dirty = false
    this.timer = undefined
    this.disposed = false
    this.log = log
    this.writeFailed = false
    this.load()
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.value = { ...this.value, ...parsed }
      }
    } catch {
      // Absent is normal; unreadable is not. Keep the damaged file: without
      // this the next flush renames a fresh default over it and the user's
      // switch state is gone with nothing on disk to recover.
      try {
        if (fs.existsSync(this.file)) fs.copyFileSync(this.file, `${this.file}.corrupt-${Date.now()}`)
      } catch { /* a home we cannot write to is not this file's problem */ }
    }
  }

  get() {
    return this.value
  }

  /** Merge a patch in and schedule the write. Returns the new value. */
  update(patch) {
    if (this.disposed) return this.value
    this.value = { ...this.value, ...patch }
    this.schedule()
    return this.value
  }

  /** Mutate through a callback; used for read-modify-write on nested state. */
  edit(mutate) {
    if (this.disposed) return this.value
    const next = mutate(structuredClone(this.value))
    if (next !== undefined) this.value = next
    this.schedule()
    return this.value
  }

  schedule(delayMs = 400) {
    if (this.disposed) return
    this.dirty = true
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.flush()
    }, delayMs)
    // A background flush must never hold the process open.
    this.timer.unref?.()
  }

  flush() {
    if (!this.dirty || this.disposed) return
    this.dirty = false
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      const temp = `${this.file}.${process.pid}.tmp`
      fs.writeFileSync(temp, JSON.stringify(this.value, undefined, 2), { mode: 0o600 })
      fs.renameSync(temp, this.file)
      this.writeFailed = false
    } catch (error) {
      // Re-arm `dirty`: it was cleared before the attempt, so dispose()'s
      // final flush would otherwise skip a write that never landed and drop
      // the switch's last change silently.
      this.dirty = true
      if (!this.writeFailed) {
        this.writeFailed = true
        this.log?.(`model-float: could not persist ${path.basename(this.file)} (${error?.message ?? error}); changes are kept in memory only`)
      }
    }
  }

  dispose() {
    if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined }
    // Persist what this generation changed, THEN lock the store: a late
    // callback from a hot-reloaded-away generation must never write over the
    // successor's state.
    this.flush()
    this.disposed = true
    this.dirty = false
  }
}

/**
 * Normalise a stored state into the shape the API answers with.
 *
 * @param {unknown} value - the raw stored value
 * @returns {{version: number, enabled: boolean, hidden: Record<string, string[]>, updatedAt: number}}
 */
export function normalizeState(value) {
  const source = value !== null && typeof value === 'object' ? value : {}
  const hidden = {}
  for (const [provider, ids] of Object.entries(source.hidden ?? {})) {
    if (typeof provider !== 'string' || provider === '') continue
    if (!Array.isArray(ids)) continue
    const kept = ids.filter(id => typeof id === 'string' && id !== '')
    if (kept.length > 0) hidden[provider] = kept
  }
  return {
    version: 1,
    enabled: source.enabled === true,
    hidden,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt : 0,
  }
}
