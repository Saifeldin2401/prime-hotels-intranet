/**
 * SmartAICourseCreatorModal
 * High-Control AI Course & Assessment Generation Studio Modal
 */

import { AICourseEngineStudioModal } from '@/components/training/ai-engine/AICourseEngineStudioModal'
import type { CourseGenerationMode } from '@/types/aiCourseEngine'

interface SmartAICourseCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseCreated?: (moduleId: string) => void
  onApplyToBuilder?: (data: {
    title: string
    description: string
    sections: any[]
    checkpoints?: any[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    language: 'English' | 'Arabic'
  }) => void
  initialTopic?: string
  initialMode?: CourseGenerationMode
  initialDocumentId?: string
}

export function SmartAICourseCreatorModal({
  open,
  onOpenChange,
  onCourseCreated,
  onApplyToBuilder,
  initialTopic,
  initialMode,
  initialDocumentId,
}: SmartAICourseCreatorModalProps) {
  return (
    <AICourseEngineStudioModal
      open={open}
      onOpenChange={onOpenChange}
      onCourseCreated={onCourseCreated}
      onApplyToBuilder={onApplyToBuilder}
      initialTopic={initialTopic}
      initialMode={initialMode}
      initialDocumentId={initialDocumentId}
    />
  )
}
