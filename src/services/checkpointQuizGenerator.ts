import { aiService } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import type { QuestionType } from '@/types/questions'

// Must match the `question_type` Postgres enum (unified_questions table)
// exactly - the AI-generated value isn't guaranteed to land on a valid member.
const VALID_QUESTION_TYPES = new Set<string>(['mcq', 'mcq_multi', 'true_false', 'fill_blank', 'scenario', 'ordering', 'matching'])

export const toValidQuestionType = (value: string): QuestionType =>
    (VALID_QUESTION_TYPES.has(value) ? value : 'mcq') as QuestionType

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface CheckpointQuizParams {
    quizId: string
    sectionContent: string
    difficulty: CourseDifficulty
    language: 'English' | 'Arabic'
    trainingModuleId?: string | null
    createdBy?: string
    count?: number
}

// unified_questions.difficulty is the stricter question_difficulty enum
// (easy/medium/hard/expert) - distinct from the course-level
// beginner/intermediate/advanced scale used by the AI course generator UI.
const toQuestionDifficulty = (difficulty: CourseDifficulty) =>
    difficulty === 'advanced' ? 'hard' : difficulty === 'intermediate' ? 'medium' : 'easy'

/**
 * Generates AI questions for one checkpoint quiz and links them via
 * unified_question_options / unified_quiz_questions. Returns how many
 * questions actually made it in - callers must treat 0 as "this quiz has
 * nothing to submit" and not attach it to a mandatory content block, since a
 * mandatory quiz block with an empty quiz permanently blocks module
 * completion (complete_training_module requires a submitted, and usually
 * passed, attempt for every mandatory quiz block).
 */
export async function generateAndLinkCheckpointQuestions(params: CheckpointQuizParams): Promise<number> {
    const quizQuestions = await aiService.generateQuiz({
        sopContent: params.sectionContent,
        count: params.count ?? 3,
        difficulty: params.difficulty,
        language: params.language
    })

    const questionDifficulty = toQuestionDifficulty(params.difficulty)
    let linkedCount = 0

    for (let qIdx = 0; qIdx < quizQuestions.length; qIdx++) {
        const q = quizQuestions[qIdx]
        const { data: newQ, error: questionError } = await supabase
            .from('unified_questions')
            .insert({
                source_domain: 'knowledge',
                question_text: q.question_text,
                question_type: toValidQuestionType(q.question_type),
                difficulty: questionDifficulty,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                training_module_id: params.trainingModuleId || null,
                ai_generated: true,
                status: 'published',
                created_by: params.createdBy
            })
            .select()
            .single()

        if (questionError) {
            console.warn('Checkpoint question insert failed:', questionError)
            continue
        }
        if (!newQ) continue

        if (q.options?.length) {
            const { error: optionsError } = await supabase.from('unified_question_options').insert(
                q.options.map((optText, idx) => ({
                    question_id: newQ.id,
                    option_text: optText,
                    is_correct: optText === q.correct_answer,
                    display_order: idx + 1
                }))
            )
            if (optionsError) {
                console.warn('Checkpoint question options insert failed:', optionsError)
                continue
            }
        }

        const { error: linkError } = await supabase.from('unified_quiz_questions').insert({
            quiz_id: params.quizId,
            question_id: newQ.id,
            display_order: qIdx + 1
        })
        if (linkError) {
            console.warn('Checkpoint question link insert failed:', linkError)
            continue
        }

        linkedCount += 1
    }

    return linkedCount
}
