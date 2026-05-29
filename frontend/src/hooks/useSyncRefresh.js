import { useEffect } from 'react'

const useSyncRefresh = (callback) => {
  useEffect(() => {
    const onSync = () => callback()
    const onFocus = () => callback()

    window.addEventListener('store-sync', onSync)
    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('store-sync', onSync)
      window.removeEventListener('focus', onFocus)
    }
  }, [callback])
}

export default useSyncRefresh