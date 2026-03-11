import type { Profile, Property, Department } from './profile'

// Task Management Interfaces
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority

  // Assignment
  assigned_to_id: string | null
  created_by_id: string

  // Organization
  property_id: string | null
  department_id: string | null

  // Dates
  due_date: string | null
  start_date: string | null
  completed_at: string | null

  // Metadata
  tags: string[] | null
  estimated_hours: number | null
  actual_hours: number | null

  created_at: string
  updated_at: string

  // Relations
  assigned_to?: Profile
  created_by?: Profile
  property?: Property
  department?: Department
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  watchers?: Profile[]
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string

  // Relations
  author?: Profile
}

export interface TaskAttachment {
  id: string
  task_id: string
  uploaded_by_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number | null
  created_at: string

  // Relations
  uploaded_by?: Profile
}

export interface TaskStats {
  total_tasks: number
  todo_tasks: number
  in_progress_tasks: number
  review_tasks: number
  completed_tasks: number
  overdue_tasks: number
}
