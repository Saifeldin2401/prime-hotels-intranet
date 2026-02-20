import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { QuizComponentEnhanced } from './components/QuizComponentEnhanced'
import { useTranslation } from 'react-i18next'

export default function QuizPlayer() {
    const { t: t_ext } = useTranslation('extracted');
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
                {t_ext('larr', '&larr;')}{t('quizzes.player.back_to_learning')}
            </Button>

            <QuizComponentEnhanced
                quizId={id}
                assignmentId={assignmentId}
                onExit={() => navigate('/learning/my')}
            />
        </div>
    )
}
