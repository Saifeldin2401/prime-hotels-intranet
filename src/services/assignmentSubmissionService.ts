/**
 * Assignment & Practical Submissions Service
 *
 * Manages learner practical assignment submissions, file attachment uploads,
 * submission status tracking, and trainer review / grading workflows.
 */

import { supabase } from '@/lib/supabase'

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'revision_required'
  | 'approved'
  | 'rejected'

export interface SubmissionAttachment {
  id?: string
  name: string
  url: string
  size?: number
  type?: string
  uploadedAt?: string
}

export interface TrainingAssignmentSubmission {
  id: string
  training_module_id: string
  block_id: string
  user_id: string
  assignment_id?: string | null
  status: SubmissionStatus
  submission_content?: string | null
  attachment_urls: SubmissionAttachment[]
  score?: number | null
  passed?: boolean | null
  instructor_feedback?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  submitted_at?: string | null
  attempt_number: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  // Populated relations
  learner?: {
    id: string
    full_name?: string | null
    email?: string | null
    avatar_url?: string | null
    job_title?: string | null
    department?: string | null
  } | null
  module?: {
    id: string
    title: string
    category?: string | null
  } | null
  reviewer?: {
    id: string
    full_name?: string | null
  } | null
}

export interface SubmitAssignmentDTO {
  moduleId: string
  blockId: string
  assignmentId?: string | null
  content?: string
  attachments?: SubmissionAttachment[]
  status?: SubmissionStatus
}

export interface ReviewSubmissionDTO {
  submissionId: string
  status: 'approved' | 'revision_required' | 'rejected'
  score?: number
  passed?: boolean
  feedback?: string
}

