import { useEffect, useState } from 'react'
import { requestApi } from './config'

type Result<T> = { key: string; status: 'success'; data: T } | { key: string; status: 'error'; message: string }

export function useApi<T>(path: string, parse: (value: unknown) => T) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)
  const key = `${path}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    requestApi(path, controller.signal)
      .then(parse)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, status: 'success', data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, status: 'error', message: error instanceof Error ? error.message : 'Error inesperado al consultar el backend.' })
      })
    return () => controller.abort()
  }, [path, parse, key])

  return {
    result: result?.key === key ? result : { status: 'loading' as const },
    retry: () => setAttempt((value) => value + 1),
  }
}
