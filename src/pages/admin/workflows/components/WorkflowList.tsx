import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteWorkflow, useExecuteWorkflow, useToggleWorkflow, useWorkflows } from '@/hooks/useWorkflows'
import type { WorkflowDefinition } from '@/services/workflowEngine'
import { format } from 'date-fns'
import { Loader2, Play, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from "react-i18next"
import { WorkflowEditor } from './WorkflowEditor'

export function WorkflowList() {
    const { t: t_ext } = useTranslation('extracted');
    const { data: workflows, isLoading, error } = useWorkflows()
    const { user } = useAuth()
    const toggleMutation = useToggleWorkflow()
    const executeMutation = useExecuteWorkflow()
    const deleteMutation = useDeleteWorkflow()
    const { toast } = useToast()
    const [executingId, setExecutingId] = useState<string | null>(null)
    const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [searchText, setSearchText] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    const handleToggle = (id: string, currentStatus: boolean) => {
        toggleMutation.mutate(
            { workflowId: id, isActive: !currentStatus },
            {
                onSuccess: () => {
                    toast({
                        title: 'Workflow Updated',
                        description: `Workflow is now ${!currentStatus ? 'active' : 'inactive'}`,
                    })
                },
                onError: () => {
                    toast({
                        title: 'Error',
                        description: 'Failed to update workflow status',
                        variant: 'destructive',
                    })
                }
            }
        )
    }

    const handleExecute = (id: string, name: string) => {
        if (!user?.id) {
            toast({
                title: 'Execution Failed',
                description: 'No authenticated user found. Please sign in again.',
                variant: 'destructive',
            })
            return
        }
        setExecutingId(id)
        executeMutation.mutate(
            { workflowId: id, metadata: { triggered_by: user.id } },
            {
                onSuccess: () => {
                    toast({
                        title: 'Workflow Triggered',
                        description: `Workflow "${name}" has been triggered successfully.`,
                    })
                    setExecutingId(null)
                },
                onError: (error) => {
                    toast({
                        title: 'Execution Failed',
                        description: error instanceof Error ? error.message : 'Unknown error',
                        variant: 'destructive',
                    })
                    setExecutingId(null)
                }
            }
        )
    }

    const handleDelete = () => {
        if (!deleteId) return
        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast({
                    title: 'Workflow Deleted',
                    description: 'Workflow has been archived and removed from the active list.',
                })
                setDeleteId(null)
            },
            onError: (error) => {
                toast({
                    title: 'Delete Failed',
                    description: error instanceof Error ? error.message : 'Failed to delete workflow',
                    variant: 'destructive',
                })
                setDeleteId(null)
            }
        })
    }

    const getTriggerLabel = (workflow: WorkflowDefinition) => {
        if (workflow.trigger_config?.cron) return workflow.trigger_config.cron
        if (workflow.trigger_config?.event || workflow.trigger_config?.event_type) {
            return workflow.trigger_config.event || workflow.trigger_config.event_type
        }
        return 'Manual'
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    if (error) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {t_ext('failed_to_load_workflows', 'Failed to load workflows:')}{error instanceof Error ? error.message : 'Unknown error'}
            </div>
        )
    }

    const filteredWorkflows = (workflows || []).filter((workflow) => {
        const matchesStatus = statusFilter === 'all'
            || (statusFilter === 'active' && workflow.is_active)
            || (statusFilter === 'inactive' && !workflow.is_active)
        const matchesSearch = !searchText
            || workflow.name?.toLowerCase().includes(searchText.toLowerCase())
            || workflow.description?.toLowerCase().includes(searchText.toLowerCase())
        return matchesStatus && matchesSearch
    })

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-medium">{t_ext('workflow_definitions', 'Workflow Definitions')}</h3>
                    <p className="text-xs text-muted-foreground">Create, activate, and run automated workflows.</p>
                </div>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t_ext('new_workflow', 'New Workflow')}</Button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={(val: 'all' | 'active' | 'inactive') => setStatusFilter(val)}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Search workflows..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-[260px]"
                    />
                </div>
                <div className="text-xs text-muted-foreground">
                    Showing {filteredWorkflows.length} of {workflows?.length || 0} workflows
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t_ext('workflow_name', 'Workflow Name')}</TableHead>
                            <TableHead>{t_ext('type', 'Type')}</TableHead>
                            <TableHead>{t_ext('trigger', 'Trigger')}</TableHead>
                            <TableHead>{t_ext('last_updated', 'Last Updated')}</TableHead>
                            <TableHead>{t_ext('status_1', 'Status')}</TableHead>
                            <TableHead className="text-right">{t_ext('actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWorkflows.map((workflow) => (
                            <TableRow key={workflow.id}>
                                <TableCell className="font-medium">
                                    <div>{workflow.name}</div>
                                    <div className="text-xs text-muted-foreground">{workflow.description}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{workflow.type}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                    {getTriggerLabel(workflow)}
                                </TableCell>
                                <TableCell>
                                    {workflow.updated_at ? format(new Date(workflow.updated_at), 'MMM d, yyyy') : '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={workflow.is_active}
                                            onCheckedChange={() => handleToggle(workflow.id, workflow.is_active)}
                                            disabled={toggleMutation.isPending}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {workflow.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingWorkflow(workflow)}
                                        >
                                            <Settings2 className="h-4 w-4 mr-2" />
                                            {t_ext('edit', 'Edit')}</Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExecute(workflow.id, workflow.name)}
                                            disabled={executingId === workflow.id}
                                        >
                                            {executingId === workflow.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Play className="h-4 w-4 mr-2" />
                                            )}
                                            {t_ext('run', 'Run')}</Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(workflow.id)}
                                        >
                                            {t_ext('delete', 'Delete')}</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredWorkflows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    {t_ext('no_workflows_found', 'No workflows found.')}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!editingWorkflow} onOpenChange={() => setEditingWorkflow(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t_ext('edit_workflow', 'Edit Workflow:')}{editingWorkflow?.name}</DialogTitle>
                    </DialogHeader>
                    {editingWorkflow && (
                        <WorkflowEditor
                            workflow={editingWorkflow}
                            onClose={() => setEditingWorkflow(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t_ext('delete_workflow', 'Delete Workflow?')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t_ext('this_will_archive_the_workflow_and_remov', 'This will archive the workflow and remove it from active lists. Existing executions remain in history.')}</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteId(null)}>{t_ext('cancel', 'Cancel')}</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                                {t_ext('delete', 'Delete')}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t_ext('create_new_workflow', 'Create New Workflow')}</DialogTitle>
                    </DialogHeader>
                    <WorkflowEditor
                        workflow={{ id: '', name: '', type: 'event-based', trigger_config: {}, action_config: {}, is_active: true }}
                        onClose={() => setIsCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}
