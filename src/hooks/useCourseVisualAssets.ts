/**
 * Custom React Query hooks for Course Visual Assets Management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiCourseEngineService } from '@/services/aiCourseEngineService'
import type { CourseVisualAsset, VisualOpportunity } from '@/types/aiCourseEngine'

export const COURSE_VISUAL_KEYS = {
  all: ['course-visual-assets'] as const,
  byCourse: (courseId: string) => [...COURSE_VISUAL_KEYS.all, courseId] as const,
}

export function useCourseVisualAssets(courseId?: string) {
  return useQuery({
    queryKey: COURSE_VISUAL_KEYS.byCourse(courseId || ''),
    queryFn: () => (courseId ? aiCourseEngineService.getCourseVisualAssets(courseId) : []),
    enabled: Boolean(courseId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateVisualAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetId,
      updates,
    }: {
      assetId: string
      updates: Partial<CourseVisualAsset>
    }) => aiCourseEngineService.updateVisualAsset(assetId, updates),
    onSuccess: (updatedAsset) => {
      queryClient.invalidateQueries({
        queryKey: COURSE_VISUAL_KEYS.byCourse(updatedAsset.course_id),
      })
    },
  })
}

export function useDeleteVisualAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assetId,
      courseId,
    }: {
      assetId: string
      courseId: string
    }) => aiCourseEngineService.deleteVisualAsset(assetId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: COURSE_VISUAL_KEYS.byCourse(variables.courseId),
      })
    },
  })
}

export function useGenerateVisualAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      courseId: string
      moduleId: string
      lessonId: string
      opportunity: VisualOpportunity
      model?: string
      visualStyle?: string
    }) => aiCourseEngineService.generateLessonVisualAsset(params),
    onSuccess: (asset) => {
      if (asset) {
        queryClient.invalidateQueries({
          queryKey: COURSE_VISUAL_KEYS.byCourse(asset.course_id),
        })
      }
    },
  })
}
