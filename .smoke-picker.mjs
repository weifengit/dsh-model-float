import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const bundle = readFileSync('dist/client.js', 'utf8')

let plugin = null

const fakeWindow = {
  __ModuleLoader__: {
    load(spec) {
      const exports = spec.factory((id) => {
        if (id === 'react') return require('react')
        if (id === 'react/jsx-runtime') return require('react/jsx-runtime')
        if (id === 'react-dom') return { createPortal: (node) => node }
        throw new Error(`unexpected external: ${id}`)
      })
      plugin = exports
      return exports
    },
  },
}

const context = vm.createContext({
  window: fakeWindow,
  document: {
    body: { appendChild() {}, removeChild() {} },
    head: { appendChild() {} },
    createElement: () => ({ style: {}, setAttribute() {}, remove() {} }),
  },
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
})
vm.runInContext(bundle, context, { filename: 'client.js' })

if (!plugin) throw new Error('bundle did not register a plugin')
console.log('registered id:', plugin.id)
console.log('inject:', JSON.stringify(plugin.inject))

const captured = []
const cleanups = []
const ctx = {
  locale: {
    bind: () => (key) => key,
    register: () => {},
  },
  effect: (fn) => {
    cleanups.push(fn())
  },
  slots: {
    inject: (id, fn) => {
      const descriptor = fn()
      captured.push({ slotId: id, ...descriptor })
    },
    register: (descriptor) => descriptor,
  },
  inject: (services, fn) => {
    const scope = {
      slots: {
        inject: (id, inner) => {
          const descriptor = inner()
          captured.push({ slotId: id, ...descriptor })
        },
        register: (descriptor) => descriptor,
      },
      modelDirectories: {
        directoryFor: () => directory,
      },
      sessions: {
        subagentAddress: () => undefined,
      },
    }
    fn(scope)
  },
}

const directory = {
  store: { subscribe: () => () => {}, getSnapshot: () => ({ groups: [] }) },
  load: () => Promise.resolve(),
  select: () => Promise.resolve(),
  resetConnected: () => {},
  dispose: () => {},
}

plugin.apply(ctx)

for (const descriptor of captured) {
  console.log('slot:', descriptor.slotId, 'name=', descriptor.name, 'priority=', descriptor.priority, 'id=', descriptor.id)
}

const modelSlot = captured.find((d) => d.slotId === 'conversation.input.model')
if (!modelSlot) throw new Error('conversation.input.model was not registered')
if (modelSlot.priority !== -100) throw new Error('model seat must shadow at -100')

const face = modelSlot.inject('sess-1')
console.log('seat keys:', Object.keys(face).sort().join(','))
if (typeof face.select !== 'function') throw new Error('seat select missing')
if (typeof face.load !== 'function') throw new Error('seat load missing')
if (face.available !== true) throw new Error('seat should be available')

for (const cleanup of cleanups) {
  if (typeof cleanup === 'function') cleanup()
}
console.log('OK')
