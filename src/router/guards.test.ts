import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { jsonResponse, ME, mockFetch, TOKENS } from '../test/helpers'
import { useSessionStore } from '../stores/session'
import { createAppRouter } from './index'
import { resolveAccess, safeRedirect } from './guards'

afterEach(() => vi.unstubAllGlobals())

function backend(options: { cookieValid: boolean }) {
  return mockFetch((url) => {
    if (url.endsWith('/auth/refresh')) {
      return options.cookieValid
        ? jsonResponse(200, TOKENS)
        : jsonResponse(401, { code: 'INVALID_SESSION' })
    }
    if (url.endsWith('/auth/me')) return jsonResponse(200, ME)
    if (url.endsWith('/auth/login')) return jsonResponse(200, TOKENS)
    return jsonResponse(404, {})
  })
}

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createAppRouter(createMemoryHistory())
  return { pinia, router, session: useSessionStore() }
}

describe('safeRedirect', () => {
  it.each([
    ['/clientes?x=1', '/clientes?x=1'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    [undefined, '/'],
    [['/a'], '/'],
  ])('%j -> %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected)
  })
})

describe('resolveAccess', () => {
  const privateRoute = { meta: {}, fullPath: '/x?y=1', query: {} }
  const publicRoute = { meta: { public: true }, fullPath: '/ingresar', query: { redirect: '/a' } }

  it('sends anonymous users from private routes to the login keeping the target', () => {
    expect(resolveAccess(privateRoute, { isAuthenticated: false })).toEqual({
      name: 'login',
      query: { redirect: '/x?y=1' },
    })
    expect(resolveAccess(privateRoute, { isAuthenticated: false }, false)).toEqual({
      name: 'login',
      query: {},
    })
  })

  it('sends authenticated users away from public routes and lets everything else through', () => {
    expect(resolveAccess(publicRoute, { isAuthenticated: true })).toBe('/a')
    expect(resolveAccess({ ...publicRoute, query: {} }, { isAuthenticated: true })).toBe('/')
    expect(resolveAccess(publicRoute, { isAuthenticated: false })).toBe(true)
    expect(resolveAccess(privateRoute, { isAuthenticated: true })).toBe(true)
  })
})

describe('router guard', () => {
  it('CA-12: a private route without a session redirects to the login with redirect', async () => {
    backend({ cookieValid: false })
    const { router, session } = setup()
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/')
    expect(session.status).toBe('anonymous')
    session.dispose()
  })

  it('CA-12: after login the user returns to the requested route', async () => {
    backend({ cookieValid: false })
    const { pinia, router, session } = setup()
    await router.push('/')
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    await router.push('/ingresar?redirect=%2F')
    await flushPromises()
    await wrapper.find('#login-email').setValue('ana@example.test')
    await wrapper.find('#login-password').setValue('Secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(session.status).toBe('authenticated')
    session.dispose()
  })

  it('CA-12: with a session, public routes redirect to /', async () => {
    backend({ cookieValid: true })
    const { router, session } = setup()
    for (const path of ['/ingresar', '/recuperar', '/restablecer']) {
      await router.push(path)
      expect(router.currentRoute.value.fullPath).toBe('/')
    }
    session.dispose()
  })

  it('CA-12: on reload with a valid cookie the session is restored without ever rendering the login', async () => {
    backend({ cookieValid: true })
    const { pinia, router, session } = setup()
    router.push('/')
    const seen: string[] = []
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    // Before the restoration ends only the loading screen exists.
    seen.push(wrapper.html())
    await router.isReady()
    await flushPromises()
    seen.push(wrapper.html())
    expect(seen[0]).toContain('Cargando')
    expect(seen[0]).not.toContain('data-testid="sidebar"')
    expect(seen.join('')).not.toContain('login-email')
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(true)
    session.dispose()
  })

  it('the loading screen shows while the session is unknown and no dashboard is rendered', async () => {
    let release: (r: Response) => void = () => {}
    mockFetch((url) =>
      url.endsWith('/auth/refresh')
        ? new Promise<Response>((resolve) => (release = resolve))
        : jsonResponse(200, ME),
    )
    const { pinia, router, session } = setup()
    router.push('/')
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('Cargando')
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(false)
    release(jsonResponse(200, TOKENS))
    await router.isReady()
    await flushPromises()
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(true)
    session.dispose()
  })

  it('CA-13: an expired session sends the user to the login with the notice and the route', async () => {
    backend({ cookieValid: true })
    const { pinia, router, session } = setup()
    router.push('/')
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await router.isReady()
    await flushPromises()
    session.expire()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/')
    expect(wrapper.find('[data-testid="expired-notice"]').text()).toContain('Tu sesión expiró')
    session.dispose()
  })

  it('CA-14: a logout from another tab sends this one to the login', async () => {
    backend({ cookieValid: true })
    const { pinia, router, session } = setup()
    router.push('/')
    mount(App, { global: { plugins: [pinia, router] } })
    await router.isReady()
    await flushPromises()
    const otherTab = new BroadcastChannel('inv-session')
    otherTab.postMessage({ type: 'logout' })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    otherTab.close()
    session.dispose()
  })
})
