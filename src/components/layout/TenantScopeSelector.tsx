import React from 'react'
import { FacetedScopeCapsule } from '@/components/layout/FacetedScopeCapsule'

interface TenantScopeSelectorProps {
  className?: string
}

export function TenantScopeSelector({ className }: TenantScopeSelectorProps) {
  return <FacetedScopeCapsule className={className} />
}

export default TenantScopeSelector
