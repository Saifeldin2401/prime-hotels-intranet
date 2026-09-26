import { useQuery } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'

import { fetchRiskQueue } from './api'
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
