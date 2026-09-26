import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Settings2, Users } from 'lucide-react'

import { AssignTrainingWizardModal } from '@/components/training/AssignTrainingWizardModal'
import { useTenant } from '@/contexts/TenantContext'
import { TrainingAssignmentsPanel } from '@/pages/training/TrainingAssignments'
import { WorkspaceHeader, headerActionClass } from '@/ui'

/**
 * Manage > Assignments. The assignment centre (overview, assignments,
 * grading) under one header whose actions are the things a manager does next:
 * assign to a team, set automatic rules, check notification batches.
 * `?course=<id>` opens the assign dialog for that course - that is how
 * Studio's "Assign" hands a course over.
 */
export default function ManageAssignments() {
    const { t } = useTranslation('training')
    const [searchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const { currentOrganization } = useTenant()
    const [wizardOpen, setWizardOpen] = useState(false)
    const courseId = searchParams.get('course') ?? undefined

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <WorkspaceHeader
                eyebrow={t('assignmentsPage.eyebrow', 'Manage')}
                title={t('assignmentsPage.title', 'Assignments')}
                context={currentOrganization?.name ?? null}
                actions={
                    <>
                        <Link to="/manage/assignments/rules" className={headerActionClass.secondary}>
                            <Settings2 aria-hidden="true" className="h-4 w-4" />{t('assignmentsPage.rules', 'Automatic rules')}
                        </Link>
                        <Link to="/admin/notifications" className={`${headerActionClass.secondary} hidden md:inline-flex`}>
                            <Bell aria-hidden="true" className="h-4 w-4" />{t('assignmentsPage.batches', 'Notification batches')}
                        </Link>
                        <button type="button" onClick={() => setWizardOpen(true)} className={headerActionClass.primary}>
                            <Users aria-hidden="true" className="h-4 w-4" />{t('assign_wizard', 'Assign to team')}
                        </button>
                    </>
                }
            />
            <TrainingAssignmentsPanel
                embedded
                hideHeaderActions
                initialTab={courseId ? 'assignments' : 'overview'}
                defaultModuleId={courseId}
                autoOpen={!!courseId}
            />
            <AssignTrainingWizardModal
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })}
            />
        </div>
    )
}
