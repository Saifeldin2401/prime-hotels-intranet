import { Badge } from '@/components/ui/badge'
import type { AppRole } from '@/lib/constants'
import { ROLES } from '@/lib/constants'
import type { Profile } from '@/lib/types'
import { useTranslation } from 'react-i18next'

interface RoleBadgeProps {
  role?: AppRole
  profile?: Profile
  mode?: 'system-role' | 'job-title' | 'auto'
  showDebug?: boolean // Show both job title and system role for admins
}

export function RoleBadge({ role, profile, mode = 'auto', showDebug = false }: RoleBadgeProps) {
    const { t: t_ext } = useTranslation('extracted');
  const { t } = useTranslation(['common', 'nav'])

  // Auto mode: prefer job title if available, fall back to system role
  if (mode === 'auto') {
    if (profile?.job_title) {
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="secondary">
            {profile.job_title}
          </Badge>
          {showDebug && role && (
            <span className="text-xs text-gray-500">
              {t_ext('system_role', 'System Role:')}{ROLES[role].label}
            </span>
          )}
        </div>
      )
    }
    if (role) {
      return <Badge variant="secondary">{t(`roles.${role}`)}</Badge>
    }
    return <Badge variant="outline">{t('common.noResults')}</Badge>
  }

  // Job title mode
  if (mode === 'job-title') {
    const jobTitle = profile?.job_title || t('roles.staff')
    return <Badge variant="secondary">{jobTitle}</Badge>
  }

  // System role mode (for admin interfaces)
  if (mode === 'system-role' && role) {
    return <Badge variant="secondary">{t(`roles.${role}`)}</Badge>
  }

  return <Badge variant="outline">{t_ext('n_a', 'N/A')}</Badge>
}
