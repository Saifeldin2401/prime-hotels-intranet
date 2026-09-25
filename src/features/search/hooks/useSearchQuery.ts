import { useQuery } from '@tanstack/react-query'
import {
  searchAllTenantContent,
  searchDocuments,
  searchCourses,
  searchQuizzes,
  searchCertificates,
  searchProfiles,
  type GlobalSearchResults,
} from '../api/searchApi'

export function useGlobalSearch(query: string, organizationId: string | null) {
  const trimmed = query.trim()
  const enabled = Boolean(organizationId && trimmed)

  return useQuery<GlobalSearchResults>({
    queryKey: ['search', 'global', trimmed, organizationId],
    queryFn: () => {
      if (!organizationId || !trimmed) {
        return {
          documents: [],
          courses: [],
          quizzes: [],
          certificates: [],
          profiles: [],
        }
      }
      return searchAllTenantContent({ query: trimmed, organizationId })
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useSearchCategory(
  category: 'documents' | 'courses' | 'quizzes' | 'certificates' | 'profiles',
  query: string,
  organizationId: string | null
) {
  const trimmed = query.trim()
  const enabled = Boolean(organizationId && trimmed)

  return useQuery({
    queryKey: ['search', category, trimmed, organizationId],
    queryFn: async () => {
      if (!organizationId || !trimmed) return []
      const params = { query: trimmed, organizationId }
      switch (category) {
        case 'documents':
          return searchDocuments(params)
        case 'courses':
          return searchCourses(params)
        case 'quizzes':
          return searchQuizzes(params)
        case 'certificates':
          return searchCertificates(params)
        case 'profiles':
          return searchProfiles(params)
      }
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  })
}
