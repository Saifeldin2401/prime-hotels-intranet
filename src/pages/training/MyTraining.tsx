import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TrainingModule, TrainingAssignment, TrainingProgress } from '@/lib/types'

interface UserTrainingItem {
  module: TrainingModule
  assignment: TrainingAssignment | null
  progress: TrainingProgress | null
}

export default function MyTraining() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: ['my-training', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return [] as UserTrainingItem[]

      // Fetch assignments visible to this user
      const { data: assignments, error: assignmentsError } = await supabase
        .from('training_assignments')
        .select('*')

      if (assignmentsError) throw assignmentsError

      const assignmentModulesIds = Array.from(
        new Set((assignments || []).map((a) => a.training_module_id))
      )

      if (assignmentModulesIds.length === 0) return [] as UserTrainingItem[]

      // Fetch modules
      const { data: modules, error: modulesError } = await supabase
        .from('training_modules')
        .select('*')
        .in('id', assignmentModulesIds)

      if (modulesError) throw modulesError

      // Fetch progress for this user
      const { data: progress, error: progressError } = await supabase
        .from('training_progress')
        .select('*')
        .eq('user_id', profile.id)

      if (progressError) throw progressError

      const items: UserTrainingItem[] = []

      modules?.forEach((m) => {
        const moduleAssignments = (assignments || []).filter(
          (a) => a.training_module_id === m.id,
        )

        // For now, just pick the first assignment; logic can be extended later
        const assignment = moduleAssignments[0] || null
        const moduleProgress = (progress || []).find((p) => p.training_id === m.id) || null

        items.push({
          module: m as TrainingModule,
          assignment: assignment as TrainingAssignment | null,
          progress: moduleProgress as TrainingProgress | null,
        })
      })

      return items
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      moduleId,
      assignmentId,
      nextStatus,
    }: {
      moduleId: string
      assignmentId: string | null
      nextStatus: 'in_progress' | 'completed'
    }) => {
      if (!profile?.id) return

      const now = new Date().toISOString()

      // Upsert progress row for this user and module
      const { data, error } = await supabase
        .from('training_progress')
        .upsert(
          {
            user_id: profile.id,
            training_id: moduleId,
            assignment_id: assignmentId,
            status: nextStatus,
            started_at: nextStatus === 'in_progress' ? now : undefined,
            completed_at: nextStatus === 'completed' ? now : undefined,
          },
          { onConflict: 'user_id,training_id' },
        )
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-training', profile?.id] })
    },
  })

  const handleStart = (item: UserTrainingItem) => {
    updateStatusMutation.mutate({
      moduleId: item.module.id,
      assignmentId: item.assignment?.id ?? null,
      nextStatus: 'in_progress',
    })
  }

  const handleComplete = (item: UserTrainingItem) => {
    updateStatusMutation.mutate({
      moduleId: item.module.id,
      assignmentId: item.assignment?.id ?? null,
      nextStatus: 'completed',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Training"
        description="View your assigned training and track your progress"
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading training...
            </div>
          ) : !items || items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No training assigned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const status = item.progress?.status ?? 'not_started'
                return (
                  <div
                    key={item.module.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.module.title}</p>
                      {item.module.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.module.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        Status: {status.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'not_started' && (
                        <Button
                          size="sm"
                          onClick={() => handleStart(item)}
                          disabled={updateStatusMutation.isPending}
                        >
                          Start
                        </Button>
                      )}
                      {status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(item)}
                          disabled={updateStatusMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {status === 'completed' && (
                        <span className="text-xs text-green-600 font-medium">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
