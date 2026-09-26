import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types/profile'

export interface PersonalExecutiveContext {
  profileSummary: string
  learningSummary: string
  rawContextBlock: string
}

/**
 * Fetches secure, read-only live database context tailored for the authenticated employee profile.
 */
export async function fetchPersonalExecutiveContext(
  userId: string,
  profile: Profile | null
): Promise<PersonalExecutiveContext> {
  if (!userId) {
    return {
      profileSummary: '',
      learningSummary: '',
      rawContextBlock: '',
    }
  }

  try {
    // Active module progress (assignments seed a training_progress row per learner).
    const { data: learning, error } = await supabase
      .from('training_progress')
      .select(`
        id,
        status,
        progress:progress_percentage,
        course:courses(id, title, category, difficulty:difficulty_level)
      `)
      .eq('user_id', userId)
      .eq('lp_content_type', 'module')
      .neq('status', 'completed')
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .limit(5)

    if (error) throw error

    const learningRows = learning || []
    const learningSummary = learningRows.length > 0
      ? learningRows.map((l: any, i: number) => {
          const courseTitle = l.course?.title || 'Training course'
          return `${i + 1}. "${courseTitle}" (Progress: ${l.progress || 0}%, Status: ${l.status})`
        }).join('\n')
      : 'All assigned courses are up to date.'

    const profileSummary = `
- Employee Name: ${profile?.full_name || 'Staff Member'}
- Job Title: ${profile?.job_title || 'Hospitality Associate'}
- Department: ${profile?.departments?.[0]?.name || profile?.department_id || 'Not assigned'}
- Role / Permissions: ${profile?.role || 'staff'}
`.trim()

    const rawContextBlock = `
=== AUTHENTICATED EMPLOYEE CONTEXT (READ-ONLY) ===
${profileSummary}

=== ACTIVE COURSES (${learningRows.length} in progress) ===
${learningSummary}

=== ASSISTANT INSTRUCTIONS ===
1. You are this employee's learning assistant.
2. You have read-only access to the records above; reference them directly when asked about their training.
3. Never fabricate records or expose information outside their organization, hotel or department.
4. Answer concisely in their preferred language (Arabic or English).
`.trim()

    return { profileSummary, learningSummary, rawContextBlock }
  } catch (error) {
    console.warn('Failed to build personal learning context:', error)
    return {
      profileSummary: `- Employee Name: ${profile?.full_name || 'Staff Member'}`,
      learningSummary: 'Live learning data temporarily unavailable.',
      rawContextBlock: `Employee: ${profile?.full_name || 'Staff Member'}`,
    }
  }
}
