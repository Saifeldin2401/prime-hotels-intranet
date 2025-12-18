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
import { Play, Loader2 } from 'lucide-react'
import { useWorkflows, useToggleWorkflow, useExecuteWorkflow } from '@/hooks/useWorkflows'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

export function WorkflowList() {
    const { data: workflows, isLoading } = useWorkflows()
    const toggleMutation = useToggleWorkflow()
    const executeMutation = useExecuteWorkflow()
    const { toast } = useToast()
    const [executingId, setExecutingId] = useState<string | null>(null)

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
                                    Run Now
                                </Button>
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
    )
}
