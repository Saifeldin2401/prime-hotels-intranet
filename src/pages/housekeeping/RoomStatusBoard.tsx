import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
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
import { useCreateRoom, useRooms, useUpdateRoomStatus } from '@/hooks/useRooms'
import type { Room } from '@/lib/types/housekeeping'
import { cn } from '@/lib/utils'
import { BedDouble, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STATUS_COLUMNS: { status: Room['status']; color: string }[] = [
    { status: 'clean', color: 'bg-green-50 border-green-200' },
    { status: 'dirty', color: 'bg-red-50 border-red-200' },
    { status: 'inspected', color: 'bg-blue-50 border-blue-200' },
    { status: 'occupied', color: 'bg-purple-50 border-purple-200' },
    { status: 'vacant', color: 'bg-gray-50 border-gray-200' },
    { status: 'out_of_order', color: 'bg-orange-50 border-orange-200' }
]

export default function RoomStatusBoard() {
    const { t } = useTranslation(['housekeeping', 'common'])
    const { toast } = useToast()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: rooms, isLoading } = useRooms(propertyId)
    const createMutation = useCreateRoom()
    const updateStatus = useUpdateRoomStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ room_number: '', floor: '', room_type: '' })

    const roomsByStatus = useMemo(() => {
        const grouped: Record<string, Room[]> = {}
        for (const col of STATUS_COLUMNS) grouped[col.status] = []
        for (const room of rooms || []) {
            grouped[room.status] = grouped[room.status] || []
            grouped[room.status].push(room)
        }
        return grouped
    }, [rooms])

    const resetForm = () => setFormData({ room_number: '', floor: '', room_type: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!propertyId) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                room_number: formData.room_number,
                floor: formData.floor || undefined,
                room_type: formData.room_type || undefined
            })
            toast({ title: t('housekeeping:rooms.success.created', { defaultValue: 'Room added' }) })
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

    const handleCycleStatus = (room: Room) => {
        const cycle: Room['status'][] = ['dirty', 'clean', 'inspected']
        const idx = cycle.indexOf(room.status)
        const nextStatus = idx === -1 ? 'dirty' : cycle[(idx + 1) % cycle.length]
        updateStatus.mutate({ id: room.id, status: nextStatus })
    }

    if (!propertyId) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={BedDouble}
                    title={t('housekeeping:rooms.no_property', { defaultValue: 'No property assigned' })}
                    description={t('housekeeping:rooms.no_property_desc', { defaultValue: 'You need an assigned property to view the room board.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('housekeeping:rooms.title', { defaultValue: 'Room Status Board' })}
                description={t('housekeeping:rooms.description', { defaultValue: 'Live room status across your property. Click a room to cycle dirty → clean → inspected.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('housekeeping:rooms.add_room', { defaultValue: 'Add Room' })}
                    </Button>
                }
            />

            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
            ) : rooms && rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {STATUS_COLUMNS.map((col) => (
                        <div key={col.status} className={cn('rounded-lg border p-3 space-y-2 min-h-[120px]', col.color)}>
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm capitalize">
                                    {t(`housekeeping:rooms.status_${col.status}`, { defaultValue: col.status.replace('_', ' ') })}
                                </h4>
                                <span className="text-xs text-muted-foreground">{roomsByStatus[col.status]?.length || 0}</span>
                            </div>
                            <div className="space-y-1.5">
                                {(roomsByStatus[col.status] || []).map((room) => (
                                    <button
                                        key={room.id}
                                        onClick={() => handleCycleStatus(room)}
                                        disabled={updateStatus.isPending}
                                        className="w-full text-left bg-white rounded border px-2 py-1.5 text-sm hover:shadow-sm transition-shadow"
                                    >
                                        <span className="font-medium">{room.room_number}</span>
                                        {room.room_type && <span className="text-muted-foreground text-xs ms-1">· {room.room_type}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={BedDouble}
                    title={t('housekeeping:rooms.no_data', { defaultValue: 'No rooms set up yet' })}
                    description={t('housekeeping:rooms.no_data_desc', { defaultValue: 'Add rooms to start tracking status.' })}
                    action={{
                        label: t('housekeeping:rooms.add_room', { defaultValue: 'Add Room' }),
                        onClick: () => { resetForm(); setIsDialogOpen(true) },
                        icon: Plus
                    }}
                />
            )}

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('housekeeping:rooms.add_room', { defaultValue: 'Add Room' })}</DialogTitle>
                        <DialogDescription>
                            {t('housekeeping:rooms.add_new_desc', { defaultValue: 'Register a new room for status tracking.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="room_number">{t('housekeeping:rooms.number_label', { defaultValue: 'Room Number' })}</Label>
                            <Input id="room_number" value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="floor">{t('housekeeping:rooms.floor_label', { defaultValue: 'Floor' })}</Label>
                                <Input id="floor" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room_type">{t('housekeeping:rooms.type_label', { defaultValue: 'Room Type' })}</Label>
                                <Input id="room_type" value={formData.room_type} onChange={(e) => setFormData({ ...formData, room_type: e.target.value })} placeholder={t('housekeeping:rooms.type_placeholder', { defaultValue: 'e.g. Deluxe King' })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.room_number}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
