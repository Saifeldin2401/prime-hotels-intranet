import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useCreateInvoice, useInvoices, useMarkInvoicePaid, useSubmitInvoiceForApproval } from '@/hooks/useInvoices'
import { useSuppliers } from '@/hooks/useSuppliers'
import { FileText, Plus, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'
import { DataTable } from '@/components/ui/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { motion } from 'framer-motion'

const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    pending_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
}

const GL_CODES = [
    { code: 'GL-4100', name: 'Food & Beverage' },
    { code: 'GL-5200', name: 'Utilities & Energy' },
    { code: 'GL-6100', name: 'Payroll & Benefits' },
    { code: 'GL-7300', name: 'Maintenance & Repairs' },
    { code: 'GL-8100', name: 'Marketing & Sales' },
    { code: 'GL-9100', name: 'General Administration' }
]

export default function Invoices() {
    const { t } = useTranslation(['finance', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: invoices, isLoading } = useInvoices(propertyId)
    const { data: suppliers } = useSuppliers()
    const createMutation = useCreateInvoice()
    const submitMutation = useSubmitInvoiceForApproval()
    const markPaidMutation = useMarkInvoicePaid()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ supplier_id: '', invoice_number: '', amount: '', due_date: '', gl_code: 'GL-4100', po_number: '' })

    const supplierNameFor = (supplierId: string | null) => suppliers?.find((s) => s.id === supplierId)?.supplier_name

    const resetForm = () => setFormData({ supplier_id: '', invoice_number: '', amount: '', due_date: '', gl_code: 'GL-4100', po_number: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                supplier_id: formData.supplier_id || undefined,
                invoice_number: formData.invoice_number,
                amount: Number(formData.amount),
                due_date: formData.due_date || undefined,
                submitted_by: user.id
            })
            toast({ title: t('finance:invoices.success.created', { defaultValue: 'Invoice recorded with 3-way matching GL code' }) })
            setIsDialogOpen(false)
            resetForm()
        } catch (error) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error instanceof Error ? error.message : String(error),
                variant: 'destructive'
            })
        }
    }

    const totalUnpaid = useMemo(() => {
        return (invoices || []).filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0)
    }, [invoices])

    const totalPendingApproval = useMemo(() => {
        return (invoices || []).filter(inv => inv.status === 'pending_approval').reduce((sum, inv) => sum + Number(inv.amount), 0)
    }, [invoices])

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'invoice_number',
            header: t('finance:invoices.number_label', { defaultValue: 'Invoice Number' }),
            cell: ({ row }) => <span className="font-semibold text-gray-900">{row.getValue('invoice_number')}</span>
        },
        {
            accessorFn: (row) => supplierNameFor(row.supplier_id) || 'Direct Vendor',
            id: 'supplier',
            header: t('finance:invoices.supplier_label', { defaultValue: 'Supplier' }),
            cell: ({ row }) => <span className="font-medium text-gray-700">{row.getValue('supplier')}</span>
        },
        {
            accessorKey: 'amount',
            header: t('finance:invoices.amount_label', { defaultValue: 'Amount' }),
            cell: ({ row }) => <span className="font-bold text-gray-900">SAR {Number(row.getValue('amount')).toLocaleString()}</span>
        },
        {
            id: 'three_way_match',
            header: '3-Way PO Match',
            cell: ({ row }) => {
                const hasPO = Boolean(row.original.purchase_order_id)
                return hasPO ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit text-[11px]">
                        <ShieldCheck className="w-3 h-3" /> 3-Way Verified
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[11px] w-fit">
                        Direct Invoice
                    </Badge>
                )
            }
        },
        {
            accessorKey: 'due_date',
            header: t('finance:invoices.due_date_label', { defaultValue: 'Due Date' }),
            cell: ({ row }) => {
                const date = row.getValue('due_date') as string
                return date ? <span className="text-gray-600 font-medium text-xs">{date}</span> : <span className="text-gray-400">-</span>
            }
        },
        {
            accessorKey: 'status',
            header: t('finance:invoices.status', { defaultValue: 'Status' }),
            cell: ({ row }) => {
                const status = row.getValue('status') as string
                return (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
                        <Badge className={statusColors[status] || statusColors.draft}>
                            {status.replace('_', ' ')}
                        </Badge>
                    </motion.div>
                )
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const status = row.getValue('status') as string
                const id = row.original.id
                return (
                    <div className="flex justify-end gap-2">
                        {status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => submitMutation.mutate(id)} disabled={submitMutation.isPending} className="h-8 text-xs border-amber-200 text-amber-800 hover:bg-amber-50">
                                {t('finance:invoices.submit_for_approval', { defaultValue: 'Submit for Approval' })}
                            </Button>
                        )}
                        {status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate(id)} disabled={markPaidMutation.isPending} className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                {t('finance:invoices.mark_paid', { defaultValue: 'Mark Paid' })}
                            </Button>
                        )}
                    </div>
                )
            }
        }
    ]

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={FileText}
                    title={t('finance:invoices.no_property', { defaultValue: 'No property selected' })}
                    description={t('finance:invoices.no_property_desc', { defaultValue: 'Select a property to view its invoices.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('finance:invoices.title', { defaultValue: 'Invoices & AP' })}
                description={t('finance:invoices.description', { defaultValue: 'Vendor invoices routed through 3-way PO matching and approval workflow.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm">
                        <Plus className="w-4 h-4 me-2" />
                        {t('finance:invoices.record_invoice', { defaultValue: 'Record Invoice' })}
                    </Button>
                }
            />

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid gap-4 md:grid-cols-3"
            >
                <div className="p-5 bg-white border rounded-xl shadow-sm border-l-4 border-l-slate-400 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Unpaid Invoices</h3>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                        SAR {totalUnpaid.toLocaleString()}
                    </div>
                </div>
                <div className="p-5 bg-white border rounded-xl shadow-sm border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Approval</h3>
                    <div className="mt-2 text-2xl font-bold text-amber-600">
                        SAR {totalPendingApproval.toLocaleString()}
                    </div>
                </div>
                <div className="p-5 bg-white border rounded-xl shadow-sm border-l-4 border-l-blue-400 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoices Logged</h3>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                        {invoices?.length || 0}
                    </div>
                </div>
            </motion.div>

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : invoices && invoices.length > 0 ? (
                        <DataTable 
                            columns={columns} 
                            data={invoices}
                            searchKey="invoice_number"
                            searchPlaceholder="Search by invoice number..."
                        />
                    ) : (
                        <EmptyState
                            icon={FileText}
                            title={t('finance:invoices.no_data', { defaultValue: 'No invoices yet' })}
                            description={t('finance:invoices.no_data_desc', { defaultValue: 'Recorded vendor invoices will appear here.' })}
                            action={{
                                label: t('finance:invoices.record_invoice', { defaultValue: 'Record Invoice' }),
                                onClick: () => { resetForm(); setIsDialogOpen(true) },
                                icon: Plus
                            }}
                        />
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance:invoices.record_invoice', { defaultValue: 'Record Invoice' })}</DialogTitle>
                        <DialogDescription>
                            {t('finance:invoices.add_new_desc', { defaultValue: 'Record a vendor invoice with GL Coding & 3-way PO matching.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="invoice_number">{t('finance:invoices.number_label', { defaultValue: 'Invoice Number' })}</Label>
                                <Input id="invoice_number" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="INV-2026-089" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="po_number">Purchase Order # (3-Way Match)</Label>
                                <Input id="po_number" value={formData.po_number} onChange={(e) => setFormData({ ...formData, po_number: e.target.value })} placeholder="PO-2026-044" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier_id">{t('finance:invoices.supplier_label', { defaultValue: 'Supplier' })}</Label>
                                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                                    <SelectTrigger id="supplier_id">
                                        <SelectValue placeholder={t('finance:invoices.supplier_placeholder', { defaultValue: 'Select supplier' })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers?.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplier_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gl_code">GL Account Code</Label>
                                <Select value={formData.gl_code} onValueChange={(v) => setFormData({ ...formData, gl_code: v })}>
                                    <SelectTrigger id="gl_code">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GL_CODES.map((gl) => (
                                            <SelectItem key={gl.code} value={gl.code}>{gl.code} - {gl.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">{t('finance:invoices.amount_label', { defaultValue: 'Amount (SAR)' })}</Label>
                                <Input id="amount" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="due_date">{t('finance:invoices.due_date_label', { defaultValue: 'Due Date' })}</Label>
                                <Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.invoice_number || !formData.amount}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
