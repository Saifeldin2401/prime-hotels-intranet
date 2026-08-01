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
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreatePurchaseOrder, usePurchaseOrders, useReceivePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useSuppliers } from '@/hooks/useSuppliers'
import type { PurchaseOrder } from '@/lib/types/procurement'
import { Package, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    partially_received: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    received: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
}

export default function PurchaseOrders() {
    const { t } = useTranslation(['procurement', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: orders, isLoading } = usePurchaseOrders(propertyId)
    const { data: suppliers } = useSuppliers()
    const createMutation = useCreatePurchaseOrder()
    const receiveMutation = useReceivePurchaseOrder()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null)
    const [formData, setFormData] = useState({ supplier_id: '', po_number: '', total_amount: '' })
    const [receiveQty, setReceiveQty] = useState('')

    const supplierNameFor = (supplierId: string) => suppliers?.find((s) => s.id === supplierId)?.supplier_name || supplierId.slice(0, 8)

    const resetForm = () => setFormData({ supplier_id: '', po_number: '', total_amount: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId) || !formData.supplier_id) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                supplier_id: formData.supplier_id,
                po_number: formData.po_number,
                total_amount: Number(formData.total_amount),
                created_by: user.id
            })
            toast({ title: t('procurement:orders.success.created', { defaultValue: 'Purchase order created' }) })
            setIsDialogOpen(false)
            resetForm()
        } catch (error: any) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error?.message || String(error),
                variant: 'destructive'
            })
        }
    }

    const handleReceive = async (fullyReceived: boolean) => {
        if (!user || !receivingOrder || !receiveQty) return
        try {
            await receiveMutation.mutateAsync({
                purchaseOrderId: receivingOrder.id,
                quantityReceived: Number(receiveQty),
                receivedBy: user.id,
                fullyReceived
            })
            toast({ title: t('procurement:orders.success.received', { defaultValue: 'Goods received' }) })
            setReceivingOrder(null)
            setReceiveQty('')
        } catch (error: any) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error?.message || String(error),
                variant: 'destructive'
            })
        }
    }

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Package}
                    title={t('procurement:orders.no_property', { defaultValue: 'No property assigned' })}
                    description={t('procurement:orders.no_property_desc', { defaultValue: 'You need an assigned property to manage purchase orders.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('procurement:orders.title', { defaultValue: 'Purchase Orders' })}
                description={t('procurement:orders.description', { defaultValue: 'Track orders placed with suppliers and receive goods.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={!suppliers || suppliers.length === 0}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('procurement:orders.new_order', { defaultValue: 'New Order' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : orders && orders.length > 0 ? (
                        <div className="space-y-2">
                            {orders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{order.po_number}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span>{supplierNameFor(order.supplier_id)}</span>
                                                <span>· {order.total_amount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={statusColors[order.status]}>{order.status.replace('_', ' ')}</Badge>
                                        {(order.status === 'sent' || order.status === 'partially_received') && (
                                            <Button size="sm" variant="outline" onClick={() => setReceivingOrder(order)}>
                                                {t('procurement:orders.receive_goods', { defaultValue: 'Receive Goods' })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Package}
                            title={t('procurement:orders.no_data', { defaultValue: 'No purchase orders yet' })}
                            description={t('procurement:orders.no_data_desc', {
                                defaultValue: suppliers && suppliers.length === 0
                                    ? 'Add a supplier first before creating an order.'
                                    : 'Orders will appear here.'
                            })}
                        />
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('procurement:orders.new_order', { defaultValue: 'New Order' })}</DialogTitle>
                        <DialogDescription>
                            {t('procurement:orders.add_new_desc', { defaultValue: 'Create a purchase order for a supplier.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier_id">{t('procurement:orders.supplier_label', { defaultValue: 'Supplier' })}</Label>
                            <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                                <SelectTrigger id="supplier_id">
                                    <SelectValue placeholder={t('procurement:orders.supplier_placeholder', { defaultValue: 'Select supplier' })} />
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
                                <Label htmlFor="po_number">{t('procurement:orders.po_number_label', { defaultValue: 'PO Number' })}</Label>
                                <Input id="po_number" value={formData.po_number} onChange={(e) => setFormData({ ...formData, po_number: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="total_amount">{t('procurement:orders.total_label', { defaultValue: 'Total Amount' })}</Label>
                                <Input id="total_amount" type="number" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.supplier_id || !formData.po_number}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!receivingOrder} onOpenChange={(open) => { if (!open) { setReceivingOrder(null); setReceiveQty('') } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('procurement:orders.receive_goods', { defaultValue: 'Receive Goods' })}</DialogTitle>
                        <DialogDescription>{receivingOrder?.po_number}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="receive_qty">{t('procurement:orders.quantity_received_label', { defaultValue: 'Quantity Received' })}</Label>
                            <Input id="receive_qty" type="number" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleReceive(false)} disabled={receiveMutation.isPending || !receiveQty}>
                            {t('procurement:orders.partial_receive', { defaultValue: 'Partial Receive' })}
                        </Button>
                        <Button type="button" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" onClick={() => handleReceive(true)} disabled={receiveMutation.isPending || !receiveQty}>
                            {t('procurement:orders.full_receive', { defaultValue: 'Full Receive' })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
