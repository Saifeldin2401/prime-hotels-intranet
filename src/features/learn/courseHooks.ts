import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/hooks/useAuth'

import { fetchCourse, fetchCourseLessons, fetchMyCourseProgress } from './courseApi'

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['learn-course', courseId],
    enabled: !!courseId,
    queryFn: () => fetchCourse(courseId as string),
  })
}

export function useCourseLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ['learn-course-lessons', courseId],
    enabled: !!courseId,
    queryFn: () => fetchCourseLessons(courseId as string),
  })
}

export function useMyCourseProgress(courseId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['learn-course-progress', courseId, user?.id],
    enabled: !!courseId && !!user?.id,
    queryFn: () => fetchMyCourseProgress(courseId as string, user!.id),
  })
}
