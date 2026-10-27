/**
 * Model Float — the action registry.
 *
 * The ring around the whale is a menu of *actions*, and this module is the one
 * place that knows what they are. Adding a function means adding an entry
 * here; the ring, the layout and the panel all read from this list and never
 * hard-code an action.
 *
 * An action is described by four things:
 *
 * - an **id**, stable across releases, used as the React key and as the
 *   persisted selection;
 * - a **glyph** and a **label**, so the ring can show it;
 * - a **kind**, which decides how the ring draws it (a plain wedge, or a wedge
 *   that opens a surface of its own);
 * - a **run** function, which performs the action.
 *
 * The registry is data, not behaviour: it holds no state and the actions
 * themselves own whatever they need.
 *
 * @module client/src/features/registry.ts
 */

import type { IconName } from '../ring/icons.tsx'

/**
 * How an action behaves when the ring is opened.
 *
 * - `toggle` — a surface that opens and closes (the lock screen);
 * - `momentary` — an action that runs once and reports back (memory release).
 */
export type ActionKind = 'toggle' | 'momentary'

/**
 * One action in the ring.
 */
export interface Action {
  /** Stable identity; also the React key. */
  readonly id: string
  /** The line-art icon drawn in the wedge. */
  readonly icon: IconName
  /** The action's name, shown in the tooltip. */
  readonly label: string
  /** How the action behaves. */
  readonly kind: ActionKind
  /**
   * Whether the action can run right now.
   *
   * A disabled action stays in the ring — it is greyed out rather than
   * removed, so the ring does not change shape as the machine's state
   * changes.
   */
  readonly enabled?: boolean
  /** The action's own state, for a wedge that shows a live value. */
  readonly detail?: string
  /**
   * Perform the action.
   *
   * @returns a message to show, or undefined when the action has nothing to
   *   report.
   */
  readonly run: () => Promise<string | undefined> | string | undefined
}

/**
 * The actions the ring offers, in ring order (clockwise from the top).
 *
 * The order is also the order the wedge geometry uses, so adding an action
 * here is all it takes to give it a place in the ring.
 */
export const ACTIONS: readonly Action[] = [
  {
    id: 'free-model',
    icon: 'whale',
    label: '白嫖模型',
    kind: 'toggle',
    run: () => undefined,
  },
  {
    id: 'lock-screen',
    icon: 'lock',
    label: '一键锁屏',
    kind: 'toggle',
    run: () => undefined,
  },
  {
    id: 'memory',
    icon: 'broom',
    label: '内存释放',
    kind: 'momentary',
    run: () => undefined,
  },
]

/**
 * The action with a given id.
 *
 * @param id - the action id.
 * @returns the action, or undefined.
 */
export function actionById(id: string): Action | undefined {
  return ACTIONS.find(action => action.id === id)
}

/**
 * A registry the panel fills in with the real behaviour.
 *
 * The registry separates *what* the actions are from *how* they run: the list
 * above is a declaration, and the panel supplies the implementations that
 * need React state, the host API and the current readings.
 */
export interface ActionRegistry {
  /**
   * The action list the ring renders, with the live state folded in.
   */
  readonly actions: readonly Action[]
  /**
   * Run an action by id.
   *
   * @param id - the action id.
   */
  readonly run: (id: string) => void
}
