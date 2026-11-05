/**
 * Model Float — the homepage channel.
 *
 * The lock screen's wall is not this plugin's data. The readings it shows —
 * the machine's load, today's spend, what the DSH home is holding, the core's
 * version, the sessions that are running — are collected and published by
 * `dsh-homepage` as the sessionless `homepage/*` endpoints on the shell's
 * shared `/api` channel. Absorbing that plugin's abilities therefore means
 * calling its channel, not reimplementing eleven collectors behind it.
 *
 * Two facts about the channel shape this module:
 *
 * - the transport is offered late, so it is resolved **per call**, never
 *   captured at mount;
 * - `dsh-homepage` may simply not be installed. That is a state, not a fault:
 *   it is reported once as `absent` so the wall can say one clear sentence
 *   rather than show eleven identical failures.
 *
 * The argument map is passed through exactly as declared. The gateway
 * compares parameter names strictly, so `{ options }` is only sent for
 * endpoints that declare an `options` parameter — a card knows which it is,
 * and this layer does not guess.
 *
 * @module client/src/features/homepage/rpc.ts
 */

/** The namespace the other plugin publishes its endpoints under. */
export const HOMEPAGE_NAMESPACE = 'homepage'

/** One call's outcome: the reading, or why there is none. */
export type HomepageAnswer<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly code: HomepageFailureCode, readonly message: string }

/** Why one call did not produce a reading. */
export type HomepageFailureCode =
  /** The page has no shared transport at all. */
  | 'transport'
  /** The transport answered, and nothing serves `homepage/*`. */
  | 'absent'
  /** The endpoint ran and refused: a bad argument, a missing source. */
  | 'refused'
  /** The call never settled: a Host that is restarting, a dropped socket. */
  | 'unreachable'

/** Whether the plugin behind the channel is there. */
export type HomepageStatus = 'unknown' | 'present' | 'absent'

/** The shell's RPC verb, reached through its connection service. */
export type ChannelCall = (channel: string, endpoint: string, payload: unknown) => Promise<unknown>

/** The channel this plugin's wall reads through. */
export interface HomepageRpc {
  /** The last thing learned about the other plugin. */
  readonly status: () => HomepageStatus
  /** Listen for a change of that verdict. */
  readonly subscribe: (listener: () => void) => () => void
  /**
   * Call one `homepage/<method>` endpoint.
   *
   * @param method - the endpoint's method name, without the namespace.
   * @param args - the endpoint's declared parameter map, sent as-is.
   * @returns the reading, or the reason there is none.
   */
  readonly call: <T = unknown>(method: string, args?: Record<string, unknown>) => Promise<HomepageAnswer<T>>
}

/** What an unwrapped RPC frame looks like on the wire. */
interface RpcFrame<T> {
  readonly ok?: boolean
  readonly value?: T
  readonly error?: { readonly code?: string, readonly message?: string }
}

/**
 * Decide whether an error means "nobody is serving this namespace".
 *
 * Matched on words rather than codes because the gateway's refusal is
 * phrased in several places up the stack and the code is not stable across
 * them; anything else is treated as a real endpoint that answered badly.
 *
 * @param text - the code and message joined.
 * @returns whether this reads as a missing plugin.
 */
function looksAbsent(text: string): boolean {
  const haystack = text.toLowerCase()
  return haystack.includes('not found')
    || haystack.includes('unknown endpoint')
    || haystack.includes('unknown method')
    || haystack.includes('no endpoint')
    || haystack.includes('not registered')
    || haystack.includes('no such')
    || haystack.includes('unavailable')
}

/**
 * Build the channel over a resolver for the shell's RPC verb.
 *
 * @param readCall - returns the transport, or null when the page has none.
 *   Called on every request: the service may not exist at mount time.
 * @returns the channel.
 */
export function createHomepageRpc(readCall: () => ChannelCall | null): HomepageRpc {
  let status: HomepageStatus = 'unknown'
  const listeners = new Set<() => void>()

  const settle = (next: HomepageStatus): void => {
    if (next === status) return
    status = next
    for (const listener of [...listeners]) listener()
  }

  const call = async <T = unknown>(
    method: string,
    args?: Record<string, unknown>,
  ): Promise<HomepageAnswer<T>> => {
    const invoke = readCall()
    if (invoke === null) {
      settle('absent')
      return { ok: false, code: 'transport', message: '这个页面没有共享 RPC 通道' }
    }
    try {
      const frame = await invoke('/api', `${HOMEPAGE_NAMESPACE}/${method}`, { args: args ?? {} }) as RpcFrame<T> | undefined
      if (frame !== undefined && frame !== null && frame.ok === true) {
        settle('present')
        return { ok: true, value: frame.value as T }
      }
      const failure = frame?.error
      const text = `${failure?.code ?? ''} ${failure?.message ?? ''}`.trim()
      if (looksAbsent(text)) {
        settle('absent')
        return { ok: false, code: 'absent', message: failure?.message ?? failure?.code ?? 'dsh-homepage 不在场' }
      }
      settle('present')
      return { ok: false, code: 'refused', message: failure?.message ?? failure?.code ?? `${method} 调用失败` }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (looksAbsent(message)) {
        settle('absent')
        return { ok: false, code: 'absent', message }
      }
      return { ok: false, code: 'unreachable', message }
    }
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  return { status: () => status, subscribe, call }
}

/**
 * Read the shell's RPC verb off a client context.
 *
 * The connection service is offered late and a context wrapper may throw on a
 * service it has not resolved yet, so both the property read and the method
 * read are guarded; a page without one simply gets null and degrades.
 *
 * @param ctx - the browser plugin context, if one is in hand.
 * @returns the transport, or null.
 */
export function channelCallFrom(ctx: Record<string, any> | null | undefined): ChannelCall | null {
  if (ctx === null || ctx === undefined) return null
  let connection: any = null
  try {
    connection = ctx.connection ?? (typeof ctx.get === 'function' ? ctx.get('connection') : null)
  } catch {
    return null
  }
  const rpc = connection?.rpc
  const call = rpc?.call
  if (typeof call !== 'function' || typeof rpc !== 'object' || rpc === null) return null
  return (channel, endpoint, payload) => call.call(rpc, channel, endpoint, payload) as Promise<unknown>
}
