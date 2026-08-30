/**
 * React Query Hooks for AI Course Engine & LCMS Studio
 */

import { aiCourseEngineService } from '@/services/aiCourseEngineService'
import type {
  CourseBlueprint,
  CourseGenerationJob,
  CourseGenerationPreset,
  CourseQAQualityReport,
  FullCourseGenerationConfig,
} from '@/types/aiCourseEngine'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function useExecuteCoursePipeline() {
  const [currentStage, setCurrentStage] = useState<number>(0)
  const [stageName, setStageName] = useState<string>('')
  const [stageDetail, setStageDetail] = useState<string>('')

  const mutation = useMutation<
    {
      blueprint: CourseBlueprint
      qaReport: CourseQAQualityReport
      jobId?: string
      durationMs: number
      resumedFromCheckpoint: boolean
    },
    Error,
    { config: FullCourseGenerationConfig; resumeJobId?: string }
  >({
    mutationFn: async ({ config, resumeJobId }) => {
      setCurrentStage(1)
      setStageName(resumeJobId ? 'Resuming' : 'Initializing')
      setStageDetail(
        resumeJobId
          ? 'Loading the last checkpoint and skipping completed work...'
          : 'Configuring pedagogical pipeline parameters...'
      )
      return await aiCourseEngineService.executeCoursePipeline(
        config,
        (stage, name, detail) => {
          setCurrentStage(stage)
          setStageName(name)
          setStageDetail(detail)
        },
        resumeJobId ? { resumeJobId } : undefined
      )
    },
  })

  return {
    ...mutation,
    currentStage,
    stageName,
    stageDetail,
  }
}

export function useSaveCourseBlueprint() {
  const queryClient = useQueryClient()

  return useMutation<
    { moduleId: string },
    Error,
    { blueprint: CourseBlueprint; config: FullCourseGenerationConfig; jobId?: string }
  >({
    mutationFn: async ({ blueprint, config, jobId }) => {
      return await aiCourseEngineService.saveBlueprintToDatabase(blueprint, config, jobId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      queryClient.invalidateQueries({ queryKey: ['course-generation-history'] })
    },
  })
}

export function useCourseGenerationPresets() {
  const queryClient = useQueryClient()

  const query = useQuery<CourseGenerationPreset[]>({
    queryKey: ['course-generation-presets'],
    queryFn: async () => {
      return await aiCourseEngineService.getPresets()
    },
    staleTime: 5 * 60 * 1000,
  })

  const savePresetMutation = useMutation<
    CourseGenerationPreset,
    Error,
    {
      name: string
      name_ar?: string
      description: string
      description_ar?: string
      config: FullCourseGenerationConfig
    }
  >({
    mutationFn: async (payload) => {
      return await aiCourseEngineService.saveCustomPreset(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-generation-presets'] })
    },
  })

  return {
    ...query,
    savePreset: savePresetMutation.mutateAsync,
    isSavingPreset: savePresetMutation.isPending,
  }
}

export function useCourseGenerationHistory() {
  return useQuery<CourseGenerationJob[]>({
    queryKey: ['course-generation-history'],
    queryFn: async () => {
      return await aiCourseEngineService.getGenerationHistory()
    },
    staleTime: 60 * 1000,
  })
}

export function useRefineComponent() {
  return useMutation<
    string,
    Error,
    {
      componentType: 'lesson' | 'quiz' | 'objective' | 'summary'
      currentContent: string
      action: string
      customInstruction?: string
      language?: string
      preferredModel?: string
    }
  >({
    mutationFn: async (params) => {
      return await aiCourseEngineService.refineComponent(params)
    },
  })
}
