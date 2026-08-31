/**
 * useFeature — resolve a platform feature flag for the caller's current tenant
 * context (their org, or the org they are operating inside via an audited
 * session). Resolution order server-side: per-tenant override → plan gate →
 * platform default (see `feature_enabled` / `my_feature_enabled`, migration
 * 20260901231000).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type FeatureKey =
  | 'ai_course_generation'
  | 'ai_quiz_generation'
  | 'advanced_assessments'
  | 'learning_paths'
  | 'certifications'
  | 'ilt_sessions'
  | 'competency_framework'
  | 'knowledge_base'
  | 'custom_branding'
  | 'advanced_analytics'

export function useFeature(key: FeatureKey, orgId?: string): { enabled: boolean; isLoading: boolean } {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['feature', key, orgId ?? 'self', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('my_feature_enabled', {
        p_key: key,
        p_org_id: orgId ?? null,
      })
      if (error) {
        // Fail open only for non-gated defaults would be risky; fail closed.
        console.warn('[useFeature] resolve failed:', error.message)
        return false
      }
      return !!data
    },
  })
  return { enabled: !!data, isLoading }
}
