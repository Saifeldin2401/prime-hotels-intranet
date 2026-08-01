import type { LearningProgress } from '@/hooks/useLearningProgress'
import type { PersistLearningAssignmentsResult } from '@/lib/learningAssignmentMutations'
import { useTranslation } from 'react-i18next'
import type { LearningAssignment, AssignmentStatus } from './types'

export const isPriorityPropertyName = (name: string) => /head office|altus group/i.test(name)

export const sortPropertyNames = (a: string, b: string) => {
  if (isPriorityPropertyName(a) && !isPriorityPropertyName(b)) return -1
  if (!isPriorityPropertyName(a) && isPriorityPropertyName(b)) return 1
  return a.localeCompare(b)
}

export const progressStatusOrder: Record<LearningProgress['status'], number> = {
  overdue: 0,
  in_progress: 1,
  assigned: 2,
  completed: 3,
  excused: 4
}

export const describeAssignmentMutationResult = (
  result: PersistLearningAssignmentsResult,
  t: ReturnType<typeof useTranslation>['t']
) => {
  if (result.inserted === 0 && result.reactivated === 0) {
    return {
      title: t('assignmentNoChanges', 'No assignment changes'),
      description: t(
        'assignmentNoChangesDesc',
        'All selected targets already had active assignments for this module.'
      ),
    }
  }

  const summaryParts = [
    result.inserted > 0 ? t('assignmentInsertedSummary', '{{count}} new', { count: result.inserted }) : null,
    result.reactivated > 0 ? t('assignmentReactivatedSummary', '{{count}} restored', { count: result.reactivated }) : null,
    result.skipped > 0 ? t('assignmentSkippedSummary', '{{count}} already active', { count: result.skipped }) : null,
  ].filter(Boolean)

  return {
    title: t('assignmentUpdated', 'Assignments updated'),
    description: summaryParts.join(' | '),
  }
}

export const getAssignmentStatus = (assignment: LearningAssignment): AssignmentStatus => {
  if (!assignment.due_date) return 'active'
  const now = new Date()
  const deadline = new Date(assignment.due_date)
  const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 7) return 'due_soon'
  return 'active'
}
