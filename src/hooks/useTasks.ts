import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { isRealPropertyId } from '@/lib/propertyScope'
import { getTransitionErrorMessage, validateTransition } from '@/lib/statusTransitions'
import { secureSearchTasks } from '@/lib/secureSearch'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { Task, TaskPriority, TaskStats, TaskStatus } from '@/lib/types'
import { sanitizeSearchInput } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Fetch tasks
export function useTasks(filters?: {
  status?: TaskStatus
  statuses?: TaskStatus[]
  priority?: TaskPriority
  assignedTo?: string
  assignedToIds?: string[]
  createdBy?: string
  propertyId?: string
  departmentId?: string
  search?: string
  limit?: number
  ignorePropertyFilter?: boolean // Allow bypassing property filter for regional admins
}) {
  const { currentProperty } = useProperty()

  return useQuery({
    queryKey: ['tasks', filters, currentProperty?.id],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to:profiles!assigned_to_id(id, full_name, avatar_url),
          created_by:profiles!created_by_id(id, full_name, avatar_url),
          property:properties(id, name),
          department:departments(id, name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
      } else if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to_id', filters.assignedTo)
      }
      if (filters?.assignedToIds && filters.assignedToIds.length > 0) {
        query = query.in('assigned_to_id', filters.assignedToIds)
      }
      if (filters?.createdBy) {
        query = query.eq('created_by_id', filters.createdBy)
      }

      // Auto-filter by current property unless explicitly disabled or consolidated scope is selected.
      if (!filters?.ignorePropertyFilter) {
        const propertyIdToUse = filters?.propertyId || currentProperty?.id
        if (isRealPropertyId(propertyIdToUse)) {
          query = query.eq('property_id', propertyIdToUse)
        }
      }

      if (filters?.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }
      
      // SECURE: Use parameterized RPC for search, or sanitize for simple filters
      if (filters?.search) {
        const sanitized = sanitizeSearchInput(filters.search)
        if (sanitized) {
          // Use secure search RPC for complex search
          const secureResults = await secureSearchTasks({
            search: sanitized,
            property_id: filters.propertyId || currentProperty?.id,
            department_id: filters.departmentId,
            assigned_to: filters.assignedTo,
            created_by: filters.createdBy,
            limit: filters.limit || 100
          })
          return (secureResults as unknown) as Task[]
        }
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return (data as unknown) as Task[]
    },
  })
}

// Paginated version of useTasks
// Fetch single task
// Fetch task stats
export function useTaskStats(userId?: string) {
  return useQuery({
    queryKey: ['task-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_task_stats', { user_id_param: userId })
        .single()

      if (error) throw error
      return data as TaskStats
    },
  })
}

// Create task
// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { notifyTaskAssigned, notifyTaskCompleted } = useNotificationTriggers()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      if (updates.property_id !== undefined && !isRealPropertyId(updates.property_id)) {
        throw new Error('A valid property_id is required when updating task scope')
      }

      // Get current task to check for changes
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('status, assigned_to_id, title, created_by_id')
        .eq('id', id)
        .single()

      // Validate status transition if status is being changed
      if (updates.status && currentTask) {
        if (currentTask.status !== updates.status) {
          try {
            validateTransition('task', currentTask.status, updates.status)
          } catch (_error) {
            const errorMsg = getTransitionErrorMessage('task', currentTask.status, updates.status)
            throw new Error(errorMsg)
          }
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Send notifications for important changes
      if (currentTask) {
        // Notify if task was reassigned
        if (updates.assigned_to_id && updates.assigned_to_id !== currentTask.assigned_to_id && updates.assigned_to_id !== user.id) {
          await notifyTaskAssigned(
            updates.assigned_to_id,
            id,
            currentTask.title || 'Task'
          )
        }

        // Notify creator if task was completed
        if (updates.status === 'completed' && currentTask.status !== 'completed' && currentTask.created_by_id && currentTask.created_by_id !== user.id) {
          await notifyTaskCompleted(
            currentTask.created_by_id,
            id,
            currentTask.title || 'Task'
          )
        }
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      crudToasts.update.success('Task')
    },
    onError: (error: Error) => {
      console.error('Error updating task:', error.message)
      crudToasts.update.error('task')
    }
  })
}

// Soft Delete task
// Add comment
