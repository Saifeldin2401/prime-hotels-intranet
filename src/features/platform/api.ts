import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'

export type PlatformExceptionRow = Database['public']['Functions']['get_platform_exceptions']['Returns'][number]

/**
 * Organizations and operations that need an Altus operator: suspended or
 * unadministered organizations, trials ending, billing problems, failed jobs
 * in the last week, and open break-glass sessions. Requires the
 * platform-operator permission tenant.read (hint PLATFORM_OPERATOR_REQUIRED).
 */
export async function fetchPlatformExceptions(): Promise<PlatformExceptionRow[]> {
  const { data, error } = await supabase.rpc('get_platform_exceptions')
  if (error) throw error
  return data ?? []
}
