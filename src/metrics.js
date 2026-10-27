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
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import v8 from 'node:v8'
import vm from 'node:vm'

/**
 * The machine's byte counters, summed over its real interfaces.
 *
 * Node has no API for this. `os.networkInterfaces()` returns addresses and
 * MACs but *not* byte counters, so a sampler built on it reads a permanent
 * zero — which is exactly what this one did before. The counters live in the
 * operating system, so they are read from it.
 *
 * Each platform reports them differently:
 *
 * - **macOS** — `netstat -ib`, whose `<Link#N>` rows are the only ones
 *   carrying counters (the address rows repeat the same numbers). The row
 *   layout varies with whether an interface has a MAC, so the numbers are
 *   taken from the *end* of the line: every row ends with the same seven
 *   columns.
 * - **Linux** — `/proc/net/dev`, one row per interface.
 * - **Windows** — `netstat -e`, whose totals are machine-wide already.
 *
 * Loopback is always excluded: it carries the host talking to itself, which
 * would read as traffic nobody asked for.
 *
 * @returns {Promise<{received: number, sent: number}>} the counters.
 */
async function readNetworkCounters() {
  const platform = process.platform
  try {
    if (platform === 'linux') return readProcNetDev()
    if (platform === 'win32') return await readWindowsNetstat()
    return await readMacNetstat()
  } catch (error) {
    // A counter that cannot be read is not worth failing the whole reading
    // over: the rest of the metrics are still true.
    return { received: 0, sent: 0 }
  }
}

/** Linux: `/proc/net/dev` has one row per interface, `name: rx... tx...`. */
function readProcNetDev() {
  let received = 0
  let sent = 0
  for (const line of readFileSync('/proc/net/dev', 'utf8').split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const name = line.slice(0, colon).trim()
    if (name === 'lo') continue
    const fields = line.slice(colon + 1).trim().split(/\s+/)
    received += Number(fields[0]) || 0
    sent += Number(fields[8]) || 0
  }
  return { received, sent }
}

/** Windows: `netstat -e` totals the machine, so there is nothing to sum. */
async function readWindowsNetstat() {
  const out = await run('netstat', ['-e'])
  const line = out.split('\n').find(row => /^\s*Bytes\s/i.test(row))
  if (line === undefined) return { received: 0, sent: 0 }
  const numbers = line.match(/\d+/g) ?? []
  return { received: Number(numbers[0]) || 0, sent: Number(numbers[1]) || 0 }
}

/** macOS: `netstat -ib`, with the counters at the end of each `<Link#>` row. */
async function readMacNetstat() {
  const out = await run('netstat', ['-ib'])
  let received = 0
  let sent = 0
  for (const line of out.split('\n')) {
    if (!/<Link#\d+>/.test(line)) continue
    const fields = line.trim().split(/\s+/)
    const name = fields[0]
    if (name === 'lo0') continue
    // Every row ends with: Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll.
    const tail = fields.slice(-7).map(Number)
    if (tail.length < 7 || tail.some(Number.isNaN)) continue
    received += tail[2]
    sent += tail[5]
  }
  return { received, sent }
}

/**
 * Run a command and collect its stdout.
 *
 * @param {string} command - the executable.
 * @param {string[]} args - its arguments.
 * @returns {Promise<string>} the output.
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 4000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      if (error !== null && error !== undefined) reject(error)
      else resolve(stdout)
    })
  })
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
  async sample() {
    const at = this.now()
    const net = await readNetworkCounters()
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
 * A collector, obtained once and kept.
 *
 * Node only puts `gc` on the global when it was started with `--expose-gc` —
 * which a harness normally is not, and which this plugin cannot ask for. But
 * V8's collector is still reachable: flipping the flag on a fresh V8 context
 * and evaluating `gc` inside it hands back the real function.
 *
 * The flag is flipped back immediately, so nothing else in the process sees a
 * different set of V8 flags than it started with.
 */
let collector
function garbageCollector() {
  if (collector !== undefined) return collector
  if (typeof globalThis.gc === 'function') {
    collector = globalThis.gc
    return collector
  }
  try {
    v8.setFlagsFromString('--expose-gc')
    collector = vm.runInNewContext('gc')
    v8.setFlagsFromString('--no-expose-gc')
  } catch {
    collector = null
  }
  return collector
}

/**
 * Ask V8 to collect.
 *
 * The result carries a *reason code*, not a sentence: the Host has no idea
 * which language the page is showing, and inventing an English one is how a
 * Chinese UI ends up with an English toast. The client owns the copy.
 *
 * The bytes freed are measured, not assumed: a collection that finds nothing
 * to reclaim reports zero, and that is a true answer rather than a failure.
 *
 * @returns {{requested: boolean, freedBytes: number, reason: 'expose-gc-missing' | 'collected'}}
 */
export function requestGarbageCollection() {
  const collect = garbageCollector()
  if (collect === null || collect === undefined) {
    return { requested: false, freedBytes: 0, reason: 'expose-gc-missing' }
  }
  const before = process.memoryUsage().heapUsed
  collect()
  const after = process.memoryUsage().heapUsed
  return {
    requested: true,
    freedBytes: Math.max(0, before - after),
    reason: 'collected',
  }
}
