/**
 * Model Float — the composer's model list, with each model's probe verdict.
 *
 * The shell's composer has one model seat (`conversation.input.model`, a
 * `single` slot): the trigger that names the current model and opens the
 * provider-grouped list. This module occupies that seat at a shadowing priority
 * so the list can say what this plugin already knows — whether each model can
 * answer a turn right now — without adding a second control beside it.
 *
 * What it does *not* own: the session's model directory. Selection state,
 * catalog loading and the Model/effort submission all ride the same
 * `ModelDirectory` the shell's own entries share, so a switch made here is a
 * switch made everywhere. This component is presentation over that store plus
 * one read of the shared verdict table.
 *
 * The verdicts themselves come from {@link useVerdicts}: the lane's own probes,
 * this plugin's cached sweeps, and anything the current sweep has landed. They
 * are shown, never enforced — hiding a model stays the master switch's job, and
 * the picker must list what the Host would actually accept.
 *
 * @module client/src/features/free-model/composer-model-picker.tsx
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ComposerModelPickerProps, ModelOption, ModelSelection } from './composer-model-face.ts'
import { pickerProbeKey } from './composer-keys.ts'
import { verdictLabel, verdictTone } from './verdict-copy.ts'
import type { VerdictTone } from './verdict-copy.ts'
import { refreshReadings, useVerdicts } from './verdict-store.ts'

/** One row of the list: a model, its group, and the selection it would submit. */
interface Choice {
  readonly groupId: string
  readonly groupName: string
  readonly model: ModelOption
  readonly tone: VerdictTone
  readonly title: string
}

/** Where the portal sits until the first measure pass places it. */
const MEASURE_STYLE: React.CSSProperties = { visibility: 'hidden', left: 0, top: 0 }

/** How close to the viewport edge the panel is allowed to get. */
const VIEWPORT_MARGIN = 12

/** Above this many models the list gets a search field. */
const SEARCH_THRESHOLD = 4

/**
 * How a group is titled. The account group is the shell's own signed-in
 * provider and has a name of its own; every other group shows what the Host
 * called it.
 */
function groupTitle(id: string, name: string, t: ComposerModelPickerProps['t']): string {
  return id === 'deepseek-account' ? t('picker.account') : name
}

/** The status dot: the whole of the verdict's presence in one row. */
function VerdictDot({ tone }: { tone: VerdictTone }): React.ReactElement {
  return <span className={`mf-picker-dot is-${tone}`} aria-hidden="true" />
}

