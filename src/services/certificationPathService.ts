import { createCertificate } from '@/services/certificateService'
import { supabase } from '@/lib/supabase'

type PathRow = {
  id: string
  title: string
  description: string | null
  certificate_enabled: boolean | null
  is_active: boolean | null
}

type PathModuleRow = {
  module_id: string
  is_mandatory: boolean | null
}

type LearningProgressRow = {
  content_id: string
  status: string
  score_percentage: number | null
}

type TrainingModuleThresholdRow = {
  id: string
  passing_score_percentage: number | null
  estimated_duration_minutes: number | null
}

export interface AwardPathCertificatesInput {
  userId: string
  completedModuleId: string
  recipientName: string
  recipientEmail?: string | null
  propertyId?: string
  propertyName?: string
  departmentId?: string
  departmentName?: string
}

export interface AwardPathCertificatesResult {
  awarded: Array<{ pathId: string; title: string; certificateId: string }>
  alreadyIssued: string[]
  skippedIncomplete: string[]
  errors: Array<{ pathId: string; error: string }>
}

const toUniqueArray = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const getWeightedAverageScore = (
  rows: LearningProgressRow[],
  weightByModule: Map<string, number>
) => {
  let weightedSum = 0
  let totalWeight = 0

  rows.forEach((row) => {
    if (typeof row.score_percentage !== 'number' || !Number.isFinite(row.score_percentage)) return
    const rawWeight = weightByModule.get(row.content_id)
    const weight = typeof rawWeight === 'number' && Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 1
    weightedSum += row.score_percentage * weight
    totalWeight += weight
  })

  if (totalWeight === 0) return undefined
  return Math.round(weightedSum / totalWeight)
}

export async function awardCertificationPathCertificates(
  input: AwardPathCertificatesInput
): Promise<AwardPathCertificatesResult> {
  const result: AwardPathCertificatesResult = {
    awarded: [],
    alreadyIssued: [],
    skippedIncomplete: [],
    errors: []
  }

  const { data: modulePathRows, error: modulePathError } = await supabase
    .from('training_path_modules')
    .select('path_id')
    .eq('module_id', input.completedModuleId)

  if (modulePathError) {
    return {
      ...result,
      errors: [{ pathId: 'unknown', error: modulePathError.message }]
    }
  }

  const candidatePathIds = toUniqueArray((modulePathRows || []).map((row) => row.path_id as string))
  if (candidatePathIds.length === 0) return result

  const { data: paths, error: pathsError } = await supabase
    .from('training_paths')
    .select('id,title,description,certificate_enabled,is_active')
    .in('id', candidatePathIds)
    .eq('is_active', true)
    .eq('certificate_enabled', true)

  if (pathsError) {
    return {
      ...result,
      errors: [{ pathId: 'unknown', error: pathsError.message }]
    }
  }

  for (const path of (paths || []) as PathRow[]) {
    try {
      const { data: pathModules, error: pathModulesError } = await supabase
        .from('training_path_modules')
        .select('module_id,is_mandatory')
        .eq('path_id', path.id)

      if (pathModulesError) {
        result.errors.push({ pathId: path.id, error: pathModulesError.message })
        continue
      }

      const modules = (pathModules || []) as PathModuleRow[]
      const allModuleIds = toUniqueArray(modules.map((m) => m.module_id))
      if (allModuleIds.length === 0) {
        result.skippedIncomplete.push(path.id)
        continue
      }

      const mandatoryModuleIds = toUniqueArray(
        modules.filter((m) => m.is_mandatory !== false).map((m) => m.module_id)
      )
      const requiredModuleIds = mandatoryModuleIds.length > 0 ? mandatoryModuleIds : allModuleIds

      const { data: moduleThresholdRows, error: thresholdError } = await supabase
        .from('training_modules')
        .select('id,passing_score_percentage,estimated_duration_minutes')
        .in('id', requiredModuleIds)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (thresholdError) {
        result.errors.push({ pathId: path.id, error: thresholdError.message })
        continue
      }

      const passingThresholdByModule = new Map(
        ((moduleThresholdRows || []) as TrainingModuleThresholdRow[]).map((row) => [
          row.id,
          typeof row.passing_score_percentage === 'number' && Number.isFinite(row.passing_score_percentage)
            ? row.passing_score_percentage
            : 80
        ])
      )
      const weightByModule = new Map(
        ((moduleThresholdRows || []) as TrainingModuleThresholdRow[]).map((row) => [
          row.id,
          typeof row.estimated_duration_minutes === 'number' && Number.isFinite(row.estimated_duration_minutes)
            ? Math.max(1, row.estimated_duration_minutes)
            : 1
        ])
      )

      const { data: progressRows, error: progressError } = await supabase
        .from('training_progress')
        .select('content_id,status,score_percentage')
        .eq('user_id', input.userId)
        .eq('content_type', 'module')
        .in('content_id', allModuleIds)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (progressError) {
        result.errors.push({ pathId: path.id, error: progressError.message })
        continue
      }

      const progressByModule = new Map(
        ((progressRows || []) as LearningProgressRow[]).map((row) => [row.content_id, row])
      )

      const allRequiredComplete = requiredModuleIds.every((moduleId) => {
        const moduleProgress = progressByModule.get(moduleId)
        if (moduleProgress?.status !== 'completed') return false

        const score = moduleProgress.score_percentage
        if (typeof score !== 'number' || !Number.isFinite(score)) return true

        const passingThreshold = passingThresholdByModule.get(moduleId) ?? 80
        return score >= passingThreshold
      })

      if (!allRequiredComplete) {
        result.skippedIncomplete.push(path.id)
        continue
      }

      const { data: existingCertificate, error: existingCertificateError } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', input.userId)
        .eq('certificate_type', 'achievement')
        .eq('status', 'active')
        .contains('metadata', { training_path_id: path.id })
        .maybeSingle()

      if (!existingCertificateError && existingCertificate?.id) {
        result.alreadyIssued.push(path.id)
      } else {
        const aggregateScore = getWeightedAverageScore(
          (progressRows || []) as LearningProgressRow[],
          weightByModule
        )
        const completionDate = new Date()
        const cert = await createCertificate({
          userId: input.userId,
          recipientName: input.recipientName,
          recipientEmail: input.recipientEmail || undefined,
          certificateType: 'achievement',
          title: path.title,
          description:
            path.description || `Completed training path: ${path.title}`,
          completionDate,
          score: aggregateScore,
          propertyId: input.propertyId,
          propertyName: input.propertyName,
          departmentId: input.departmentId,
          departmentName: input.departmentName,
          metadata: {
            training_path_id: path.id,
            training_path_title: path.title,
            required_module_ids: requiredModuleIds
          }
        })

        if (cert?.id) {
          result.awarded.push({
            pathId: path.id,
            title: path.title,
            certificateId: cert.id
          })
        } else {
          result.errors.push({
            pathId: path.id,
            error: 'Failed to create certification path certificate'
          })
        }
      }

      // Keep enrollment completion in sync with path completion.
      const { error: enrollmentError } = await supabase
        .from('user_path_enrollments')
        .upsert(
          {
            user_id: input.userId,
            path_id: path.id,
            completed_at: new Date().toISOString()
          },
          { onConflict: 'user_id,path_id' }
        )

      if (enrollmentError) {
        result.errors.push({ pathId: path.id, error: enrollmentError.message })
      }
    } catch (error) {
      result.errors.push({
        pathId: path.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return result
}
