import { ApiError, NetworkError } from '../../api/http'

export const NETWORK_MESSAGE =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
export const SERVER_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Formato de correo valido (la validacion definitiva es del servidor). */
export function isValidEmail(value: string): boolean {
  const email = value.trim()
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

/** Texto de espera para un 429: "1 minuto" / "5 minutos" / "30 segundos". */
export function waitText(seconds?: number): string {
  if (!seconds) return 'unos minutos'
  if (seconds < 60) return `${seconds} segundos`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`
}

/** Mensaje comun para fallos de red y de servidor; null si el error es otro. */
export function transportMessage(error: unknown): string | null {
  if (error instanceof NetworkError) return NETWORK_MESSAGE
  if (error instanceof ApiError && error.status >= 500) return SERVER_MESSAGE
  return null
}

/** Mensaje del login: generico para no revelar si el correo existe. */
export function loginMessage(error: unknown): string {
  const transport = transportMessage(error)
  if (transport) return transport
  if (error instanceof ApiError && error.status === 429) {
    return `Demasiados intentos. Espera ${waitText(error.retryAfter)} antes de volver a intentarlo.`
  }
  if (error instanceof ApiError && error.status === 401) {
    return 'El correo o la contraseña no son correctos.'
  }
  return SERVER_MESSAGE
}
