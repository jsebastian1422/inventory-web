import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '../router'
import { useSessionStore } from '../stores/session'
import { jsonResponse, ME, mockFetch, TOKENS } from '../test/helpers'
import HomeView from './HomeView.vue'
import ModuleCard from '../components/ModuleCard.vue'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function backend(permissions: string[]) {
  mockFetch((url) =>
    url.endsWith('/auth/refresh')
      ? jsonResponse(200, TOKENS)
      : url.endsWith('/auth/me')
        ? jsonResponse(200, { ...ME, permissions })
        : url.endsWith('/auth/login')
          ? jsonResponse(200, TOKENS)
          : url.endsWith('/auth/logout')
            ? jsonResponse(204)
            : jsonResponse(404, {}),
  )
}

async function mountApp(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createAppRouter(createMemoryHistory())
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, session: useSessionStore() }
}

describe('HomeView', () => {
  it('CA-2/CA-4/CA-11: shows the permitted cards as links and the same sidebar items', async () => {
    backend(['sales.create', 'products.read', 'inventories.read'])
    const { wrapper, session } = await mountApp('/')
    const cards = wrapper.findAll('[data-testid="module-card"]')
    expect(cards.map((c) => c.find('.module-card__title').text())).toEqual([
      'Productos',
      'Inventarios',
      'Ventas',
    ])
    expect(cards.map((c) => c.attributes('href'))).toEqual(['/products', '/inventories', '/sales'])
    expect(cards[0]!.find('img').attributes('alt')).toBe('')
    expect(cards[0]!.find('.module-card__desc').text().length).toBeGreaterThan(0)
    const links = wrapper.findAll('nav a')
    expect(links.map((l) => l.text())).toEqual(['⌂ Inicio', 'Productos', 'Inventarios', 'Ventas'])
    expect(links[0]!.attributes('aria-current')).toBe('page')
    expect(links.slice(1).every((l) => l.find('img').exists())).toBe(true)
    expect(wrapper.find('[data-testid="modules-section"]').attributes('aria-busy')).toBe('false')
    expect(wrapper.find('[data-testid="module-skeleton"]').exists()).toBe(false)
    session.dispose()
  })

  it('CA-3: without catalog permissions shows the empty state and only Inicio', async () => {
    backend(['users.write'])
    const { wrapper, session } = await mountApp('/')
    expect(wrapper.find('[data-testid="modules-empty"]').text()).toBe(
      'Aún no tienes módulos asignados. Pide acceso a un administrador.',
    )
    expect(wrapper.findAll('nav a')).toHaveLength(1)
    session.dispose()
  })

  it('CA-5: shows cols x 2 skeletons with aria-busy while the session is not ready', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(HomeView, {
      global: { plugins: [pinia], stubs: { RouterLink: true } },
    })
    expect(wrapper.find('[data-testid="modules-section"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('[data-testid="module-skeleton"]')).toHaveLength(8)
    expect(wrapper.find('[data-testid="module-card"]').exists()).toBe(false)
    useSessionStore().dispose()
  })

  it('CA-7: offers 2 to 5, defaults to 4, applies and persists the choice', async () => {
    backend(['users.read'])
    const { wrapper, session } = await mountApp('/')
    const group = wrapper.find('[role="radiogroup"]')
    expect(wrapper.text()).toContain('Cards por fila')
    const buttons = group.findAll('[role="radio"]')
    expect(buttons.map((b) => b.text())).toEqual(['2', '3', '4', '5'])
    expect(group.find('[aria-checked="true"]').text()).toBe('4')
    const grid = () => wrapper.find('.module-grid').attributes('style')
    expect(grid()).toContain('--menu-pref: 4')
    await buttons[1]!.trigger('click')
    expect(grid()).toContain('--menu-pref: 3')
    expect(localStorage.getItem('inv.pref.menuColumns')).toBe('3')
    wrapper.unmount()
    const again = await mountApp('/')
    expect(again.wrapper.find('.module-grid').attributes('style')).toContain('--menu-pref: 3')
    again.session.dispose()
    session.dispose()
  })

  it('CA-8: an invalid stored value falls back to 4', async () => {
    localStorage.setItem('inv.pref.menuColumns', '9')
    backend(['users.read'])
    const { wrapper, session } = await mountApp('/')
    expect(wrapper.find('.module-grid').attributes('style')).toContain('--menu-pref: 4')
    session.dispose()
  })

  it('CA-12: another user after logout sees their own cards and sidebar', async () => {
    backend(['users.read'])
    const first = await mountApp('/')
    expect(first.wrapper.findAll('[data-testid="module-card"]')).toHaveLength(1)
    await first.wrapper.find('[data-testid="logout"]').trigger('click')
    await flushPromises()
    expect(first.router.currentRoute.value.name).toBe('login')
    backend(['stock.search', 'carts.use'])
    await first.session.login('otra@example.test', 'Secret123')
    await first.router.push('/')
    await flushPromises()
    const titles = first.wrapper.findAll('[data-testid="module-card"] .module-card__title')
    expect(titles.map((t) => t.text())).toEqual(['Existencias', 'Carritos'])
    expect(first.wrapper.findAll('nav a').map((l) => l.text())).toEqual([
      '⌂ Inicio',
      'Existencias',
      'Carritos',
    ])
    first.session.dispose()
  })
})

describe('ModuleCard', () => {
  const entry = {
    id: 'x',
    title: 'Xilofón',
    description: 'd',
    icon: '/x.svg',
    path: '/x',
    anyOf: ['x'],
    order: 1,
  }
  it('CA-6: shows its own skeleton until load, and a fallback on error, keeping the size', async () => {
    const wrapper = mount(ModuleCard, {
      props: { module: entry },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.find('.skeleton').exists()).toBe(true)
    expect(wrapper.find('img').attributes('width')).toBe('56')
    expect(wrapper.find('img').attributes('height')).toBe('56')
    expect(wrapper.find('img').attributes('loading')).toBe('lazy')
    await wrapper.find('img').trigger('load')
    expect(wrapper.find('.skeleton').exists()).toBe(false)
    const broken = mount(ModuleCard, {
      props: { module: entry },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await broken.find('img').trigger('error')
    expect(broken.find('img').exists()).toBe(false)
    expect(broken.find('.module-card__fallback').text()).toBe('X')
  })
})
