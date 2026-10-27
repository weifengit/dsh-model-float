/**
 * Model Float — the metrics client.
 *
 * A thin reader over the Host's `/api/model-float/metrics` route. It knows
 * the shape of one reading and nothing else; the sampling itself lives on the
 * Host, because a browser cannot read the machine's network counters.
 *
 * @module client/src/features/lockscreen/metrics-client.ts
 */

/** The Host route serving one system reading. */
export const METRICS_API = '/api/model-float/metrics'

/** The Host route that asks V8 to collect. */
export const MEMORY_API = '/api/model-float/memory/release'

/**
 * One reading of the machine's state.
 */
export interface Metrics {
  /** When the reading was taken, in epoch ms. */
  readonly at: number
  /** CPU busy fraction (0..1), or null before the second reading. */
  readonly cpu: number | null
  /** The load average over 1, 5 and 15 minutes. */
  readonly loadavg: readonly number[]
  /** The core count. */
  readonly cores: number
  /** The Host process's resident set size, in bytes. */
  readonly rss: number
  /** The Host process's used heap, in bytes. */
  readonly heapUsed: number
  /** The Host process's total heap, in bytes. */
  readonly heapTotal: number
  /** The Host process's external memory, in bytes. */
  readonly external: number
  /** The machine's total memory, in bytes. */
  readonly systemTotal: number
  /** The machine's free memory, in bytes. */
  readonly systemFree: number
  /** The machine's used memory, in bytes. */
  readonly systemUsed: number
  /** Bytes per second received, or null before the second reading. */
  readonly netDown: number | null
  /** Bytes per second sent, or null before the second reading. */
  readonly netUp: number | null
}

/** Why a memory release ended the way it did. */
export type MemoryReleaseReason = 'expose-gc-missing' | 'collected'

/** What a memory release did. */
export interface MemoryRelease {
  /** Whether V8 was asked to collect at all. */
  readonly requested: boolean
  /** How much heap the collection freed, in bytes. */
  readonly freedBytes: number
  /**
   * Why it ended that way.
   *
   * A code rather than a sentence: the Host does not know which language the
   * page is showing, so the copy belongs to the client.
   */
  readonly reason: MemoryReleaseReason
  /** The reading taken right after the release. */
  readonly memory?: Metrics
}

/**
 * Read one system reading.
 *
 * @returns the reading.
 */
export async function readMetrics(): Promise<Metrics> {
  const response = await fetch(METRICS_API, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
  return response.json() as Promise<Metrics>
}

/**
 * Ask the Host to release memory.
 *
 * @returns what the release did.
 */
export async function releaseMemory(): Promise<MemoryRelease> {
  const response = await fetch(MEMORY_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
  return response.json() as Promise<MemoryRelease>
}
