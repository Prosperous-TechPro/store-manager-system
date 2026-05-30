import { useEffect } from 'react'

const useSyncRefresh = (callback) => {
  useEffect(() => {
    const onSync = () => callback()
    const onFocus = () => callback()
    const onStorage = (event) => {
      if (event.key === 'store-sync') {
        callback()
      }
    }

    window.addEventListener('store-sync', onSync)
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('store-sync', onSync)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [callback])
}

export default useSyncRefresh