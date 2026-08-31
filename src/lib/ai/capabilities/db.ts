/**
 * Loosely-typed Supabase accessor for tables/RPCs that are not yet in
 * src/types/database.generated.ts (knowledge_chunks, match_knowledge_chunks).
 *
 * Mirrors the established pattern in src/lib/ai/observability.ts and
 * src/services/aiPlatformConfigService.ts. Regenerate DB types
 * (`npm run db:types`) after the migrations land and this file can be deleted.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'

export interface RpcResult<T> {
  data: T | null
  error: { message: string } | null
}

export const capabilityDb = supabase as unknown as {
  from: (table: string) => any
  rpc: <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<RpcResult<T>>
}
