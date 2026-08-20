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
  onClose?: () => void
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
  onClose,
}: KBSidebarPanelProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const addBlockToSections = (block: ContentBlockForm) => {
    setSections(prev => {
      if (prev.length === 0) {
        return [{
          id: `section-${Date.now()}`,
          title: t('mainContent', 'Main Content'),
          description: '',
          items: [{ ...block, order: 0 }],
          order: 0
        }]
      }
      const targetSectionId = activeSection || prev[0].id
      return prev.map(s =>
        s.id === targetSectionId
          ? { ...s, items: [...s.items, { ...block, order: s.items.length }] }
          : s
      )
    })
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30 sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-16 end-0 w-full sm:w-[420px] md:w-[460px] lg:w-[500px] z-40 shadow-2xl border-s bg-background flex flex-col">
        <KnowledgeBaseSidebar
          moduleId={moduleId || undefined}
          moduleTopic={title}
          onClose={onClose}
          onInsertContent={(content) => {
            const newBlock: ContentBlockForm = {
              id: `block_${Date.now()}`,
              type: content.type === 'ai_generated' ? 'text' : (content.type as ContentType || 'text'),
              title: content.title,
              content: content.content,
              content_url: '',
              content_data: content.sourceId
                ? { source_document_id: content.sourceId, sop_id: content.sourceId }
                : {},
              is_mandatory: true,
              order: contentBlocks.length
            }
            setContentBlocks(prev => [...prev, newBlock])
            addBlockToSections(newBlock)

            toast({
              title: t('builder.added', 'Added'),
              description: t('builder.contentAdded', { defaultValue: `Content added for "${content.title}"` })
            })
          }}
          onLinkDocument={(docId, docTitle) => {
            const sop = availableSOPs?.find(s => s.id === docId)
            const resolvedTitle = sop?.title || docTitle || 'SOP Document'

            const newBlock: ContentBlockForm = {
              id: `sop-${Date.now()}`,
              type: 'sop_reference',
              title: resolvedTitle,
              content: '',
              content_url: '',
              content_data: { sop_id: docId, source_document_id: docId },
              is_mandatory: true,
              order: 0
            }

            addBlockToSections(newBlock)

            toast({
              title: t('builder.added', 'Added'),
              description: t('builder.sopAdded', { title: resolvedTitle, defaultValue: `Linked "${resolvedTitle}"` })
            })
          }}
          onLinkQuiz={(quizId, quizTitle) => {
            const quiz = availableQuizzes?.find(q => q.id === quizId)
            const resolvedTitle = quiz?.title || quizTitle || 'Quiz Assessment'

            const newBlock: ContentBlockForm = {
              id: `quiz-${Date.now()}`,
              type: 'quiz',
              title: resolvedTitle,
              content: '',
              content_url: '',
              content_data: { quiz_id: quizId },
              is_mandatory: true,
              order: 0
            }

            addBlockToSections(newBlock)

            toast({
              title: t('builder.added', 'Added'),
              description: t('builder.quizAdded', { title: resolvedTitle, defaultValue: `Linked "${resolvedTitle}"` })
            })
          }}
          onAddQuestions={async (questionIds) => {
            if (!questionIds.length) return

            try {
              const quizTitle = `${title || t('builder.untitledModule', 'Untitled Module')} - Knowledge Quiz`
              const { data: quizData, error: quizError } = await supabase
                .from('learning_quizzes')
                .insert({
                  title: quizTitle,
                  description: `Created from Knowledge Base question bank`,
                  status: 'published',
                  training_module_id: moduleId || null,
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

              addBlockToSections(newBlock)
              queryClient.invalidateQueries({ queryKey: ['available-quizzes'] })

              toast({
                title: t('builder.added', 'Added'),
                description: t('builder.questionsAdded', {
                  count: questionIds.length,
                  defaultValue: `Created quiz with ${questionIds.length} question(s)`
                })
              })
            } catch (err) {
              const errorDetails = getUserFriendlyError(err)
              toast({
                title: t('common:error', 'Error'),
                description: errorDetails.message || 'Failed to create quiz from questions.',
                variant: 'destructive'
              })
            }
          }}
          className="h-full border-none shadow-none rounded-none"
        />
      </aside>
    </>
  )
}
