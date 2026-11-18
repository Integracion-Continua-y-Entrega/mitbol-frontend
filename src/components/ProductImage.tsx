import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Prueba las fotos de la API en orden antes de mostrar el respaldo. */
export default function ProductImage({ urls, alt, className, loading, fallback, loadAlternatives }: {
  urls: string[]
  alt: string
  className: string
  loading?: 'lazy' | 'eager'
  fallback: ReactNode
  loadAlternatives?: () => Promise<string[]>
}) {
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  const [alternatives, setAlternatives] = useState<string[]>([])
  const requestedAlternatives = useRef(false)
  const candidates = [...new Set([...urls, ...alternatives])]
  const url = candidates.find(candidate => !failedUrls.includes(candidate))

  if (!url) return fallback

  return (
    <img
      key={url}
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        const failed = [...failedUrls, url]
        setFailedUrls(failed)
        if (loadAlternatives && !requestedAlternatives.current && candidates.every(candidate => failed.includes(candidate))) {
          requestedAlternatives.current = true
          void loadAlternatives().then(setAlternatives).catch(() => undefined)
        }
      }}
    />
  )
}
