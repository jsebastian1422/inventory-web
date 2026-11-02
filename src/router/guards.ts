import type { RouteLocationNormalizedGeneric, RouteLocationRaw, Router } from 'vue-router'
import { useSessionStore } from '../stores/session'

/** Solo se aceptan rutas internas como destino: evita redirecciones abiertas (`//otro.sitio`). */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/'
}

interface SessionView {
  readonly isAuthenticated: boolean
}

/**
 * Decide si se puede entrar a `to` con la sesion actual: true, o la ruta a la que ir.
 * - Ruta privada sin sesion -> login (conserva el destino en `redirect` si `keepTarget`).
 * - Ruta publica con sesion -> el destino pedido o `/`.
 */
export function resolveAccess(
  to: Pick<RouteLocationNormalizedGeneric, 'meta' | 'fullPath' | 'query'>,
  session: SessionView,
  keepTarget = true,
): true | RouteLocationRaw {
  const isPublic = to.meta.public === true
  if (!session.isAuthenticated && !isPublic) {
    return { name: 'login', query: keepTarget ? { redirect: to.fullPath } : {} }
  }
  if (session.isAuthenticated && isPublic) return safeRedirect(to.query.redirect)
  return true
}

/**
 * Middleware de navegacion: espera a que la sesion se intente restaurar (carga o recarga) antes de
 * decidir, asi nunca se ve el dashboard ni el login de forma prematura.
 */
export function installSessionGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const session = useSessionStore()
    await session.ensureRestored()
    return resolveAccess(to, session)
  })
}
