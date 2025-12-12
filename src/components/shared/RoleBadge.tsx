import { Badge } from '@/components/ui/badge'
import { ROLES } from '@/lib/constants'
import type { AppRole } from '@/lib/constants'
import type { Profile } from '@/lib/types'

interface RoleBadgeProps {
  role?: AppRole
  profile?: Profile
  mode?: 'system-role' | 'job-title' | 'auto'
  showDebug?: boolean // Show both job title and system role for admins
}

export function RoleBadge({ role, profile, mode = 'auto', showDebug = false }: RoleBadgeProps) {
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
              System Role: {ROLES[role].label}
            </span>
          )}
        </div>
      )
    }
    if (role) {
      return <Badge variant="secondary">{ROLES[role].label}</Badge>
    }
    return <Badge variant="outline">No Role</Badge>
  }

  // Job title mode
  if (mode === 'job-title') {
    const jobTitle = profile?.job_title || 'Employee'
    return <Badge variant="secondary">{jobTitle}</Badge>
  }

  // System role mode (for admin interfaces)
  if (mode === 'system-role' && role) {
    return <Badge variant="secondary">{ROLES[role].label}</Badge>
  }

  return <Badge variant="outline">N/A</Badge>
}
