/** URL base de la API de negocio (core); se define en VITE_API_URL (ver .env.example). */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** URL base del servicio de identidad (sesion y recuperacion); se define en VITE_IDENTITY_URL. */
export const IDENTITY_URL: string = import.meta.env.VITE_IDENTITY_URL ?? 'http://localhost:3001'
