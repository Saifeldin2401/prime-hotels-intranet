import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

/**
 * Tenant capabilities of the signed-in user in the current organization, read
 * from the database's single capability matrix (role_capabilities via
 * get_my_capabilities). Use this - not app-role lists - to decide what the UI
 * offers. The database enforces the same capabilities on every write, so this
 * is a hint for navigation, never the security boundary.
 */
export type Capability =
  | 'learning.take'
  | 'knowledge.read'
  | 'content.author'
  | 'content.publish'
  | 'assignment.manage'
  | 'certificate.issue'
  | 'reports.view'
  | 'people.manage'
  | 'org.admin'
  | 'org.settings'
  | 'audit.view'

export function useCapabilities() {
  const { user } = useAuth()
  const { currentOrganization, isLoading: tenantLoading } = useTenant()
  const orgId = currentOrganization?.id ?? null

  const query = useQuery({
    queryKey: ['my-capabilities', user?.id, orgId],
    enabled: !!user?.id && !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Capability[]> => {
      // get_my_capabilities is newer than the generated DB types.
      const rpc = supabase.rpc.bind(supabase) as unknown as (
        name: string,
        params: Record<string, unknown>
      ) => PromiseLike<{ data: string[] | null; error: { message: string } | null }>
      const { data, error } = await rpc('get_my_capabilities', { p_org_id: orgId })
      if (error) throw new Error(error.message)
      return (data ?? []) as Capability[]
    },
  })

  const capabilities = query.data ?? []
  return {
    capabilities,
    /**
     * True while the organization or its capabilities are still being
     * resolved. Callers must not treat "no capabilities yet" as "denied" -
     * on a fresh page load the organization arrives a moment after the user.
     */
    isLoading: tenantLoading || (!!orgId && query.isLoading),
    isError: query.isError,
    can: (capability: Capability) => capabilities.includes(capability),
    canAny: (...wanted: Capability[]) => wanted.some((c) => capabilities.includes(c)),
  }
}
