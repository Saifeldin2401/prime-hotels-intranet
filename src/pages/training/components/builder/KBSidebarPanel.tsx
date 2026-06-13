import { KnowledgeBaseSidebar } from '@/components/training'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import type { ContentBlockForm, ContentType, TrainingSection } from './trainingBuilderTypes'
import type { LearningQuiz } from '@/types/learning'

interface KBSidebarPanelProps {
  moduleId: string | null
  title: string
  activeSection: string | null
  sections: TrainingSection[]
  setSections: React.Dispatch<React.SetStateAction<TrainingSection[]>>
  contentBlocks: ContentBlockForm[]
  setContentBlocks: React.Dispatch<React.SetStateAction<ContentBlockForm[]>>
  availableSOPs: { id: string; title: string }[] | undefined
  availableQuizzes: LearningQuiz[] | undefined
}

export function KBSidebarPanel({
  moduleId,
  title,
  activeSection,
  sections,
  setSections,
  contentBlocks,
  setContentBlocks,
  availableSOPs,
  availableQuizzes,
}: KBSidebarPanelProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return (
    <div className="fixed inset-x-0 sm:inset-x-auto sm:right-0 top-16 bottom-0 w-full sm:w-80 z-40 shadow-xl border-l bg-white">
      <KnowledgeBaseSidebar
        moduleId={moduleId || undefined}
        moduleTopic={title}
        onInsertContent={(content) => {
          const newBlock: ContentBlockForm = {
            id: `block_${Date.now()}`,
            type: content.type === 'ai_generated' ? 'text' : content.type as ContentType,
            title: content.title,
            content: content.content,
            content_url: '',
            content_data: content.sourceId ? { source_document_id: content.sourceId } : {},
            is_mandatory: true,
            order: contentBlocks.length
          }
          setContentBlocks([...contentBlocks, newBlock])
        }}
        onLinkDocument={(docId) => {
          const sop = availableSOPs?.find(s => s.id === docId)
          if (!sop) return

          const newBlock: ContentBlockForm = {
            id: `sop-${Date.now()}`,
            type: 'sop_reference',
            title: sop.title,
            content: '',
            content_url: '',
            content_data: { sop_id: docId },
            is_mandatory: true,
            order: 0
          }

          const targetSectionId = activeSection || sections[0]?.id
          if (targetSectionId) {
            setSections(prev => prev.map(s =>
              s.id === targetSectionId
                ? { ...s, items: [...s.items, { ...newBlock, order: s.items.length }] }
                : s
            ))
            toast({
              title: t('builder.added'),
              description: t('builder.sopAdded', { title: sop.title })
            })
          }
        }}
        onLinkQuiz={(quizId) => {
          const quiz = availableQuizzes?.find(q => q.id === quizId)
          if (!quiz) return

          const newBlock: ContentBlockForm = {
            id: `quiz-${Date.now()}`,
            type: 'quiz',
            title: quiz.title,
            content: '',
            content_url: '',
            content_data: { quiz_id: quizId },
            is_mandatory: true,
            order: 0
          }

          const targetSectionId = activeSection || sections[0]?.id
          if (targetSectionId) {
            setSections(prev => prev.map(s =>
              s.id === targetSectionId
                ? { ...s, items: [...s.items, { ...newBlock, order: s.items.length }] }
                : s
            ))
            toast({
              title: t('builder.added'),
              description: t('builder.quizAdded', { title: quiz.title })
            })
          }
        }}
        onAddQuestions={async (questionIds) => {
          if (!questionIds.length) return
          if (!moduleId) {
            toast({
              title: t('common:error'),
              description: t('saveModuleFirst'),
              variant: 'destructive'
            })
            return
          }

          try {
            const { data: quizData, error: quizError } = await supabase
              .from('learning_quizzes')
              .insert({
                title: `${title || t('builder.untitledModule')} - Generated Quiz`,
                description: `Created from Knowledge Base questions`,
                status: 'published',
                training_module_id: moduleId,
                passing_score_percentage: 80,
                created_by: profile?.id
              })
              .select()
              .single()

            if (quizError) throw quizError

            const quizQuestions = questionIds.map((qId, idx) => ({
              quiz_id: quizData.id,
              question_id: qId,
              display_order: idx + 1,
              points_override: 1
            }))

            const { error: linkError } = await supabase
              .from('unified_quiz_questions')
              .insert(quizQuestions)

            if (linkError) throw linkError

            const newBlock: ContentBlockForm = {
              id: `quiz-${Date.now()}`,
              type: 'quiz',
              title: quizData.title,
              content: '',
              content_url: '',
              content_data: { quiz_id: quizData.id },
              is_mandatory: true,
              order: 0
            }

            const targetSectionId = activeSection || sections[0]?.id
            if (targetSectionId) {
              setSections(prev => prev.map(s =>
                s.id === targetSectionId
                  ? { ...s, items: [...s.items, { ...newBlock, order: s.items.length }] }
                  : s
              ))

              queryClient.invalidateQueries({ queryKey: ['available-quizzes'] })

              toast({
                title: t('builder.added'),
                description: t('builder.questionsAdded', { count: questionIds.length })
              })
            }

          } catch (_err) {
            toast({
              title: t('common:error'),
              description: 'Failed to create quiz from questions.',
              variant: 'destructive'
            })
          }
        }}
        className="h-full"
      />
    </div>
  )
}
