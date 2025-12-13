import { useState } from 'react'
import {
    usePendingApprovals,
    useApproveDocument,
    useRejectDocument
} from '@/hooks/useDocuments'
import {
    useTeamLeaveRequests,
    useApproveLeaveRequest,
    useRejectLeaveRequest
} from '@/hooks/useLeaveRequests'
import { useRequestsInbox, type RequestStatus } from '@/hooks/useRequests'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, CheckCircle, Loader2, Calendar, Clock, AlertCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export default function ApprovalsDashboard() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { t, i18n } = useTranslation('approvals')
    const isRTL = i18n.dir() === 'rtl'

    // Unified requests hook
    const { data: pendingRequests = [], isLoading: requestsLoading } = useRequestsInbox({
        status: ['pending_supervisor_approval', 'pending_hr_review']
    })

    // Legacy hooks for backward compatibility
    const { data: pendingApprovals = [], isLoading: documentsLoading } = usePendingApprovals()
    const approveDocument = useApproveDocument()
    const rejectDocument = useRejectDocument()

    const { data: teamLeaves = [], isLoading: leavesLoading } = useTeamLeaveRequests()
    const approveLeave = useApproveLeaveRequest()
    const rejectLeave = useRejectLeaveRequest()

    const pendingLeaves = teamLeaves.filter(l => l.status === 'pending')
    const isLoading = requestsLoading || documentsLoading || leavesLoading

    const [selectedApproval, setSelectedApproval] = useState<string | null>(null)
    const [actionType, setActionType] = useState<'document' | 'leave' | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [feedback, setFeedback] = useState('')

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    const getStatusBadge = (status: RequestStatus) => {
        const statusConfig = {
            pending_supervisor_approval: { label: 'Pending Supervisor', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
            pending_hr_review: { label: 'Pending HR', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4" /> },
            approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
            rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
            returned_for_correction: { label: 'Returned', color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-4 h-4" /> },
            draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: <FileText className="w-4 h-4" /> },
            closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-4 h-4" /> },
        }
        const config = statusConfig[status] || statusConfig.draft
        return (
            <Badge className={cn(config.color, "rounded-md")}>
                {config.icon}
                <span className={cn("ml-1", isRTL && "mr-1 ml-0")}>{config.label}</span>
            </Badge>
        )
    }

    const getEntityBadge = (entityType: string) => {
        const entityConfig = {
            leave_request: { label: 'Leave Request', icon: <Calendar className="w-4 h-4" /> },
            document: { label: 'Document', icon: <FileText className="w-4 h-4" /> },
            transfer: { label: 'Transfer', icon: <FileText className="w-4 h-4" /> },
        }
        const config = entityConfig[entityType as keyof typeof entityConfig] || { label: entityType, icon: <FileText className="w-4 h-4" /> }
        return (
            <Badge variant="outline" className="rounded-md">
                {config.icon}
                <span className={cn("ml-1", isRTL && "mr-1 ml-0")}>{config.label}</span>
            </Badge>
        )
    }

    const initiateAction = (id: string, action: 'approve' | 'reject', type: 'document' | 'leave') => {
        setSelectedApproval(id)
        setActionType(type)
        if (action === 'approve') setShowApproveDialog(true)
        else setShowRejectDialog(true)
    }

    const handleDocumentApprove = async () => {
        if (!selectedApproval) return
        try {
            await approveDocument.mutateAsync({ approvalId: selectedApproval, feedback })
            toast({ title: t('toast.document_approved'), description: t('toast.document_approved_desc') })
            closeDialogs()
        } catch (error) {
            console.error('Error approving document:', error)
            toast({ title: t('toast.error'), description: t('toast.approve_error_doc'), variant: "destructive" })
        }
    }

    const handleLeaveApprove = async () => {
        if (!selectedApproval) return
        try {
            await approveLeave.mutateAsync({ requestId: selectedApproval })
            toast({ title: t('toast.leave_approved'), description: t('toast.leave_approved_desc') })
            closeDialogs()
        } catch (error) {
            console.error('Error approving leave:', error)
            toast({ title: t('toast.error'), description: t('toast.approve_error_leave'), variant: "destructive" })
        }
    }

    const handleDocumentReject = async () => {
        if (!selectedApproval) return
        try {
            await rejectDocument.mutateAsync({ approvalId: selectedApproval, reason: rejectReason })
            toast({ title: t('toast.document_rejected'), description: t('toast.document_rejected_desc') })
            closeDialogs()
        } catch (error) {
            console.error('Error rejecting document:', error)
            toast({ title: t('toast.error'), description: t('toast.reject_error_doc'), variant: "destructive" })
        }
    }

    const handleLeaveReject = async () => {
        if (!selectedApproval) return
        try {
            await rejectLeave.mutateAsync({ requestId: selectedApproval, reason: rejectReason })
            toast({ title: t('toast.leave_rejected'), description: t('toast.leave_rejected_desc') })
            closeDialogs()
        } catch (error) {
            console.error('Error rejecting leave:', error)
            toast({ title: t('toast.error'), description: t('toast.reject_error_leave'), variant: "destructive" })
        }
    }

    const closeDialogs = () => {
        setShowApproveDialog(false)
        setShowRejectDialog(false)
        setSelectedApproval(null)
        setFeedback('')
        setRejectReason('')
        setActionType(null)
    }

    const onApprove = () => {
        if (actionType === 'document') handleDocumentApprove()
        else if (actionType === 'leave') handleLeaveApprove()
    }

    const onReject = () => {
        if (actionType === 'document') handleDocumentReject()
        else if (actionType === 'leave') handleLeaveReject()
    }

    const isPending = approveDocument.isPending || rejectDocument.isPending || approveLeave.isPending || rejectLeave.isPending

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-gray-600">{t('description')}</p>
                </div>
            </div>

            <Tabs defaultValue="unified" className="w-full">
                <TabsList>
                    <TabsTrigger value="unified">Unified Requests ({pendingRequests.length})</TabsTrigger>
                    <TabsTrigger value="documents">{t('documents_tab')} ({pendingApprovals.length})</TabsTrigger>
                    <TabsTrigger value="leaves">{t('leaves_tab')} ({pendingLeaves.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="unified" className="space-y-4">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/20">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">All caught up</h3>
                            <p className="text-gray-600">No pending requests to review</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pendingRequests.map((request) => (
                                <Card key={request.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1 mb-2">
                                                {getEntityBadge(request.entity_type)}
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <span className="text-xs text-gray-600">
                                                {format(new Date(request.created_at), 'MMM d')}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base line-clamp-1">
                                            {request.requester?.full_name || 'Unknown Employee'}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            Request #{request.request_no} • {request.current_assignee?.full_name ? `Assigned to: ${request.current_assignee.full_name}` : 'Unassigned'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate(`/hr/request/${request.id}`)}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                    {pendingApprovals.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/20">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">{t('all_caught_up_documents')}</h3>
                            <p className="text-gray-600">{t('all_caught_up_documents_desc')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pendingApprovals.map((approval) => (
                                <Card key={approval.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md mb-2">{t('document_badge')}</Badge>
                                            <span className="text-xs text-gray-600">
                                                {format(new Date(approval.created_at), 'MMM d')}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base line-clamp-1" title={approval.document?.title}>
                                            {approval.document?.title || t('untitled_document')}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {approval.document?.description || t('no_description')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center mt-4 gap-2">
                                            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm" onClick={() => navigate(`/documents/${approval.document_id}`)}>
                                                <FileText className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                                                {t('view')}
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => initiateAction(approval.id, 'reject', 'document')}
                                                >
                                                    {t('reject')}
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => initiateAction(approval.id, 'approve', 'document')}
                                                >
                                                    {t('approve')}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="leaves" className="space-y-4">
                    {pendingLeaves.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/20">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">{t('no_pending_leaves')}</h3>
                            <p className="text-gray-600">{t('no_pending_leaves_desc')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pendingLeaves.map((leave) => (
                                <Card key={leave.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 mb-2">
                                                {leave.type.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <span className="text-xs text-gray-600">
                                                {format(new Date(leave.created_at), 'MMM d')}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base">
                                            {leave.requester?.full_name || t('unknown_user')}
                                        </CardTitle>
                                        <CardDescription>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                                            </div>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                                            {leave.reason ? `"${leave.reason}"` : t('no_reason')}
                                        </p>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => initiateAction(leave.id, 'reject', 'leave')}
                                            >
                                                {t('reject')}
                                            </Button>
                                            <Button
                                                variant="default" // primary
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => initiateAction(leave.id, 'approve', 'leave')}
                                            >
                                                {t('approve')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={closeDialogs}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionType === 'document' ? t('approve_dialog_title_document') : t('approve_dialog_title_leave')}</DialogTitle>
                        <DialogDescription>
                            {actionType === 'document'
                                ? t('approve_dialog_desc_document')
                                : t('approve_dialog_desc_leave')}
                        </DialogDescription>
                    </DialogHeader>
                    {actionType === 'document' && (
                        <div className="space-y-2 py-2">
                            <Textarea
                                placeholder={t('optional_feedback')}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={closeDialogs}>{t('cancel')}</Button>
                        <Button onClick={onApprove} disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {t('approve')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={closeDialogs}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionType === 'document' ? t('reject_dialog_title_document') : t('reject_dialog_title_leave')}</DialogTitle>
                        <DialogDescription>
                            {actionType === 'document' ? t('reject_dialog_desc_document') : t('reject_dialog_desc_leave')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Textarea
                            placeholder={t('reject_reason_placeholder')}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={closeDialogs}>{t('cancel')}</Button>
                        <Button
                            variant="destructive"
                            onClick={onReject}
                            disabled={isPending || !rejectReason.trim()}
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {t('reject')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
