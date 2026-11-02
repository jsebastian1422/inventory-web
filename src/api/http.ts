import { API_URL, IDENTITY_URL } from '../config'

/** Error de la API: respuesta HTTP no exitosa con el cuerpo uniforme de inventory-api. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: ReadonlyArray<{ field: string; message: string }>,
    /** Segundos de espera sugeridos (cabecera Retry-After) en un 429. */
    readonly retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** No hubo respuesta: red caida, servidor inalcanzable o bloqueo de CORS. */
export class NetworkError extends Error {
  constructor() {
    super('No hay conexion con el servidor')
    this.name = 'NetworkError'
  }
}

/** Lo que el cliente HTTP necesita de la sesion; lo registra el store de sesion. */
export interface AuthBridge {
  getAccessToken: () => string | null
  /** Renueva el access token. true = renovado; false = la sesion ya no es valida. Lanza en errores de red. */
  refresh: () => Promise<boolean>
  /** La renovacion fallo porque la sesion termino: limpiar estado y llevar al login. */
  onExpired: () => void
}

let bridge: AuthBridge = {
  getAccessToken: () => null,
  refresh: async () => false,
  onExpired: () => {},
}
let refreshing: Promise<boolean> | null = null

export function setAuthBridge(next: AuthBridge): void {
  bridge = next
  refreshing = null
}

/** Una unica renovacion en curso: todas las peticiones con 401 esperan la misma promesa. */
function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = bridge
      .refresh()
      .then((ok) => {
        if (!ok) bridge.onExpired()
        return ok
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  /** Enviar el Bearer si hay access token (por defecto si). */
  auth?: boolean
  /** Ante un 401, renovar la sesion y reintentar una vez (por defecto si). */
  retryOn401?: boolean
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

async function send(base: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { ...options.headers }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = options.auth === false ? null : bridge.getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  try {
    return await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      // La cookie de sesion solo viaja hacia /auth/*; el resto de las rutas no la necesita.
      ...(path.startsWith('/auth/') ? { credentials: 'include' as const } : {}),
    })
  } catch {
    throw new NetworkError()
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const data = (body ?? {}) as {
    message?: string
    code?: string
    details?: ApiError['details']
  }
  const retry = Number(response.headers.get('Retry-After'))
  return new ApiError(
    response.status,
    data.message ?? 'Error inesperado',
    data.code,
    data.details,
    Number.isFinite(retry) && retry > 0 ? retry : undefined,
  )
}

/**
 * Peticion JSON con Bearer. Si responde 401 renueva la sesion una sola vez (compartida entre todas
 * las peticiones en curso) y reintenta; si la renovacion falla, la sesion se cierra.
 */
export async function request<T = void>(
  base: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await send(base, path, options)
  if (response.status === 401 && options.retryOn401 !== false && options.auth !== false) {
    if (await refreshOnce()) response = await send(base, path, options)
  }
  const body = await parseBody(response)
  if (!response.ok) throw toApiError(response, body)
  return body as T
}

/** Peticion al servicio de identidad. */
export const identityRequest = <T = void>(path: string, options?: RequestOptions) =>
  request<T>(IDENTITY_URL, path, options)

/** Peticion a core (negocio). */
export const coreRequest = <T = void>(path: string, options?: RequestOptions) =>
  request<T>(API_URL, path, options)
