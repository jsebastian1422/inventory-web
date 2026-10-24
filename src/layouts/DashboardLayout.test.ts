import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '../router'
import App from '../App.vue'

describe('Dashboard layout', () => {
  it('renders sidebar, header and the Home view at /', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="content"]').text()).toContain('Bienvenido')
  })
})
