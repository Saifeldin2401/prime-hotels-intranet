import { useQuery } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'

import { fetchSetupGaps } from './api'
import { groupSetupGaps } from './model'

export function useSetupGaps() {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null

  return useQuery({
    queryKey: ['org-setup-gaps', orgId],
    enabled: !!orgId,
    staleTime: 60 * 1000,
    queryFn: async () => groupSetupGaps(await fetchSetupGaps(orgId as string)),
  })
}
