
import { useNotificationBatches, useBulkNotifications } from '@/hooks/useBulkNotifications'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, RefreshCw, Play, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useQueryClient } from '@tanstack/react-query'

export default function NotificationBatches() {
    const { t, i18n } = useTranslation('common')
    const { data: batches, isLoading } = useNotificationBatches()
    const { processBatch, isProcessing } = useBulkNotifications()
    const queryClient = useQueryClient()

    const handleProcess = async (batchId: string) => {
        try {
            await processBatch(batchId)
            queryClient.invalidateQueries({ queryKey: ['notification-batches'] })
        } catch (error) {
            console.error('Failed to process batch:', error)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800'
            case 'processing': return 'bg-blue-100 text-blue-800'
            case 'failed': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />
            case 'processing': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />
            default: return <Clock className="w-4 h-4 text-gray-600" />
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notification Batches"
                description="Monitor and manage bulk notification jobs"
                actions={
                    <Button
                        variant="outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['notification-batches'] })}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>Batch Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : !batches || batches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No notification batches found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Job Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.map((batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{batch.job_type}</span>
                                                <span className="text-xs text-muted-foreground text-ellipsis overflow-hidden max-w-[200px]">
                                                    {batch.metadata?.title || 'No title'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`flex w-fit items-center gap-1 ${getStatusColor(batch.status)}`}>
                                                {getStatusIcon(batch.status)}
                                                <span className="capitalize">{batch.status}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="w-[200px]">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{batch.processed_count + batch.failed_count} / {batch.total_count}</span>
                                                    <span>{Math.round(((batch.processed_count + batch.failed_count) / batch.total_count) * 100)}%</span>
                                                </div>
                                                <Progress value={((batch.processed_count + batch.failed_count) / batch.total_count) * 100} className="h-2" />
                                                {batch.failed_count > 0 && (
                                                    <p className="text-xs text-red-500">{batch.failed_count} failed</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {batch.profiles?.full_name || 'System'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell>
                                            {batch.status !== 'completed' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleProcess(batch.id)}
                                                    disabled={isProcessing}
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    Process
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
