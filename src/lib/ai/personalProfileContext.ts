import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types/profile'
import { format } from 'date-fns'

export interface PersonalExecutiveContext {
  profileSummary: string
  tasksSummary: string
  learningSummary: string
  announcementsSummary: string
  shiftsSummary: string
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
      tasksSummary: '',
      learningSummary: '',
      announcementsSummary: '',
      shiftsSummary: '',
      rawContextBlock: '',
    }
  }

  const propertyId = profile?.property?.id || profile?.properties?.[0]?.id
  const departmentId = profile?.department_id || profile?.departments?.[0]?.id

  try {
    // 1. Fetch User's Pending / In-Progress Tasks
    const tasksPromise = supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, created_at')
      .eq('assigned_to_id', userId)
      .eq('is_deleted', false)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8)

    // 2. Fetch User's Active Learning / Training Assignments
    const learningPromise = supabase
      .from('learning_assignments')
      .select(`
        id,
        status,
        progress,
        due_date,
        course:learning_courses(id, title, category, difficulty)
      `)
      .eq('user_id', userId)
      .neq('status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5)

    // 3. Fetch Recent Property Announcements
    let announcementsQuery = supabase
      .from('announcements')
      .select('id, title, priority, published_at, target_type')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(4)

    if (propertyId) {
      announcementsQuery = announcementsQuery.or(`property_id.eq.${propertyId},target_type.eq.all`)
    }

    // 4. Fetch User's Upcoming Shift Assignments
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const shiftsPromise = supabase
      .from('shift_assignments')
      .select(`
        id,
        shift_date,
        shift:shifts(id, name, start_time, end_time)
      `)
      .eq('user_id', userId)
      .gte('shift_date', todayStr)
      .order('shift_date', { ascending: true })
      .limit(3)

    // Execute concurrently with read-only performance
    const [tasksRes, learningRes, announcementsRes, shiftsRes] = await Promise.allSettled([
      tasksPromise,
      learningPromise,
      announcementsQuery,
      shiftsPromise,
    ])

    // Format Tasks Summary
    const tasks = tasksRes.status === 'fulfilled' && tasksRes.value.data ? tasksRes.value.data : []
    const tasksSummary = tasks.length > 0
      ? tasks.map((t: any, i: number) => {
          const due = t.due_date ? `Due: ${format(new Date(t.due_date), 'yyyy-MM-dd')}` : 'No deadline'
          return `${i + 1}. [${t.priority?.toUpperCase() || 'NORMAL'}] "${t.title}" (Status: ${t.status}, ${due})`
        }).join('\n')
      : 'No pending tasks assigned currently.'

    // Format Learning Summary
    const learning = learningRes.status === 'fulfilled' && learningRes.value.data ? learningRes.value.data : []
    const learningSummary = learning.length > 0
      ? learning.map((l: any, i: number) => {
          const courseTitle = l.course?.title || 'Hotel Training Module'
          const due = l.due_date ? `Due: ${format(new Date(l.due_date), 'yyyy-MM-dd')}` : 'No deadline'
          return `${i + 1}. "${courseTitle}" (Progress: ${l.progress || 0}%, Status: ${l.status}, ${due})`
        }).join('\n')
      : 'All assigned learning modules are up to date.'

    // Format Announcements Summary
    const announcements = announcementsRes.status === 'fulfilled' && announcementsRes.value.data ? announcementsRes.value.data : []
    const announcementsSummary = announcements.length > 0
      ? announcements.map((a: any, i: number) => {
          const pub = a.published_at ? `Published: ${format(new Date(a.published_at), 'yyyy-MM-dd')}` : ''
          return `${i + 1}. "${a.title}" [${a.priority || 'Normal'}] (${pub})`
        }).join('\n')
      : 'No recent announcements.'

    // Format Shifts Summary
    const shifts = shiftsRes.status === 'fulfilled' && shiftsRes.value.data ? shiftsRes.value.data : []
    const shiftsSummary = shifts.length > 0
      ? shifts.map((s: any, i: number) => {
          const shiftName = s.shift?.name || 'Standard Shift'
          const times = s.shift?.start_time && s.shift?.end_time ? `(${s.shift.start_time} - ${s.shift.end_time})` : ''
          return `${i + 1}. Date: ${s.shift_date} - ${shiftName} ${times}`
        }).join('\n')
      : 'No upcoming scheduled shifts found in the system for this week.'

    // Format Profile Info
    const profileSummary = `
- Employee Name: ${profile?.full_name || 'Staff Member'}
- Job Title: ${profile?.job_title || 'Hospitality Associate'}
- Department: ${profile?.departments?.[0]?.name || profile?.department_id || 'Hotel Operations'}
- Hotel Property: ${profile?.property?.name || 'PRIME Hotels & Resorts (KSA)'}
- Staff ID / Code: ${profile?.staff_id || 'PRIME-EMP'}
- Role / Permissions: ${profile?.role || 'staff'}
- Email: ${profile?.email || 'employee@primehotels.sa'}
`.trim()

    // Build the master context block
    const rawContextBlock = `
=== 👤 AUTHENTICATED EMPLOYEE LIVE DATABASE CONTEXT (READ-ONLY) ===
${profileSummary}

=== 📋 ASSIGNED PENDING TASKS (${tasks.length} active) ===
${tasksSummary}

=== 🎓 ACTIVE LEARNING & TRAINING COURSES (${learning.length} assigned) ===
${learningSummary}

=== 📅 UPCOMING SHIFTS & SCHEDULE ===
${shiftsSummary}

=== 📢 RECENT PROPERTY & COMPANY ANNOUNCEMENTS ===
${announcementsSummary}

=== 🔒 ASSISTANT INSTRUCTIONS ===
1. You are this employee's dedicated, personal 5-star executive AI assistant.
2. You have SECURE, READ-ONLY access to their live database workspace above.
3. When they ask about their tasks, learning, shift, or announcements, reference their real records directly.
4. Maintain strict confidentiality: Never fabricate database IDs or expose information outside their property/department scope.
5. Provide actionable, concise, and courteous answers in their preferred language (Arabic or English).
`.trim()

    return {
      profileSummary,
      tasksSummary,
      learningSummary,
      announcementsSummary,
      shiftsSummary,
      rawContextBlock,
    }
  } catch (error) {
    console.warn('Failed to build personal executive DB context:', error)
    return {
      profileSummary: `- Employee Name: ${profile?.full_name || 'Staff Member'}`,
      tasksSummary: 'Live task data temporarily unavailable.',
      learningSummary: 'Live learning data temporarily unavailable.',
      announcementsSummary: 'Live announcements temporarily unavailable.',
      shiftsSummary: 'Live shift schedule temporarily unavailable.',
      rawContextBlock: `Employee: ${profile?.full_name || 'Staff Member'}, Property: ${profile?.property?.name || 'PRIME Hotels'}`,
    }
  }
}
