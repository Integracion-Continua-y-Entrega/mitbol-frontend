export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function normalizeApiUrl(value: string): string {
  const url = new URL(value.trim())
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ApiError('VITE_API_URL debe ser una URL HTTP(S) sin credenciales, parámetros ni fragmentos.')
  }
  return url.href.replace(/\/+$/, '')
}

export function createApiClient(baseUrl: string, fetcher: typeof fetch = fetch, timeoutMs = 90_000) {
  const base = normalizeApiUrl(baseUrl)

  return async (path: string, signal?: AbortSignal): Promise<unknown> => {
    const timeout = AbortSignal.timeout(timeoutMs)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
    try {
      const response = await fetcher(`${base}/${path.replace(/^\/+/, '')}`, {
        signal: combined,
        headers: { Accept: 'application/json' },
        credentials: 'omit',
      })
      if (!response.ok) {
        throw new ApiError(`El backend respondió con HTTP ${response.status}. Reintenta en unos momentos.`, response.status)
      }
      const body = await response.text()
      if (!body.trim()) return null
      try {
        return JSON.parse(body) as unknown
      } catch {
        throw new ApiError('El backend respondió con un formato distinto de JSON.')
      }
    } catch (error) {
      if (signal?.aborted) throw error
      if (error instanceof ApiError) throw error
      if (timeout.aborted) throw new ApiError('El backend tardó demasiado en responder. Render puede necesitar tiempo para iniciar; reintenta.')
      throw new ApiError('No fue posible conectar con el backend. Revisa tu conexión y VITE_API_URL. El navegador también puede bloquear la solicitud por CORS; consulta la consola para confirmarlo.')
    }
  }
}
