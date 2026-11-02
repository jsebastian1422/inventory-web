import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, type CurrentUser, type SessionTokens } from '../api/auth'
import { ApiError, setAuthBridge } from '../api/http'

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'
export type SessionNotice = 'expired' | null

type SessionMessage = { type: 'login' } | { type: 'logout' }

const CHANNEL_NAME = 'inv-session'
const LOCK_NAME = 'inv-refresh'
/** Se renueva este tiempo antes del vencimiento del access token. */
const REFRESH_MARGIN_SECONDS = 60
const MIN_REFRESH_DELAY_SECONDS = 5
/** Reintento cuando una renovacion programada falla por red. */
const RETRY_DELAY_MS = 30_000

/**
 * Sesion del usuario. El access token vive SOLO en memoria (nunca en el almacenamiento del
 * navegador ni en cookies legibles); el refresh token viaja en una cookie HttpOnly que JavaScript
 * no ve.
 */
export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('unknown')
  const user = ref<CurrentUser | null>(null)
  const permissions = ref<string[]>([])
  const accessToken = ref<string | null>(null)
  /** Aviso para el login: la sesion termino sin que el usuario lo pidiera. */
  const notice = ref<SessionNotice>(null)
  const isAuthenticated = computed(() => status.value === 'authenticated')

  let timer: ReturnType<typeof setTimeout> | undefined
  let restoring: Promise<void> | null = null
  let channel: BroadcastChannel | null = null

  function post(message: SessionMessage): void {
    channel?.postMessage(message)
  }

  function listen(): void {
    if (channel || typeof BroadcastChannel === 'undefined') return
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<SessionMessage>) => {
      if (event.data?.type === 'logout') clear()
      // Otra pestana inicio sesion: la cookie ya existe, basta renovar para tener la nuestra.
      else if (event.data?.type === 'login' && status.value !== 'authenticated') void adopt()
    }
  }

  function clear(): void {
    clearTimeout(timer)
    accessToken.value = null
    user.value = null
    permissions.value = []
    status.value = 'anonymous'
  }

  function schedule(expiresIn: number): void {
    clearTimeout(timer)
    const seconds = Math.max(expiresIn - REFRESH_MARGIN_SECONDS, MIN_REFRESH_DELAY_SECONDS)
    timer = setTimeout(() => void renewInBackground(), seconds * 1000)
  }

  function apply(tokens: SessionTokens): void {
    accessToken.value = tokens.accessToken
    schedule(tokens.expiresIn)
  }

  async function loadProfile(): Promise<void> {
    const me = await authApi.me()
    user.value = me.user
    permissions.value = me.permissions
    status.value = 'authenticated'
  }

  /**
   * Renueva el access token con la cookie. true = renovado; false = sesion invalida (401).
   * Con navigator.locks, las pestanas renuevan de una en una: dos refresh simultaneos con la misma
   * cookie dispararian la deteccion de reutilizacion y cerrarian todas las sesiones.
   */
  async function refresh(): Promise<boolean> {
    const run = async (): Promise<boolean> => {
      try {
        apply(await authApi.refresh())
        return true
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return false
        throw error
      }
    }
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
    return locks ? locks.request(LOCK_NAME, run) : run()
  }

  async function renewInBackground(): Promise<void> {
    try {
      if (!(await refresh())) expire()
    } catch {
      // Sin red: se conserva la sesion y se reintenta mas tarde.
      timer = setTimeout(() => void renewInBackground(), RETRY_DELAY_MS)
    }
  }

  /** Restaura la sesion desde la cookie (otra pestana, recarga). */
  async function adopt(): Promise<void> {
    try {
      if (await refresh()) await loadProfile()
      else clear()
    } catch {
      clear()
    }
  }

  /** Arranque o recarga: intenta restaurar la sesion una sola vez antes de decidir rutas. */
  function ensureRestored(): Promise<void> {
    if (status.value !== 'unknown') return Promise.resolve()
    listen()
    restoring ??= adopt().finally(() => {
      restoring = null
    })
    return restoring
  }

  async function login(email: string, password: string): Promise<void> {
    listen()
    apply(await authApi.login(email, password))
    notice.value = null
    try {
      await loadProfile()
    } catch (error) {
      clear()
      throw error
    }
    post({ type: 'login' })
  }

  /** Cierra la sesion: si el servidor no responde, la sesion local se cierra igual. */
  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // Se cierra localmente de todos modos.
    }
    notice.value = null
    clear()
    post({ type: 'logout' })
  }

  /** La sesion termino por vencimiento o revocacion: limpiar y avisar en el login. */
  function expire(): void {
    notice.value = 'expired'
    clear()
    post({ type: 'logout' })
  }

  function dismissNotice(): void {
    notice.value = null
  }

  /** Libera el temporizador y el canal (pruebas, cierre de la app). */
  function dispose(): void {
    clearTimeout(timer)
    channel?.close()
    channel = null
  }

  setAuthBridge({ getAccessToken: () => accessToken.value, refresh, onExpired: expire })

  return {
    status,
    user,
    permissions,
    accessToken,
    notice,
    isAuthenticated,
    ensureRestored,
    login,
    logout,
    refresh,
    expire,
    dismissNotice,
    dispose,
  }
})
