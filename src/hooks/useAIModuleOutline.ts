/**
 * useAIModuleOutline
 *
 * React Query mutation hook wrapping aiService.generateModuleOutline --
 * the "AI Draft Outline" feature for the Training Builder. Given pasted
 * source content, it returns a suggested module title/description and an
 * ordered list of section skeletons (heading + suggested block type +
 * summary) for the author to review, edit, and insert into the builder.
 */

import { aiService, type CourseArchetype, type CourseInclusions, type CourseTone, type ModuleOutline } from '@/lib/gemini'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface GenerateModuleOutlineRequest {
  sourceContent: string
  targetLanguage?: string
  sectionCount?: number
  archetype?: CourseArchetype
  tone?: CourseTone
  inclusions?: CourseInclusions
  preferredModel?: string
  onFallbackModelEngaged?: (failedModel: string, nextModel: string) => void
}

export function useGenerateModuleOutline() {
  return useMutation({
    mutationFn: (request: GenerateModuleOutlineRequest): Promise<ModuleOutline> =>
      aiService.generateModuleOutline(request),
    onSuccess: (outline) => {
      const count = outline.sections.length
      const modelNote = outline.meta?.fallbackOccurred
        ? ` (via fallback model)`
        : ''
      toast.success(`Draft outline ready: ${count} section${count === 1 ? '' : 's'}${modelNote}`)
    },
    onError: (error) => {
      toast.error('Failed to generate outline')
      console.error('AI outline generation error:', error)
    }
  })
}
