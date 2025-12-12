import { supabase } from '@/lib/supabase'

export interface Task {
    id: string
    title: string
    description: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'critical'
    assigned_to: string | null
    assigned_to_id: string | null
    assigned_by: string | null
    created_by_id: string | null
    department_id: string | null
    property_id: string | null
    due_date: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
}

export interface CreateTaskInput {
    title: string
    description?: string
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority?: 'low' | 'medium' | 'high' | 'critical'
    assigned_to?: string
    assigned_by?: string
    department_id?: string
    property_id?: string
    due_date?: string
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
    completed_at?: string
}

export class TaskService {
    /**
     * Get tasks with optional filtering
     */
    static async getTasks(filters?: {
        assigned_to?: string
        status?: string
        priority?: string
        department_id?: string
        property_id?: string
    }): Promise<Task[]> {
        let query = supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true })

        if (filters?.assigned_to) {
            query = query.or(`assigned_to.eq.${filters.assigned_to},assigned_to_id.eq.${filters.assigned_to}`)
        }
        if (filters?.status) {
            query = query.eq('status', filters.status)
        }
        if (filters?.priority) {
            query = query.eq('priority', filters.priority)
        }
        if (filters?.department_id) {
            query = query.eq('department_id', filters.department_id)
        }
        if (filters?.property_id) {
            query = query.eq('property_id', filters.property_id)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    }

    /**
     * Get a single task by ID
     */
    static async getTask(id: string): Promise<Task | null> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    }

    /**
     * Create a new task
     */
    static async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                ...input,
                assigned_to: input.assigned_to,
                assigned_to_id: input.assigned_to, // Set both for compatibility
                created_by_id: userId,
                assigned_by: userId
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Update an existing task
     */
    static async updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
        const payload: any = { ...updates }

        // If updating assigned_to, also update assigned_to_id
        if (updates.assigned_to) {
            payload.assigned_to_id = updates.assigned_to
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(payload)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Delete a task
     */
    static async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)

        if (error) throw error
    }

    /**
     * Mark a task as completed
     */
    static async completeTask(id: string): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Get task statistics for a user
     */
    static async getTaskStats(userId: string): Promise<{
        total: number
        pending: number
        in_progress: number
        completed: number
        overdue: number
    }> {
        const { data, error } = await supabase
            .from('tasks')
            .select('status, due_date')
            .or(`assigned_to.eq.${userId},assigned_to_id.eq.${userId}`)

        if (error) throw error

        const now = new Date()
        const stats = {
            total: data?.length || 0,
            pending: 0,
            in_progress: 0,
            completed: 0,
            overdue: 0
        }

        data?.forEach(task => {
            if (task.status === 'pending') stats.pending++
            if (task.status === 'in_progress') stats.in_progress++
            if (task.status === 'completed') stats.completed++

            if (task.due_date && new Date(task.due_date) < now && task.status !== 'completed') {
                stats.overdue++
            }
        })

        return stats
    }
}
