import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { iltService } from '@/services/iltService'
import type { SessionAttendanceStatus, TrainingSession } from '@/types/enterpriseOperatingModel'

export function useTrainingSessions(filters?: {
  organizationId?: string
  hotelId?: string
  courseId?: string
  instructorId?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['training-sessions', filters],
    queryFn: () => iltService.getSessions(filters)
  })
}

export function useSessionAttendees(sessionId?: string) {
  return useQuery({
    queryKey: ['session-attendees', sessionId],
    queryFn: () => (sessionId ? iltService.getSessionAttendees(sessionId) : []),
    enabled: Boolean(sessionId)
  })
}

export function useCreateTrainingSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (session: Partial<TrainingSession>) => iltService.createSession(session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
    }
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sessionId,
      userId,
      status,
      scorePercentage,
      feedback
    }: {
      sessionId: string
      userId: string
      status: SessionAttendanceStatus
      scorePercentage?: number
      feedback?: string
    }) =>
      iltService.markAttendance(sessionId, userId, status, scorePercentage, feedback),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-attendees', variables.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
    }
  })
}
