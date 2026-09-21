import { supabase } from '@/lib/supabase'
import type {
  TrainingSession,
  TrainingSessionAttendee,
  SessionAttendanceStatus
} from '@/types/enterpriseOperatingModel'
import type { TablesInsert } from '@/lib/database.types'

export const iltService = {
  async getSessions(filters?: {
    organizationId?: string
    hotelId?: string
    courseId?: string
    instructorId?: string
    status?: string
  }): Promise<TrainingSession[]> {
    let query = supabase
      .from('training_sessions')
      .select(
        `
        *,
        instructor:profiles!training_sessions_instructor_id_fkey(id, full_name, email, avatar_url),
        hotel:hotels(id, name),
        course:courses(id, title),
        attendees:training_session_attendees(count)
      `
      )
      .order('start_time', { ascending: true })

    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters?.hotelId) {
      query = query.or(`hotel_id.eq.${filters.hotelId},hotel_id.is.null`)
    }
    if (filters?.courseId) {
      query = query.eq('course_id', filters.courseId)
    }
    if (filters?.instructorId) {
      query = query.eq('instructor_id', filters.instructorId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any) => ({
      ...row,
      attendees_count: row.attendees?.[0]?.count || 0
    }))
  },

  async getSessionAttendees(sessionId: string): Promise<TrainingSessionAttendee[]> {
    const { data, error } = await supabase
      .from('training_session_attendees')
      .select(
        `
        *,
        user:profiles(id, full_name, email, avatar_url)
      `
      )
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []) as unknown as TrainingSessionAttendee[]
  },

  async createSession(session: Partial<TrainingSession>): Promise<TrainingSession> {
    const { data, error } = await supabase
      .from('training_sessions')
      .insert(session as TablesInsert<'training_sessions'>)
      .select()
      .single()

    if (error) throw error
    return data as unknown as TrainingSession
  },

  async registerAttendee(sessionId: string, userId: string, organizationId?: string): Promise<void> {
    const payload: Record<string, any> = {
      session_id: sessionId,
      user_id: userId,
      attendance_status: 'registered'
    }
    if (organizationId) {
      payload.organization_id = organizationId
    }

    const { error } = await supabase
      .from('training_session_attendees')
      .insert(payload)

    if (error) throw error
  },

  async removeAttendee(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('training_session_attendees')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (error) throw error
  },

  async markAttendance(
    sessionId: string,
    userId: string,
    status: SessionAttendanceStatus,
    scorePercentage?: number,
    feedback?: string
  ): Promise<void> {
    const { data: user } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('training_session_attendees')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        attendance_status: status,
        score_percentage: scorePercentage,
        feedback_comments: feedback,
        marked_by: user?.user?.id,
        marked_at: new Date().toISOString()
      }, { onConflict: 'session_id,user_id' })

    if (error) throw error
  }
}
