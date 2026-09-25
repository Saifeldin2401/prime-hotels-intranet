import { focusManager, onlineManager } from '@tanstack/react-query'
import { useEffect } from 'react'


import { supabase } from '@/lib/supabase'
import { clearQueryCache, persistQueryCache, restoreQueryCache, setQueryCacheUser } from './queryPersistence'

export function QueryRuntimeBridge() {
  // Restore the cached snapshot only once we know who is signed in, and only
  // if it was written for that member and organization. Signing out, or a
  // different member signing in, wipes every cached query.
  useEffect(() => {
    let userId: string | null = null
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null
      if (event === 'INITIAL_SESSION') {
        userId = nextUserId
        setQueryCacheUser(nextUserId)
        if (nextUserId) restoreQueryCache()
        return
      }
      if (event === 'SIGNED_OUT' || (userId && nextUserId !== userId)) {
        clearQueryCache()
      }
      userId = nextUserId
      setQueryCacheUser(nextUserId)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistQueryCache()
      }
    }

    const handlePageHide = () => {
      persistQueryCache()
    }

    const handleBeforeUnload = () => {
      persistQueryCache()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    let debounceTimer: number | null = null
    const debounceMs = 500

    focusManager.setEventListener((handleFocus) => {
      const onFocus = () => {
        if (document.visibilityState !== 'visible') return

        if (debounceTimer) window.clearTimeout(debounceTimer)
        debounceTimer = window.setTimeout(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            handleFocus()
          }
        }, debounceMs)
      }

      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)

      return () => {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
        if (debounceTimer) window.clearTimeout(debounceTimer)
      }
    })

    onlineManager.setEventListener((handleOnline) => {
      const onOnline = () => {
        window.setTimeout(() => handleOnline(true), 1000)
      }
      const onOffline = () => handleOnline(false)

      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)

      return () => {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    })
  }, [])

  return null
}
