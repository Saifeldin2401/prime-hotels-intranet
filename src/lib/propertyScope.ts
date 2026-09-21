import type { AppRole } from '@/lib/constants'
export const CONSOLIDATED_PROPERTY_ID = 'all' as const

export const isConsolidatedPropertyId = (propertyId: string | null | undefined): boolean =>
  propertyId === CONSOLIDATED_PROPERTY_ID

export const isRealPropertyId = (propertyId: string | null | undefined): propertyId is string =>
  Boolean(propertyId) && !isConsolidatedPropertyId(propertyId)
const consolidatedRoleSet: ReadonlySet<AppRole> = new Set(['corporate_admin', 'regional_admin'])

export const roleSupportsConsolidatedView = (role: AppRole | null | undefined): boolean =>
  Boolean(role && consolidatedRoleSet.has(role))
