import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { isConsolidatedPropertyId, isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/types'
import { type TaskFormData } from '@/lib/validationSchemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { Building2, Loader2, MapPin, User } from 'lucide-react'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

// Adapt the schema for form use (dates as strings, optional fields)
// Define form schema explicitly since we can't extend a refined schema
const taskFormSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
    description: z.string().max(2000, 'Description is too long').optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    assigned_to_id: z.string().optional().nullable(),
    property_id: z.string().optional().nullable(),
    department_id: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    // Form-specific transformations
    due_date: z.union([z.string(), z.date()]).optional().transform((val) => {
        if (!val) return undefined;
        return new Date(val);
    }),
    start_date: z.union([z.string(), z.date()]).optional().transform((val) => {
        if (!val) return undefined;
        return new Date(val);
    }),
    estimated_hours: z.union([z.string(), z.number()]).optional().transform((val) => {
        if (!val) return undefined;
        const num = parseFloat(val.toString());
        return isNaN(num) ? undefined : num;
    })
})

interface TaskFormProps {
    task?: Task
    onSuccess?: () => void
    onCancel?: () => void
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
    const { user } = useAuth()
    const { currentProperty, availableProperties, isMultiPropertyUser } = useProperty()
    const createTask = useCreateTask()
    const updateTask = useUpdateTask()
    const { t } = useTranslation('tasks')

    // Default to currentProperty only when scoped to a real property.
    const initialPropertyId = isRealPropertyId(currentProperty?.id) ? currentProperty.id : null

