import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, CalendarDays, Clock } from 'lucide-react'
import { useTaskTemplates, useToggleTaskTemplate, useDeleteTaskTemplate, useCreateTaskTemplate, useUpdateTaskTemplate } from '@/hooks/useTaskTemplates'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useProperties } from '@/hooks/useProperties'
import { useDepartments } from '@/hooks/useDepartments'
import { useProfiles } from '@/hooks/useUsers'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function TaskTemplateList() {
    const { data: templates, isLoading, error } = useTaskTemplates()
    const toggleMutation = useToggleTaskTemplate()
    const deleteMutation = useDeleteTaskTemplate()
    const createMutation = useCreateTaskTemplate()
    const updateMutation = useUpdateTaskTemplate()
    const { toast } = useToast()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<any>(null)
    const { data: properties } = useProperties()
    const { departments } = useDepartments()
    const { data: profiles } = useProfiles({ limit: 200 })
    const { user } = useAuth()
    const [formState, setFormState] = useState({
        title: '',
        description: '',
        priority: 'medium',
        recurrence_type: 'daily',
        recurrence_config: '{}',
        assignment_scope: 'user',
        assigned_to_id: '',
        property_id: '',
        department_id: '',
        is_active: true
    })

    const resetForm = () => {
        setFormState({
            title: '',
            description: '',
            priority: 'medium',
            recurrence_type: 'daily',
            recurrence_config: '{}',
            assignment_scope: 'user',
            assigned_to_id: '',
            property_id: '',
            department_id: '',
            is_active: true
        })
    }

    const handleToggle = (id: string, currentStatus: boolean) => {
        toggleMutation.mutate({ id, isActive: !currentStatus }, {
            onSuccess: () => {
                toast({
                    title: 'Template Updated',
                    description: `Recurring task is now ${!currentStatus ? 'active' : 'inactive'}`,
                })
            }
        })
    }

    const handleDelete = () => {
        if (!deleteId) return
        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast({
                    title: 'Template Deleted',
                    description: 'Recurring task template has been removed.',
                })
                setDeleteId(null)
            }
        })
    }

    const handleEdit = (template: any) => {
        setEditingTemplate(template)
        setFormState({
            title: template.title || '',
            description: template.description || '',
            priority: template.priority || 'medium',
            recurrence_type: template.recurrence_type || 'daily',
            recurrence_config: JSON.stringify(template.recurrence_config || {}, null, 2),
            assignment_scope: template.assigned_to_id ? 'user' : template.department_id ? 'department' : template.property_id ? 'property' : 'unassigned',
            assigned_to_id: template.assigned_to_id || '',
            property_id: template.property_id || '',
            department_id: template.department_id || '',
            is_active: template.is_active ?? true
        })
    }

    const computeNextRunAt = async (recurrenceType: string) => {
        const { data, error } = await supabase.rpc('calculate_next_task_run', {
            recurrence: recurrenceType,
            last_run: new Date().toISOString()
        })
        if (error) throw error
        return data
    }

    const handleSaveTemplate = async () => {
        try {
            if (!formState.title.trim()) {
                toast({
                    title: 'Missing Title',
                    description: 'Task template title is required.',
                    variant: 'destructive'
                })
                return
            }
            if (formState.assignment_scope === 'user' && !formState.assigned_to_id) {
                toast({
                    title: 'Missing Assignee',
                    description: 'Select a user to assign the task template.',
                    variant: 'destructive'
                })
                return
            }
            if (formState.assignment_scope === 'department' && !formState.department_id) {
                toast({
                    title: 'Missing Department',
                    description: 'Select a department to assign the task template.',
                    variant: 'destructive'
                })
                return
            }
            if (formState.assignment_scope === 'property' && !formState.property_id) {
                toast({
                    title: 'Missing Property',
                    description: 'Select a property to assign the task template.',
                    variant: 'destructive'
                })
                return
            }

            let recurrenceConfig: Record<string, any> = {}
            try {
                recurrenceConfig = formState.recurrence_config ? JSON.parse(formState.recurrence_config) : {}
            } catch {
                toast({
                    title: 'Invalid Recurrence Config',
                    description: 'Recurrence config JSON is invalid.',
                    variant: 'destructive'
                })
                return
            }

            const nextRunAt = await computeNextRunAt(formState.recurrence_type)

            const payload = {
                title: formState.title,
                description: formState.description,
                priority: formState.priority,
                recurrence_type: formState.recurrence_type,
                recurrence_config: recurrenceConfig,
                assigned_to_id: formState.assignment_scope === 'user' ? formState.assigned_to_id || null : null,
                department_id: formState.assignment_scope === 'department' ? formState.department_id || null : null,
                property_id: formState.assignment_scope === 'property' ? formState.property_id || null : null,
                is_active: formState.is_active,
                next_run_at: nextRunAt,
                created_by_id: user?.id || null,
                updated_at: new Date().toISOString()
            }

            if (editingTemplate?.id) {
                await updateMutation.mutateAsync({
                    id: editingTemplate.id,
                    updates: payload
                })
                toast({
                    title: 'Template Updated',
                    description: 'Recurring task template has been updated.'
                })
            } else {
                await createMutation.mutateAsync(payload as any)
                toast({
                    title: 'Template Created',
                    description: 'Recurring task template has been created.'
                })
            }

            setIsCreateOpen(false)
            setEditingTemplate(null)
            resetForm()
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save template'
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            })
        }
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    if (error) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Failed to load recurring templates: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Recurring Task Templates</h3>
                </div>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Template Title</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Next Run</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates?.map((template: any) => (
                            <TableRow key={template.id}>
                                <TableCell>
                                    <div className="font-medium">{template.title}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {template.description || 'No description'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">
                                        {template.recurrence_type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        {template.assignee?.full_name || (template.department?.name ? 'Department' : template.property?.name ? 'Property' : 'Unassigned')}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {template.department?.name || template.property?.name || 'Any Scope'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Clock className="h-3 w-3" />
                                        {template.next_run_at ? format(new Date(template.next_run_at), 'MMM d, HH:mm') : 'N/A'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={template.is_active}
                                        onCheckedChange={() => handleToggle(template.id, template.is_active)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(template)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(template.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!templates?.length && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No recurring task templates found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will stop the automated generation of tasks from this template. Existing tasks will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateOpen(false)
                    setEditingTemplate(null)
                    resetForm()
                }
            }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Task Template' : 'Create Task Template'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input
                                value={formState.title}
                                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Daily Lobby Safety Check"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formState.description}
                                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Inspect fire exits, emergency lights, and lobby safety signage."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={formState.priority}
                                    onValueChange={(val) => setFormState((prev) => ({ ...prev, priority: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Recurrence</Label>
                                <Select
                                    value={formState.recurrence_type}
                                    onValueChange={(val) => setFormState((prev) => ({ ...prev, recurrence_type: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Recurrence Config (JSON)</Label>
                            <Textarea
                                className="font-mono text-xs h-24"
                                value={formState.recurrence_config}
                                onChange={(e) => setFormState((prev) => ({ ...prev, recurrence_config: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Assignment Scope</Label>
                            <Select
                                value={formState.assignment_scope}
                                onValueChange={(val) => setFormState((prev) => ({
                                    ...prev,
                                    assignment_scope: val,
                                    assigned_to_id: '',
                                    department_id: '',
                                    property_id: ''
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Specific User</SelectItem>
                                    <SelectItem value="department">Department</SelectItem>
                                    <SelectItem value="property">Property</SelectItem>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formState.assignment_scope === 'user' && (
                            <div className="grid gap-2">
                                <Label>Assignee</Label>
                                <Select
                                    value={formState.assigned_to_id}
                                    onValueChange={(val) => setFormState((prev) => ({ ...prev, assigned_to_id: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profiles?.map((profile: any) => (
                                            <SelectItem key={profile.id} value={profile.id}>{profile.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {formState.assignment_scope === 'department' && (
                            <div className="grid gap-2">
                                <Label>Department</Label>
                                <Select
                                    value={formState.department_id}
                                    onValueChange={(val) => setFormState((prev) => ({ ...prev, department_id: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments?.map((dept: any) => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {formState.assignment_scope === 'property' && (
                            <div className="grid gap-2">
                                <Label>Property</Label>
                                <Select
                                    value={formState.property_id}
                                    onValueChange={(val) => setFormState((prev) => ({ ...prev, property_id: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select property" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties?.map((prop: any) => (
                                            <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select
                                value={formState.is_active ? 'active' : 'inactive'}
                                onValueChange={(val) => setFormState((prev) => ({ ...prev, is_active: val === 'active' }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => {
                                setIsCreateOpen(false)
                                setEditingTemplate(null)
                                resetForm()
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveTemplate} disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingTemplate ? 'Save Changes' : 'Create Template'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
