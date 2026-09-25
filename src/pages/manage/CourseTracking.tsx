import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { AssignTrainingWizardModal } from '@/components/training/AssignTrainingWizardModal'
import { TrainingTrackCommandCenter } from '@/components/training/hub/TrainingTrackCommandCenter'
import { useCapabilities } from '@/hooks/useCapabilities'

/**
 * Manage > Course tracking. The per-course tracking command centre that used
 * to be the Studio hub's "Track" step: completion by course, stalled learners,
 * and follow-up actions.
 */
export default function CourseTracking() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { can, canAny } = useCapabilities()
    const [wizardOpen, setWizardOpen] = useState(false)

    return (
        <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
            <TrainingTrackCommandCenter
                canManageModules={canAny('content.author', 'content.publish')}
                canAssignTraining={can('assignment.manage')}
                onNavigateToBuilder={(id) => navigate(`/studio/courses/${id}`)}
                onOpenAssignWizard={() => setWizardOpen(true)}
            />
            <AssignTrainingWizardModal
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })}
            />
        </div>
    )
}
