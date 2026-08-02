import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, FileCheck, PackageCheck, Receipt } from 'lucide-react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function GrnVerificationModal({ open, onOpenChange }: Props) {
    const [mockGrns] = useState([
        {
            id: '1',
            grn_number: 'GRN-2026-084',
            po_number: 'PO-8842',
            supplier_name: 'Al-Madinah Fresh Produce Co.',
            received_date: '2026-08-01',
            inspection_status: 'passed',
            matching_status: 'matched',
            total_items: 24,
            rejected_items: 0,
            invoice_amount_sar: 14500.00
        },
        {
            id: '2',
            grn_number: 'GRN-2026-082',
            po_number: 'PO-8839',
            supplier_name: 'Red Sea Linen Supplier Trading',
            received_date: '2026-07-30',
            inspection_status: 'partially_rejected',
            matching_status: 'variance_flagged',
            total_items: 100,
            rejected_items: 6,
            invoice_amount_sar: 32000.00
        }
    ])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <PackageCheck className="h-6 w-6 text-blue-600" />
                        Goods Received Notes (GRN) & 3-Way Matching Audit
                    </DialogTitle>
                    <DialogDescription>
                        Automated verification of Purchase Orders, Receiving Inspections, and Supplier Invoices
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {mockGrns.map(grn => (
                        <div key={grn.id} className="rounded-xl border p-5 bg-card space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h4 className="font-bold text-base flex items-center gap-2">
                                        {grn.grn_number}
                                        <span className="text-xs font-normal text-muted-foreground">(Ref: {grn.po_number})</span>
                                    </h4>
                                    <p className="text-xs text-muted-foreground">Supplier: {grn.supplier_name}</p>
                                </div>
                                <Badge className={grn.matching_status === 'matched' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}>
                                    {grn.matching_status === 'matched' ? '3-WAY MATCHED' : 'VARIANCE FLAGGED'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                <div className="p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 justify-center">
                                    <FileCheck className="h-4 w-4 text-blue-600" />
                                    <div>
                                        <span className="block font-medium">Items Accepted</span>
                                        <span className="font-bold text-sm text-emerald-600">{grn.total_items - grn.rejected_items} / {grn.total_items}</span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 justify-center">
                                    <Receipt className="h-4 w-4 text-purple-600" />
                                    <div>
                                        <span className="block font-medium">Invoice Value</span>
                                        <span className="font-bold text-sm">SAR {grn.invoice_amount_sar.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 justify-center">
                                    {grn.rejected_items > 0 ? (
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    )}
                                    <div>
                                        <span className="block font-medium">Quality Inspection</span>
                                        <span className="font-bold text-xs uppercase">{grn.inspection_status.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
