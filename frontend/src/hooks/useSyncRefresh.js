import { useEffect } from 'react'

const listeners = new Set()
let eventSource = null

const resolveStreamUrl = () => {
  const configuredBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL
  const base = configuredBase ? configuredBase.replace(/\/$/, '') : '/api'
  return `${base}/stream`
}

const attachRealtime = () => {
  if (eventSource) return
  try {
    eventSource = new EventSource(resolveStreamUrl())
    eventSource.addEventListener('open', () => {
      for (const cb of listeners) cb()
    })
    eventSource.addEventListener('sales', () => {
      for (const cb of listeners) cb()
    })
    eventSource.addEventListener('inventory', () => {
      for (const cb of listeners) cb()
    })
    eventSource.addEventListener('connected', () => {
      for (const cb of listeners) cb()
    })
    eventSource.onerror = () => {
      console.warn('Realtime stream disconnected, retrying...')
    }
  } catch (error) {
    console.warn('Realtime updates unavailable', error)
  }
}

const useSyncRefresh = (callback) => {
  useEffect(() => {
    const onSync = () => callback()
    const onFocus = () => callback()
    const onStorage = (event) => {
      if (event.key === 'store-sync') {
        callback()
      }
    }

    listeners.add(callback)
    attachRealtime()

    window.addEventListener('store-sync', onSync)
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(callback)
      window.removeEventListener('store-sync', onSync)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [callback])
}

export default useSyncRefresh