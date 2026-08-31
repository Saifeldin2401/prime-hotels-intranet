/**
 * useOfflineSync Hook
 * 
 * Manages offline synchronization state and provides UI feedback
 * for pending operations that need to be synced when back online.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getPendingSubmissions, 
  removeSubmission,
  isOnline,
  waitForOnline,
  type PendingSubmission 
} from '@/services/offlineService';

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  pendingSubmissions: PendingSubmission[];
  isSyncing: boolean;
  lastSyncError: string | null;
}

export interface OfflineSyncActions {
  refreshPending: () => Promise<void>;
  removePending: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState & OfflineSyncActions {
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Refresh pending submissions count
  const refreshPending = useCallback(async () => {
    try {
      const submissions = await getPendingSubmissions();
      setPendingSubmissions(submissions);
      setPendingCount(submissions.length);
    } catch {
      // Silent fail - storage might not be available
    }
  }, []);

  // Remove a pending submission
  const removePending = useCallback(async (id: string) => {
    try {
      await removeSubmission(id);
      await refreshPending();
    } catch {
      // Silent fail
    }
  }, [refreshPending]);

  // Attempt to sync pending submissions
  const syncNow = useCallback(async () => {
    if (!isOnline()) {
      setLastSyncError('You are offline. Please connect to the internet to sync.');
      return;
    }

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const submissions = await getPendingSubmissions();
      
      for (const submission of submissions) {
        try {
          if (submission.url) {
            const response = await fetch(submission.url, {
              method: submission.method || 'POST',
              headers: submission.headers,
              body: submission.body,
            });

            if (response.ok) {
              await removeSubmission(submission.id);
            } else {
              setLastSyncError(`Sync failed: Server returned ${response.status}`);
            }
          } else {
            await removeSubmission(submission.id);
          }
        } catch (error) {
          setLastSyncError(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await refreshPending();
    } catch {
      setLastSyncError('Failed to access offline storage');
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPending]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnlineState(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    refreshPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPending, syncNow]);

  return {
    isOnline: isOnlineState,
    pendingCount,
    pendingSubmissions,
    isSyncing,
    lastSyncError,
    refreshPending,
    removePending,
    syncNow,
  };
}

export default useOfflineSync;
