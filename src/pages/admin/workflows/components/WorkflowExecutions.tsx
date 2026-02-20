import { useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useExecuteWorkflow } from '@/hooks/useWorkflows'
import { useTranslation } from "react-i18next";

export function WorkflowExecutions() {
    const { t: t_ext } = useTranslation('extracted');
    const { data: executions, isLoading, error } = useWorkflowExecutions(undefined, 50)
    const [selectedExecution, setSelectedExecution] = useState<any>(null)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchText, setSearchText] = useState('')
    const executeMutation = useExecuteWorkflow()

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success'
            case 'failed': return 'destructive'
            case 'running': return 'default'
            default: return 'secondary'
        }
    }

    const filteredExecutions = useMemo(() => {
        const list = executions || []
        return list.filter((exec) => {
            const matchesStatus = statusFilter === 'all' || exec.status === statusFilter
            const matchesSearch = !searchText
                || exec.workflow_definitions?.name?.toLowerCase().includes(searchText.toLowerCase())
                || exec.id.toLowerCase().includes(searchText.toLowerCase())
            return matchesStatus && matchesSearch
        })
    }, [executions, statusFilter, searchText])

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    if (error) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {t_ext('failed_to_load_execution_logs', 'Failed to load execution logs:')}{error instanceof Error ? error.message : 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t_ext('all_statuses', 'All Statuses')}</SelectItem>
                            <SelectItem value="completed">{t_ext('completed', 'Completed')}</SelectItem>
                            <SelectItem value="failed">{t_ext('failed_1', 'Failed')}</SelectItem>
                            <SelectItem value="running">{t_ext('running', 'Running')}</SelectItem>
                            <SelectItem value="pending">{t_ext('pending', 'Pending')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder={t_ext('search_by_workflow_or_execution_id', 'Search by workflow or execution ID...')}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-[260px]"
                    />
                </div>
                <div className="text-xs text-muted-foreground">
                    {t_ext('showing', 'Showing')}{filteredExecutions.length} of {executions?.length || 0} {t_ext('executions', 'executions')}</div>
            </div>

            <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t_ext('workflow', 'Workflow')}</TableHead>
                        <TableHead>{t_ext('status_1', 'Status')}</TableHead>
                        <TableHead>{t_ext('started_at', 'Started At')}</TableHead>
                        <TableHead>{t_ext('duration', 'Duration')}</TableHead>
                        <TableHead>{t_ext('trigger', 'Trigger')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredExecutions.map((exec) => (
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
                    {filteredExecutions.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                {t_ext('no_execution_history_found_for_the_selec', 'No execution history found for the selected filters.')}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            </div>

            <Sheet open={!!selectedExecution} onOpenChange={(open) => !open && setSelectedExecution(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle>{t_ext('execution_details', 'Execution Details')}</SheetTitle>
                        <SheetDescription>
                            {selectedExecution?.id}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedExecution && (
                        <div className="mt-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium">{t_ext('status_1', 'Status')}</h4>
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
                                    <h4 className="text-sm font-medium">{t_ext('duration', 'Duration')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedExecution.execution_time_ms}ms
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium">{t_ext('workflow', 'Workflow')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedExecution.workflow_definitions?.name || selectedExecution.workflow_id}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => executeMutation.mutate({ workflowId: selectedExecution.workflow_id, metadata: { retry_of: selectedExecution.id } })}
                                    disabled={executeMutation.isPending}
                                >
                                    {t_ext('retry_run', 'Retry Run')}</Button>
                            </div>

                            {selectedExecution.error && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-destructive">{t_ext('error', 'Error')}</h4>
                                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive font-mono whitespace-pre-wrap">
                                        {selectedExecution.error}
                                    </div>
                                </div>
                            )}

                            {selectedExecution.result && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">{t_ext('result', 'Result')}</h4>
                                    <ScrollArea className="h-[200px] w-full rounded-md border bg-muted/50 p-4">
                                        <pre className="text-xs font-mono">
                                            {JSON.stringify(selectedExecution.result, null, 2)}
                                        </pre>
                                    </ScrollArea>
                                </div>
                            )}

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">{t_ext('metadata', 'Metadata')}</h4>
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
