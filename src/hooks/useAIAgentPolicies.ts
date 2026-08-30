/**
 * React Query hooks for per-agent policy overrides (ai_agent_policies, Gap D).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  aiAgentPolicyService,
  type AIAgentPolicy,
} from '@/services/aiAgentPolicyService'

const KEY = ['ai-agent-policies'] as const

export function useAIAgentPolicies() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      await aiAgentPolicyService.load(true)
      return aiAgentPolicyService.getCachedAll()
    },
    staleTime: 60_000,
  })
}

export function useUpdateAIAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ role, patch }: { role: string; patch: Partial<AIAgentPolicy> }) =>
      aiAgentPolicyService.update(role, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}
