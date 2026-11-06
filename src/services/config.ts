import { createApiClient } from './api'

// Única URL de respaldo; Vite sustituye VITE_API_URL durante la compilación.
export const API_URL = import.meta.env.VITE_API_URL?.trim() || 'https://mitbol-backend.onrender.com'

// La configuración se valida al consultar para poder mostrar sus errores en la página.
export function requestApi(path: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return createApiClient(API_URL)(path, signal)
  } catch {
    return Promise.reject(new Error('VITE_API_URL no es válida. Configura una URL HTTP(S) pública sin credenciales.'))
  }
}
