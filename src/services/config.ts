import { createApiClient } from './api'

// Conserva compatibilidad con la variable utilizada en la rama original.
const backendUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  || import.meta.env.VITE_API_URL?.trim()
  || 'https://mitbol-backend.onrender.com'

// En desarrollo utiliza el origen del dispositivo que abre la página.
// Vite reenvía /backend/api/menu a Render; el build conserva la URL pública.
export const API_URL = import.meta.env.DEV
  ? new URL('/backend', window.location.origin).href
  : backendUrl

// La configuración se valida al consultar para poder mostrar sus errores en la página.
export function requestApi(path: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return createApiClient(API_URL)(path, signal)
  } catch {
    return Promise.reject(new Error('La URL de la API no es válida. Configura VITE_API_BASE_URL con una URL HTTP(S) pública sin credenciales.'))
  }
}
