import type { PlatformExceptionRow } from './api'

export type PlatformExceptionKind =
  | 'failed_job'
  | 'suspended_organization'
  | 'subscription_problem'
  | 'organization_without_admin'
  | 'trial_ending'
  | 'active_session'

/** Most operationally urgent first. */
export const PLATFORM_EXCEPTION_ORDER: PlatformExceptionKind[] = [
  'failed_job',
  'suspended_organization',
  'subscription_problem',
  'organization_without_admin',
  'trial_ending',
  'active_session',
]

export interface PlatformException {
  kind: PlatformExceptionKind
  organizationId: string | null
  organizationName: string | null
  subjectId: string
  detail: string | null
  since: string | null
}

export function groupPlatformExceptions(rows: PlatformExceptionRow[]): Map<PlatformExceptionKind, PlatformException[]> {
  const groups = new Map<PlatformExceptionKind, PlatformException[]>()
  for (const r of rows) {
    if (!(PLATFORM_EXCEPTION_ORDER as string[]).includes(r.kind)) continue
    const kind = r.kind as PlatformExceptionKind
    const list = groups.get(kind) ?? []
    list.push({
      kind,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      subjectId: r.subject_id,
      detail: r.detail,
      since: r.since,
    })
    groups.set(kind, list)
  }
  // Newest first within each kind.
  for (const list of groups.values()) list.sort((a, b) => Date.parse(b.since ?? '0') - Date.parse(a.since ?? '0'))
  return groups
}
