import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import type { ContentBlockForm, ContentType, TrainingSection } from './trainingBuilderTypes'

interface AIQuizDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  aiPrefillTitle: string
  aiPrefillContent: string
  aiTargetSectionId: string | null
  setAiTargetSectionId: (v: string | null) => void
  setAiPrefillContent: (v: string) => void
  setAiPrefillTitle: (v: string) => void
  moduleId: string | null
  title: string
  passingScore: string
  activeSection: string | null
  sections: TrainingSection[]
  setSections: React.Dispatch<React.SetStateAction<TrainingSection[]>>
  setActiveSection: (v: string | null) => void
  isRTL: boolean
}

export function AIQuizDialog({
  open,
  onOpenChange,
  aiPrefillTitle,
  aiPrefillContent,
  aiTargetSectionId,
  setAiTargetSectionId,
  setAiPrefillContent,
  setAiPrefillTitle,
  moduleId,
  title,
  passingScore,
  activeSection,
  sections,
  setSections,
  setActiveSection,
  isRTL,
}: AIQuizDialogProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Sparkles className="w-5 h-5 text-purple-600" />
            {t('builder.aiQuestionGenerator')}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : ''}>
            {t('builder.aiDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AIQuestionGenerator
            sopId="general"
            sopTitle={aiPrefillTitle || title || t('builder.untitledModule')}
            sopContent={aiPrefillContent}
            initialContent={aiPrefillContent}
            initialSourceType="text"
            defaultGroundedOnly={aiPrefillContent.trim().length > 0}
            defaultIncludeCitations={aiPrefillContent.trim().length > 0}
            onQuestionsCreated={async (count, ids) => {
              onOpenChange(false)
              setAiTargetSectionId(null)
              setAiPrefillContent('')
              setAiPrefillTitle('')

              if (ids && ids.length > 0) {
                if (!moduleId) {
                  toast({
                    title: t('common:error'),
                    description: t('saveModuleFirstBeforeQuiz'),
                    variant: 'destructive'
                  })
                  return
                }

                try {
                  const { data: quizData, error: quizError } = await supabase
                    .from('learning_quizzes')
                    .insert({
                      title: `${title || t('builder.untitledModule')} - Quiz`,
                      description: `Auto-generated quiz with ${count} questions`,
                      status: 'published',
                      training_module_id: moduleId,
                      passing_score_percentage: Number(passingScore) || 80,
                      time_limit_minutes: null,
                      created_by: profile?.id
                    })
                    .select()
                    .single()

                  if (quizError) {
                    const errorDetails = getUserFriendlyError(quizError)
                    toast({
                      title: t('error'),
                      description: errorDetails.message,
                      variant: 'destructive'
                    })
                    throw quizError
                  }

                  for (let i = 0; i < ids.length; i++) {
                    const questionId = ids[i]
                    await supabase
                      .from('learning_quiz_questions')
                      .insert({
                        quiz_id: quizData.id,
                        question_id: questionId,
                        display_order: i + 1,
                        points_override: 2
                      })
                  }

                  const quizBlock: ContentBlockForm = {
                    id: `quiz-${Date.now()}`,
                    type: 'quiz' as ContentType,
                    title: t('builder.aiGeneratedQuiz'),
                    content: '',
                    content_url: '',
                    content_data: { quiz_id: quizData.id, question_ids: ids },
                    is_mandatory: true,
                    order: 0
                  }

                  const targetSectionId = aiTargetSectionId || activeSection || sections[0]?.id

                  if (targetSectionId) {
                    setSections(prevSections => prevSections.map(section => {
                      if (section.id === targetSectionId) {
                        return {
                          ...section,
                          items: [...section.items, { ...quizBlock, order: section.items.length }]
                        }
                      }
                      return section
                    }))
                  } else {
                    const newSection: TrainingSection = {
                      id: `section-${Date.now()}`,
                      title: t('mainContent'),
                      description: '',
                      items: [quizBlock],
                      order: 0
                    }
                    setSections([newSection])
                    setActiveSection(newSection.id)
                  }

                  await queryClient.invalidateQueries({ queryKey: ['available-quizzes'] })

                  toast({
                    title: t('builder.questionsGenerated'),
                    description: t('builder.questionsAdded', { count })
                  })
                } catch (error) {
                  const errorDetails = getUserFriendlyError(error)
                  toast({
                    title: t('common:error'),
                    description: errorDetails.message,
                    variant: 'destructive'
                  })
                }
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
