import { vi } from 'vitest'

export interface MockCall {
  url: string
  init: RequestInit
}

/** Respuesta JSON (o vacia si body es undefined) para simular fetch. */
export function jsonResponse(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
  })
}

export const TOKENS = { accessToken: 'access-1', tokenType: 'Bearer', expiresIn: 900 }
export const ME = {
  user: {
    id: 'u1',
    email: 'ana@example.test',
    fullName: 'Ana Pérez',
    role: { id: 'r1', name: 'Administrador', isSystem: true },
  },
  permissions: ['users.read'],
}

/**
 * Sustituye fetch por un manejador por ruta. El manejador recibe (url, init) y devuelve una
 * Response (o la promesa de una). Devuelve el registro de llamadas.
 */
export function mockFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
): MockCall[] {
  const calls: MockCall[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init })
      return handler(url, init)
    }),
  )
  return calls
}

/** Deja correr las promesas pendientes. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
