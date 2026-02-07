import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, FileText, User, Building, MapPin, Clock, Inbox, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { ApprovalItem } from '@/hooks/useUnifiedApprovals'
import { useNavigate } from 'react-router-dom'

interface ApprovalDetailsSheetProps {
    approval: ApprovalItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onApprove: (id: string, feedback?: string) => void
    onReject: (id: string, reason: string) => void
    isProcessing: boolean
}

export function ApprovalDetailsSheet({
    approval,
    open,
    onOpenChange,
    onApprove,
    onReject,
    isProcessing
}: ApprovalDetailsSheetProps) {
    const { t } = useTranslation(['approvals', 'common'])
    const navigate = useNavigate()

    if (!approval) return null

    const renderContent = () => {
        switch (approval.type) {
            case 'request':
                return (
                    <div className="space-y-6">
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Inbox className="w-4 h-4" /> Request Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Request ID:</span>
                                    <p className="font-medium">#{approval.raw?.request_no}</p>
                                </div>
                                <div className="capitalize">
                                    <span className="text-muted-foreground">Status:</span>
                                    <p className="font-medium text-blue-600">{approval.status?.replace(/_/g, ' ')}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Description:</span>
                                    <p className="mt-1">{approval.description || 'No additional description.'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                            <p className="text-blue-800 font-medium mb-1">Assigned To:</p>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span>{approval.raw?.current_assignee?.full_name || 'Unassigned'}</span>
                            </div>
                        </div>

                        <div className="flex justify-center pt-2">
                            <Button variant="outline" className="w-full" onClick={() => {
                                navigate(`/hr/request/${approval.id}`)
                                onOpenChange(false)
                            }}>
                                View Full Request <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )
            case 'document':
                return (
                    <div className="space-y-6">
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Document Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Title:</span>
                                    <p className="font-medium">{approval.title}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Version:</span>
                                    <p className="font-medium">v{approval.raw.document?.current_version || 1}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Description:</span>
                                    <p className="mt-1">{approval.description || t('common:no_description_provided')}</p>
                                </div>
                            </div>
                        </div>

                        {approval.raw.document?.file_url && (
                            <div className="flex justify-center">
                                <Button variant="outline" className="w-full" asChild>
                                    <a href={approval.raw.document.file_url} target="_blank" rel="noopener noreferrer">
                                        <FileText className="mr-2 h-4 w-4" /> View Document
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>
                )
            case 'leave':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                <span className="text-xs text-blue-600 font-semibold uppercase">Start Date</span>
                                <p className="text-lg font-bold text-blue-900">
                                    {format(new Date(approval.raw.start_date), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                <span className="text-xs text-blue-600 font-semibold uppercase">End Date</span>
                                <p className="text-lg font-bold text-blue-900">
                                    {format(new Date(approval.raw.end_date), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <h4 className="font-semibold mb-2">Reason</h4>
                            <p className="text-sm text-gray-700">{approval.description}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                {approval.entityMatches?.property}
                            </div>
                            <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {approval.entityMatches?.department}
                            </div>
                        </div>
                    </div>
                )
            case 'maintenance':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant={approval.priority === 'critical' ? 'destructive' : 'secondary'}>
                                {approval.priority?.toUpperCase()} Priority
                            </Badge>
                            <Badge variant="outline">
                                {approval.status}
                            </Badge>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Location
                            </h4>
                            <p className="text-sm">
                                {approval.entityMatches?.property}
                                {approval.entityMatches?.room && ` - Room ${approval.entityMatches.room}`}
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">Issue Description</h4>
                            <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-md border">
                                {approval.description}
                            </p>
                        </div>
                    </div>
                )
            default:
                return <p className="text-muted-foreground">Details not available for this type.</p>
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-white dark:bg-slate-950">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="uppercase text-xs tracking-wider">
                            {approval.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {approval.createdAt ? format(new Date(approval.createdAt), 'MMM d, h:mm a') : 'Unknown Date'}
                        </span>
                    </div>
                    <SheetTitle className="text-xl">{approval.title}</SheetTitle>
                    <SheetDescription>
                        Submitted by <span className="font-medium text-foreground">{approval.requester || 'Unknown'}</span>
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                    {renderContent()}
                </ScrollArea>

                <SheetFooter className="mt-8 pt-4 border-t flex flex-col sm:flex-row gap-2">
                    {approval.actions.canApprove && (
                        <>
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => onReject(approval.id, '')}
                                disabled={isProcessing}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                            </Button>
                            <Button
                                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => onApprove(approval.id)}
                                disabled={isProcessing}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                            </Button>
                        </>
                    )}
                    {!approval.actions.canApprove && (
                        <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
