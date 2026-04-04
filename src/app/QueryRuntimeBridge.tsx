import { focusManager, onlineManager } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { isEnabled } from '@/lib/featureFlags'

import { persistQueryCache, restoreQueryCache } from './queryPersistence'

export function QueryRuntimeBridge() {
  useState(() => {
    restoreQueryCache()
    return true
  })

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
    const debounceMs = isEnabled('debouncedFocusManager') ? 500 : 0

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
