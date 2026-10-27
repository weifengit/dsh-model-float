/**
 * Model Float — system metrics.
 *
 * The browser cannot read the machine's network counters, so the numbers behind
 * the lock screen's "系统状态监控" are sampled here, on the host, and served
 * to the page.
 *
 * Two samplers, because the two kinds of number need different clocks:
 *
 * - **CPU and memory** are read from `os` on demand — they are current values,
 *   and a stale one is worse than none.
 * - **network speed** is a *rate*, and a rate needs two samples. The delta
 *   between two readings is the speed; the first reading has no predecessor
 *   and is reported as null rather than as a fabricated zero.
 *
 * The sampler is request-driven: the page polls, each poll is one sample, and
 * a page that never opens the lock screen costs nothing.
 *
 * @module src/metrics.js
 */

import os from 'node:os'

/**
 * The network counters, summed over every non-internal interface.
 *
 * `os.networkInterfaces()` reports per-interface byte counters, and a machine
 * with a VPN or a container bridge has several. Summing them is the closest a
 * portable Node gives to "the machine's total traffic" — a loopback-only or
 * container-only host simply reports a small number, which is honest.
 */
function readNetworkBytes() {
  const interfaces = os.networkInterfaces()
  let received = 0
  let sent = 0
  for (const entries of Object.values(interfaces)) {
    if (entries === undefined) continue
    for (const entry of entries) {
      // Internal interfaces (loopback, docker bridges, p2p) carry the host's
      // own traffic, which would show up as a link speed nobody can use.
      if (entry.internal === true) continue
      received += entry.bytesReceived ?? 0
      sent += entry.bytesSent ?? 0
    }
  }
  return { received, sent }
}

/**
 * The CPU load, as a fraction of capacity.
 *
 * `os.loadavg()` is a run-queue depth, not a percentage, and it means nothing
 * on Windows. The portable reading is the delta of the CPU-time counters
 * across the whole interval: the sum of every core's user+system time against
 * the wall-clock time it took, divided by the core count.
 */
function readCpu() {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    for (const [kind, value] of Object.entries(cpu.times)) {
      total += value
      if (kind === 'idle') idle += value
    }
  }
  return { idle, total }
}

/**
 * A running sampler for one host.
 *
 * @param {{now?: () => number, logger?: {warn?: (message: string) => void}}} [options]
 */
export class MetricsSampler {
  /**
   * @param {object} [options] - clock and logger overrides, for tests.
   */
  constructor(options = {}) {
    this.now = options.now ?? (() => Date.now())
    this.logger = options.logger ?? console
    this.previous = undefined
    this.last = undefined
  }

  /**
   * Take one reading, computing the rates from the previous one.
   *
   * The sampler is request-driven: the page polls, and each poll is one
   * sample. The rate between two polls is therefore the rate over the poll
   * interval — a timer would only add a second, competing clock.
   */
  sample() {
    const at = this.now()
    const net = readNetworkBytes()
    const cpu = readCpu()
    const memory = process.memoryUsage()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()

    const previous = this.previous
    this.previous = { at, net, cpu }

    const seconds = previous === undefined ? 0 : (at - previous.at) / 1000
    const down = seconds > 0 ? Math.max(0, (net.received - previous.net.received) / seconds) : null
    const up = seconds > 0 ? Math.max(0, (net.sent - previous.net.sent) / seconds) : null
    const cpuUsage = previous !== undefined && cpu.total > previous.cpu.total
      ? 1 - ((cpu.idle - previous.cpu.idle) / (cpu.total - previous.cpu.total))
      : null

    const reading = {
      at,
      cpu: cpuUsage,
      loadavg: os.loadavg().map(value => Math.round(value * 100) / 100),
      cores: os.cpus().length,
      // The host process's own heap — the number a "release memory" action can
      // actually move.
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      // The machine's memory, which is what a person watching a lock screen
      // means by "内存占用".
      systemTotal: totalMemory,
      systemFree: freeMemory,
      systemUsed: totalMemory - freeMemory,
      netDown: down,
      netUp: up,
    }
    this.last = reading
    return reading
  }

  /** The most recent reading, or a fresh one if none was taken yet. */
  current() {
    return this.last ?? this.sample()
  }
}

/**
 * A process-wide sampler.
 *
 * One per host: the numbers are machine-wide, so two samplers would only
 * disagree.
 */
let shared = null

/**
 * The shared sampler, created on first use.
 *
 * @returns {MetricsSampler}
 */
export function sharedSampler() {
  if (shared === null) shared = new MetricsSampler()
  return shared
}

/**
 * Ask V8 to collect.
 *
 * Node only exposes `global.gc` when it was started with `--expose-gc`, and a
 * harness usually is not. The call is guarded, and the result says plainly
 * whether the collection actually happened — a "released 0 MB" line that
 * claims success would be a lie.
 *
 * The result carries a *reason code*, not a sentence: the Host has no idea
 * which language the page is showing, and inventing an English one is how a
 * Chinese UI ends up with an English toast. The client owns the copy.
 *
 * @returns {{requested: boolean, freedBytes: number, reason: 'expose-gc-missing' | 'collected'}}
 */
export function requestGarbageCollection() {
  const before = process.memoryUsage()
  const collector = globalThis.gc
  if (typeof collector !== 'function') {
    return { requested: false, freedBytes: 0, reason: 'expose-gc-missing' }
  }
  collector()
  const after = process.memoryUsage()
  return {
    requested: true,
    freedBytes: Math.max(0, before.heapUsed - after.heapUsed),
    reason: 'collected',
  }
}
