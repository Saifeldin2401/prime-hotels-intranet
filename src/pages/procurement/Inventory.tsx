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
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useAdjustInventoryQuantity, useCreateInventoryItem, useInventoryItems } from '@/hooks/useInventory'
import type { InventoryItem } from '@/lib/types/procurement'
import { Boxes, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'

export default function Inventory() {
    const { t } = useTranslation(['procurement', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: items, isLoading } = useInventoryItems(propertyId)
    const createMutation = useCreateInventoryItem()
    const adjustMutation = useAdjustInventoryQuantity()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ item_name: '', category: '', unit: '', quantity_on_hand: '0', reorder_threshold: '' })
    const [editingQty, setEditingQty] = useState<Record<string, string>>({})

    const resetForm = () => setFormData({ item_name: '', category: '', unit: '', quantity_on_hand: '0', reorder_threshold: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                item_name: formData.item_name,
                category: formData.category || undefined,
                unit: formData.unit || undefined,
                quantity_on_hand: Number(formData.quantity_on_hand) || 0,
                reorder_threshold: formData.reorder_threshold ? Number(formData.reorder_threshold) : undefined,
                last_updated_by: user.id
            })
            toast({ title: t('procurement:inventory.success.created', { defaultValue: 'Item added' }) })
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

    const handleAdjust = (item: InventoryItem) => {
        if (!user) return
        const newQty = editingQty[item.id]
        if (newQty === undefined || newQty === '') return
        adjustMutation.mutate({ id: item.id, quantity_on_hand: Number(newQty), last_updated_by: user.id }, {
            onSuccess: () => setEditingQty((prev) => ({ ...prev, [item.id]: '' }))
        })
    }

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Boxes}
                    title={t('procurement:inventory.no_property', { defaultValue: 'No property assigned' })}
                    description={t('procurement:inventory.no_property_desc', { defaultValue: 'You need an assigned property to manage inventory.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('procurement:inventory.title', { defaultValue: 'Inventory' })}
                description={t('procurement:inventory.description', { defaultValue: 'Basic stock levels per property.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('procurement:inventory.add_item', { defaultValue: 'Add Item' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : items && items.length > 0 ? (
                        <div className="space-y-2">
                            {items.map((item) => {
                                const isLow = item.reorder_threshold != null && item.quantity_on_hand <= item.reorder_threshold
                                return (
                                    <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <Boxes className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {item.item_name}
                                                    {isLow && <Badge className="ms-2 bg-red-100 text-red-800">{t('procurement:inventory.low_stock', { defaultValue: 'Low stock' })}</Badge>}
                                                </p>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    {item.category && <span>{item.category}</span>}
                                                    <span>{item.quantity_on_hand} {item.unit || ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                placeholder={t('procurement:inventory.new_qty_placeholder', { defaultValue: 'New qty' })}
                                                value={editingQty[item.id] ?? ''}
                                                onChange={(e) => setEditingQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                className="w-24 h-8"
                                            />
                                            <Button size="sm" variant="outline" onClick={() => handleAdjust(item)} disabled={adjustMutation.isPending || !editingQty[item.id]}>
                                                {t('procurement:inventory.update', { defaultValue: 'Update' })}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Boxes}
                            title={t('procurement:inventory.no_data', { defaultValue: 'No inventory items yet' })}
                            description={t('procurement:inventory.no_data_desc', { defaultValue: 'Add items to start tracking stock levels.' })}
                            action={{
                                label: t('procurement:inventory.add_item', { defaultValue: 'Add Item' }),
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
                        <DialogTitle>{t('procurement:inventory.add_item', { defaultValue: 'Add Item' })}</DialogTitle>
                        <DialogDescription>
                            {t('procurement:inventory.add_new_desc', { defaultValue: 'Register a new inventory item.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="item_name">{t('procurement:inventory.name_label', { defaultValue: 'Item Name' })}</Label>
                            <Input id="item_name" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">{t('procurement:inventory.category_label', { defaultValue: 'Category' })}</Label>
                                <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">{t('procurement:inventory.unit_label', { defaultValue: 'Unit' })}</Label>
                                <Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder={t('procurement:inventory.unit_placeholder', { defaultValue: 'e.g. each, box, case' })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quantity_on_hand">{t('procurement:inventory.qty_label', { defaultValue: 'Starting Quantity' })}</Label>
                                <Input id="quantity_on_hand" type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reorder_threshold">{t('procurement:inventory.reorder_label', { defaultValue: 'Reorder Threshold' })}</Label>
                                <Input id="reorder_threshold" type="number" value={formData.reorder_threshold} onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.item_name}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
