// Arranque en frio (como main.ts) con enlace profundo y sin/con sesion.
import { flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { jsonResponse, ME, mockFetch, TOKENS } from '../test/helpers'
import { createAppRouter } from './index'

afterEach(() => vi.unstubAllGlobals())

async function coldStart(initial: string, cookieValid: boolean) {
  mockFetch((url) => {
    if (url.endsWith('/auth/refresh'))
      return cookieValid
        ? jsonResponse(200, TOKENS)
        : jsonResponse(401, { code: 'INVALID_SESSION' })
    if (url.endsWith('/auth/me')) return jsonResponse(200, ME)
    return jsonResponse(404, {})
  })
  const history = createMemoryHistory()
  history.replace(initial)
  const router = createAppRouter(history)
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(App).use(createPinia()).use(router)
  app.mount(el)
  await router.isReady()
  await flushPromises()
  await new Promise((r) => setTimeout(r, 20))
  await flushPromises()
  const out = {
    path: router.currentRoute.value.fullPath,
    name: router.currentRoute.value.name,
    html: el.innerHTML,
  }
  app.unmount()
  return out
}

describe('arranque en frio con enlace profundo (sin sesion)', () => {
  it('/restablecer#token=... se queda en restablecer', async () => {
    const r = await coldStart('/restablecer#token=abc', false)
    expect(r.name).toBe('reset-password')
  })
  it('/recuperar se queda en recuperar', async () => {
    const r = await coldStart('/recuperar', false)
    expect(r.name).toBe('forgot-password')
  })
  it('ruta privada profunda conserva redirect al destino original', async () => {
    const r = await coldStart('/', false)
    expect(r.name).toBe('login')
    expect(r.path).toContain('redirect=/')
  })
  it('/ingresar?redirect=/x se queda en login conservando redirect', async () => {
    const r = await coldStart('/ingresar?redirect=/x', false)
    expect(r.name).toBe('login')
    expect(r.path).toContain('redirect=/x')
  })
})
describe('arranque en frio con sesion valida', () => {
  it('/ingresar -> /', async () => {
    const r = await coldStart('/ingresar', true)
    expect(r.name).toBe('home')
  })
  it('/ -> se queda en home sin login', async () => {
    const r = await coldStart('/', true)
    expect(r.name).toBe('home')
    expect(r.html).not.toContain('Ingresar')
  })
})
