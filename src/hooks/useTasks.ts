import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, TaskComment, TaskStats } from '@/lib/types'

// Fetch tasks
export function useTasks(filters?: {
  status?: string
  priority?: string
  assignedTo?: string
  createdBy?: string
  propertyId?: string
  departmentId?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['tasks', filters],
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
      if (filters?.propertyId) {
        query = query.eq('property_id', filters.propertyId)
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

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
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
    },
  })
}
