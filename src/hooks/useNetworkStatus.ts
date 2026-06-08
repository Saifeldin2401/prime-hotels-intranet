import { useEffect, useState, useCallback } from 'react'

interface NetworkStatus {
  online: boolean
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    online: navigator.onLine,
    type: (navigator as any).connection?.type,
    effectiveType: (navigator as any).connection?.effectiveType,
    downlink: (navigator as any).connection?.downlink,
    rtt: (navigator as any).connection?.rtt,
  }))

  useEffect(() => {
    const handleOnline = () => setStatus((s) => ({ ...s, online: true }))
    const handleOffline = () => setStatus((s) => ({ ...s, online: false }))

    const connection = (navigator as any).connection
    const handleConnectionChange = () => {
      setStatus({
        online: navigator.onLine,
        type: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  return status
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0)

  const refreshCount = useCallback(async () => {
    // In a real implementation, this would query IndexedDB
    // For now, we'll emit a custom event when items are queued
    setPendingCount(0)
  }, [])

  useEffect(() => {
    const handleQueueUpdate = (event: CustomEvent) => {
      setPendingCount(event.detail?.count || 0)
    }

    window.addEventListener('offline-queue-updated', handleQueueUpdate as EventListener)
    return () => {
      window.removeEventListener('offline-queue-updated', handleQueueUpdate as EventListener)
    }
  }, [])

  return { pendingCount, refreshCount }
}
