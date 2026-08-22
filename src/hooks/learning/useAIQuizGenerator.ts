import { useToast } from '@/components/ui/use-toast'
import { aiService } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import { learningService } from '@/services/learningService'
import { normalizeAnswerText } from '@/services/checkpointQuizGenerator'
import type { Database } from '@/types/database.generated'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface QuizGenerationOptions {
    types?: string[]
    difficulty?: Database['public']['Enums']['question_difficulty']
    includeHints?: boolean
    includeExplanations?: boolean
    timeLimitMinutes?: number
    passingScore?: number
    randomizeQuestions?: boolean
    showFeedbackDuring?: boolean
    status?: 'draft' | 'published'
}

export const useAIQuizGenerator = () => {
    const [generating, setGenerating] = useState(false)
    const { toast } = useToast()
    const navigate = useNavigate()

    const generateQuizFromSOP = async (
        sopId: string,
        title?: string,
        count: number = 5,
        language: string = 'English',
        options: QuizGenerationOptions = {}
    ) => {
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
                language,
                types: options.types,
                difficulty: options.difficulty,
                includeHints: options.includeHints,
                includeExplanations: options.includeExplanations,
            })

            if (!generatedQuestions || generatedQuestions.length === 0) {
                throw new Error('AI failed to generate valid questions')
            }

            // 3. Create "Learning Quiz" Container
            const quizTitle = title || `Assessment: ${sop.title}`
            const resolvedTimeLimit = options.timeLimitMinutes === 0 ? null : options.timeLimitMinutes
            const timeLimitMinutes = resolvedTimeLimit === undefined ? 20 : resolvedTimeLimit

            const newQuiz = await learningService.createQuiz({
                title: quizTitle,
                description: `Automatically generated assessment for ${sop.title}`,
                passing_score_percentage: options.passingScore ?? 70,
                time_limit_minutes: timeLimitMinutes,
                randomize_questions: options.randomizeQuestions ?? true,
                show_feedback_during: options.showFeedbackDuring ?? true,
                status: options.status ?? 'draft',
                linked_sop_id: sopId // Storing document ID here. Assumes FK constraint is removed or compatible.
            })

            // 4. Create Questions in `knowledge_questions` AND Link to Quiz
            // Resolve the current user once (this is a real network call) rather
            // than re-fetching it on every question, and insert all questions in
            // a single batched multi-row insert instead of one round-trip each.
            const { data: authData } = await supabase.auth.getUser()
            const userId = authData.user?.id

            const { data: qRecords, error: qError } = await supabase
                .from('unified_questions')
                .insert(
                    generatedQuestions.map(q => ({
                        source_domain: 'knowledge',
                        question_text: q.question_text,
                        question_type: (q.question_type as Database['public']['Enums']['question_type']) || 'mcq',
                        correct_answer: q.correct_answer,
                        points: q.points,
                        explanation: q.explanation ?? null,
                        hint: q.hint ?? null,
                        linked_sop_id: sopId,
                        difficulty: (options.difficulty as Database['public']['Enums']['question_difficulty']) ?? 'medium',
                        status: 'draft' as const,
                        created_by: userId
                    }))
                )
                .select('id')

            if (qError) {
                console.error('Failed to save generated questions:', qError)
            }

            // Supabase returns rows for a multi-row INSERT in the same order as
            // the input array, so this lines up with `generatedQuestions`.
            const insertedIds: string[] = (qRecords ?? []).map(r => r.id)

            // 4b. Create the selectable answer choices in `unified_question_options`.
            // `unified_questions` has no `options` column of its own - without this
            // insert every question would come back with zero options and be
            // unanswerable in the player. For each question, normalize before
            // comparing option text to `correct_answer` (LLM output can have minor
            // textual drift between the two fields) and drop any question whose
            // correct_answer doesn't match any option even after normalization,
            // rather than silently shipping an unwinnable question.
            const optionsToInsert: {
                question_id: string
                option_text: string
                is_correct: boolean
                display_order: number
            }[] = []
            const questionIds: string[] = []

            insertedIds.forEach((questionId, idx) => {
                const q = generatedQuestions[idx]
                const opts = q.options ?? []

                if (opts.length === 0) {
                    // Nothing to validate (e.g. fill_blank questions carry no
                    // option list) - keep the question as-is.
                    questionIds.push(questionId)
                    return
                }

                const questionOptions = opts.map((optText, optIdx) => ({
                    question_id: questionId,
                    option_text: optText,
                    is_correct: normalizeAnswerText(optText) === normalizeAnswerText(q.correct_answer),
                    display_order: optIdx + 1
                }))

                if (!questionOptions.some(o => o.is_correct)) {
                    console.warn('Generated question skipped: correct_answer did not match any option', {
                        questionId,
                        correct_answer: q.correct_answer
                    })
                    return
                }

                optionsToInsert.push(...questionOptions)
                questionIds.push(questionId)
            })

            if (optionsToInsert.length > 0) {
                const { error: optionsError } = await supabase
                    .from('unified_question_options')
                    .insert(optionsToInsert)
                if (optionsError) {
                    console.error('Failed to save generated question options:', optionsError)
                }
            }

            // Clean up question rows that were dropped above (unmatched
            // correct_answer) so they don't linger unlinked in the bank.
            const droppedIds = insertedIds.filter(id => !questionIds.includes(id))
            if (droppedIds.length > 0) {
                await supabase.from('unified_questions').delete().in('id', droppedIds)
            }

            // 5. Link Questions to Quiz
            await learningService.reorderQuizQuestions(newQuiz.id, questionIds)

            toast({
                title: 'Quiz Generated!',
                description: `Created "${quizTitle}" with ${questionIds.length} questions.`,
            })

            // 6. Navigate to Editor
            navigate(`/learning/quizzes/${newQuiz.id}`)

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            console.error('Quiz Generation Error:', error)
            toast({
                title: 'Generation Failed',
                description: errorMessage,
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
