import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../router'
import { jsonResponse, ME, mockFetch, TOKENS } from '../test/helpers'
import { useSessionStore } from '../stores/session'
import App from '../App.vue'

afterEach(() => vi.unstubAllGlobals())

async function mountAt(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createAppRouter(createMemoryHistory())
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, session: useSessionStore() }
}

describe('Dashboard layout', () => {
  it('renders sidebar, header, user name and the Home view at / for an authenticated user', async () => {
    mockFetch((url) =>
      url.endsWith('/auth/refresh')
        ? jsonResponse(200, TOKENS)
        : url.endsWith('/auth/me')
          ? jsonResponse(200, ME)
          : jsonResponse(404, {}),
    )
    const { wrapper, session } = await mountAt('/')
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="content"]').text()).toContain('Bienvenido, Ana')
    expect(wrapper.find('[data-testid="user-name"]').text()).toBe('Ana Pérez')
    session.dispose()
  })

  it('"Cerrar sesión" revokes the session and goes to the login', async () => {
    const calls = mockFetch((url) =>
      url.endsWith('/auth/refresh')
        ? jsonResponse(200, TOKENS)
        : url.endsWith('/auth/me')
          ? jsonResponse(200, ME)
          : url.endsWith('/auth/logout')
            ? jsonResponse(204)
            : jsonResponse(404, {}),
    )
    const { wrapper, router, session } = await mountAt('/')
    await wrapper.find('[data-testid="logout"]').trigger('click')
    await flushPromises()
    expect(calls.some((c) => c.url.endsWith('/auth/logout'))).toBe(true)
    expect(session.status).toBe('anonymous')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(false)
    session.dispose()
  })
})
