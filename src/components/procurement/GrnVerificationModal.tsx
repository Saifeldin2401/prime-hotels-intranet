import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useGoodsReceivedNotes } from '@/hooks/useGoodsReceivedNotes'
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    propertyId?: string
}

export function GrnVerificationModal({ open, onOpenChange, propertyId }: Props) {
    const { t } = useTranslation('procurement')
    const { data: grns, isLoading } = useGoodsReceivedNotes(open ? propertyId : undefined)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <PackageCheck className="h-6 w-6 text-blue-600" />
                        {t('grn.title', { defaultValue: 'Goods Received Notes (GRN) & 3-Way Matching' })}
                    </DialogTitle>
                    <DialogDescription>
                        {t('grn.description', { defaultValue: 'Verification of Purchase Orders, Receiving Inspections, and Supplier Invoices' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin me-2" />
                            {t('grn.loading', { defaultValue: 'Loading GRNs...' })}
                        </div>
                    ) : !grns || grns.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-10">
                            {t('grn.empty', { defaultValue: 'No goods received notes for this property yet.' })}
                        </p>
                    ) : (
                        grns.map(grn => (
                            <div key={grn.id} className="rounded-xl border p-5 bg-card space-y-4 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div>
                                        <h4 className="font-bold text-base flex items-center gap-2">
                                            {grn.grn_number}
                                            {grn.purchase_order?.po_number && (
                                                <span className="text-xs font-normal text-muted-foreground">(Ref: {grn.purchase_order.po_number})</span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {t('grn.supplier', { defaultValue: 'Supplier' })}: {grn.supplier?.supplier_name ?? '-'}
                                        </p>
                                    </div>
                                    <Badge className={grn.matching_status === 'matched' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}>
                                        {grn.matching_status === 'matched'
                                            ? t('grn.matched', { defaultValue: '3-WAY MATCHED' })
                                            : t('grn.variance_flagged', { defaultValue: 'VARIANCE FLAGGED' })}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                    <div className="p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 justify-center">
                                        <Receipt className="h-4 w-4 text-purple-600" />
                                        <div>
                                            <span className="block font-medium">{t('grn.po_value', { defaultValue: 'PO Value' })}</span>
                                            <span className="font-bold text-sm">
                                                {grn.purchase_order?.total_amount != null
                                                    ? `SAR ${grn.purchase_order.total_amount.toLocaleString()}`
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 justify-center">
                                        {grn.inspection_status === 'passed' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        )}
                                        <div>
                                            <span className="block font-medium">{t('grn.inspection', { defaultValue: 'Quality Inspection' })}</span>
                                            <span className="font-bold text-xs uppercase">{grn.inspection_status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 justify-center">
                                        <div>
                                            <span className="block font-medium">{t('grn.received_date', { defaultValue: 'Received' })}</span>
                                            <span className="font-bold text-xs">{grn.received_date}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
