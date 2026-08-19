import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { generateAndLinkCheckpointQuestions } from '@/services/checkpointQuizGenerator'
import { Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SmartAICourseCreatorModal } from '@/components/training'
import { useTrainingBuilderContext } from '../../contexts/TrainingBuilderContext'
import type { TrainingSection } from './trainingBuilderTypes'

interface StepStructureProps {
  sections: TrainingSection[]
  addSection: () => void
  deleteSection: (id: string) => void
  handleRenameSection: (id: string, value: string) => void
  moveSection: (index: number, direction: number) => void
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  setSections: React.Dispatch<React.SetStateAction<TrainingSection[]>>
  setActiveSection: (v: string | null) => void
  isRTL: boolean
}

export function StepStructure({
  sections,
  addSection,
  deleteSection,
  handleRenameSection,
  moveSection,
  title,
  setTitle,
  description,
  setDescription,
  setSections,
  setActiveSection,
  isRTL,
}: StepStructureProps) {
  const { t } = useTranslation('training')
  const { toast } = useToast()
  const { profile } = useAuth()
  const ctx = useTrainingBuilderContext()
  const [showAIOutline, setShowAIOutline] = useState(false)

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{t('builder.structureTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('builder.structureDesc')}</p>
          </div>
          <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            <Button
              variant="outline"
              onClick={() => setShowAIOutline(true)}
              className={cn("border-purple-200 text-purple-700 hover:bg-purple-50", isRTL ? "flex-row-reverse" : "")}
            >
              <Sparkles className={cn("w-4 h-4", isRTL ? "ms-2" : "me-2")} />
              {t('builder.draftWithAI', 'Draft with AI')}
            </Button>
            <Button onClick={addSection} className={cn("bg-hotel-gold hover:bg-hotel-gold-dark text-white", isRTL ? "flex-row-reverse" : "")}>
              <Plus className={cn("w-4 h-4", isRTL ? "ms-2" : "me-2")} />
              {t('builder.addSection')}
            </Button>
          </div>
        </div>

        {sections.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50">
            <CardContent className="text-center py-16 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-lg font-medium text-slate-700 mb-2">{t('builder.startStructure')}</h4>
              <p className="text-slate-500 mb-6 max-w-sm">{t('builder.startStructureDesc')}</p>
              <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                <Button onClick={addSection} variant="outline" className={cn("border-dashed border-slate-300 hover:border-hotel-gold hover:text-hotel-gold", isRTL ? "flex-row-reverse" : "")}>
                  <Plus className={cn("w-4 h-4", isRTL ? "ms-1" : "me-1")} />
                  {t('builder.addSection')}
                </Button>
                <Button onClick={() => setShowAIOutline(true)} variant="outline" className={cn("border-dashed border-purple-200 text-purple-700 hover:border-purple-400 hover:bg-purple-50", isRTL ? "flex-row-reverse" : "")}>
                  <Sparkles className={cn("w-4 h-4", isRTL ? "ms-1" : "me-1")} />
                  {t('builder.draftWithAI', 'Draft with AI')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <Card key={section.id} className="border-slate-200 shadow-sm">
                <CardContent className="py-4 space-y-3">
                  <div className={cn("flex items-center justify-between gap-4", isRTL ? "flex-row-reverse" : "")}>
                    <div className="flex-1 space-y-2">
                      <Label className={cn("text-xs font-semibold text-slate-500", isRTL ? "text-right block" : "")}>
                        {t('builder.sectionLabel', { number: index + 1 })}
                      </Label>
                      <Input
                        value={section.title}
                        onChange={(e) => handleRenameSection(section.id, e.target.value)}
                        className={cn("bg-white border-slate-200 focus:ring-hotel-gold", isRTL ? "text-right" : "")}
                      />
                    </div>
                    <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                        {section.items.length} {t('builder.items')}
                      </Badge>
                      <div className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                        >
                          {t('builder.moveUp')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveSection(index, 1)}
                          disabled={index === sections.length - 1}
                        >
                          {t('builder.moveDown')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteSection(section.id)}
                        >
                          {t('delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SmartAICourseCreatorModal
        open={showAIOutline}
        onOpenChange={setShowAIOutline}
        initialTopic={title}
        onApplyToBuilder={async (generated) => {
          if (generated.title && !title) setTitle(generated.title)
          if (generated.description && !description) setDescription(generated.description)

          const checkpoints = generated.checkpoints || []
          const checkpointFailures: string[] = []

          const newSections = await Promise.all((generated.sections || []).map(async (sec: any, idx: number) => {
            const items: any[] = [
              {
                id: `block_${Date.now()}_${idx}`,
                title: sec.heading,
                type: (sec.suggestedBlockType === 'scenario' ? 'text' : sec.suggestedBlockType) as any,
                content: sec.rich_content || `<h3>${sec.heading}</h3><p>${sec.summary}</p>`,
                content_url: '',
                content_data: { summary: sec.summary },
                is_mandatory: true,
                order: 0
              }
            ]

            const checkpoint = checkpoints.find((c: any) => c.afterSectionIndex === (sec.originalIndex ?? idx) && c.include)
            if (checkpoint) {
              // Create the real quiz + AI-generated questions now, not just a
              // placeholder block - a quiz-type block with no linked quiz_id
              // (or a quiz with zero questions) permanently blocks completion
              // once this module is saved/published.
              try {
                const { data: createdQuiz } = await supabase
                  .from('learning_quizzes')
                  .insert({
                    title: `Checkpoint: ${checkpoint.topic || sec.heading}`,
                    description: `Verification quiz for ${sec.heading}`,
                    training_module_id: ctx.moduleId,
                    passing_score_percentage: Number(ctx.passingScore) || 80,
                    time_limit_minutes: 10,
                    max_attempts: 3,
                    status: 'published',
                    created_by: profile?.id
                  })
                  .select()
                  .single()

                if (createdQuiz) {
                  const linkedQuestionCount = await generateAndLinkCheckpointQuestions({
                    quizId: createdQuiz.id,
                    sectionContent: `${sec.heading}\n${sec.summary}\n${sec.rich_content || ''}`,
                    difficulty: generated.difficulty,
                    language: generated.language,
                    trainingModuleId: ctx.moduleId,
                    createdBy: profile?.id
                  })

                  if (linkedQuestionCount > 0) {
                    items.push({
                      id: `block_${Date.now()}_${idx}_quiz`,
                      title: `Checkpoint Quiz: ${checkpoint.topic || sec.heading}`,
                      type: 'quiz' as any,
                      content: '',
                      content_url: '',
                      content_data: {
                        quiz_id: createdQuiz.id,
                        is_checkpoint: true,
                        passing_score: 80,
                        topic: checkpoint.topic
                      },
                      is_mandatory: true,
                      order: 1
                    })
                  } else {
                    await supabase.from('learning_quizzes').delete().eq('id', createdQuiz.id)
                    checkpointFailures.push(checkpoint.topic || sec.heading)
                  }
                }
              } catch (qErr) {
                console.warn('Could not generate quiz checkpoint for section:', qErr)
                checkpointFailures.push(checkpoint.topic || sec.heading)
              }
            }

            return {
              id: `section_${Date.now()}_${idx}`,
              title: sec.heading,
              description: sec.summary,
              order: sections.length + idx,
              items
            }
          }))

          setSections((prev) => [...prev, ...newSections])
          if (newSections.length > 0) {
            setActiveSection(newSections[0].id)
          }

          if (checkpointFailures.length > 0) {
            toast({
              title: t('builder.checkpointGenerationIncomplete', 'Some checkpoint quizzes were skipped'),
              description: t(
                'builder.checkpointGenerationIncompleteDesc',
                `Could not generate a usable quiz for: ${checkpointFailures.join(', ')}. Add one manually before publishing.`
              ),
              variant: 'destructive'
            })
          }
        }}
      />
    </div>
  )
}
