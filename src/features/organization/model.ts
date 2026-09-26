import type { SetupGapRow } from './api'

export type SetupGapKind =
  | 'unplaced_member'
  | 'pending_invitation'
  | 'expired_invitation'
  | 'department_without_manager'
  | 'missing_logo'

/** Display order: people first (they cannot learn), then structure, then branding. */
export const SETUP_GAP_ORDER: SetupGapKind[] = [
  'unplaced_member',
  'expired_invitation',
  'pending_invitation',
  'department_without_manager',
  'missing_logo',
]

export interface SetupGap {
  kind: SetupGapKind
  subjectId: string
  subjectName: string
  detail: string | null
  since: string | null
}

export function groupSetupGaps(rows: SetupGapRow[]): Map<SetupGapKind, SetupGap[]> {
  const groups = new Map<SetupGapKind, SetupGap[]>()
  for (const r of rows) {
    if (!(SETUP_GAP_ORDER as string[]).includes(r.kind)) continue
    const kind = r.kind as SetupGapKind
    const list = groups.get(kind) ?? []
    list.push({ kind, subjectId: r.subject_id, subjectName: r.subject_name ?? '', detail: r.detail, since: r.since })
    groups.set(kind, list)
  }
  for (const list of groups.values()) list.sort((a, b) => a.subjectName.localeCompare(b.subjectName))
  return groups
}
