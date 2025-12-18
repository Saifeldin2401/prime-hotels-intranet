import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useWorkflowExecutions } from '@/hooks/useWorkflows'
import { format } from 'date-fns'

export function WorkflowExecutions() {
    const { data: executions, isLoading } = useWorkflowExecutions(undefined, 50)
    const [selectedExecution, setSelectedExecution] = useState<any>(null)

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success'
            case 'failed': return 'destructive'
            case 'running': return 'default'
            default: return 'secondary'
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started At</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Trigger</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {executions?.map((exec) => (
                        <TableRow
                            key={exec.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedExecution(exec)}
                        >
                            <TableCell className="font-medium">
                                {exec.workflow_definitions?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(exec.status) as any}>
                                    {exec.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {exec.started_at ? format(new Date(exec.started_at), 'MMM d, HH:mm:ss') : '-'}
                            </TableCell>
                            <TableCell>
                                {exec.execution_time_ms ? `${exec.execution_time_ms}ms` : '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {exec.metadata?.triggered_by || 'scheduled'}
                            </TableCell>
                        </TableRow>
                    ))}
                    {!executions?.length && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                No execution history found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Sheet open={!!selectedExecution} onOpenChange={(open) => !open && setSelectedExecution(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle>Execution Details</SheetTitle>
                        <SheetDescription>
                            {selectedExecution?.id}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedExecution && (
                        <div className="mt-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium">Status</h4>
                                    <div className="flex items-center gap-2">
                                        {selectedExecution.status === 'completed' ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : selectedExecution.status === 'failed' ? (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-blue-500" />
                                        )}
                                        <span className="capitalize">{selectedExecution.status}</span>
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <h4 className="text-sm font-medium">Duration</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedExecution.execution_time_ms}ms
                                    </p>
                                </div>
                            </div>

                            {selectedExecution.error && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-destructive">Error</h4>
                                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive font-mono whitespace-pre-wrap">
                                        {selectedExecution.error}
                                    </div>
                                </div>
                            )}

                            {selectedExecution.result && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">Result</h4>
                                    <ScrollArea className="h-[200px] w-full rounded-md border bg-muted/50 p-4">
                                        <pre className="text-xs font-mono">
                                            {JSON.stringify(selectedExecution.result, null, 2)}
                                        </pre>
                                    </ScrollArea>
                                </div>
                            )}

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Metadata</h4>
                                <div className="rounded-md border bg-muted/50 p-4">
                                    <pre className="text-xs font-mono">
                                        {JSON.stringify(selectedExecution.metadata, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
