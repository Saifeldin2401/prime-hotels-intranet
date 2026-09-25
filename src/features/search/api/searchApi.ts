import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'

export interface SearchDocResult {
  id: string
  title: string
  description?: string | null
  status?: string
  created_at: string
  document_type?: string
}

export interface SearchCourseResult {
  id: string
  title: string
  description?: string | null
  status?: string
  difficulty_level?: string | null
  created_at: string
  estimated_duration_minutes?: number | null
}

export interface SearchQuizResult {
  id: string
  title: string
  description?: string | null
  passing_score_percentage?: number | null
  created_at: string
}

export interface SearchCertResult {
  id: string
  certificate_number?: string | null
  title?: string | null
  recipient_name?: string | null
  issue_date: string
}

export interface SearchProfileResult {
  id: string
  full_name: string | null
  email: string | null
  job_title?: string | null
  role?: string | null
}

export interface GlobalSearchResults {
  documents: SearchDocResult[]
  courses: SearchCourseResult[]
  quizzes: SearchQuizResult[]
  certificates: SearchCertResult[]
  profiles: SearchProfileResult[]
}

export interface SearchParams {
  query: string
  organizationId: string
  limit?: number
}

export async function searchDocuments({
  query,
  organizationId,
  limit = 20,
}: SearchParams): Promise<SearchDocResult[]> {
  const trimmed = query.trim()
  if (!trimmed || !organizationId) return []
  const escapedQuery = escapeSearchQuery(trimmed)
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, description, status, created_at, document_type:content_type')
    .eq('is_deleted', false)
    .or(
      `and(or(organization_id.eq.${organizationId},is_master_template.eq.true),or(title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%))`
    )
    .limit(limit)

  if (error) {
    console.warn('Search docs error:', error)
    return []
  }
  return (data || []) as SearchDocResult[]
}

export async function searchCourses({
  query,
  organizationId,
  limit = 20,
}: SearchParams): Promise<SearchCourseResult[]> {
  const trimmed = query.trim()
  if (!trimmed || !organizationId) return []
  const escapedQuery = escapeSearchQuery(trimmed)
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, status, difficulty_level, created_at, estimated_duration_minutes')
    .eq('is_deleted', false)
    .or(
      `and(or(organization_id.eq.${organizationId},is_master_template.eq.true),or(title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%))`
    )
    .limit(limit)

  if (error) {
    console.warn('Search courses error:', error)
    return []
  }
  return (data || []) as SearchCourseResult[]
}

export async function searchQuizzes({
  query,
  organizationId,
  limit = 20,
}: SearchParams): Promise<SearchQuizResult[]> {
  const trimmed = query.trim()
  if (!trimmed || !organizationId) return []
  const escapedQuery = escapeSearchQuery(trimmed)
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, passing_score_percentage, created_at')
    .eq('organization_id', organizationId)
    .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
    .limit(limit)

  if (error) {
    console.warn('Search quizzes error:', error)
    return []
  }
  return (data || []) as SearchQuizResult[]
}

export async function searchCertificates({
  query,
  organizationId,
  limit = 20,
}: SearchParams): Promise<SearchCertResult[]> {
  const trimmed = query.trim()
  if (!trimmed || !organizationId) return []
  const escapedQuery = escapeSearchQuery(trimmed)
  const { data, error } = await supabase
    .from('certificates')
    .select('id, certificate_number, title, recipient_name, issue_date:completion_date')
    .eq('organization_id', organizationId)
    .or(
      `title.ilike.%${escapedQuery}%,recipient_name.ilike.%${escapedQuery}%,certificate_number.ilike.%${escapedQuery}%`
    )
    .limit(limit)

  if (error) {
    console.warn('Search certs error:', error)
    return []
  }
  return (data || []) as SearchCertResult[]
}

export async function searchProfiles({
  query,
  organizationId,
  limit = 20,
}: SearchParams): Promise<SearchProfileResult[]> {
  const trimmed = query.trim()
  if (!trimmed || !organizationId) return []
  const escapedQuery = escapeSearchQuery(trimmed)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, job_title')
    .eq('organization_id', organizationId)
    .or(`full_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`)
    .limit(limit)

  if (error) {
    console.warn('Search profiles error:', error)
    return []
  }
  return (data || []) as SearchProfileResult[]
}

export async function searchAllTenantContent(params: SearchParams): Promise<GlobalSearchResults> {
  const [documents, courses, quizzes, certificates, profiles] = await Promise.all([
    searchDocuments(params),
    searchCourses(params),
    searchQuizzes(params),
    searchCertificates(params),
    searchProfiles(params),
  ])

  return {
    documents,
    courses,
    quizzes,
    certificates,
    profiles,
  }
}
