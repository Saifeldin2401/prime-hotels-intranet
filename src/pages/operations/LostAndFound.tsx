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
import { useCreateLostFoundItem, useLostFoundItems, useUpdateLostFoundStatus } from '@/hooks/useLostAndFound'
import type { LostFoundItem } from '@/lib/types/operations'
import { PackageSearch, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'

const statusColors: Record<string, string> = {
    unclaimed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    claimed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    disposed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export default function LostAndFound() {
    const { t } = useTranslation(['operations', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: items, isLoading } = useLostFoundItems(propertyId)
    const createMutation = useCreateLostFoundItem()
    const updateStatus = useUpdateLostFoundStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ item_description: '', found_location: '', stored_location: '' })

    const resetForm = () => setFormData({ item_description: '', found_location: '', stored_location: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                item_description: formData.item_description,
                found_location: formData.found_location || undefined,
                stored_location: formData.stored_location || undefined,
                created_by: user.id
            })
            toast({ title: t('operations:lost_found.success.created', { defaultValue: 'Item logged' }) })
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

    const handleMarkClaimed = (item: LostFoundItem) => {
        const guestName = window.prompt(t('operations:lost_found.claimed_by_prompt', { defaultValue: 'Claimed by (guest name, optional):' })) || undefined
        updateStatus.mutate({ id: item.id, status: 'claimed', claimed_by_guest_name: guestName })
    }

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={PackageSearch}
                    title={t('operations:lost_found.no_property', { defaultValue: 'No property assigned' })}
                    description={t('operations:lost_found.no_property_desc', { defaultValue: 'You need an assigned property to log lost & found items.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('operations:lost_found.title', { defaultValue: 'Lost & Found' })}
                description={t('operations:lost_found.description', { defaultValue: 'Track items found on property and their claim status.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('operations:lost_found.log_item', { defaultValue: 'Log Item' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : items && items.length > 0 ? (
                        <div className="space-y-2">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <PackageSearch className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{item.item_description}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {item.found_location && <span>{t('operations:lost_found.found_at', { defaultValue: 'Found at' })}: {item.found_location}</span>}
                                                <span>{item.found_date}</span>
                                                {item.claimed_by_guest_name && <span>· {t('operations:lost_found.claimed_by', { defaultValue: 'Claimed by' })} {item.claimed_by_guest_name}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={statusColors[item.status]}>{item.status}</Badge>
                                        {item.status === 'unclaimed' && (
                                            <Button size="sm" variant="outline" onClick={() => handleMarkClaimed(item)} disabled={updateStatus.isPending}>
                                                {t('operations:lost_found.mark_claimed', { defaultValue: 'Mark Claimed' })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={PackageSearch}
                            title={t('operations:lost_found.no_data', { defaultValue: 'No items logged' })}
                            description={t('operations:lost_found.no_data_desc', { defaultValue: 'Found items will appear here.' })}
                            action={{
                                label: t('operations:lost_found.log_item', { defaultValue: 'Log Item' }),
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
                        <DialogTitle>{t('operations:lost_found.log_item', { defaultValue: 'Log Item' })}</DialogTitle>
                        <DialogDescription>
                            {t('operations:lost_found.add_new_desc', { defaultValue: 'Record a found item.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="item_description">{t('operations:lost_found.item_label', { defaultValue: 'Item Description' })}</Label>
                            <Input id="item_description" value={formData.item_description} onChange={(e) => setFormData({ ...formData, item_description: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="found_location">{t('operations:lost_found.found_location_label', { defaultValue: 'Found Location' })}</Label>
                                <Input id="found_location" value={formData.found_location} onChange={(e) => setFormData({ ...formData, found_location: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stored_location">{t('operations:lost_found.stored_location_label', { defaultValue: 'Stored At' })}</Label>
                                <Input id="stored_location" value={formData.stored_location} onChange={(e) => setFormData({ ...formData, stored_location: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.item_description}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
