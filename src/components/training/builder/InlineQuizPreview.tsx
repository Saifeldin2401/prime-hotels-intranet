/**
 * InlineQuizPreview
 * 
 * Fetches and displays quiz questions inline within the Training Builder.
 * Shows question text, options with correct answers highlighted, difficulty,
 * and summary stats — all without leaving the builder canvas.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileQuestion,
  HelpCircle,
  RefreshCw,
  Sparkles,
  XCircle
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface QuizQuestion {
  id: string
  question_text: string
  question_text_ar: string | null
  question_type: string
  difficulty: string
  correct_answer: string | null
  explanation: string | null
  explanation_ar: string | null
  points: number | null
  display_order: number
  options: {
    id: string
    option_text: string
    option_text_ar: string | null
    is_correct: boolean | null
    display_order: number | null
  }[]
}

interface InlineQuizPreviewProps {
  quizId: string
  onRegenerate?: () => void
  isRTL: boolean
  compact?: boolean
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  hard: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  expert: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
}

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  mcq_multi: 'Multi-MCQ',
  true_false: 'True/False',
  fill_blank: 'Fill Blank',
  scenario: 'Scenario',
  ordering: 'Ordering',
  matching: 'Matching'
}

export function InlineQuizPreview({ quizId, onRegenerate, isRTL, compact = false }: InlineQuizPreviewProps) {
  const { t } = useTranslation('training')
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const { data: questions, isLoading, isError, refetch } = useQuery({
    queryKey: ['inline-quiz-preview', quizId],
    queryFn: async () => {
      // Fetch quiz questions via the link table
      const { data: links, error: linkError } = await supabase
        .from('unified_quiz_questions')
        .select('question_id, display_order, points_override')
        .eq('quiz_id', quizId)
        .order('display_order', { ascending: true })

      if (linkError) throw linkError
      if (!links || links.length === 0) return []

      const questionIds = links.map(l => l.question_id)

      // Fetch the actual questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('unified_questions')
        .select('id, question_text, question_text_ar, question_type, difficulty, correct_answer, explanation, explanation_ar, points')
        .in('id', questionIds)

      if (questionsError) throw questionsError
      if (!questionsData) return []

      // Fetch options for all questions
      const { data: optionsData, error: optionsError } = await supabase
        .from('unified_question_options')
        .select('id, question_id, option_text, option_text_ar, is_correct, display_order')
        .in('question_id', questionIds)
        .order('display_order', { ascending: true })

      if (optionsError) throw optionsError

      // Merge it all together
      const optionsByQuestion = new Map<string, typeof optionsData>()
      for (const opt of (optionsData || [])) {
        const existing = optionsByQuestion.get(opt.question_id) || []
        existing.push(opt)
        optionsByQuestion.set(opt.question_id, existing)
      }

      const orderMap = new Map(links.map(l => [l.question_id, l.display_order]))

      return questionsData
        .map((q): QuizQuestion => ({
          ...q,
          display_order: orderMap.get(q.id) ?? 0,
          options: (optionsByQuestion.get(q.id) || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        }))
        .sort((a, b) => a.display_order - b.display_order)
    },
    enabled: !!quizId,
    staleTime: 30_000
  })

  const toggleExplanation = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.add(questionId)
      }
      return next
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-1 ps-4">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="p-4 text-center space-y-2">
        <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
        <p className="text-xs text-muted-foreground">{t('builder.inlinePreview.quizLoadError', 'Could not load quiz questions')}</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs">
          <RefreshCw className="w-3 h-3 me-1" />
          {t('builder.inlinePreview.retry', 'Retry')}
        </Button>
      </div>
    )
  }

  // Empty state
  if (!questions || questions.length === 0) {
    return (
      <div className="p-4 text-center space-y-2 border border-dashed border-slate-200 rounded-lg">
        <HelpCircle className="h-5 w-5 text-slate-400 mx-auto" />
        <p className="text-xs text-muted-foreground">{t('builder.inlinePreview.noQuestions', 'No questions in this quiz yet')}</p>
        {onRegenerate && (
          <Button variant="outline" size="sm" onClick={onRegenerate} className="text-xs">
            <Sparkles className="w-3 h-3 me-1" />
            {t('builder.inlinePreview.generateQuestions', 'Generate with AI')}
          </Button>
        )}
      </div>
    )
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  const estimatedMins = Math.max(1, Math.ceil(questions.length * 1.5))

  return (
    <div className={cn('space-y-3', isRTL ? 'text-right' : 'text-left')}>
      {/* Quiz summary bar */}
      <div className={cn(
        'flex items-center gap-3 px-3 py-2 bg-purple-50/80 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/50',
        isRTL ? 'flex-row-reverse' : ''
      )}>
        <FileQuestion className="w-4 h-4 text-purple-600 shrink-0" />
        <div className="flex-1 flex items-center gap-2 flex-wrap text-xs font-medium text-purple-900 dark:text-purple-200">
          <span>{t('builder.inlinePreview.questionCount', { count: questions.length, defaultValue: '{{count}} questions' })}</span>
          <span className="text-purple-400">•</span>
          <span>{totalPoints} {t('builder.inlinePreview.points', 'pts')}</span>
          <span className="text-purple-400">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            ~{estimatedMins} {t('builder.inlinePreview.min', 'min')}
          </span>
        </div>
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="h-6 px-2 text-[11px] text-purple-700 hover:text-purple-900 hover:bg-purple-100/60"
          >
            <Sparkles className="w-3 h-3 me-1" />
            {t('builder.inlinePreview.regenerate', 'Regenerate')}
          </Button>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-2">
        {questions.map((question, qIdx) => {
          const isExpanded = expandedQuestions.has(question.id)

          return (
            <div
              key={question.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden transition-all"
            >
              {/* Question header */}
              <div className={cn(
                'flex items-start gap-2.5 p-3',
                isRTL ? 'flex-row-reverse' : ''
              )}>
                <span className="shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[11px] font-bold mt-0.5">
                  {qIdx + 1}
                </span>
                <div className={cn('flex-1 min-w-0', isRTL ? 'text-right' : 'text-left')}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                    {isRTL && question.question_text_ar ? question.question_text_ar : question.question_text}
                  </p>
                  <div className={cn('flex items-center gap-1.5 mt-1.5 flex-wrap', isRTL ? 'flex-row-reverse' : '')}>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-semibold">
                      {TYPE_LABELS[question.question_type] || question.question_type}
                    </Badge>
                    <Badge className={cn('text-[10px] h-5 px-1.5 font-semibold border-none', DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.medium)}>
                      {question.difficulty}
                    </Badge>
                    {question.points && (
                      <span className="text-[10px] text-slate-400 font-medium">{question.points} pts</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Answer options */}
              {question.options.length > 0 && (
                <div className={cn('px-3 pb-2 space-y-1', isRTL ? 'pe-12' : 'ps-12')}>
                  {question.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                        opt.is_correct
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-900 border border-transparent',
                        isRTL ? 'flex-row-reverse' : ''
                      )}
                    >
                      {opt.is_correct ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={cn(
                        'flex-1',
                        opt.is_correct ? 'text-emerald-900 dark:text-emerald-200 font-medium' : 'text-slate-600 dark:text-slate-400'
                      )}>
                        {isRTL && opt.option_text_ar ? opt.option_text_ar : opt.option_text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* True/False or Fill Blank correct answer */}
              {question.options.length === 0 && question.correct_answer && (
                <div className={cn('px-3 pb-2', isRTL ? 'pe-12' : 'ps-12')}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-900 dark:text-emerald-200 font-medium">
                      {t('builder.inlinePreview.answer', 'Answer')}: {question.correct_answer}
                    </span>
                  </div>
                </div>
              )}

              {/* Expandable explanation */}
              {question.explanation && (
                <div className={cn('px-3 pb-2', isRTL ? 'pe-12' : 'ps-12')}>
                  <button
                    onClick={() => toggleExplanation(question.id)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {t('builder.inlinePreview.explanation', 'Explanation')}
                  </button>
                  {isExpanded && (
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded p-2 leading-relaxed">
                      {isRTL && question.explanation_ar ? question.explanation_ar : question.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
