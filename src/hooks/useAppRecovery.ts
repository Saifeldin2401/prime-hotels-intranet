import { useCallback } from 'react'
import { toast } from 'sonner'
import { clearAltusServiceWorkersAndCaches } from '@/lib/runtimeRecovery'

/**
 * Hook for app recovery functionality
 * 
 * Provides methods to clear service workers and caches when users experience issues.
 * This is useful for:
 * - Stale module errors after deployments
 * - Dashboard 404 errors
 * - Cache corruption issues
 * 
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { forceRefresh, isRefreshing } = useAppRecovery()
 *   
 *   return (
 *     <Button onClick={forceRefresh} disabled={isRefreshing}>
 *       {isRefreshing ? 'Refreshing...' : 'Clear Cache & Reload'}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useAppRecovery() {
  const forceRefresh = useCallback(async () => {
    const toastId = toast.loading('Clearing cache and reloading...')
    
    try {
      console.log('[App Recovery] Clearing service workers and caches...')
      const hadArtifacts = await clearAltusServiceWorkersAndCaches()
      
      // Clear version check keys to force fresh start on next load
      localStorage.removeItem('__altus_app_version__')
      sessionStorage.removeItem('__altus_version_reload_done__')
      
      toast.success(hadArtifacts 
        ? 'Cache cleared. Reloading app...' 
        : 'No cache found. Reloading app...', 
        { id: toastId }
      )
      
      // Small delay to let the toast show
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('[App Recovery] Failed to clear cache:', error)
      toast.error('Failed to clear cache. Please try again or clear site data manually.', { id: toastId })
    }
  }, [])

  const clearVersionAndReload = useCallback(async () => {
    localStorage.removeItem('__altus_app_version__')
    sessionStorage.removeItem('__altus_version_reload_done__')
    window.location.reload()
  }, [])

  return {
    forceRefresh,
    clearVersionAndReload,
    // Expose the raw function for advanced use cases
    clearArtifacts: clearAltusServiceWorkersAndCaches,
  }
}
