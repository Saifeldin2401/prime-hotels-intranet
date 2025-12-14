import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { QuizComponent } from './components/QuizComponent'

export default function QuizPlayer() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignment')
    const navigate = useNavigate()

    if (!id) return <div>Invalid Quiz ID</div>

    return (
        <div className="container mx-auto py-8">
            <Button
                variant="ghost"
                onClick={() => navigate('/learning/my')}
                className="mb-6"
            >
                &larr; Back to My Learning
            </Button>

            <QuizComponent
                quizId={id}
                assignmentId={assignmentId}
                onExit={() => navigate('/learning/my')}
            />
        </div>
    )
}
