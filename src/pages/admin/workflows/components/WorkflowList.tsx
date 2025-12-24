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
import { Play, Loader2, Settings2, Plus } from 'lucide-react'
import { useWorkflows, useToggleWorkflow, useExecuteWorkflow } from '@/hooks/useWorkflows'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { WorkflowEditor } from './WorkflowEditor'
import type { WorkflowDefinition } from '@/services/workflowEngine'

export function WorkflowList() {
    const { data: workflows, isLoading } = useWorkflows()
    const toggleMutation = useToggleWorkflow()
    const executeMutation = useExecuteWorkflow()
    const { toast } = useToast()
    const [executingId, setExecutingId] = useState<string | null>(null)
    const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

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
                onError: (error) => {
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
        setExecutingId(id)
        executeMutation.mutate(
            { workflowId: id },
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

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Workflow Definitions</h3>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workflow
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Workflow Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Trigger</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workflows?.map((workflow) => (
                            <TableRow key={workflow.id}>
                                <TableCell className="font-medium">
                                    <div>{workflow.name}</div>
                                    <div className="text-xs text-muted-foreground">{workflow.description}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{workflow.type}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                    {workflow.trigger_config.cron || 'Manual'}
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
                                            Edit
                                        </Button>
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
                                            Run
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!workflows?.length && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No workflows found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!editingWorkflow} onOpenChange={() => setEditingWorkflow(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Workflow: {editingWorkflow?.name}</DialogTitle>
                    </DialogHeader>
                    {editingWorkflow && (
                        <WorkflowEditor
                            workflow={editingWorkflow}
                            onClose={() => setEditingWorkflow(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Workflow</DialogTitle>
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
