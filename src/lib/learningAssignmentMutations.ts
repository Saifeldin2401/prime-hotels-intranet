import { getErrorMessage } from '@/lib/errorMessages'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'

export type LearningAssignmentMutationPayload = {
  target_type: string
  target_id: string | null
  content_type: string
  content_id: string
  assigned_by?: string | null
  due_date?: string | null
  valid_from?: string | null
  expires_at?: string | null
  priority?: string | null
  instructions?: string | null
  requires_acknowledgement?: boolean | null
  notify_on_due?: boolean | null
  reminder_days_before?: number[] | null
  is_deleted?: boolean | null
}

type ExistingLearningAssignmentRow = {
  id: string
  target_type: string
  target_id: string | null
  content_type: string
  content_id: string
  is_deleted?: boolean | null
  created_at?: string | null
}

type PostgrestLikeError = {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

export type PersistLearningAssignmentsResult = {
  inserted: number
  reactivated: number
  skipped: number
  totalRequested: number
  changedAssignments: LearningAssignmentMutationPayload[]
}

const LEGACY_UNSUPPORTED_COLUMNS = [
  'instructions',
  'requires_acknowledgement',
  'notify_on_due',
  'reminder_days_before',
] as const

const buildAssignmentKey = (assignment: Pick<LearningAssignmentMutationPayload, 'target_type' | 'target_id' | 'content_type' | 'content_id'>) =>
  `${assignment.content_type}:${assignment.content_id}:${assignment.target_type}:${assignment.target_id ?? '__everyone__'}`

const stripUnsupportedColumns = (assignment: LearningAssignmentMutationPayload): LearningAssignmentMutationPayload => {
  const legacyAssignment = { ...assignment }
  LEGACY_UNSUPPORTED_COLUMNS.forEach((column) => {
    delete legacyAssignment[column]
  })
  return legacyAssignment
}

export const isLearningAssignmentSchemaColumnMismatchError = (error: PostgrestLikeError | null | undefined) => {
  if (!error) return false
  const details = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    error.code === 'PGRST204'
    || error.code === '42703'
    || (details.includes('column') && details.includes('does not exist'))
    || (details.includes('schema cache') && details.includes('column'))
    || (details.includes('could not find') && details.includes('column'))
  )
}

export const getLearningAssignmentErrorMessage = (error: unknown) => {
  const candidate = (typeof error === 'object' && error !== null)
    ? (error as PostgrestLikeError)
    : null

  const message = `${candidate?.message ?? ''} ${candidate?.details ?? ''} ${candidate?.hint ?? ''}`.trim()
  const normalized = message.toLowerCase()

  if (candidate?.code === '23505' || normalized.includes('duplicate key value violates unique constraint')) {
    return 'One or more selected targets already have an assignment for this training.'
  }

  if (normalized.includes('cannot assign module')) {
    return candidate?.message || 'This module cannot be assigned in its current state.'
  }

  if (normalized.includes('certificate')) {
    return candidate?.message || message
  }

  return getErrorMessage(error)
}

async function fetchExistingAssignments(assignments: LearningAssignmentMutationPayload[]) {
  const contentIdsByType = new Map<string, Set<string>>()

  assignments.forEach((assignment) => {
    const contentIds = contentIdsByType.get(assignment.content_type) || new Set<string>()
    contentIds.add(assignment.content_id)
    contentIdsByType.set(assignment.content_type, contentIds)
  })

  const queries = Array.from(contentIdsByType.entries()).map(([contentType, contentIds]) =>
    supabase
      .from('training_assignment_rules')
      .select('id, target_type, target_id, content_type, content_id, is_deleted, created_at')
      .eq('content_type', contentType)
      .in('content_id', Array.from(contentIds))
  )

  const results = await Promise.all(queries)
  const rows: ExistingLearningAssignmentRow[] = []

  for (const result of results) {
    if (result.error) throw result.error
    rows.push(...((result.data || []) as ExistingLearningAssignmentRow[]))
  }

  return rows
}

async function insertLearningAssignments(assignments: LearningAssignmentMutationPayload[]) {
  if (assignments.length === 0) return

  const { error } = await supabase
    .from('training_assignment_rules')
    .insert(assignments)

  if (!error) return
  if (!isLearningAssignmentSchemaColumnMismatchError(error)) throw error

  const { error: legacyError } = await supabase
    .from('training_assignment_rules')
    .insert(assignments.map(stripUnsupportedColumns))

  if (legacyError) throw legacyError
}

