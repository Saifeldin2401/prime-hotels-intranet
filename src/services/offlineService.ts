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

export async function removeSubmission(id: string): Promise<void> {
  const submissions = await getPendingSubmissions();
  const filtered = submissions.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[offlineService] Failed to remove offline submission:', error);
  }
}