export const assignmentSubmissionService = {
  /**
   * Fetches the latest submission for a specific user, module, and block.
   */
  async getLatestSubmission(
    moduleId: string,
    blockId: string,
    userId?: string
  ): Promise<TrainingAssignmentSubmission | null> {
    const { data: authData } = await supabase.auth.getUser()
    const targetUserId = userId || authData.user?.id
    if (!targetUserId) return null

    const { data, error } = await supabase
      .from('training_assignment_submissions')
      .select(`
        *,
        reviewer:reviewed_by (id, full_name)
      `)
      .eq('training_module_id', moduleId)
      .eq('block_id', blockId)
      .eq('user_id', targetUserId)
      .eq('is_deleted', false)
      .order('attempt_number', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.warn('Failed to fetch assignment submission:', error)
      return null
    }

    if (!data) return null

    return {
      ...data,
      attachment_urls: Array.isArray(data.attachment_urls) ? data.attachment_urls : []
    } as TrainingAssignmentSubmission
  },

  /**
   * Fetches all submissions for a training module for the current user.
   */
  async getModuleSubmissionsForUser(
    moduleId: string,
    userId?: string
  ): Promise<Record<string, TrainingAssignmentSubmission>> {
    const { data: authData } = await supabase.auth.getUser()
    const targetUserId = userId || authData.user?.id
    if (!targetUserId) return {}

    const { data, error } = await supabase
      .from('training_assignment_submissions')
      .select('*')
      .eq('training_module_id', moduleId)
      .eq('user_id', targetUserId)
      .eq('is_deleted', false)
      .order('attempt_number', { ascending: false })

    if (error || !data) {
      return {}
    }

    const byBlockId: Record<string, TrainingAssignmentSubmission> = {}
    for (const item of data) {
      if (!byBlockId[item.block_id]) {
        byBlockId[item.block_id] = {
          ...item,
          attachment_urls: Array.isArray(item.attachment_urls) ? item.attachment_urls : []
        } as TrainingAssignmentSubmission
      }
    }
    return byBlockId
  },

  /**
   * Submits or updates a practical assignment response.
   */
  async submitAssignment(dto: SubmitAssignmentDTO): Promise<TrainingAssignmentSubmission> {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    if (!userId) throw new Error('Authentication required')

    // Check existing latest attempt
    const existing = await this.getLatestSubmission(dto.moduleId, dto.blockId, userId)

    let nextAttempt = 1
    if (existing) {
      if (existing.status === 'draft') {
        // Update existing draft
        const { data, error } = await supabase
          .from('training_assignment_submissions')
          .update({
            submission_content: dto.content,
            attachment_urls: dto.attachments || [],
            status: dto.status || 'submitted',
            submitted_at: dto.status === 'draft' ? null : new Date().toISOString(),
            assignment_id: dto.assignmentId || existing.assignment_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data as TrainingAssignmentSubmission
      }

      if (existing.status === 'revision_required' || existing.status === 'rejected') {
        nextAttempt = (existing.attempt_number || 1) + 1
      } else if (existing.status === 'submitted' || existing.status === 'under_review') {
        // Update in-place if still under review
        const { data, error } = await supabase
          .from('training_assignment_submissions')
          .update({
            submission_content: dto.content,
            attachment_urls: dto.attachments || [],
            status: dto.status || 'submitted',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data as TrainingAssignmentSubmission
      }
    }

    // Insert new submission row
    const isDraft = dto.status === 'draft'
    const newSubmission = {
      training_module_id: dto.moduleId,
      block_id: dto.blockId,
      user_id: userId,
      assignment_id: dto.assignmentId || null,
      status: isDraft ? 'draft' : 'submitted',
      submission_content: dto.content || '',
      attachment_urls: dto.attachments || [],
      attempt_number: nextAttempt,
      submitted_at: isDraft ? null : new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('training_assignment_submissions')
      .insert(newSubmission)
      .select()
      .single()

    if (error) throw error
    return data as TrainingAssignmentSubmission
  },

  /**
   * Uploads a file attachment to the secure storage bucket.
   */
  async uploadAttachment(file: File, moduleId: string, blockId: string): Promise<SubmissionAttachment> {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    if (!userId) throw new Error('Authentication required')

    const fileExt = file.name.split('.').pop() || 'bin'
    const fileName = `${userId}_${blockId}_${Date.now()}.${fileExt}`
    const filePath = `training-submissions/${moduleId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      // Fallback to public bucket or report error
      throw uploadError
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return {
      name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    }
  },

  /**
   * Queries submissions awaiting review across the organization for instructors and managers.
   */
  async getSubmissionsForGrading(filters?: {
    moduleId?: string
    status?: SubmissionStatus | 'all'
    limit?: number
    offset?: number
  }): Promise<{ submissions: TrainingAssignmentSubmission[]; totalCount: number }> {
    let query = supabase
      .from('training_assignment_submissions')
      .select(`
        *,
        learner:user_id (id, full_name, email, avatar_url, job_title),
        module:training_module_id (id, title, category),
        reviewer:reviewed_by (id, full_name)
      `, { count: 'exact' })
      .eq('is_deleted', false)

    if (filters?.moduleId) {
      query = query.eq('training_module_id', filters.moduleId)
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    } else {
      // By default show actionable submissions first
      query = query.neq('status', 'draft')
    }

    query = query.order('created_at', { ascending: false })

    if (typeof filters?.limit === 'number') {
      const offset = filters.offset || 0
      query = query.range(offset, offset + filters.limit - 1)
    }

    const { data, count, error } = await query

    if (error) {
      console.warn('Failed to query submissions for grading:', error)
      return { submissions: [], totalCount: 0 }
    }

    const formatted = (data || []).map((sub) => ({
      ...sub,
      attachment_urls: Array.isArray(sub.attachment_urls) ? sub.attachment_urls : []
    })) as TrainingAssignmentSubmission[]

    return {
      submissions: formatted,
      totalCount: count || formatted.length
    }
  },

  /**
   * Reviews and grades a learner's practical submission.
   */
  async reviewSubmission(dto: ReviewSubmissionDTO): Promise<TrainingAssignmentSubmission> {
    const { data: authData } = await supabase.auth.getUser()
    const reviewerId = authData.user?.id
    if (!reviewerId) throw new Error('Authentication required')

    const isApproved = dto.status === 'approved'
    const passed = dto.passed !== undefined ? dto.passed : isApproved

    const { data, error } = await supabase
      .from('training_assignment_submissions')
      .update({
        status: dto.status,
        score: dto.score !== undefined ? dto.score : (isApproved ? 100 : null),
        passed,
        instructor_feedback: dto.feedback || '',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', dto.submissionId)
      .select(`
        *,
        learner:user_id (id, full_name, email),
        module:training_module_id (id, title)
      `)
      .single()

    if (error) throw error

    // If approved, also record block completion in training_block_progress
    if (isApproved && data) {
      try {
        await supabase
          .from('training_block_progress')
          .upsert({
            user_id: data.user_id,
            training_module_id: data.training_module_id,
            block_id: data.block_id,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id,block_id' })
      } catch (err) {
        console.warn('Failed to auto-mark training_block_progress on approval:', err)
      }
    }

    return data as TrainingAssignmentSubmission
  }
}
