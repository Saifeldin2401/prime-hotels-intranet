export const GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID = '739771e0-08ff-4e07-992f-d2be1770aa59'

export const GUEST_REVIEW_EXCLUDED_PROPERTY_IDS = new Set<string>([
  GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID,
])

export function isGuestReviewEligiblePropertyId(propertyId: string | null | undefined): boolean {
  if (!propertyId) return false
  return !GUEST_REVIEW_EXCLUDED_PROPERTY_IDS.has(propertyId)
}
