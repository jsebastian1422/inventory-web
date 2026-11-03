import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '../router'
import { resolveAccess } from '../router/guards'
import { useSessionStore } from '../stores/session'
import { jsonResponse, ME, mockFetch, TOKENS } from '../test/helpers'

afterEach(() => vi.unstubAllGlobals())

function backend(permissions: string[] | null) {
  mockFetch((url) =>
    url.endsWith('/auth/refresh')
      ? permissions
        ? jsonResponse(200, TOKENS)
        : jsonResponse(401, { code: 'INVALID_SESSION' })
      : url.endsWith('/auth/me')
        ? jsonResponse(200, { ...ME, permissions })
        : jsonResponse(404, {}),
  )
}

async function mountAt(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const history = createMemoryHistory()
  history.replace(path)
  const router = createAppRouter(history)
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await router.isReady()
  await flushPromises()
  return { wrapper, router, session: useSessionStore() }
}

describe('module routes', () => {
  it('CA-10: without the permission redirects to /', async () => {
    backend(['products.read'])
    const { router, wrapper, session } = await mountAt('/users')
    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.find('[data-testid="module-placeholder"]').exists()).toBe(false)
    session.dispose()
  })

  it('CA-10: with the permission shows "En construcción", the title and a link home', async () => {
    backend(['products.read'])
    const { router, wrapper, session } = await mountAt('/products')
    expect(router.currentRoute.value.fullPath).toBe('/products')
    const view = wrapper.find('[data-testid="module-placeholder"]')
    expect(view.text()).toContain('En construcción')
    expect(view.text()).toContain('Productos')
    expect(view.find('a').attributes('href')).toBe('/')
    expect(wrapper.find('[data-testid="header"] h1').text()).toBe('Productos')
    const active = wrapper.find('nav a[aria-current="page"]')
    expect(active.text()).toBe('Productos')
    session.dispose()
  })

  it('CA-10: without a session, cold start goes to the login with redirect', async () => {
    backend(null)
    const { router, session } = await mountAt('/sales')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/sales')
    session.dispose()
  })

  it('every catalog route requires its permission', () => {
    const route = {
      meta: { permission: ['carts.use', 'carts.read'] },
      fullPath: '/carts',
      query: {},
    }
    expect(resolveAccess(route, { isAuthenticated: true, permissions: ['carts.read'] })).toBe(true)
    expect(resolveAccess(route, { isAuthenticated: true, permissions: ['sales.read'] })).toBe('/')
    expect(resolveAccess(route, { isAuthenticated: true })).toBe('/')
    expect(resolveAccess(route, { isAuthenticated: false, permissions: [] })).toEqual({
      name: 'login',
      query: { redirect: '/carts' },
    })
  })
})
