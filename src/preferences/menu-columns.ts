const KEY = 'inv.pref.menuColumns'
export const MIN_COLUMNS = 2
export const MAX_COLUMNS = 5
export const DEFAULT_COLUMNS = 4

/** Cards por fila guardadas en este dispositivo: entero exacto de 2 a 5, o 4 si falta o es invalido. */
export function readMenuColumns(): number {
  try {
    const raw = localStorage.getItem(KEY) ?? ''
    return /^[2-5]$/.test(raw) ? Number(raw) : DEFAULT_COLUMNS
  } catch {
    return DEFAULT_COLUMNS
  }
}

/** Guarda la preferencia; ignora valores fuera de rango y fallos del almacenamiento. */
export function writeMenuColumns(value: number): void {
  if (!Number.isInteger(value) || value < MIN_COLUMNS || value > MAX_COLUMNS) return
  try {
    localStorage.setItem(KEY, String(value))
  } catch {
    // Sin almacenamiento: la preferencia vale solo para esta sesion de pagina.
  }
}