/** A line-art chevron, matching the composer's other glyphs. */
function Chevron({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      className={`mf-picker-chevron ${open ? 'is-open' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/** A tick for the selected row. */
function Check(): React.ReactElement {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/**
 * The composer model seat.
 *
 * @param props - the owner's lock flag, the injected directory face, and copy.
 * @returns the trigger and, while open, the list.
 */
export function ComposerModelPicker(props: ComposerModelPickerProps): React.ReactElement | null {
  const { locked, available, directory, load, select, t } = props
  const state = React.useSyncExternalStore(
    useCallback((fn: () => void) => directory.subscribe(fn), [directory]),
    useCallback(() => directory.getSnapshot(), [directory]),
  )
  const verdicts = useVerdicts()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPos, setMenuPos] = useState<{ left: number, top: number } | null>(null)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const id = React.useId()

  const groups = state.groups
  const busy = state.pending !== null || state.status === 'selecting'

  const current = state.current
  const currentOption = useMemo(() => {
    if (current === null) return undefined
    for (const group of groups) {
      if (group.id !== current.provider) continue
      const hit = group.models.find(model => model.id === current.model)
      if (hit !== undefined) return { group, model: hit }
    }
    return undefined
  }, [groups, current])

  const currentReasoning = currentOption?.model.reasoning
  const currentEffort = current?.reasoningEffort ?? currentReasoning?.defaultEffort

  const choices = useMemo<Choice[]>(() => {
    const needle = query.trim().toLowerCase()
    const rows: Choice[] = []
    for (const group of groups) {
      for (const model of group.models) {
        if (needle !== '' && !model.name.toLowerCase().includes(needle)) continue
        const verdict = verdicts[pickerProbeKey(group.id, model.id)]
        const state_ = verdict?.state
        rows.push({
          groupId: group.id,
          groupName: groupTitle(group.id, group.name, t),
          model,
          tone: verdictTone(state_),
          // The verdict's own words are the hover text: a throttled model and a
          // region-blocked one are both a red dot, and only this says which.
          title: state_ === undefined || state_ === 'unknown'
            ? t('picker.untested')
            : verdict?.detail !== undefined && verdict.detail !== ''
              ? `${verdictLabel(state_, t)} · ${verdict.detail}`
              : verdictLabel(state_, t),
        })
      }
    }
    return rows
  }, [groups, verdicts, query, t])

  const grouped = useMemo(() => {
    const order: string[] = []
    const byGroup = new Map<string, Choice[]>()
    for (const row of choices) {
      const bucket = byGroup.get(row.groupId)
      if (bucket === undefined) {
        order.push(row.groupId)
        byGroup.set(row.groupId, [row])
        continue
      }
      bucket.push(row)
    }
    return order.map(groupId => byGroup.get(groupId) as Choice[])
  }, [choices])

  const showSearch = groups.reduce((sum, group) => sum + group.models.length, 0) > SEARCH_THRESHOLD

  // ── reading ──────────────────────────────────────────────────────────────
  // The catalog is advisory and shared: ask for it whenever the seat mounts or
  // opens, and let failures land on the store rather than here.
  useEffect(() => {
    if (available && state.status === 'idle') load()
  }, [available, state.status, load])

  // ── verdicts ─────────────────────────────────────────────────────────────
  // The table is a shared store: the vendor card publishes into it, and a page
  // where the card is not mounted still asks for one read here.
  useEffect(() => {
    void refreshReadings()
  }, [])

  // ── placement ────────────────────────────────────────────────────────────
  // The panel is portalled onto the body so the composer's overflow cannot clip
  // it; that means it is positioned against the trigger's viewport rect and has
  // to be re-placed whenever that rect can move.
  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect === undefined) return
      const width = menuRef.current?.offsetWidth ?? 0
      const height = menuRef.current?.offsetHeight ?? 0
      let left = rect.right - width
      let top = rect.top - 8 - height
      if (width > 0) left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN)
      if (height > 0) top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - height - VIEWPORT_MARGIN)
      setMenuPos({ left, top })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, choices.length, state.status])

  // ── dismissal ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const dismiss = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node) === true) return
      if (menuRef.current?.contains(event.target as Node) === true) return
      setOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [open])

  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus()
  }, [open, showSearch])

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    setQuery('')
    if (!restoreFocus) return
    queueMicrotask(() => triggerRef.current?.focus())
  }, [])

  const submit = useCallback((selection: ModelSelection) => {
    setError('')
    void select(selection).then(result => {
      if (result === undefined) return
      if (result.ok) {
        close(true)
        return
      }
      const failure = result.error
      setError(failure === undefined
        ? t('picker.failed')
        : failure.code === 'session/writer-held'
          ? t('picker.sessionInUse')
          : `${failure.code}: ${failure.message}`)
    })
  }, [select, close, t])

  const choose = useCallback((groupId: string, model: ModelOption) => {
    if (current?.provider === groupId && current.model === model.id) {
      close(true)
      return
    }
    // A new model starts at the effort its own adapter declares: carrying the
    // previous model's level over would submit a level this one may not have.
    const effort = model.reasoning?.defaultEffort
    submit({
      provider: groupId,
      model: model.id,
      ...effort === undefined ? {} : { reasoningEffort: effort },
    })
  }, [current, submit, close])

  const chooseEffort = useCallback((effort: string | undefined) => {
    if (current === null) return
    if (currentEffort === effort) {
      close(true)
      return
    }
    submit({
      provider: current.provider,
      model: current.model,
      ...effort === undefined ? {} : { reasoningEffort: effort },
    })
  }, [current, currentEffort, submit, close])

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    close(true)
  }, [open, close])

  if (!available) return null

  const waiting = current === null && state.status === 'loading'
  const label = waiting
    ? t('picker.loading')
    : currentOption?.model.name
      ?? (current === null ? t('picker.placeholder') : `${current.provider}/${current.model}`)
  const effortName = currentReasoning === undefined
    ? undefined
    : currentEffort === undefined
      ? t('picker.providerDefault')
      : currentReasoning.efforts.find(level => level.id === currentEffort)?.name ?? currentEffort
  const triggerTone = current === null
    ? verdictTone(undefined)
    : verdictTone(verdicts[pickerProbeKey(current.provider, current.model)]?.state)

  return (
    <div className="mf-picker-root" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="mf-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        title={current === null ? t('picker.open') : `${label}${effortName === undefined ? '' : ` · ${effortName}`}`}
        disabled={locked}
        onClick={() => {
          if (open) {
            close(true)
            return
          }
          setError('')
          setOpen(true)
          load()
        }}
      >
        <VerdictDot tone={triggerTone} />
        <span className="mf-picker-label">{label}</span>
        {effortName !== undefined && <span className="mf-picker-effort">{effortName}</span>}
        <Chevron open={open} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          id={`${id}-menu`}
          className="mf-picker-menu"
          style={menuPos ?? MEASURE_STYLE}
          role="dialog"
          aria-label={t('picker.menu')}
          // The panel is portalled, so Escape typed inside it never reaches
          // the root's handler — the two events are in different DOM trees.
          onKeyDown={onKeyDown}
        >
          {showSearch && (
            <input
              ref={searchRef}
              className="mf-picker-search"
              type="search"
              value={query}
              placeholder={t('picker.search')}
              aria-label={t('picker.search')}
              onChange={event => setQuery(event.target.value)}
            />
          )}

          {state.status === 'loading' && <div className="mf-picker-note">{t('picker.loading')}</div>}
          {state.error !== null && (
            <div className="mf-picker-note is-error">
              <span>{t('picker.groupFailed', { name: t('picker.menu'), message: state.error })}</span>
              <button type="button" className="mf-picker-retry" onClick={load}>
                {t('picker.retry')}
              </button>
            </div>
          )}
          {error !== '' && <div className="mf-picker-note is-error">{error}</div>}
          {state.failures.map(failure => (
            <div className="mf-picker-note is-warning" key={failure.id}>
              {t('picker.groupFailed', { name: groupTitle(failure.id, failure.name, t), message: failure.message })}
            </div>
          ))}

          <div className="mf-picker-list" role="listbox" aria-label={t('picker.menu')}>
            {grouped.map(rows => (
              <div className="mf-picker-group" key={rows[0].groupId}>
                <div className="mf-picker-group-name">{rows[0].groupName}</div>
                {rows.map(row => {
                  const selected = current?.provider === row.groupId && current.model === row.model.id
                  return (
                    <button
                      key={row.model.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`mf-picker-row ${selected ? 'is-selected' : ''}`}
                      title={row.title}
                      disabled={busy}
                      onClick={() => choose(row.groupId, row.model)}
                    >
                      <VerdictDot tone={row.tone} />
                      <span className="mf-picker-row-name">{row.model.name}</span>
                      <span className="mf-picker-row-check">{selected ? <Check /> : null}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            {state.status === 'ready' && grouped.length === 0 && (
              <div className="mf-picker-note">
                {groups.length === 0 ? t('picker.emptyModels') : t('picker.emptySearch')}
              </div>
            )}
          </div>

          {currentReasoning !== undefined && current !== null && (
            <div className="mf-picker-efforts">
              <div className="mf-picker-group-name">{t('picker.effort')}</div>
              <div className="mf-picker-effort-row">
                {currentReasoning.defaultEffort === undefined && (
                  <button
                    type="button"
                    className={`mf-picker-effort-chip ${currentEffort === undefined ? 'is-selected' : ''}`}
                    disabled={busy}
                    onClick={() => chooseEffort(undefined)}
                  >
                    {t('picker.providerDefault')}
                  </button>
                )}
                {currentReasoning.efforts.map(level => (
                  <button
                    key={level.id}
                    type="button"
                    className={`mf-picker-effort-chip ${currentEffort === level.id ? 'is-selected' : ''}`}
                    title={level.description ?? level.name}
                    disabled={busy}
                    onClick={() => chooseEffort(level.id)}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
