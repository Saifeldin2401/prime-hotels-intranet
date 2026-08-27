/**
 * React Query hooks for the AI Platform Config (admin CMS control surface).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  aiPlatformConfigService,
  type AIPlatformConfig,
} from '@/services/aiPlatformConfigService'

const KEY = ['ai-platform-config'] as const

export function useAIPlatformConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => aiPlatformConfigService.load(true),
    staleTime: 60_000,
  })
}

export function useUpdateAIPlatformConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<AIPlatformConfig>) => aiPlatformConfigService.update(patch),
    onSuccess: (cfg) => {
      qc.setQueryData(KEY, cfg)
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}
