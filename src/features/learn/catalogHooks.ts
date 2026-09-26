import { useQuery } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'

import { fetchCatalog } from './catalogApi'

export function useCatalog() {
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  return useQuery({
    queryKey: ['learn-catalog', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchCatalog(orgId as string),
  })
}
