/**
 * Model Float — the composer model seat's injected face.
 *
 * The seat (`conversation.input.model`) belongs to the shell's model-selection
 * package: its registration hands the occupant one per-session directory store
 * and the two verbs that read and write it. This plugin shadows that occupant to
 * add the probe verdicts, so it must speak the same face.
 *
 * The contract lives here, declared structurally, for two reasons: the plugin is
 * built standalone against the profile's `node_modules` and does not depend on
 * the native package's type entry, and stating what the seat consumes in one
 * place means a shifted face fails the type check instead of the picker.
 *
 * @module client/src/features/free-model/composer-model-face.ts
 */

/** One provider/model/effort the Host accepts as a selection. */
export interface ModelSelection {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** One reasoning level the selected model declares. */
export interface ModelEffort {
  readonly id: string
  readonly name: string
  readonly description?: string
}

/** One model inside one provider group. */
export interface ModelOption {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly reasoning?: {
    readonly efforts: readonly ModelEffort[]
    readonly defaultEffort?: string
  }
}

/** One provider group, as the Host's catalog groups models. */
export interface ModelGroup {
  readonly id: string
  readonly name: string
  readonly models: readonly ModelOption[]
}

/** A provider whose catalog failed to load; the loaded groups stay usable. */
export interface ModelGroupFailure {
  readonly id: string
  readonly name: string
  readonly message: string
}

/** The directory snapshot the /model popup and this seat both render. */
export interface ModelDirectorySnapshot {
  readonly current: ModelSelection | null
  readonly retainedEffort?: string
  readonly routable: boolean | null
  readonly groups: readonly ModelGroup[]
  readonly failures: readonly ModelGroupFailure[]
  readonly status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
  readonly pending: ModelSelection | null
  readonly error: string | null
}

/** A Host refusal, as the directory reports it. */
export interface ModelSelectionFailure {
  readonly code: string
  readonly message: string
}

/** The Host's answer to one selection; `ok:false` carries the refusal. */
export interface ModelSelectionResult {
  readonly ok: boolean
  readonly error?: ModelSelectionFailure
}

/** The observable store face the seat reads (a `useSyncExternalStore` source). */
export interface ModelDirectoryStore {
  getSnapshot(): ModelDirectorySnapshot
  subscribe(fn: () => void): () => void
}

/** Everything the seat component is handed: owner share + injected face + copy. */
export interface ComposerModelPickerProps {
  /** The owner locks the seat while a turn is being submitted. */
  readonly locked: boolean
  /** Whether this session may inspect and select a model at all. */
  readonly available: boolean
  readonly directory: ModelDirectoryStore
  readonly load: () => void
  readonly select: (selection: ModelSelection) => Promise<ModelSelectionResult | undefined>
  readonly t: (key: string, vars?: Record<string, string | number>) => string
}
