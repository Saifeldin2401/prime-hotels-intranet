import { useAuth } from '@/hooks/useAuth'
import {
  useTrainingAssignments,
  useTrainingProgress,
  useStartTraining,
  useCompleteTraining,
  useTrainingStats
} from '@/hooks/useTraining'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatsLoading, CardLoading } from '@/components/common/LoadingStates'
import {
  Play,
  Clock,
  CheckCircle,
  BookOpen,
  Award,
  Calendar,
  BarChart3
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { TrainingModule, TrainingAssignment, TrainingProgress } from '@/lib/types'

interface UserTrainingItem {
  module: TrainingModule
  assignment: TrainingAssignment | null
  progress: TrainingProgress | null
}

export default function MyTraining() {
  const { profile } = useAuth()

  // Get user's training assignments
  const { data: assignments, isLoading: assignmentsLoading } = useTrainingAssignments({
    assigned_to_user_id: profile?.id
  })

  // Get user's training progress
  const { data: progress, isLoading: progressLoading } = useTrainingProgress(
    profile?.id
  )

  // Get training stats
  const { data: stats } = useTrainingStats()

  // Mutations
  const startTrainingMutation = useStartTraining()
  const completeTrainingMutation = useCompleteTraining()

  // Combine assignments with progress
  const trainingItems: UserTrainingItem[] = assignments?.map(assignment => ({
    module: assignment.training_modules!,
    assignment,
    progress: progress?.find(p => p.training_id === assignment.training_module_id) || null
  })) || []

  const handleStartTraining = (trainingId: string, assignmentId?: string) => {
    startTrainingMutation.mutate({ trainingId, assignmentId })
  }

  const handleCompleteTraining = (progressId: string) => {
    completeTrainingMutation.mutate({ progressId })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'not_started': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Play className="w-4 h-4" />
      case 'not_started': return <BookOpen className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  if (assignmentsLoading || progressLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="My Training"
          description="View and complete your assigned training modules"
        />
        <StatsLoading count={4} />
        <CardLoading count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="My Training"
        description="View and complete your assigned training modules"
      />

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalAssigned}</div>
              <div className="text-xs sm:text-sm text-gray-600">Assigned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-xs sm:text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs sm:text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs sm:text-sm text-gray-600">Overdue</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training Items */}
      <div className="space-y-4">
        {trainingItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="w-12 h-12 text-hotel-navy mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No training assigned</h3>
              <p className="text-gray-700">
                You don't have any training modules assigned to you yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          trainingItems.map((item) => {
            const status = item.progress?.status || 'not_started'
            const progress = item.progress?.status === 'completed' ? 100 :
              item.progress?.status === 'in_progress' ? 50 : 0

            return (
              <Card key={item.module.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                        <h3 className="font-semibold text-base sm:text-lg">{item.module.title}</h3>
                        <Badge
                          className={`text-xs ${getStatusColor(status)}`}
                        >
                          {status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.module.description || 'No description provided'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.module.estimated_duration_minutes || 0} min</span>
                        </div>
                        {item.assignment?.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Due {formatRelativeTime(item.assignment.deadline)}</span>
                          </div>
                        )}
                      </div>

                      {item.assignment?.deadline && new Date(item.assignment.deadline) < new Date() && status !== 'completed' && (
                        <Badge variant="destructive" className="mb-2 text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'not_started' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-9 text-xs sm:text-sm"
                          onClick={() => handleStartTraining(item.module.id, item.assignment?.id)}
                          disabled={startTrainingMutation.isPending}
                        >
                          <Play className="w-3.5 h-3.5 mr-1" />
                          Start
                        </Button>
                      )}

                      {status === 'in_progress' && (
                        <Button
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors h-9 text-xs sm:text-sm"
                          size="sm"
                          onClick={() => window.open(`/training/${item.module.id}`, '_self')}
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" />
                          Continue
                        </Button>
                      )}

                      {status === 'completed' && (
                        <Button
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors h-9 text-xs sm:text-sm"
                          size="sm"
                          onClick={() => window.open(`/training/${item.module.id}`, '_self')}
                        >
                          <Award className="w-3.5 h-3.5 mr-1" />
                          Certificate
                        </Button>
                      )}
                    </div>
                  </div>

                  {status === 'in_progress' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm font-medium">Progress</span>
                        <span className="text-xs sm:text-sm text-gray-600">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
