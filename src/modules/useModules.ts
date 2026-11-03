import { computed } from 'vue'
import { useSessionStore } from '../stores/session'
import { MODULES, type ModuleEntry } from './catalog'

/** Modulos cuyo permiso (alguno de `anyOf`) esta en `permissions`, en el orden del catalogo. */
export function filterModules(permissions: readonly string[]): ModuleEntry[] {
  return MODULES.filter((m) => m.anyOf.some((code) => permissions.includes(code))).sort(
    (a, b) => a.order - b.order,
  )
}

/** Modulos visibles para la sesion actual; se recalculan si la sesion cambia. */
export function useModules() {
  const session = useSessionStore()
  const visibleModules = computed(() => filterModules(session.permissions))
  /** Los permisos solo estan cargados con la sesion autenticada. */
  const isReady = computed(() => session.status === 'authenticated')
  return { visibleModules, isReady }
}
