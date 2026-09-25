import { supabase } from '@/lib/supabase'
import type { TrainingContentBlock } from '@/lib/types'
import type { CourseVisualAsset } from '@/types/aiCourseEngine'

export interface FetchCourseParams {
  id: string
  canViewUnpublished?: boolean
}

export interface CourseWithContent {
  module: any
  blocks: TrainingContentBlock[]
  referencedTitles: Record<string, string>
  visualAssets: CourseVisualAsset[]
}

export async function fetchCourseWithContent({
  id,
  canViewUnpublished = false,
}: FetchCourseParams): Promise<CourseWithContent | null> {
  let moduleQuery = supabase.from('courses').select('*').eq('id', id)

  if (!canViewUnpublished) {
    moduleQuery = moduleQuery.eq('status', 'published')
  }

  const { data: module, error: moduleError } = await moduleQuery.maybeSingle()

  if (moduleError) throw moduleError
  if (!module) return null

  // Lesson blocks live in `lessons`.
  const { data: blocks, error: blocksError } = await supabase
    .from('lessons')
    .select(
      'id, training_module_id, created_at, title, block_type, content, content_ar, block_order, content_url, content_data, is_mandatory, is_deleted, linked_training_id:source_document_id, ai_generated, ai_source_content, duration_seconds, points'
    )
    .eq('training_module_id', id)
    .eq('is_deleted', false)
    .order('block_order', { ascending: true })

  if (blocksError) throw blocksError

  // Map raw DB column names to TrainingContentBlock shape
  const mappedBlocks = (blocks || []).map((b) => {
    const contentData = b.content_data as Record<string, unknown> | null
    const resolvedSourceDocId =
      (contentData?.sop_id as string | undefined) ||
      (contentData?.source_document_id as string | undefined) ||
      (contentData?.document_id as string | undefined) ||
      b.linked_training_id ||
      null

    return {
      ...b,
      type: b.block_type,
      order: b.block_order,
      source_document_id: resolvedSourceDocId,
    }
  }) as TrainingContentBlock[]

  // Fetch referenced content titles (SOPs, Quizzes) to show in sidebar
  const sopIds = mappedBlocks
    .filter((b) => b.type === 'sop_reference')
    .map((b) => {
      const contentData = b.content_data as Record<string, unknown> | null
      const inlineId = contentData?.sop_id as string | undefined
      const legacyDocId = contentData?.document_id as string | undefined
      return inlineId || b.source_document_id || legacyDocId
    })
    .filter(Boolean) as string[]

  const quizIds = mappedBlocks
    .filter((b) => b.type === 'quiz' && b.content_data?.quiz_id)
    .map((b) => b.content_data!.quiz_id as string)

  const referencedTitles: Record<string, string> = {}

  if (sopIds.length > 0) {
    const { data: sops } = await supabase
      .from('documents')
      .select('id, title')
      .in('id', sopIds)
    sops?.forEach((sop) => {
      referencedTitles[sop.id] = sop.title
    })
  }

  if (quizIds.length > 0) {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title')
      .in('id', quizIds)
    quizzes?.forEach((quiz) => {
      referencedTitles[quiz.id] = quiz.title
    })
  }

  let visualAssets: CourseVisualAsset[] = []
  try {
    const { data: assets } = await supabase
      .from('course_visual_assets')
      .select('*')
      .eq('course_id', id)
      .in('status', ['completed', 'draft'])
      .order('order_index', { ascending: true })
    visualAssets = (assets || []) as CourseVisualAsset[]
  } catch (_assetError) {
    visualAssets = []
  }

  return {
    module,
    blocks: mappedBlocks,
    referencedTitles,
    visualAssets,
  }
}

export async function fetchLinkedTrainingProgress(userId: string, trainingId: string) {
  const { data: syncedTrainingProgress } = await supabase
    .from('training_progress')
    .select('id, quiz_score')
    .eq('user_id', userId)
    .eq('training_id', trainingId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return syncedTrainingProgress
}

export async function recordLessonBlockCompletion(
  userId: string,
  trainingModuleId: string,
  blockId: string,
  timeSpentSeconds: number
) {
  const nowIso = new Date().toISOString()
  await supabase.from('lesson_progress').upsert(
    {
      user_id: userId,
      training_module_id: trainingModuleId,
      block_id: blockId,
      completed_at: nowIso,
      last_viewed_at: nowIso,
      time_spent_seconds: timeSpentSeconds,
    },
    { onConflict: 'user_id,block_id' }
  )
}

export async function recordLessonBlockLastViewed(
  userId: string,
  trainingModuleId: string,
  blockId: string
) {
  const nowIso = new Date().toISOString()
  await supabase.from('lesson_progress').upsert(
    {
      user_id: userId,
      training_module_id: trainingModuleId,
      block_id: blockId,
      last_viewed_at: nowIso,
    },
    { onConflict: 'user_id,block_id' }
  )
}

export async function fetchPersistedProgress(userId: string, trainingId: string) {
  const { data } = await supabase
    .from('training_progress')
    .select(
      'id, status, progress_percentage, score_percentage, passed, completed_at, last_block_index, last_block_id, time_spent_seconds, metadata, updated_at'
    )
    .eq('user_id', userId)
    .eq('lp_content_type', 'module')
    .eq('training_id', trainingId)
    .maybeSingle()

  return data
}

export function subscribeToPlayerProgress(
  userId: string,
  trainingId: string,
  onProgressUpdate: (payload: any) => void
): () => void {
  const channel = supabase
    .channel(`training-player-progress:${userId}:${trainingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'training_progress',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onProgressUpdate(payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