async function updateLearningAssignment(id: string, payload: LearningAssignmentMutationPayload) {
  const updatePayload = {
    ...payload,
    is_deleted: false,
  }

  const { error } = await supabase
    .from('training_assignment_rules')
    .update(updatePayload)
    .eq('id', id)

  if (!error) return
  if (!isLearningAssignmentSchemaColumnMismatchError(error)) throw error

  const { error: legacyError } = await supabase
    .from('training_assignment_rules')
    .update(stripUnsupportedColumns(updatePayload))
    .eq('id', id)

  if (legacyError) throw legacyError
}

async function clearDirectUserAssignmentExemptions(assignments: LearningAssignmentMutationPayload[]) {
  const directUserAssignments = Array.from(
    new Map(
      assignments
        .filter((assignment) => assignment.target_type === 'user' && typeof assignment.target_id === 'string' && assignment.target_id.length > 0)
        .map((assignment) => [
          `${assignment.content_type}:${assignment.content_id}:${assignment.target_id}`,
          assignment,
        ])
    ).values()
  )

  if (directUserAssignments.length === 0) return

  await Promise.all(
    directUserAssignments.map(async (assignment) => {
      const { error } = await supabase
        .from('learning_assignment_exemptions')
        .delete()
        .eq('content_type', assignment.content_type as Database['public']['Enums']['learning_content_type'])
        .eq('content_id', assignment.content_id)
        .eq('user_id', assignment.target_id!)

      if (error) throw error
    })
  )
}

export async function persistLearningAssignments(
  assignments: LearningAssignmentMutationPayload[]
): Promise<PersistLearningAssignmentsResult> {
  if (assignments.length === 0) {
    return {
      inserted: 0,
      reactivated: 0,
      skipped: 0,
      totalRequested: 0,
      changedAssignments: [],
    }
  }

  const uniqueAssignments = Array.from(
    new Map(assignments.map((assignment) => [buildAssignmentKey(assignment), assignment])).values()
  )
  const duplicateInputCount = assignments.length - uniqueAssignments.length
  const existingAssignments = await fetchExistingAssignments(uniqueAssignments)

  const existingByKey = new Map<string, ExistingLearningAssignmentRow[]>()
  existingAssignments.forEach((row) => {
    const key = buildAssignmentKey(row)
    const currentRows = existingByKey.get(key) || []
    currentRows.push(row)
    existingByKey.set(key, currentRows)
  })

  const inserts: LearningAssignmentMutationPayload[] = []
  const reactivations: Array<{ id: string; payload: LearningAssignmentMutationPayload }> = []
  let skipped = duplicateInputCount

  uniqueAssignments.forEach((assignment) => {
    const key = buildAssignmentKey(assignment)
    const matchingRows = [...(existingByKey.get(key) || [])].sort((left, right) => {
      const leftDeleted = left.is_deleted === true ? 1 : 0
      const rightDeleted = right.is_deleted === true ? 1 : 0
      if (leftDeleted !== rightDeleted) return leftDeleted - rightDeleted

      const leftCreated = left.created_at ? new Date(left.created_at).getTime() : 0
      const rightCreated = right.created_at ? new Date(right.created_at).getTime() : 0
      return rightCreated - leftCreated
    })

    const activeRow = matchingRows.find((row) => row.is_deleted !== true)
    if (activeRow) {
      skipped += 1
      return
    }

    const deletedRow = matchingRows.find((row) => row.is_deleted === true)
    if (deletedRow) {
      reactivations.push({
        id: deletedRow.id,
        payload: assignment,
      })
      return
    }

    inserts.push(assignment)
  })

  await Promise.all(reactivations.map(({ id, payload }) => updateLearningAssignment(id, payload)))
  await insertLearningAssignments(inserts)
  await clearDirectUserAssignmentExemptions(uniqueAssignments)

  return {
    inserted: inserts.length,
    reactivated: reactivations.length,
    skipped,
    totalRequested: assignments.length,
    changedAssignments: [
      ...reactivations.map(({ payload }) => payload),
      ...inserts,
    ],
  }
}
