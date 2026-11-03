import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './app'

function mockMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches }))
}

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => vi.unstubAllGlobals())

describe('app store sidebar (OBS-2)', () => {
  it('starts open on wide screens and when matchMedia is unavailable', () => {
    mockMatchMedia(false)
    expect(useAppStore().sidebarOpen).toBe(true)
  })
  it('starts closed below 768 px and still toggles', () => {
    mockMatchMedia(true)
    const app = useAppStore()
    expect(app.sidebarOpen).toBe(false)
    app.toggleSidebar()
    expect(app.sidebarOpen).toBe(true)
  })
})
