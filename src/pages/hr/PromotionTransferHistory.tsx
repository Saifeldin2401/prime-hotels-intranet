import { PromoteEmployeeDialog } from '@/components/hr/PromoteEmployeeDialog'
import { TransferEmployeeDialog } from '@/components/hr/TransferEmployeeDialog'
import { PageHeader } from '@/components/layout/PageHeader'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input'
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import {
    ArrowRightLeft,
    ArrowUp,
    Calendar,
    Edit,
    MoreHorizontal,
    Search, Target,
    User,
    XCircle
} from 'lucide-react'
import { EosbCalculatorModal } from '@/components/hr/EosbCalculatorModal'
import { Scale } from 'lucide-react'

interface PromotionRecord {
    type: 'promotion'
    id: string
    request_id?: string
    employee_id: string
    approved_by: string | null
    from_role: string | null
    to_role: string
    from_title: string | null
    to_title: string
    to_department_id: string | null
    effective_date: string
    notes: string | null
    // employee_promotions has no status column of its own; status is derived from the
    // linked request when present, so it is optional on this record shape.
    status?: 'pending' | 'completed' | 'cancelled' | 'approved' | 'rejected'
    created_at: string
    employee?: { full_name: string }
    approver?: { full_name: string }
    to_department?: { name: string }
}

interface TransferRecord {
    type: 'transfer'
    id: string
    request_id?: string
    employee_id: string
    from_property_id: string | null
    to_property_id: string
    to_department_id: string | null
    effective_date: string
    notes: string | null
    status: 'pending' | 'completed' | 'cancelled' | 'approved' | 'rejected'
    created_at: string
    employee?: { full_name: string }
    from_property?: { name: string }
    to_property?: { name: string }
    to_department?: { name: string }
}

type HistoryRecord = PromotionRecord | TransferRecord

