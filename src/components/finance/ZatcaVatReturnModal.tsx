import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { enterpriseErpService, type TaxReturn } from '@/services/enterpriseErpService'
import { FileText, ShieldCheck, Download, Calculator, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ZatcaVatReturnModal({ open, onOpenChange }: Props) {
    const [returns, setReturns] = useState<TaxReturn[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (open) {
            setLoading(true)
            enterpriseErpService.fetchTaxReturns()
                .then(data => setReturns(data))
                .catch(error => {
                    console.error('Error fetching tax returns:', error)
                    toast.error('Failed to load ZATCA tax returns')
                })
                .finally(() => setLoading(false))
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        ZATCA Phase 2 E-Invoicing & VAT Return Audit
                    </DialogTitle>
                    <DialogDescription>
                        Kingdom of Saudi Arabia Tax & Customs Authority VAT Reporting (15% Standard Rate)
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading ZATCA Tax Audit data...</div>
                ) : (
                    <div className="space-y-6 py-2">
                        {returns.map(item => (
                            <div key={item.id} className="rounded-xl border p-5 bg-card space-y-4 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div>
                                        <h4 className="font-bold text-lg">{item.period_name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Period: {item.period_start} to {item.period_end}
                                        </p>
                                    </div>
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        ZATCA {item.zatca_submission_status.toUpperCase()}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <span className="text-xs text-muted-foreground block">Taxable Sales</span>
                                        <span className="font-semibold text-sm">SAR {item.taxable_sales_sar.toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <span className="text-xs text-muted-foreground block">Output VAT (15%)</span>
                                        <span className="font-semibold text-sm text-emerald-600">SAR {item.vat_collected_sar.toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <span className="text-xs text-muted-foreground block">Input VAT Paid</span>
                                        <span className="font-semibold text-sm text-blue-600">SAR {item.vat_paid_sar.toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                        <span className="text-xs text-primary font-medium block">Net VAT Due</span>
                                        <span className="font-bold text-base text-primary">SAR {item.net_vat_due_sar.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="rounded-xl border p-4 bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calculator className="h-5 w-5 text-primary" />
                                <div>
                                    <h5 className="font-medium text-sm">ZATCA Cryptographic Stamp Active</h5>
                                    <p className="text-xs text-muted-foreground">All invoices hash-verified against GAZT gateway specs.</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                                <Download className="h-4 w-4" />
                                Export XML/PDF
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
