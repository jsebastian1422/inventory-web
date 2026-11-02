import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../test/helpers'
import { ApiError, NetworkError, request, setAuthBridge } from './http'

const BASE = 'http://api.test'
let token: string | null
let expired: number
let refreshImpl: () => Promise<boolean>

beforeEach(() => {
  token = 'tok-old'
  expired = 0
  refreshImpl = async () => {
    token = 'tok-new'
    return true
  }
  setAuthBridge({
    getAccessToken: () => token,
    refresh: () => refreshImpl(),
    onExpired: () => {
      expired++
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('sends the Bearer token and JSON body', async () => {
    const calls = mockFetch(() => jsonResponse(200, { ok: true }))
    await request(BASE, '/things', { method: 'POST', body: { a: 1 } })
    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer tok-old')
    expect(headers['Content-Type']).toBe('application/json')
    expect(calls[0]!.init.body).toBe('{"a":1}')
  })

  it('sends credentials only towards /auth/* and omits the Bearer when auth is false', async () => {
    const calls = mockFetch(() => jsonResponse(200, {}))
    await request(BASE, '/things')
    await request(BASE, '/auth/refresh', { method: 'POST', auth: false })
    expect(calls[0]!.init.credentials).toBeUndefined()
    expect(calls[1]!.init.credentials).toBe('include')
    expect((calls[1]!.init.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  it('returns undefined for 204 and parses the error body, code, details and Retry-After', async () => {
    mockFetch((url) =>
      url.endsWith('/empty')
        ? jsonResponse(204)
        : jsonResponse(
            429,
            {
              message: 'Demasiados',
              code: 'TOO_MANY_ATTEMPTS',
              details: [{ field: 'x', message: 'm' }],
            },
            { 'Retry-After': '120' },
          ),
    )
    await expect(request(BASE, '/empty')).resolves.toBeUndefined()
    const error = await request(BASE, '/limited').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 429, code: 'TOO_MANY_ATTEMPTS', retryAfter: 120 })
    expect(error.details).toHaveLength(1)
  })

  it('turns a failed fetch into NetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(request(BASE, '/things')).rejects.toBeInstanceOf(NetworkError)
  })

  it('CA-13: several 401s trigger ONE refresh and every request is retried with the new token', async () => {
    const refresh = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10))
      token = 'tok-new'
      return true
    })
    refreshImpl = refresh
    const calls = mockFetch((_url, init) => {
      const auth = (init.headers as Record<string, string>)['Authorization']
      return auth === 'Bearer tok-new' ? jsonResponse(200, { ok: 1 }) : jsonResponse(401, {})
    })
    const results = await Promise.all([
      request(BASE, '/a'),
      request(BASE, '/b'),
      request(BASE, '/c'),
    ])
    expect(results).toHaveLength(3)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(6)
    expect(expired).toBe(0)
  })

  it('CA-13: when the refresh fails the session is expired and the request fails with 401', async () => {
    refreshImpl = async () => false
    mockFetch(() => jsonResponse(401, { message: 'Credencial inválida o expirada' }))
    const results = await Promise.all([
      request(BASE, '/a').catch((e) => e),
      request(BASE, '/b').catch((e) => e),
    ])
    for (const result of results) expect(result).toMatchObject({ status: 401 })
    expect(expired).toBe(1)
  })

  it('a refresh network failure does not expire the session', async () => {
    refreshImpl = async () => {
      throw new NetworkError()
    }
    mockFetch(() => jsonResponse(401, {}))
    await expect(request(BASE, '/a')).rejects.toBeInstanceOf(NetworkError)
    expect(expired).toBe(0)
  })

  it('does not refresh when retryOn401 is false and retries only once', async () => {
    const refresh = vi.fn(async () => true)
    refreshImpl = refresh
    mockFetch(() => jsonResponse(401, {}))
    await expect(request(BASE, '/auth/login', { retryOn401: false })).rejects.toMatchObject({
      status: 401,
    })
    expect(refresh).not.toHaveBeenCalled()
    const calls = mockFetch(() => jsonResponse(401, {}))
    await expect(request(BASE, '/a')).rejects.toMatchObject({ status: 401 })
    expect(calls).toHaveLength(2)
  })
})
