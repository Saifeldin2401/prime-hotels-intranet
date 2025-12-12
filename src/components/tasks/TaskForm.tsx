import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useAuth } from '@/contexts/AuthContext'
import type { Task } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const taskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    assigned_to_id: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    estimated_hours: z.string().transform(val => val ? parseFloat(val) : null).optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
    task?: Task
    onSuccess?: () => void
    onCancel?: () => void
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
    const { user } = useAuth()
    const createTask = useCreateTask()
    const updateTask = useUpdateTask()

    const form = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: task ? {
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            // For editing, we might need more complex handling if assigned_to_id is missing from task object passed
            // but assuming it's part of Task
            assigned_to_id: task.assigned_to_id,
            due_date: task.due_date?.split('T')[0], // format needed for date input
            estimated_hours: task.estimated_hours?.toString()
        } : {
            status: 'todo',
            priority: 'medium',
        },
    })

    // Hacky quick loading state
    const isSubmitting = form.formState.isSubmitting

    const onSubmit = async (data: TaskFormData) => {
        try {
            if (task) {
                await updateTask.mutateAsync({ id: task.id, ...data })
            } else {
                if (!user) return
                await createTask.mutateAsync({
                    ...data,
                    created_by_id: user.id,
                })
            }
            onSuccess?.()
        } catch (error) {
            console.error('Error saving task:', error)
            alert('Failed to save task')
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register('title')} placeholder="Task title" />
                {form.formState.errors.title && <p className="text-destructive text-xs">{form.formState.errors.title.message}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register('description')} placeholder="Task description..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                        defaultValue={task?.status || 'todo'}
                        onValueChange={(val: any) => form.setValue('status', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                        defaultValue={task?.priority || 'medium'}
                        onValueChange={(val: any) => form.setValue('priority', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input id="due_date" type="date" {...form.register('due_date')} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="estimated_hours">Est. Hours</Label>
                    <Input id="estimated_hours" type="number" step="0.5" {...form.register('estimated_hours')} />
                </div>
            </div>

            <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Task
                </Button>
            </div>
        </form>
    )
}
