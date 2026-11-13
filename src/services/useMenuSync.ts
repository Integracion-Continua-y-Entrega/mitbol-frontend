import { useEffect } from 'react'
import { MENU_SYNC_CHANNEL, MENU_SYNC_STORAGE_KEY } from './adminApi'

/** Actualiza las consultas públicas sin interrumpir una solicitud en curso. */
export function useMenuSync(refresh: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(MENU_SYNC_CHANNEL)
        channel.onmessage = refresh
      }
    } catch { /* Algunos navegadores restringen BroadcastChannel. */ }
    const onStorage = (event: StorageEvent) => {
      if (event.key === MENU_SYNC_STORAGE_KEY) refresh()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(onVisible, 10_000)
    return () => {
      channel?.close()
      window.clearInterval(timer)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, enabled])
}
