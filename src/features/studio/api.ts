import { supabase } from '@/lib/supabase'

export interface ContentRow {
  type: 'course' | 'article' | 'quiz'
  id: string
  title: string
  status: string
  updated_at: string
  content_type?: string | null
}

/**
 * The signed-in author's own courses, articles and quizzes in one
 * organization. RLS scopes every table to what the member may see; the
 * created_by filter narrows it to their own work.
 */
export async function fetchMyContent(organizationId: string, userId: string): Promise<ContentRow[]> {
  const [courses, articles, quizzes] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, status, updated_at')
      .eq('organization_id', organizationId)
      .eq('created_by', userId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('documents')
      .select('id, title, status, updated_at, content_type')
      .eq('organization_id', organizationId)
      .eq('created_by', userId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('quizzes')
      .select('id, title, status, updated_at')
      .eq('organization_id', organizationId)
      .eq('created_by', userId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(100),
  ])
  for (const r of [courses, articles, quizzes]) if (r.error) throw r.error

  return [
    ...(courses.data ?? []).map((c) => ({ type: 'course' as const, id: c.id, title: c.title, status: String(c.status ?? ''), updated_at: c.updated_at ?? '' })),
    ...(articles.data ?? []).map((d) => ({ type: 'article' as const, id: d.id, title: d.title, status: String(d.status ?? ''), updated_at: d.updated_at ?? '', content_type: d.content_type })),
    ...(quizzes.data ?? []).map((q) => ({ type: 'quiz' as const, id: q.id, title: q.title, status: String(q.status ?? ''), updated_at: q.updated_at ?? '' })),
  ]
}
