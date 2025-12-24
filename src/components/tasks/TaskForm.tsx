import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { useAuth } from '@/contexts/AuthContext'
import { useProperty } from '@/contexts/PropertyContext'
import type { Task } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Building2, MapPin, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const taskSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    assigned_to_id: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    estimated_hours: z.string().optional(),
    department_id: z.string().optional().nullable(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
    task?: Task
    onSuccess?: () => void
    onCancel?: () => void
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const createTask = useCreateTask()
    const updateTask = useUpdateTask()
    const { t } = useTranslation('tasks')

    const { availableProperties, isMultiPropertyUser } = useProperty()

    // Default to currentProperty if it's a real property (not 'all')
    const initialPropertyId = currentProperty?.id !== 'all' ? currentProperty?.id : null

    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
        task?.property_id || initialPropertyId
    )

    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(
        task?.department_id || 'none'
    )

    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(
        task?.assigned_to_id || 'none'
    )

    // Cascade handlers - reset child selections when parent changes
    const handlePropertyChange = (val: string) => {
        setSelectedPropertyId(val === 'none' ? null : val)
        // Reset department and assignee when property changes
        setSelectedDepartmentId('none')
        setSelectedAssigneeId('none')
    }

    const handleDepartmentChange = (val: string) => {
        setSelectedDepartmentId(val)
        // Reset assignee when department changes
        setSelectedAssigneeId('none')
    }

    // Fetch departments for current property (or all if viewing 'all')
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', selectedPropertyId || currentProperty?.id],
        queryFn: async () => {
            const propertyToQuery = selectedPropertyId || currentProperty?.id
            if (!propertyToQuery || propertyToQuery === 'all') {
                // Fetch all departments when no specific property selected
                const { data, error } = await supabase
                    .from('departments')
                    .select('id, name')
                    .order('name')
                if (error) throw error
                return data
            }
            const { data, error } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', propertyToQuery)
                .order('name')
            if (error) throw error
            return data
        },
        enabled: true
    })

    // Fetch employees based on selected property and department
    const { data: employees = [] } = useQuery({
        queryKey: ['employees-for-assignment', selectedPropertyId, selectedDepartmentId],
        queryFn: async () => {
            const propertyToQuery = selectedPropertyId || currentProperty?.id
            let userIds: string[] = []

            // Step 1: Get users for the selected property (via user_properties)
            if (propertyToQuery && propertyToQuery !== 'all') {
                const { data: userPropertyLinks, error: upError } = await supabase
                    .from('user_properties')
                    .select('user_id')
                    .eq('property_id', propertyToQuery)

                if (upError) throw upError
                userIds = userPropertyLinks?.map(up => up.user_id) || []
                if (userIds.length === 0) return []
            }

            // Step 2: Further filter by department if selected (via user_departments)
            if (selectedDepartmentId && selectedDepartmentId !== 'none') {
                const { data: userDeptLinks, error: udError } = await supabase
                    .from('user_departments')
                    .select('user_id')
                    .eq('department_id', selectedDepartmentId)

                if (udError) throw udError
                const deptUserIds = userDeptLinks?.map(ud => ud.user_id) || []

                // Intersect with property users if we have them
                if (userIds.length > 0) {
                    userIds = userIds.filter(id => deptUserIds.includes(id))
                } else {
                    userIds = deptUserIds
                }

                if (userIds.length === 0) return []
            }

            // Step 3: Fetch profile details
            let query = supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('is_active', true)
                .order('full_name')

            if (userIds.length > 0) {
                query = query.in('id', userIds)
            } else {
                // No filter applied, limit results
                query = query.limit(50)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        enabled: true
    })

    const form = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: task ? {
            title: task.title,
            description: task.description || '',
            status: task.status as any,
            priority: task.priority as any,
            assigned_to_id: task.assigned_to_id,
            due_date: task.due_date?.split('T')[0],
            estimated_hours: task.estimated_hours?.toString() || '',
            department_id: task.department_id || null,
        } : {
            status: 'todo' as any,
            priority: 'medium' as any,
        },
    })

    const isSubmitting = form.formState.isSubmitting

    const onSubmit = async (values: TaskFormData) => {
        try {
            const submitData = {
                ...values,
                estimated_hours: values.estimated_hours ? parseFloat(values.estimated_hours) : null,
                department_id: selectedDepartmentId === 'none' ? null : selectedDepartmentId,
                assigned_to_id: selectedAssigneeId === 'none' ? null : selectedAssigneeId,
            }

            if (task) {
                await updateTask.mutateAsync({ id: task.id, ...submitData, property_id: selectedPropertyId } as any)
                toast.success(t('messages.task_updated', 'Task updated successfully'))
            } else {
                if (!user) return
                await createTask.mutateAsync({
                    ...submitData,
                    created_by_id: user.id,
                    property_id: selectedPropertyId
                } as any)
                toast.success(t('messages.task_created', 'Task created successfully'))
            }
            onSuccess?.()
        } catch (error: any) {
            console.error('Error saving task:', error)
            toast.error(error.message || t('messages.save_failed', 'Failed to save task'))
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="title">{t('title')}</Label>
                <Input id="title" {...form.register('title')} placeholder={t('create_new_task')} />
                {form.formState.errors.title && <p className="text-destructive text-xs">{form.formState.errors.title.message?.toString()}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea id="description" {...form.register('description')} placeholder={t('description')} />
            </div>

            {/* Property Selector for Multi-Property Users */}
            {isMultiPropertyUser && (
                <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t('property', 'Property')}
                    </Label>
                    <Select
                        value={selectedPropertyId || 'none'}
                        onValueChange={handlePropertyChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('select_property', 'Select Property')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('select_property', 'Select Property')}</SelectItem>
                            {availableProperties.filter(p => p.id !== 'all').map((prop) => (
                                <SelectItem key={prop.id} value={prop.id}>
                                    {prop.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Department Selector */}
            <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('department')}
                </Label>
                <Select
                    value={selectedDepartmentId}
                    onValueChange={handleDepartmentChange}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('select_department')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t('all_departments')}</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Employee Assignment */}
            <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('assign_to', 'Assign To')}
                </Label>
                <Select
                    value={selectedAssigneeId}
                    onValueChange={setSelectedAssigneeId}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('select_assignee', 'Select Assignee')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t('unassigned', 'Unassigned')}</SelectItem>
                        {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                                {emp.full_name || 'Unknown User'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {employees.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        {t('no_employees_found', 'No employees found for selected filters')}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>{t('status')}</Label>
                    <Select
                        defaultValue={task?.status || 'todo'}
                        onValueChange={(val: TaskFormData['status']) => form.setValue('status', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todo">{t('kanban.todo')}</SelectItem>
                            <SelectItem value="in_progress">{t('kanban.in_progress')}</SelectItem>
                            <SelectItem value="review">{t('kanban.review')}</SelectItem>
                            <SelectItem value="completed">{t('kanban.completed')}</SelectItem>
                            <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>{t('priority')}</Label>
                    <Select
                        defaultValue={task?.priority || 'medium'}
                        onValueChange={(val: TaskFormData['priority']) => form.setValue('priority', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('priority')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">{t('common:priority.low')}</SelectItem>
                            <SelectItem value="medium">{t('common:priority.medium')}</SelectItem>
                            <SelectItem value="high">{t('common:priority.high')}</SelectItem>
                            <SelectItem value="urgent">{t('common:priority.urgent')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="due_date">{t('due_date')}</Label>
                    <Input id="due_date" type="date" {...form.register('due_date')} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="estimated_hours">{t('est_hours')}</Label>
                    <Input id="estimated_hours" type="number" step="0.5" {...form.register('estimated_hours')} />
                </div>
            </div>

            <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>{t('common:common.cancel')}</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {t('save_task')}
                </Button>
            </div>
        </form>
    )
}
