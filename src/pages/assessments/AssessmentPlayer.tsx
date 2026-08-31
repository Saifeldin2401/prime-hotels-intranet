/**
 * AssessmentPlayer
 *
 * Single assessment runtime. Consolidates the former `learning/QuizPlayer`
 * wrapper into one page. The underlying question-by-question engine remains
 * `QuizComponentEnhanced` (also embedded by TrainingPlayer for inline quiz
 * blocks) so there is exactly one runtime implementation.
 */
import { Button } from '@/components/ui/button'
import { QuizComponentEnhanced } from '@/pages/learning/components/QuizComponentEnhanced'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

export default function AssessmentPlayer() {
    const { t: t_ext } = useTranslation('extracted')
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { t } = useTranslation('training')

    const handleExit = useCallback(() => {
        navigate('/learning/my')
    }, [navigate])

    if (!id) return <div>{t('quizzes.player.invalid_id')}</div>

    return (
        <div className="container mx-auto py-8">
            <Button variant="ghost" onClick={handleExit} className="mb-6">
                {t_ext('larr', '&larr;')}{t('quizzes.player.back_to_learning')}
            </Button>

            <QuizComponentEnhanced
                quizId={id}
                assignmentId={assignmentId}
                onExit={handleExit}
            />
        </div>
    )
}
