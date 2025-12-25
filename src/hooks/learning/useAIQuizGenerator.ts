import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { aiService } from '@/lib/gemini'
import { learningService } from '@/services/learningService'
import { supabase } from '@/lib/supabase'

export const useAIQuizGenerator = () => {
    const [generating, setGenerating] = useState(false)
    const { toast } = useToast()
    const navigate = useNavigate()

    const generateQuizFromSOP = async (sopId: string, title?: string, count: number = 5, language: string = 'English') => {
        try {
            setGenerating(true)

            // 1. Fetch Document Content (formerly SOP)
            const { data: sop, error: sopError } = await supabase
                .from('documents') // Updated table
                .select('title, content')
                .eq('id', sopId)
                .single()

            if (sopError) throw new Error('Failed to fetch document content')

            // 2. Generate Questions via AI
            // We pass the RAW HTML content to the AI service
            const generatedQuestions = await aiService.generateQuiz({
                sopContent: sop.content,
                count,
                language
            })

            if (!generatedQuestions || generatedQuestions.length === 0) {
                throw new Error('AI failed to generate valid questions')
            }

            // 3. Create "Learning Quiz" Container
            const quizTitle = title || `Assessment: ${sop.title}`
            const newQuiz = await learningService.createQuiz({
                title: quizTitle,
                description: `Automatically generated assessment for ${sop.title}`,
                passing_score_percentage: 70,
                time_limit_minutes: 20, // Default sensible limit
                randomize_questions: true,
                show_feedback_during: true,
                status: 'draft', // Always draft first for review
                linked_sop_id: sopId // Storing document ID here. Assumes FK constraint is removed or compatible.
            })

            // 4. Create Questions in `knowledge_questions` AND Link to Quiz
            const questionIds: string[] = []

            for (const q of generatedQuestions) {
                // Create Question Record
                const { data: qRecord, error: qError } = await supabase
                    .from('knowledge_questions')
                    .insert({
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        points: q.points,
                        linked_sop_id: sopId, // Storing document ID here too.
                        difficulty: 'medium',
                        status: 'draft',
                        usage_type: 'quiz',
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    })
                    .select('id')
                    .single()

                if (qError) {
                    console.error('Failed to save generated question:', qError)
                    continue
                }

                if (qRecord) {
                    questionIds.push(qRecord.id)
                }
            }

            // 5. Link Questions to Quiz
            await learningService.reorderQuizQuestions(newQuiz.id, questionIds)

            toast({
                title: 'Quiz Generated!',
                description: `Created "${quizTitle}" with ${questionIds.length} questions.`,
            })

            // 6. Navigate to Editor
            navigate(`/learning/quizzes/${newQuiz.id}`)

        } catch (error: any) {
            console.error('Quiz Generation Error:', error)
            toast({
                title: 'Generation Failed',
                description: error.message || 'An unexpected error occurred',
                variant: 'destructive'
            })
        } finally {
            setGenerating(false)
        }
    }

    return {
        generateQuizFromSOP,
        generating
    }
}
