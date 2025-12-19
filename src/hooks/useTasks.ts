import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import type { Task, TaskComment, TaskStats } from '@/lib/types'
import { validateTransition, getTransitionErrorMessage } from '@/lib/statusTransitions'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { crudToasts } from '@/lib/toastHelpers'

// Fetch tasks
export function useTasks(filters?: {
  status?: string
  priority?: string
  assignedTo?: string
  createdBy?: string
  propertyId?: string
  departmentId?: string
  search?: string
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
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to_id', filters.assignedTo)
      }
      if (filters?.createdBy) {
        query = query.eq('created_by_id', filters.createdBy)
      }

      // Auto-filter by current property unless explicitly disabled or overridden
      if (!filters?.ignorePropertyFilter) {
        const propertyIdToUse = filters?.propertyId || currentProperty?.id
        if (propertyIdToUse) {
          query = query.eq('property_id', propertyIdToUse)
        }
      }

      if (filters?.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Task[]
    },
  })
}

// Fetch single task
export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to:profiles!assigned_to_id(id, full_name, avatar_url, email),
          created_by:profiles!created_by_id(id, full_name, avatar_url),
          property:properties(id, name),
          department:departments(id, name),
          comments:task_comments(
            *,
            author:profiles(id, full_name, avatar_url)
          ),
          attachments:task_attachments(
            *,
            uploaded_by:profiles(id, full_name, avatar_url)
          )
        `)
        .eq('id', taskId)
        .single()

      if (error) throw error
      return data as Task
    },
  })
}

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
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const taskData = {
        ...task,
        created_by_id: user.id,
        status: task.status || 'open',
        priority: task.priority || 'medium'
      }

      let notificationPayload = null
      if (taskData.assigned_to_id && taskData.assigned_to_id !== user.id) {
        notificationPayload = {
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${taskData.title || 'Untitled'}"`,
          link: `/tasks`,
          data: { taskTitle: taskData.title }
        }
      }

      const { data, error } = await supabase.rpc('create_task_atomic', {
        task_data: taskData,
        notification_payload: notificationPayload
      })

      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.create.success('Task')
    },
    onError: () => crudToasts.create.error('task')
  })
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { notifyTaskAssigned, notifyTaskCompleted } = useNotificationTriggers()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (!user?.id) throw new Error('User must be authenticated')

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
          } catch (error) {
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
export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: true })
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
      crudToasts.delete.success('Task')
    },
    onError: () => crudToasts.delete.error('task')
  })
}

// Add comment
export function useAddTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comment: Partial<TaskComment>) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert(comment)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.task_id] })
      crudToasts.create.success('Comment')
    },
    onError: () => crudToasts.create.error('comment')
  })
}