    // Use any here for defaultValues to bypass strict type checking against the schema
    // because the schema transforms strings to dates, but input values are strings.
    const form = useForm<any>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: task ? {
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            assigned_to_id: task.assigned_to_id || null,
            property_id: task.property_id || initialPropertyId,
            department_id: task.department_id || null,
            due_date: task.due_date ? task.due_date.split('T')[0] : '',
            estimated_hours: task.estimated_hours?.toString() || '',
        } : {
            status: 'todo',
            priority: 'medium',
            description: '',
            title: '',
            estimated_hours: '',
            property_id: initialPropertyId,
            department_id: null,
            assigned_to_id: null,
        },
    })

    const isSubmitting = form.formState.isSubmitting
    const watchedTitle = useWatch({ control: form.control, name: 'title' })
    const watchedDueDate = useWatch({ control: form.control, name: 'due_date' })
    const watchedPriority = useWatch({ control: form.control, name: 'priority' })
    const watchedStatus = useWatch({ control: form.control, name: 'status' })
    
    const selectedPropertyId = useWatch({ control: form.control, name: 'property_id' })
    const selectedDepartmentId = useWatch({ control: form.control, name: 'department_id' })
    const selectedAssigneeId = useWatch({ control: form.control, name: 'assigned_to_id' })

    // Cascade handlers - reset child selections when parent changes
    const handlePropertyChange = (val: string | null) => {
        form.setValue('property_id', val)
        // Reset department and assignee when property changes
        form.setValue('department_id', null)
        form.setValue('assigned_to_id', null)
    }

    const handleDepartmentChange = (val: string | null) => {
        form.setValue('department_id', val)
        // Reset assignee when department changes
        form.setValue('assigned_to_id', null)
    }

    // Fetch departments for current property (or all in consolidated scope).
    const propertyToQuery = selectedPropertyId || currentProperty?.id
    const normalizedPropertyId = isRealPropertyId(propertyToQuery) ? propertyToQuery : undefined
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', normalizedPropertyId],
        queryFn: async () => {
            if (!propertyToQuery || isConsolidatedPropertyId(propertyToQuery)) {
                // Fetch all departments when no specific property selected
                const { data, error } = await supabase
                    .from('departments')
                    .select('id, name, property_id')
                    .eq('is_deleted', false)
                    .order('name')
                if (error) throw error
                return data
            }
            const { data, error } = await supabase
                .from('departments')
                .select('id, name, property_id')
                .eq('property_id', propertyToQuery)
                .eq('is_deleted', false)
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

            // Step 1: Get users for the selected property / hotel (via organization_memberships)
            if (isRealPropertyId(propertyToQuery)) {
                const { data: userPropertyLinks, error: upError } = await supabase
                    .from('organization_memberships')
                    .select('user_id')
                    .eq('hotel_id', propertyToQuery)
                    .eq('is_active', true)

                if (upError) throw upError
                userIds = userPropertyLinks?.map((up: any) => up.user_id) || []
                if (userIds.length === 0) return []
            }

            // Step 2: Further filter by department if selected (via organization_memberships)
            if (selectedDepartmentId && selectedDepartmentId !== 'none') {
                const { data: userDeptLinks, error: udError } = await supabase
                    .from('organization_memberships')
                    .select('user_id')
                    .eq('department_id', selectedDepartmentId)
                    .eq('is_active', true)

                if (udError) throw udError
                const deptUserIds = userDeptLinks?.map((ud: any) => ud.user_id) || []

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

    const selectedPropertyName = useMemo(() => {
        if (!selectedPropertyId) return t('all_properties', 'All Properties')
        return availableProperties.find(p => p.id === selectedPropertyId)?.name || t('all_properties', 'All Properties')
    }, [availableProperties, selectedPropertyId, t])

    const selectedDepartmentName = useMemo(() => {
        if (!selectedDepartmentId || selectedDepartmentId === 'none') return t('all_departments')
        return departments.find(d => d.id === selectedDepartmentId)?.name || t('all_departments')
    }, [departments, selectedDepartmentId, t])

    const selectedAssigneeName = useMemo(() => {
        if (!selectedAssigneeId || selectedAssigneeId === 'none') return t('unassigned', 'Unassigned')
        return employees.find(e => e.id === selectedAssigneeId)?.full_name || t('unassigned', 'Unassigned')
    }, [employees, selectedAssigneeId, t])

    const dueDatePresets = [
        { label: t('today', 'Today'), days: 0 },
        { label: t('tomorrow', 'Tomorrow'), days: 1 },
        { label: t('next_week', 'Next week'), days: 7 },
        { label: t('two_weeks', 'Two weeks'), days: 14 },
    ]

    const onSubmit = async (values: TaskFormData) => {
        try {
            const submitData = {
                ...values,
                estimated_hours: values.estimated_hours || null,
            }

            if (task) {
                await updateTask.mutateAsync({ id: task.id, ...submitData } as any)
                toast.success(t('messages.task_updated', 'Task updated successfully'))
            } else {
                if (!user) return
                await createTask.mutateAsync({
                    ...submitData,
                    created_by_id: user.id,
                } as any)
                toast.success(t('messages.task_created', 'Task created successfully'))
            }
            onSuccess?.()
        } catch (error: unknown) {
            const errorDetails = getUserFriendlyError(error)
            toast.error(errorDetails.message)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('title')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('create_new_task')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('description')}</FormLabel>
                            <FormControl>
                                <Textarea placeholder={t('description')} {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Property Selector for Multi-Property Users */}
                {isMultiPropertyUser && (
                    <FormField
                        control={form.control}
                        name="property_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {t('property', 'Property')}
                                </FormLabel>
                                <Select
                                    value={field.value || 'none'}
                                    onValueChange={(val) => handlePropertyChange(val === 'none' ? null : val)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_property', 'Select Property')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">{t('select_property', 'Select Property')}</SelectItem>
                                        {availableProperties.filter((property) => isRealPropertyId(property.id)).map((prop) => (
                                            <SelectItem key={prop.id} value={prop.id}>
                                                {prop.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {/* Department Selector */}
                <FormField
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {t('department')}
                            </FormLabel>
                            <FormControl>
                                <GroupedDepartmentSelector
                                    departments={departments}
                                    properties={availableProperties}
                                    value={field.value || 'none'}
                                    onValueChange={(val) => handleDepartmentChange(val === 'none' ? null : val)}
                                    placeholder={t('select_department')}
                                    generalLabel={t('all_departments')}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Employee Assignment */}
                <FormField
                    control={form.control}
                    name="assigned_to_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {t('assign_to', 'Assign To')}
                            </FormLabel>
                            <Select
                                value={field.value || 'none'}
                                onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_assignee', 'Select Assignee')} />
                                    </SelectTrigger>
                                </FormControl>
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
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('status')}</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('status')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="todo">{t('kanban.todo')}</SelectItem>
                                        <SelectItem value="in_progress">{t('kanban.in_progress')}</SelectItem>
                                        <SelectItem value="review">{t('kanban.review')}</SelectItem>
                                        <SelectItem value="completed">{t('kanban.completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('priority')}</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('priority')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">{t('common:priority.low')}</SelectItem>
                                        <SelectItem value="medium">{t('common:priority.medium')}</SelectItem>
                                        <SelectItem value="high">{t('common:priority.high')}</SelectItem>
                                        <SelectItem value="urgent">{t('common:priority.urgent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t('due_date')}</FormLabel>
                                <FormControl>
                                    <div className="grid gap-2">
                                        <Input type="date" {...field} value={field.value || ''} />
                                        <div className="flex flex-wrap gap-2">
                                            {dueDatePresets.map((preset) => (
                                                <Button
                                                    key={preset.label}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const dateValue = format(addDays(new Date(), preset.days), 'yyyy-MM-dd')
                                                        form.setValue('due_date', dateValue, { shouldValidate: true })
                                                    }}
                                                >
                                                    {preset.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="estimated_hours"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('est_hours')}</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.5" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2 mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('summary', 'Summary')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <p className="text-muted-foreground">{t('title')}</p>
                            <p className="font-medium">{watchedTitle || t('untitled', 'Untitled')}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">{t('assign_to', 'Assign To')}</p>
                            <p className="font-medium">{selectedAssigneeName}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">{t('property', 'Property')}</p>
                            <p className="font-medium">{selectedPropertyName}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">{t('department')}</p>
                            <p className="font-medium">{selectedDepartmentName}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">{t('priority')}</p>
                            <p className="font-medium capitalize">{watchedPriority || 'medium'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">{t('status')}</p>
                            <p className="font-medium capitalize">{watchedStatus || 'todo'}</p>
                        </div>
                    </div>
                    {watchedDueDate && (
                        <p className="text-[11px] text-muted-foreground">
                            {t('due_date')}: {format(new Date(watchedDueDate), 'PPP')}
                        </p>
                    )}
                </div>

                <div className="flex justify-end pt-4 gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>{t('common:common.cancel')}</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                        {t('save_task')}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
