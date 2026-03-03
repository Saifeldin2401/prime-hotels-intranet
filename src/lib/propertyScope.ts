import type { AppRole } from '@/lib/constants'
import type { Property } from '@/lib/types'

export const CONSOLIDATED_PROPERTY_ID = 'all' as const

export const isConsolidatedPropertyId = (propertyId: string | null | undefined): boolean =>
  propertyId === CONSOLIDATED_PROPERTY_ID

export const isRealPropertyId = (propertyId: string | null | undefined): propertyId is string =>
  Boolean(propertyId) && !isConsolidatedPropertyId(propertyId)

export const hasConsolidatedView = (properties: Property[]): boolean =>
  properties.some((property) => isConsolidatedPropertyId(property.id))

export const getFirstRealPropertyId = (properties: Property[]): string | null => {
  const firstProperty = properties.find((property) => isRealPropertyId(property.id))
  return firstProperty?.id ?? null
}

const consolidatedRoleSet: ReadonlySet<AppRole> = new Set(['corporate_admin', 'regional_admin'])

export const roleSupportsConsolidatedView = (role: AppRole | null | undefined): boolean =>
  Boolean(role && consolidatedRoleSet.has(role))

export const normalizePropertyScopeId = (
  requestedPropertyId: string | null | undefined,
  options: { allowConsolidated: boolean; fallbackPropertyId?: string | null }
): string | undefined => {
  const { allowConsolidated, fallbackPropertyId } = options

  if (!requestedPropertyId) {
    return fallbackPropertyId ?? undefined
  }

  if (isConsolidatedPropertyId(requestedPropertyId)) {
    return allowConsolidated ? CONSOLIDATED_PROPERTY_ID : (fallbackPropertyId ?? undefined)
  }

  return requestedPropertyId
}
