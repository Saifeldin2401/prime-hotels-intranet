import { useQuery } from '@tanstack/react-query'

import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'

import { fetchMyContent } from './api'
import { toContentItems } from './model'

export function useMyContent() {
  const { user } = useAuth()
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  const userId = user?.id ?? null

  return useQuery({
    queryKey: ['studio-my-content', orgId, userId],
    enabled: !!orgId && !!userId,
    staleTime: 30 * 1000,
    queryFn: async () => toContentItems(await fetchMyContent(orgId as string, userId as string)),
  })
}