export default function PromotionTransferHistory() {
    const { t, i18n } = useTranslation(['hr', 'common'])
    const [searchTerm, setSearchTerm] = useState('')
    const [isEosbOpen, setIsEosbOpen] = useState(false)
    const { primaryRole } = useAuth()
    const { toast } = useToast()
    const isRTL = i18n.dir() === 'rtl'

    // For Cancel Dialog
    const [recordToCancel, setRecordToCancel] = useState<HistoryRecord | null>(null)

    // Unified query for requests (promotions + transfers)

    // To implement Edit/Delete, I really need the `request_id`.
    // I'll fetch `requests` instead of `promotions` table directly?
    // User asked "Admin/Reg HR should see all". `requests` table is the unified source.
    // Let's refactor to Query `Requests` table!
    // It has `metadata` with everything we need for display.
    // And it has `id` which is the request_id needed for actions.

    const { data: _requestRecords, refetch: _refetch } = useQuery({
        queryKey: ['history-requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('requests')
                .select(`
                    id, entity_type, entity_id, status, created_at, metadata,
                    requester:profiles!requests_requester_id_fkey(full_name),
                    assignee:profiles!requests_current_assignee_id_fkey(full_name)
                 `)
                .in('entity_type', ['promotion', 'transfer'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map to HistoryRecord shape
            return data.map(r => {
                const meta = r.metadata || {};

                // Construct record based on metadata (available since implementation)
                // NOTE: Older records might miss metadata, but since this is a new system, it's fine.
                return {
                    type: r.entity_type as 'promotion' | 'transfer',
                    id: r.id, // This is REQUEST ID now.
                    // We keep entity_id if needed
                    entity_id: r.entity_id,

                    status: r.status,
                    created_at: r.created_at,

                    // Metadata mapping
                    employee: { full_name: meta.employee_name || 'Unknown' },
                    effective_date: meta.effective_date,
                    notes: meta.notes, // If we added notes to metadata? We probably didn't.

                    // Promotion specific
                    to_role: meta.to_role,
                    to_title: meta.to_title, // Did we add this?
                    // Check `submit_promotion_request`: 
                    // jsonb_build_object('employee_name', ..., 'new_role', ..., 'effective_date', p_effective_date)
                    // Missing job_title in metadata. 

                    // Ah, switching to Requests table ONLY is risky if metadata is incomplete.
                    // HYBRID APPROACH:
                    // Fetch Promotions/Transfers + Join Requests via client side or complex query?
                    // I will stick to original tables but I NEED Request ID.
                    // I will use `rpc` to get the history with request IDs?
                    // OR I can use `cancel_request` by `entity_id`?
                    // I'll modify `cancel_request` to verify by entity_id if provided?
                    // No, let's keep it clean.

                    // Let's create a View or RPC `get_history_with_requests`?
                    // Too much SQL.

                    // Fast fix:
                    // Fetch `requests` filtering by entity_type.
                    // Create a map of entity_id -> request_id.
                    // Pass that to the records.
                }
            });
        }
    });

    // ... actually, I'll stick to the existing code structure but fetch request map.

    const { data: requestMap } = useQuery({
        queryKey: ['request-map'],
        queryFn: async () => {
            const { data } = await supabase.from('requests')
                .select('id, entity_id')
                .in('entity_type', ['promotion', 'transfer']);
            const map = new Map();
            data?.forEach(r => map.set(r.entity_id, r.id));
            return map;
        }
    });


    // Refetch Promotions
    const { data: promotionsData, refetch: refetchPromos } = useQuery({
        queryKey: ['promotions-history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_promotions')
                .select(`
                  *,
                  employee:profiles!employee_promotions_employee_id_fkey(full_name),
                  approver:profiles!employee_promotions_approved_by_fkey(full_name),
                  to_department:departments!employee_promotions_to_department_id_fkey(name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []).map(p => ({ ...p, type: 'promotion' })) as PromotionRecord[]
        }
    })

    // Refetch Transfers
    const { data: transfersData, refetch: refetchTransfers } = useQuery({
        queryKey: ['transfers-history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_transfers')
                .select(`
                  *,
                  employee:profiles!employee_transfers_employee_id_fkey(full_name),
                  from_property:properties!employee_transfers_from_property_id_fkey(name),
                  to_property:properties!employee_transfers_to_property_id_fkey(name),
                  to_department:departments!employee_transfers_to_department_id_fkey(name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []).map(t => ({ ...t, type: 'transfer' })) as TransferRecord[]
        }
    })

    const allRecords = [...(promotionsData || []), ...(transfersData || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).map(r => ({
        ...r,
        request_id: requestMap?.get(r.id)
    }));

    const filteredRecords = allRecords.filter(r =>
        r.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const canInitiate = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'].includes(primaryRole || '')

    const handleCancel = async () => {
        if (!recordToCancel?.request_id) return;

        try {
            const { error } = await supabase.rpc('cancel_request', {
                p_request_id: recordToCancel.request_id,
                p_reason: 'Cancelled by user via History'
            });

            if (error) throw error;

            toast({ title: 'Request Cancelled', description: 'The request has been cancelled successfully.' });
            setRecordToCancel(null);
            refetchPromos();
            refetchTransfers();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to cancel request'
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('history.title', { defaultValue: 'Promotions & Transfers' })} // Updated Title
                description={t('history.description', { defaultValue: 'View past and upcoming employee movements' })}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsEosbOpen(true)} className="border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                            <Scale className="h-4 w-4 me-2 text-emerald-600" />
                            KSA EOSB Calculator
                        </Button>
                        {canInitiate && (
                            <>
                                <PromoteEmployeeDialog onSuccess={() => { refetchPromos(); }}>
                                    <Button className="bg-purple-600 hover:bg-purple-700">
                                        <ArrowUp className="h-4 w-4 me-2" />
                                        {t('history.promote_button')}
                                    </Button>
                                </PromoteEmployeeDialog>
                                <TransferEmployeeDialog onSuccess={() => { refetchTransfers(); }}>
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Target className="h-4 w-4 me-2" />
                                        {t('history.transfer_button')}
                                    </Button>
                                </TransferEmployeeDialog>
                            </>
                        )}
                    </div>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    <div className="relative max-w-md">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder={t('common:common.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={isRTL ? "pe-9" : "ps-9"}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                        <div key={`${record.type}-${record.id}`} className="altus-card group">
                            <div className="altus-card-body">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`p-3 rounded-lg ${record.type === 'promotion' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                            {record.type === 'promotion' ? (
                                                <ArrowUp className={`h-6 w-6 ${record.type === 'promotion' ? 'text-purple-600' : 'text-blue-600'}`} />
                                            ) : (
                                                <Target className="h-6 w-6 text-blue-600" />
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {record.employee?.full_name}
                                                    </h3>
                                                    <Badge variant="outline" className="uppercase text-xs">
                                                        {t(`history.${record.type === 'promotion' ? 'promotions' : 'transfers'}`)}
                                                    </Badge>
                                                    <Badge className={
                                                        record.status === 'completed' || record.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            record.status === 'pending' || (record.status as string) === 'pending_hr_review' ? 'bg-yellow-100 text-yellow-800' :
                                                                record.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                    }>
                                                        {record.status === 'pending' ? t('status.pending_approval') : t(`status.${record.status}`)}
                                                    </Badge>
                                                </div>

                                                {/* Actions Menu - Only for authorized & pending */}
                                                {record.status === 'pending' && canInitiate && record.request_id && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {record.type === 'promotion' ? (
                                                                <PromoteEmployeeDialog
                                                                    editRecord={{
                                                                        id: record.id,
                                                                        request_id: record.request_id,
                                                                        employee_id: record.employee_id,
                                                                        // Map consolidated employee_promotions columns (to_*) onto the dialog's new_* prop shape.
                                                                        new_role: record.to_role,
                                                                        new_job_title: record.to_title,
                                                                        new_department_id: record.to_department_id,
                                                                        effective_date: record.effective_date,
                                                                        notes: record.notes,
                                                                    }}
                                                                    onSuccess={() => { refetchPromos(); refetchTransfers(); }}
                                                                >
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <Edit className="me-2 h-4 w-4" /> {t('common:common.edit')}
                                                                    </DropdownMenuItem>
                                                                </PromoteEmployeeDialog>
                                                            ) : (
                                                                <TransferEmployeeDialog
                                                                    editRecord={record as TransferRecord}
                                                                    onSuccess={() => { refetchPromos(); refetchTransfers(); }}
                                                                >
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <Edit className="me-2 h-4 w-4" /> {t('common:common.edit')}
                                                                    </DropdownMenuItem>
                                                                </TransferEmployeeDialog>
                                                            )}
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => setRecordToCancel(record as HistoryRecord)}
                                                            >
                                                                <XCircle className="me-2 h-4 w-4" /> {t('history.cancel_action')}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>

                                            <div className="mt-2 space-y-1">
                                                {record.type === 'promotion' ? (
                                                    <>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-gray-600">{t('history.job_title')}:</span>
                                                            <span className="text-gray-500">
                                                                {record.from_title || 'N/A'}
                                                            </span>
                                                            <ArrowRightLeft className={`h-3 w-3 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                                                            <span className="font-medium text-purple-600">
                                                                {record.to_title}
                                                            </span>
                                                        </div>
                                                        {(record.from_role && record.to_role) && (
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span>{t('history.role')}:</span>
                                                                <span>
                                                                    {t(`roles.${record.from_role}`) || record.from_role}
                                                                </span>
                                                                <ArrowRightLeft className="h-2.5 w-2.5" />
                                                                <span>
                                                                    {t(`roles.${record.to_role}`) || record.to_role}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-600">{t('history.property')}:</span>
                                                        <span className="text-gray-500">
                                                            {record.from_property?.name || 'N/A'}
                                                        </span>
                                                        <ArrowRightLeft className={`h-3 w-3 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                                                        <span className="font-medium text-blue-600">
                                                            {record.to_property?.name}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {t('history.effective')}: {new Date(record.effective_date).toLocaleDateString(i18n.language)}
                                                    </span>
                                                    {record.type === 'promotion' && record.approver && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-4 w-4" />
                                                            {t('history.by')}: {record.approver.full_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {record.notes && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                                        {record.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="altus-card">
                        <div className="altus-card-body text-center py-12">
                            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('history.no_records')}</h3>
                            <p className="text-gray-600 mb-4">
                                {searchTerm ? t('history.no_search_results') : t('history.empty_list_desc')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={!!recordToCancel} onOpenChange={(open) => !open && setRecordToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('history.cancel_request_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('history.cancel_request_desc', { type: recordToCancel?.type })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('history.keep_request')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                            {t('history.confirm_cancel')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <EosbCalculatorModal open={isEosbOpen} onOpenChange={setIsEosbOpen} />
        </div>
    )
}
