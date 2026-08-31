/**
 * Offline Sync Service
 * 
 * Provides client-side queueing and synchronization capabilities for offline work.
 */

export interface PendingSubmission {
  id: string;
  type?: string;
  entity?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'altus_offline_submissions';

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function waitForOnline(): Promise<void> {
  if (isOnline()) return Promise.resolve();

  return new Promise((resolve) => {
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };
    window.addEventListener('online', handleOnline);
  });
}

export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingSubmission[];
  } catch {
    return [];
  }
}

export async function saveSubmissionForSync(
  type: string,
  data: Record<string, unknown>,
  entity?: string
): Promise<string> {
  const submissions = await getPendingSubmissions();
  const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newSubmission: PendingSubmission = {
    id,
    type,
    entity,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  submissions.push(newSubmission);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  } catch (error) {
    console.error('[offlineService] Failed to save offline submission:', error);
  }
  return id;
}

export async function removeSubmission(id: string): Promise<void> {
  const submissions = await getPendingSubmissions();
  const filtered = submissions.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[offlineService] Failed to remove offline submission:', error);
  }
}

export async function syncPendingSubmissions(
  customProcessor?: (item: PendingSubmission) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  if (!isOnline()) {
    return { success: 0, failed: 0 };
  }

  const submissions = await getPendingSubmissions();
  if (submissions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;
  const remaining: PendingSubmission[] = [];

  for (const item of submissions) {
    try {
      let handled = false;
      if (customProcessor) {
        handled = await customProcessor(item);
      } else if (item.url) {
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: item.headers,
          body: item.body,
        });
        handled = response.ok;
      } else {
        handled = true;
      }

      if (handled) {
        successCount++;
      } else {
        failedCount++;
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
    } catch {
      failedCount++;
      remaining.push({ ...item, retryCount: item.retryCount + 1 });
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch (error) {
    console.error('[offlineService] Failed to update remaining submissions:', error);
  }

  return { success: successCount, failed: failedCount };
}
