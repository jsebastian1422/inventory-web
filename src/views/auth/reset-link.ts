/** Token del enlace de recuperacion: viaja en el fragmento (`#token=...`) para no llegar a logs ni Referer. */
export function readResetToken(hash: string): string {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token') ?? ''
}

/** Quita el fragmento de la URL visible (sin recargar ni tocar el historial de vue-router). */
export function clearUrlFragment(): void {
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + window.location.search,
  )
}
