import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/http'
import { flush, jsonResponse, ME, mockFetch, TOKENS } from '../test/helpers'
import { useSessionStore } from './session'

function api(overrides: Record<string, () => Response> = {}) {
  return mockFetch((url) => {
    const key = Object.keys(overrides).find((k) => url.endsWith(k))
    if (key) return overrides[key]!()
    if (url.endsWith('/auth/login')) return jsonResponse(200, TOKENS)
    if (url.endsWith('/auth/refresh'))
      return jsonResponse(200, { ...TOKENS, accessToken: 'access-2' })
    if (url.endsWith('/auth/me')) return jsonResponse(200, ME)
    if (url.endsWith('/auth/logout')) return jsonResponse(204)
    return jsonResponse(404, {})
  })
}

let session: ReturnType<typeof useSessionStore>
beforeEach(() => {
  setActivePinia(createPinia())
  session = useSessionStore()
})
afterEach(() => {
  session.dispose()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('session store', () => {
  it('starts unknown and login authenticates with the access token only in memory', async () => {
    const calls = api()
    expect(session.status).toBe('unknown')
    await session.login('ana@example.test', 'Secret123')
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('access-1')
    expect(session.user?.fullName).toBe('Ana Pérez')
    expect(session.permissions).toEqual(['users.read'])
    const me = calls.find((c) => c.url.endsWith('/auth/me'))!
    expect((me.init.headers as Record<string, string>)['Authorization']).toBe('Bearer access-1')
    // CA-15: nothing is persisted in the browser.
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })

  it('a rejected login leaves the session anonymous-ready and rethrows', async () => {
    api({ '/auth/login': () => jsonResponse(401, { code: 'INVALID_CREDENTIALS' }) })
    await expect(session.login('a@b.co', 'x')).rejects.toBeInstanceOf(ApiError)
    expect(session.accessToken).toBeNull()
    expect(session.status).not.toBe('authenticated')
  })

  it('CA-12: ensureRestored restores from the cookie once (refresh + me)', async () => {
    const calls = api()
    await Promise.all([session.ensureRestored(), session.ensureRestored()])
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('access-2')
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1)
    const refresh = calls.find((c) => c.url.endsWith('/auth/refresh'))!
    expect(refresh.init.credentials).toBe('include')
    expect((refresh.init.headers as Record<string, string>)['X-Requested-With']).toBe(
      'inventory-web',
    )
    expect(refresh.init.body).toBeUndefined()
  })

  it('ensureRestored ends anonymous on 401 and on network failure', async () => {
    api({ '/auth/refresh': () => jsonResponse(401, { code: 'INVALID_SESSION' }) })
    await session.ensureRestored()
    expect(session.status).toBe('anonymous')

    setActivePinia(createPinia())
    const other = useSessionStore()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await other.ensureRestored()
    expect(other.status).toBe('anonymous')
    other.dispose()
  })

  it('logout revokes on the server, clears the state and still closes locally if the server fails', async () => {
    const calls = api()
    await session.login('a@b.co', 'x')
    await session.logout()
    expect(calls.some((c) => c.url.endsWith('/auth/logout'))).toBe(true)
    expect(session.status).toBe('anonymous')
    expect(session.accessToken).toBeNull()
    expect(session.user).toBeNull()

    await session.login('a@b.co', 'x')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await session.logout()
    expect(session.status).toBe('anonymous')
  })

  it('expire() clears the session and leaves the "expired" notice until dismissed', async () => {
    api()
    await session.login('a@b.co', 'x')
    session.expire()
    expect(session.status).toBe('anonymous')
    expect(session.notice).toBe('expired')
    session.dismissNotice()
    expect(session.notice).toBeNull()
  })

  it('renews the access token ahead of expiry (expiresIn - 60 s)', async () => {
    vi.useFakeTimers()
    const calls = api()
    await session.login('a@b.co', 'x')
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(839_000)
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1)
    expect(session.accessToken).toBe('access-2')
  })

  it('CA-14: logout in one tab clears the other tabs through BroadcastChannel', async () => {
    api()
    await session.login('a@b.co', 'x')
    const otherTab = new BroadcastChannel('inv-session')
    otherTab.postMessage({ type: 'logout' })
    await vi.waitFor(() => expect(session.status).toBe('anonymous'))
    otherTab.close()
  })

  it('CA-14: logging out publishes the message, and a login in another tab triggers a refresh here', async () => {
    const otherTab = new BroadcastChannel('inv-session')
    const received: unknown[] = []
    otherTab.onmessage = (event) => received.push(event.data)
    const calls = api()
    await session.ensureRestored()
    await session.logout()
    await vi.waitFor(() => expect(received).toContainEqual({ type: 'logout' }))

    const before = calls.filter((c) => c.url.endsWith('/auth/refresh')).length
    otherTab.postMessage({ type: 'login' })
    await vi.waitFor(() => expect(session.status).toBe('authenticated'))
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh')).length).toBe(before + 1)
    otherTab.close()
  })

  it('CA-14: renews inside navigator.locks when the browser has it, and without it otherwise', async () => {
    const request = vi.fn(async (_name: string, cb: () => Promise<unknown>) => cb())
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })
    api()
    expect(await session.refresh()).toBe(true)
    expect(request).toHaveBeenCalledWith('inv-refresh', expect.any(Function))
    vi.unstubAllGlobals()
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })
    api()
    expect(await session.refresh()).toBe(true)
  })

  it('CA-15: no source file uses sessionStorage or document.cookie; localStorage only in the columns preference', () => {
    const files = import.meta.glob('/src/**/*.{ts,vue}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const sources = Object.entries(files).filter(([path]) => !path.endsWith('.test.ts'))
    const forbidden = sources
      .filter(([, source]) => /sessionStorage|document\.cookie/.test(source))
      .map(([path]) => path)
    expect(forbidden).toEqual([])
    const usesLocal = sources
      .filter(([, source]) => /localStorage/.test(source))
      .map(([path]) => path)
    expect(usesLocal).toEqual(['/src/preferences/menu-columns.ts'])
    // The only allowed key is the columns preference: no token or session data.
    const prefs = files['/src/preferences/menu-columns.ts']
    expect(prefs).not.toMatch(/token|password|refresh/i)
  })
})

void flush
