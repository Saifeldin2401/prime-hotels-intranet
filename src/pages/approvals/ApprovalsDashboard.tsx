import { useState } from 'react'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'
import { ApprovalDetailsSheet } from '@/components/approvals/ApprovalDetailsSheet'
import { useUnifiedApprovals, type ApprovalItem } from '@/hooks/useUnifiedApprovals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
    Loader2,
    Search,
    CheckCircle,
    Filter,
    SortAsc,
    LayoutList,
    LayoutGrid,
    Inbox,
    FileText,
    Calendar,
    Wrench,
    ListTodo
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ApprovalsDashboard() {
    const { t, i18n } = useTranslation('approvals')
    const { toast } = useToast()
    const isRTL = i18n.dir() === 'rtl'

    // Use the unified hook
    const {
        approvals,
        isLoading,
        isActionPending,
        approveDocument,
        rejectDocument,
        approveLeave,
        rejectLeave,
        requestAction
    } = useUnifiedApprovals()

    // Local State
    const [searchTerm, setSearchTerm] = useState('')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)

    const includesQuery = (value?: string) =>
        (value || '').toLowerCase().includes(searchTerm.toLowerCase())

    // Filtering Logic
    const filteredApprovals = approvals.filter(item => {
        const matchesSearch = includesQuery(item.title) || includesQuery(item.requester) || includesQuery(item.description)

        const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter

        return matchesSearch && matchesPriority
    })

    // Categorized lists
    const requests = filteredApprovals.filter(i => i.type === 'request')
    const documents = filteredApprovals.filter(i => i.type === 'document')
    const leaves = filteredApprovals.filter(i => i.type === 'leave')
    const maintenance = filteredApprovals.filter(i => i.type === 'maintenance')

    // Handlers
    const handleOpenDetails = (item: ApprovalItem) => {
        setSelectedApproval(item)
        setSheetOpen(true)
    }

    const handleQuickApprove = async (id: string, type: string) => {
        try {
            if (type === 'document') {
                await approveDocument.mutateAsync({ approvalId: id })
                toast({ title: t('toast.document_approved', 'Document approved') })
            } else if (type === 'leave') {
                await approveLeave.mutateAsync({ requestId: id })
                toast({ title: t('toast.leave_approved', 'Leave request approved') })
            } else if (type === 'request') {
                // Determine next step based on role - specific logic can be complex,
                // but generalized approval usually means moving forward.
                // Assuming 'approve' action for now.
                await requestAction.mutateAsync({
                    requestId: id,
                    action: 'approve',
                    comment: 'Approved via Quick Action'
                })
                toast({ title: t('toast.request_approved', 'Request approved') })
            }
            // Close sheet if open and matches
            if (sheetOpen && selectedApproval?.id === id) setSheetOpen(false)
        } catch (error) {
            toast({ title: t('toast.error', 'Action failed'), variant: "destructive" })
        }
    }

    const handleQuickReject = async (id: string, type: string, reason: string = '') => {
        try {
            if (type === 'document') {
                await rejectDocument.mutateAsync({ approvalId: id, reason })
                toast({ title: t('toast.document_rejected', 'Document rejected') })
            } else if (type === 'leave') {
                await rejectLeave.mutateAsync({ requestId: id, reason })
                toast({ title: t('toast.leave_rejected', 'Leave request rejected') })
            } else if (type === 'request') {
                await requestAction.mutateAsync({
                    requestId: id,
                    action: 'reject',
                    comment: reason || 'Rejected via Quick Action'
                })
                toast({ title: t('toast.request_rejected', 'Request rejected') })
            }
            if (sheetOpen && selectedApproval?.id === id) setSheetOpen(false)
        } catch (error) {
            toast({ title: t('toast.error', 'Action failed'), variant: "destructive" })
        }
    }

    if (isLoading) {
        return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500 max-w-7xl">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Inbox className="w-8 h-8 text-primary" />
                        {t('title', 'Approvals Center')}
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">{t('description', 'Review and manage your pending tasks and requests.')}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className={cn("absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4", isRTL ? "right-3" : "left-3")} />
                        <Input
                            placeholder={t('search_placeholder', 'Search by title, requester...')}
                            className={cn("pl-10 h-10 bg-white", isRTL && "pr-10 pl-3")}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full sm:w-[150px] h-10 bg-white">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <SelectValue placeholder="Priority" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="hidden sm:flex border rounded-md bg-white">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-10 w-10 rounded-none rounded-l-md", viewMode === 'grid' && "bg-muted text-primary")}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-10 w-10 rounded-none rounded-r-md", viewMode === 'list' && "bg-muted text-primary")}
                            onClick={() => setViewMode('list')}
                        >
                            <LayoutList className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide h-14 p-1 bg-white border rounded-xl shadow-sm mb-6 gap-2">
                    <TabsTrigger value="all" className="rounded-lg px-4 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <ListTodo className="w-4 h-4 mr-2" />
                        {t('all', 'All')}
                        <Badge variant="secondary" className="ml-2 bg-gray-100">{filteredApprovals.length}</Badge>
                    </TabsTrigger>

                    <TabsTrigger value="requests" className="rounded-lg px-4 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <Inbox className="w-4 h-4 mr-2" />
                        {t('unified_tab', 'HR Requests')}
                        <Badge variant="secondary" className="ml-2 bg-gray-100">{requests.length}</Badge>
                    </TabsTrigger>

                    <TabsTrigger value="documents" className="rounded-lg px-4 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <FileText className="w-4 h-4 mr-2" />
                        {t('documents_tab', 'Documents')}
                        <Badge variant="secondary" className="ml-2 bg-gray-100">{documents.length}</Badge>
                    </TabsTrigger>

                    <TabsTrigger value="leaves" className="rounded-lg px-4 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <Calendar className="w-4 h-4 mr-2" />
                        {t('leaves_tab', 'Leaves')}
                        <Badge variant="secondary" className="ml-2 bg-gray-100">{leaves.length}</Badge>
                    </TabsTrigger>

                    <TabsTrigger value="maintenance" className="rounded-lg px-4 h-10 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">
                        <Wrench className="w-4 h-4 mr-2" />
                        {t('maintenance_tab', 'Maintenance')}
                        <Badge variant="secondary" className="ml-2 bg-gray-100">{maintenance.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Tab Content Areas */}
                {['all', 'requests', 'documents', 'leaves', 'maintenance'].map(tabValue => {
                    const items = tabValue === 'all' ? filteredApprovals :
                        tabValue === 'requests' ? requests :
                            tabValue === 'documents' ? documents :
                                tabValue === 'leaves' ? leaves : maintenance

                    return (
                        <TabsContent key={tabValue} value={tabValue} className="space-y-6">
                            {items.length === 0 ? (
                                <EmptyState type={tabValue} />
                            ) : (
                                <div className={cn(
                                    viewMode === 'grid'
                                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                        : "flex flex-col gap-4 max-w-4xl mx-auto"
                                )}>
                                    {items.map((item) => (
                                        <div key={`${item.type}-${item.id}`} className={cn(viewMode === 'list' && "w-full")}>
                                            <ApprovalCard
                                                {...item}
                                                // Only pass handlers if direct action is allowed on card (though detail view handles it too)
                                                onApprove={item.actions.canApprove ? () => handleQuickApprove(item.id, item.type) : undefined}
                                                onReject={item.actions.canReject ? () => handleQuickReject(item.id, item.type) : undefined}
                                                onView={() => handleOpenDetails(item)}
                                                isActionPending={isActionPending}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    )
                })}
            </Tabs>

            {/* Side Sheet for Details */}
            <ApprovalDetailsSheet
                approval={selectedApproval}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onApprove={(id) => handleQuickApprove(id, selectedApproval?.type || '')}
                onReject={(id, reason) => handleQuickReject(id, selectedApproval?.type || '', reason)}
                isProcessing={isActionPending}
            />
        </div>
    )
}

function EmptyState({ type = 'all' }: { type?: string }) {
    const { t } = useTranslation('approvals')
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <CheckCircle className="w-12 h-12 text-primary/20" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{t(`no_${type}_title`, 'All caught up!')}</h3>
            <p className="text-gray-500 max-w-sm mt-2">{t(`no_${type}_desc`, 'You have no pending items in this category.')}</p>
        </div>
    )
}
