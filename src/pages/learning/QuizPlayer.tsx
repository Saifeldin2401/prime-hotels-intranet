import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { QuizComponent } from './components/QuizComponent'
import { useTranslation } from 'react-i18next'

export default function QuizPlayer() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()
    const { t } = useTranslation('training')

    if (!id) return <div>{t('quizzes.player.invalid_id')}</div>

    return (
        <div className="container mx-auto py-8">
            <Button
                variant="ghost"
                onClick={() => navigate('/learning/my')}
                className="mb-6"
            >
                &larr; {t('quizzes.player.back_to_learning')}
            </Button>

            <QuizComponent
                quizId={id}
                assignmentId={assignmentId}
                onExit={() => navigate('/learning/my')}
            />
        </div>
    )
}
