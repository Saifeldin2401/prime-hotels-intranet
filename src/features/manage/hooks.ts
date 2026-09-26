import { useQuery } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'

import { fetchRiskQueue } from './api'
import { fetchTeamMomentum } from './momentumApi'
import { toRiskItems } from './model'

export function useRiskQueue() {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null

  return useQuery({
    queryKey: ['risk-queue', orgId],
    enabled: !!orgId,
    staleTime: 60 * 1000,
    queryFn: async () => toRiskItems(await fetchRiskQueue(orgId as string)),
  })
}

export function useTeamMomentum(weeks = 8, departmentId?: string | null) {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null

  return useQuery({
    queryKey: ['team-momentum', orgId, weeks, departmentId ?? null],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchTeamMomentum(orgId as string, weeks, departmentId),
  })
}
