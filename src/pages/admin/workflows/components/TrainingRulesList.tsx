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
import { Trash2, Plus, Loader2, GraduationCap } from 'lucide-react'
import { useTrainingRules, useDeleteTrainingRule, useUpdateTrainingRule, useCreateTrainingRule, useTrainingModulesList } from '@/hooks/useTrainingRules'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { Label } from '@/components/ui/label'
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
import { useDepartments } from '@/hooks/useDepartments'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function TrainingRulesList() {
    const { data: rules, isLoading, error } = useTrainingRules()
    const { data: modules } = useTrainingModulesList()
    const { departments } = useDepartments()
    const { data: jobTitles } = useQuery({
        queryKey: ['job_titles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_titles').select('id, title').order('title')
            if (error) throw error
            return data || []
        }
    })
    const deleteMutation = useDeleteTrainingRule()
    const updateMutation = useUpdateTrainingRule()
    const createMutation = useCreateTrainingRule()
    const { toast } = useToast()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<any>(null)
    const [formState, setFormState] = useState({
        training_module_id: '',
        target_role: '',
        target_department_id: '',
        job_title_id: '',
        is_active: true
    })

    const roles = [
        'regional_admin',
        'regional_hr',
        'property_manager',
        'property_hr',
        'department_head',
        'staff'
    ]

    const resetForm = () => {
        setFormState({
            training_module_id: '',
            target_role: '',
            target_department_id: '',
            job_title_id: '',
            is_active: true
        })
    }

    const handleToggle = (id: string, currentStatus: boolean) => {
        updateMutation.mutate(
            { id, updates: { is_active: !currentStatus } },
            {
                onSuccess: () => {
                    toast({
                        title: 'Rule Updated',
                        description: `Auto-assignment rule is now ${!currentStatus ? 'active' : 'inactive'}`,
                    })
                }
            }
        )
    }

    const handleDelete = () => {
        if (!deleteId) return
        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast({
                    title: 'Rule Deleted',
                    description: 'Training assignment rule has been removed.',
                })
                setDeleteId(null)
            }
        })
    }

    const handleEdit = (rule: any) => {
        setEditingRule(rule)
        setFormState({
            training_module_id: rule.training_module_id || '',
            target_role: rule.target_role || '',
            target_department_id: rule.target_department_id || '',
            job_title_id: rule.job_title_id || '',
            is_active: rule.is_active ?? true
        })
    }

    const handleSaveRule = async () => {
        if (!formState.training_module_id) {
            toast({
                title: 'Missing Training Module',
                description: 'Select a training module to continue.',
                variant: 'destructive'
            })
            return
        }

        try {
            if (editingRule?.id) {
                await updateMutation.mutateAsync({
                    id: editingRule.id,
                    updates: {
                        training_module_id: formState.training_module_id,
                        target_role: formState.target_role || null,
                        target_department_id: formState.target_department_id || null,
                        job_title_id: formState.job_title_id || null,
                        is_active: formState.is_active
                    }
                })
                toast({
                    title: 'Rule Updated',
                    description: 'Training assignment rule has been updated.'
                })
            } else {
                await createMutation.mutateAsync({
                    training_module_id: formState.training_module_id,
                    target_role: formState.target_role || null,
                    target_department_id: formState.target_department_id || null,
                    job_title_id: formState.job_title_id || null,
                    is_active: formState.is_active
                } as any)
                toast({
                    title: 'Rule Created',
                    description: 'Training assignment rule has been created.'
                })
            }

            setIsCreateOpen(false)
            setEditingRule(null)
            resetForm()
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save rule'
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
                Failed to load training rules: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Training Auto-Assignment Rules</h3>
                </div>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Rule
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Target Module</TableHead>
                            <TableHead>Criteria (Dept/Role/Title)</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules?.map((rule: any) => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">
                                    {rule.training_modules?.title || 'Unknown Module'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                {rule.departments?.name && (
                                    <Badge variant="outline">Dept: {rule.departments.name}</Badge>
                                )}
                                {rule.target_role && (
                                    <Badge variant="outline">Role: {rule.target_role}</Badge>
                                )}
                                        {rule.job_titles?.title && (
                                            <Badge variant="outline">Title: {rule.job_titles.title}</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(rule.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={rule.is_active}
                                        onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(rule)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(rule.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!rules?.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No auto-assignment rules found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will stop automatic training assignments for this criteria. Existing assignments will not be affected.
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

            <Dialog open={isCreateOpen || !!editingRule} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateOpen(false)
                    setEditingRule(null)
                    resetForm()
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Edit Training Rule' : 'Create Training Rule'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Training Module</Label>
                            <Select
                                value={formState.training_module_id}
                                onValueChange={(val) => setFormState((prev) => ({ ...prev, training_module_id: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select module" />
                                </SelectTrigger>
                                <SelectContent>
                                    {modules?.map((module: any) => (
                                        <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Role (optional)</Label>
                            <Select
                                value={formState.target_role || 'none'}
                                onValueChange={(val) => setFormState((prev) => ({ ...prev, target_role: val === 'none' ? '' : val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Any role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Any role</SelectItem>
                                    {roles.map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Department (optional)</Label>
                            <Select
                                value={formState.target_department_id || 'none'}
                                onValueChange={(val) => setFormState((prev) => ({ ...prev, target_department_id: val === 'none' ? '' : val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Any department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Any department</SelectItem>
                                    {departments?.map((dept: any) => (
                                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Job Title (optional)</Label>
                            <Select
                                value={formState.job_title_id || 'none'}
                                onValueChange={(val) => setFormState((prev) => ({ ...prev, job_title_id: val === 'none' ? '' : val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Any job title" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Any job title</SelectItem>
                                    {jobTitles?.map((jt: any) => (
                                        <SelectItem key={jt.id} value={jt.id}>{jt.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Rule Status</Label>
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
                                setEditingRule(null)
                                resetForm()
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveRule} disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingRule ? 'Save Changes' : 'Create Rule'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
