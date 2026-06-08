export const UPDATE_AVAILABLE_EVENT = 'phg:update-available'

export const hasPendingAppUpdate = () => {
  if (typeof window === 'undefined') return false
  return Boolean((window as Window & { __PHG_UPDATE_AVAILABLE__?: boolean }).__PHG_UPDATE_AVAILABLE__)
}

/**
 * Activate a waiting service worker (if any) and reload to the new version.
 * Falls back to a plain reload when no worker is waiting, with a 3s safety timeout.
 */
export const applyPendingAppUpdate = async () => {
  if (typeof window === 'undefined') return

  const registrations = await navigator.serviceWorker.getRegistrations()
  const waitingWorker = registrations.find((registration) => registration.waiting)?.waiting

  if (!waitingWorker) {
    window.location.reload()
    return
  }

  await new Promise<void>((resolve) => {
    let didResolve = false
    const finish = () => {
      if (didResolve) return
      didResolve = true
      resolve()
    }

    const handleControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      finish()
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true })
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      finish()
      window.location.reload()
    }, 3000)
  })
}
