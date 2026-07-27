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
import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
}

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
    const [formData, setFormData] = useState({ supplier_id: '', invoice_number: '', amount: '', due_date: '' })

    const supplierNameFor = (supplierId: string | null) => suppliers?.find((s) => s.id === supplierId)?.supplier_name

    const resetForm = () => setFormData({ supplier_id: '', invoice_number: '', amount: '', due_date: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                supplier_id: formData.supplier_id || undefined,
                invoice_number: formData.invoice_number,
                amount: Number(formData.amount),
                due_date: formData.due_date || undefined,
                submitted_by: user.id
            })
            toast({ title: t('finance:invoices.success.created', { defaultValue: 'Invoice recorded' }) })
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

    if (!propertyId) {
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
                title={t('finance:invoices.title', { defaultValue: 'Invoices' })}
                description={t('finance:invoices.description', { defaultValue: 'Vendor invoices routed through the approval workflow. Approvals appear in your Approvals inbox.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('finance:invoices.record_invoice', { defaultValue: 'Record Invoice' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : invoices && invoices.length > 0 ? (
                        <div className="space-y-2">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {supplierNameFor(invoice.supplier_id) && <span>{supplierNameFor(invoice.supplier_id)}</span>}
                                                <span>{Number(invoice.amount).toLocaleString()}</span>
                                                {invoice.due_date && <span>{t('finance:invoices.due', { defaultValue: 'Due' })} {invoice.due_date}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={statusColors[invoice.status]}>{invoice.status.replace('_', ' ')}</Badge>
                                        {invoice.status === 'draft' && (
                                            <Button size="sm" variant="outline" onClick={() => submitMutation.mutate(invoice.id)} disabled={submitMutation.isPending}>
                                                {t('finance:invoices.submit_for_approval', { defaultValue: 'Submit for Approval' })}
                                            </Button>
                                        )}
                                        {invoice.status === 'approved' && (
                                            <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate(invoice.id)} disabled={markPaidMutation.isPending}>
                                                {t('finance:invoices.mark_paid', { defaultValue: 'Mark Paid' })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            {t('finance:invoices.add_new_desc', { defaultValue: 'Record a vendor invoice as a draft. Submit it for approval when ready.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="invoice_number">{t('finance:invoices.number_label', { defaultValue: 'Invoice Number' })}</Label>
                            <Input id="invoice_number" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier_id">{t('finance:invoices.supplier_label', { defaultValue: 'Supplier' })}</Label>
                            <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                                <SelectTrigger id="supplier_id">
                                    <SelectValue placeholder={t('finance:invoices.supplier_placeholder', { defaultValue: 'Select supplier (optional)' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers?.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.supplier_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">{t('finance:invoices.amount_label', { defaultValue: 'Amount' })}</Label>
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
