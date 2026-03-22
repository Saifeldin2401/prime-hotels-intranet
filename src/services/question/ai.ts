import { aiService } from '@/lib/gemini'
import type {
    AIQuestionGenerationRequest,
    GeneratedQuestion,
    QuestionDifficulty,
    QuestionType
} from '@/types/questions'

export async function generateQuestionsWithAI(
    request: AIQuestionGenerationRequest
): Promise<GeneratedQuestion[]> {
    try {
        const languageMap: Record<string, string> = {
            'en': 'English',
            'ar': 'Arabic',
            'both': 'English and Arabic'
        }

        const aiQuestions = await aiService.generateQuiz({
            sopContent: request.sop_content,
            count: request.count,
            types: request.types,
            difficulty: request.difficulty,
            includeHints: request.include_hints,
            includeExplanations: request.include_explanations,
            language: languageMap[request.language || 'en'] || 'English',
            groundedOnly: request.grounded_only,
            includeCitations: request.include_citations,
            sourceTitle: request.source_title || request.sop_title
        })

        // Map to GeneratedQuestion format
        const baseTags = ['ai-generated']
        if (request.grounded_only) baseTags.push('grounded')
        if (request.include_citations) baseTags.push('citations')

        const includeExplanations = !!request.include_explanations
        const includeHints = !!request.include_hints
        const includeCitations = !!request.include_citations

        return aiQuestions.map(q => {
            const enriched = q as {
                question_text: string
                question_type: string
                options?: string[]
                correct_answer: string
                explanation?: string
                hint?: string
                difficulty_level?: string
                linked_section?: string
                tags?: string[]
                confidence_score?: number
                source_snippet?: string
            }

            return ({
            question_text: q.question_text,
            question_type: normalizeQuestionType(q.question_type),
            difficulty_level: normalizeDifficulty(q.difficulty_level || request.difficulty || 'medium'),
            options: q.options?.map(opt => ({
                text: opt,
                is_correct: opt === q.correct_answer,
                feedback: includeExplanations && opt === q.correct_answer ? (q.explanation || undefined) : undefined
            })),
            correct_answer: q.correct_answer,
            explanation: includeExplanations ? q.explanation : undefined,
            hint: includeHints ? q.hint : undefined,
            linked_section: includeCitations ? (enriched.source_snippet || q.linked_section) : q.linked_section,
            source_snippet: includeCitations ? enriched.source_snippet : undefined,
            confidence_score: enriched.confidence_score || 0.9,
            tags: enriched.tags?.length ? enriched.tags : baseTags
        })
        })
    } catch (error) {
        console.error('AI generation failed:', error)
        throw new Error('Failed to generate questions')
    }
}

function normalizeQuestionType(type: string): QuestionType {
    const typeMap: Record<string, QuestionType> = {
        'mcq': 'mcq',
        'multiple_choice': 'mcq',
        'mcq_multi': 'mcq_multi',
        'multiple_select': 'mcq_multi',
        'true_false': 'true_false',
        'boolean': 'true_false',
        'fill_blank': 'fill_blank',
        'fill_in_blank': 'fill_blank',
        'fill-in-blank': 'fill_blank',
        'scenario': 'scenario'
    }
    return typeMap[type.toLowerCase()] || 'mcq'
}

function normalizeDifficulty(diff: string): QuestionDifficulty {
    const diffMap: Record<string, QuestionDifficulty> = {
        'easy': 'easy',
        'simple': 'easy',
        'medium': 'medium',
        'moderate': 'medium',
        'hard': 'hard',
        'difficult': 'hard',
        'expert': 'expert',
        'advanced': 'expert'
    }
    return diffMap[diff?.toLowerCase()] || 'medium'
}
