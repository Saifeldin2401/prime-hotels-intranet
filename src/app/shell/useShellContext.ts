import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/hooks/useAccountContext'

export interface ShellContext {
  /** Platform operator working on the global plane (no organization). */
  isPlatformPlane: boolean
  /** Platform operator acting inside a customer organization. */
  isOperatorSession: boolean
  organizationName: string | null
  organizationLogo: string | null
  departmentName: string | null
  roleLabel: string | null
  /** Number of organizations this person belongs to. */
  membershipCount: number
}

const pretty = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * Who am I and where am I working - one place that turns the account and
 * tenant state into the labels the shell shows (organization,
 * department, role). Read-only: switching goes through TenantContext.
 */
export function useShellContext(): ShellContext {
  const { t, i18n } = useTranslation('nav')
  const isArabic = i18n.language?.startsWith('ar')
  const location = useLocation()
  const account = useAccountContext()
  const { currentOrganization, isPlatformScope, isImpersonating } = useTenant()

  return useMemo(() => {
    const isPlatformPlane = account.isPlatformOperator && (isPlatformScope || location.pathname.startsWith('/platform'))
    const membership = account.tenantMemberships.find((m) => m.organization_id === currentOrganization?.id)
    const role = membership?.role
      ? t(`shell.roles.${membership.role}`, pretty(membership.role))
      : account.isPlatformOperator
        ? t('shell.roles.operator', 'Platform operator')
        : null

    return {
      isPlatformPlane,
      isOperatorSession: account.isPlatformOperator && isImpersonating,
      organizationName: currentOrganization
        ? (isArabic && currentOrganization.name_ar) || currentOrganization.name
        : null,
      organizationLogo: currentOrganization?.logo_url ?? null,
      departmentName: membership?.department_name ?? null,
      roleLabel: role,
      membershipCount: account.tenantMemberships.length,
    }
  }, [account, currentOrganization, isPlatformScope, isImpersonating, location.pathname, isArabic, t])
}
