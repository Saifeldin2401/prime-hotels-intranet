import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'

import { AssignTrainingWizardModal } from '@/components/training/AssignTrainingWizardModal'
import { Button } from '@/components/ui/button'
import { TrainingAssignmentsPanel } from '@/pages/training/TrainingAssignments'

/**
 * Manage > Assignments. The full assignment centre (overview, assignments,
 * grading, auto-assign rules, batch status) that used to live inside the
 * Studio hub. `?course=<id>` opens the assign dialog for that course - that is
 * how Studio's "Assign" hands a course over.
 */
export default function ManageAssignments() {
    const { t } = useTranslation('training')
    const [searchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const [wizardOpen, setWizardOpen] = useState(false)
    const courseId = searchParams.get('course') ?? undefined

    return (
        <div className="container mx-auto space-y-4 px-3 py-4 sm:px-4 sm:py-6">
            <div className="flex justify-end">
                <Button variant="outline" onClick={() => setWizardOpen(true)} className="min-h-[44px]">
                    <Users className="me-2 h-4 w-4" aria-hidden="true" />
                    {t('assign_wizard', 'Assign to Team')}
                </Button>
            </div>
            <TrainingAssignmentsPanel
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
