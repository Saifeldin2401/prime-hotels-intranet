/**
 * useAIModuleOutline
 *
 * React Query mutation hook wrapping aiService.generateModuleOutline --
 * the "AI Draft Outline" feature for the Training Builder. Given pasted
 * source content, it returns a suggested module title/description and an
 * ordered list of section skeletons (heading + suggested block type +
 * summary) for the author to review, edit, and insert into the builder.
 */

import { aiService, type ModuleOutline } from '@/lib/gemini'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface GenerateModuleOutlineRequest {
  sourceContent: string
  targetLanguage?: string
  sectionCount?: number
}

export function useGenerateModuleOutline() {
  return useMutation({
    mutationFn: (request: GenerateModuleOutlineRequest): Promise<ModuleOutline> =>
      aiService.generateModuleOutline(request),
    onSuccess: (outline) => {
      const count = outline.sections.length
      toast.success(`Draft outline ready: ${count} section${count === 1 ? '' : 's'}`)
    },
    onError: (error) => {
      toast.error('Failed to generate outline')
      console.error('AI outline generation error:', error)
    }
  })
}
