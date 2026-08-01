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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateVipGuest, useDeactivateVipGuest, useVipGuests } from '@/hooks/useVipGuests'
import { Crown, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'

export default function VipGuests() {
    const { t } = useTranslation(['operations', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: vips, isLoading } = useVipGuests(propertyId)
    const createMutation = useCreateVipGuest()
    const deactivateMutation = useDeactivateVipGuest()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        guest_name: '',
        room_number: '',
        vip_tier: '',
        notes: '',
        arrival_date: '',
        departure_date: ''
    })

    const resetForm = () => setFormData({ guest_name: '', room_number: '', vip_tier: '', notes: '', arrival_date: '', departure_date: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                guest_name: formData.guest_name,
                room_number: formData.room_number || undefined,
                vip_tier: formData.vip_tier || undefined,
                notes: formData.notes || undefined,
                arrival_date: formData.arrival_date || undefined,
                departure_date: formData.departure_date || undefined,
                flagged_by: user.id
            })
            toast({ title: t('operations:vip_guests.success.created', { defaultValue: 'VIP guest flagged' }) })
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

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Crown}
                    title={t('operations:vip_guests.no_property', { defaultValue: 'No property assigned' })}
                    description={t('operations:vip_guests.no_property_desc', { defaultValue: 'You need an assigned property to flag VIP guests.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('operations:vip_guests.title', { defaultValue: 'VIP Guests' })}
                description={t('operations:vip_guests.description', { defaultValue: 'Flag guests for special attention during their stay.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('operations:vip_guests.flag_guest', { defaultValue: 'Flag Guest' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : vips && vips.length > 0 ? (
                        <div className="space-y-2">
                            {vips.map((vip) => (
                                <div key={vip.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Crown className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {vip.guest_name}
                                                {vip.room_number && <span className="text-gray-500 font-normal"> · {t('operations:vip_guests.room', { defaultValue: 'Room' })} {vip.room_number}</span>}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {vip.notes && <span>{vip.notes}</span>}
                                                {vip.arrival_date && <span>{vip.arrival_date} → {vip.departure_date || '?'}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {vip.vip_tier && <Badge className="bg-amber-100 text-amber-800">{vip.vip_tier}</Badge>}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => deactivateMutation.mutate(vip.id)}
                                            disabled={deactivateMutation.isPending}
                                            aria-label={t('operations:vip_guests.remove_flag', { defaultValue: 'Remove flag' })}
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Crown}
                            title={t('operations:vip_guests.no_data', { defaultValue: 'No VIP guests flagged' })}
                            description={t('operations:vip_guests.no_data_desc', { defaultValue: 'Flagged guests will appear here for staff awareness.' })}
                            action={{
                                label: t('operations:vip_guests.flag_guest', { defaultValue: 'Flag Guest' }),
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
                        <DialogTitle>{t('operations:vip_guests.flag_guest', { defaultValue: 'Flag Guest' })}</DialogTitle>
                        <DialogDescription>
                            {t('operations:vip_guests.add_new_desc', { defaultValue: 'Flag a guest for special staff attention.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guest_name">{t('operations:vip_guests.guest_label', { defaultValue: 'Guest Name' })}</Label>
                                <Input id="guest_name" value={formData.guest_name} onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room_number">{t('operations:vip_guests.room_label', { defaultValue: 'Room Number' })}</Label>
                                <Input id="room_number" value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vip_tier">{t('operations:vip_guests.tier_label', { defaultValue: 'VIP Tier' })}</Label>
                            <Input id="vip_tier" value={formData.vip_tier} onChange={(e) => setFormData({ ...formData, vip_tier: e.target.value })} placeholder={t('operations:vip_guests.tier_placeholder', { defaultValue: 'e.g. Platinum, Repeat Guest' })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="arrival_date">{t('operations:vip_guests.arrival_label', { defaultValue: 'Arrival' })}</Label>
                                <Input id="arrival_date" type="date" value={formData.arrival_date} onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="departure_date">{t('operations:vip_guests.departure_label', { defaultValue: 'Departure' })}</Label>
                                <Input id="departure_date" type="date" value={formData.departure_date} onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('operations:vip_guests.notes_label', { defaultValue: 'Notes' })}</Label>
                            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.guest_name}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
