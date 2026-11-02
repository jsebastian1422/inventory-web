import { identityRequest } from './http'

export interface SessionTokens {
  accessToken: string
  tokenType: 'Bearer'
  /** Segundos de vida del access token. */
  expiresIn: number
}

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  role: { id: string; name: string; isSystem: boolean }
}

export interface MeResponse {
  user: CurrentUser
  permissions: string[]
}

/** Cabecera exigida por identity en refresh y logout (proteccion CSRF, ADR-0007). */
const CSRF_HEADERS = { 'X-Requested-With': 'inventory-web' }

export const authApi = {
  login: (email: string, password: string) =>
    identityRequest<SessionTokens>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
      retryOn401: false,
    }),
  /** El refresh token viaja solo en la cookie HttpOnly: no hay cuerpo. */
  refresh: () =>
    identityRequest<SessionTokens>('/auth/refresh', {
      method: 'POST',
      headers: CSRF_HEADERS,
      auth: false,
      retryOn401: false,
    }),
  logout: () =>
    identityRequest('/auth/logout', {
      method: 'POST',
      headers: CSRF_HEADERS,
      auth: false,
      retryOn401: false,
    }),
  me: () => identityRequest<MeResponse>('/auth/me'),
  requestPasswordReset: (email: string) =>
    identityRequest<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: { email },
      auth: false,
      retryOn401: false,
    }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    identityRequest('/auth/password-reset/confirm', {
      method: 'POST',
      body: { token, newPassword },
      auth: false,
      retryOn401: false,
    }),
}
