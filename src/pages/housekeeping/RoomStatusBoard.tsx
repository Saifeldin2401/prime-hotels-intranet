import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useCreateRoom, useRooms, useUpdateRoomStatus } from '@/hooks/useRooms'
import type { Room } from '@/lib/types/housekeeping'
import { cn } from '@/lib/utils'
import { BedDouble, Plus, CheckCircle2, AlertCircle, ShieldCheck, Sparkles, Search, Filter, ClipboardCheck, Wrench, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'
import { motion } from 'framer-motion'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STATUS_CONFIG: Record<Room['status'], { label: string; bg: string; border: string; text: string; badge: string }> = {
    clean: { label: 'Clean', bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800' },
    dirty: { label: 'Dirty', bg: 'bg-rose-50/70', border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-800' },
    inspected: { label: 'Inspected', bg: 'bg-blue-50/70', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
    occupied: { label: 'Occupied', bg: 'bg-purple-50/70', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' },
    vacant: { label: 'Vacant', bg: 'bg-slate-50/70', border: 'border-slate-200', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-800' },
    out_of_order: { label: 'Out of Order', bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' }
}

const STATUS_COLUMNS: Room['status'][] = ['dirty', 'clean', 'inspected', 'occupied', 'vacant', 'out_of_order']

const INSPECTION_ITEMS = [
    { id: 'linens', fallback: 'Linens & bedding freshly changed and crisp' },
    { id: 'bathroom', fallback: 'Bathroom fully sanitized, polished, and re-stocked' },
    { id: 'minibar', fallback: 'Minibar inventory verified and sealed' },
    { id: 'ac', fallback: 'AC thermostat set to welcome temperature' },
    { id: 'amenities', fallback: 'VIP guest welcome amenities & card placed' }
]

export default function RoomStatusBoard() {
    const { t } = useTranslation(['housekeeping', 'common'])
    const { toast } = useToast()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: rooms, isLoading } = useRooms(propertyId)
    const createMutation = useCreateRoom()
    const updateStatus = useUpdateRoomStatus()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFloor, setSelectedFloor] = useState<string>('all')
    const [activeTab, setActiveTab] = useState<Room['status'] | 'all'>('all')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ room_number: '', floor: '', room_type: '' })

    // Inspection Modal State
    const [inspectingRoom, setInspectingRoom] = useState<Room | null>(null)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

    const availableFloors = useMemo(() => {
        if (!rooms) return []
        const floors = Array.from(new Set(rooms.map(r => r.floor).filter(Boolean))) as string[]
        return floors.sort()
    }, [rooms])

    const filteredRooms = useMemo(() => {
        if (!rooms) return []
        return rooms.filter(r => {
            const matchesSearch = !searchQuery.trim() || r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) || (r.room_type && r.room_type.toLowerCase().includes(searchQuery.toLowerCase()))
            const matchesFloor = selectedFloor === 'all' || r.floor === selectedFloor
            return matchesSearch && matchesFloor
        })
    }, [rooms, searchQuery, selectedFloor])

    const roomsByStatus = useMemo(() => {
        const grouped: Record<string, Room[]> = {}
        for (const st of STATUS_COLUMNS) grouped[st] = []
        for (const room of filteredRooms) {
            grouped[room.status] = grouped[room.status] || []
            grouped[room.status].push(room)
        }
        return grouped
    }, [filteredRooms])

    const metrics = useMemo(() => {
        const all = rooms || []
        const cleanCount = all.filter(r => r.status === 'clean' || r.status === 'inspected').length
        const dirtyCount = all.filter(r => r.status === 'dirty').length
        const oooCount = all.filter(r => r.status === 'out_of_order').length
        const occupiedCount = all.filter(r => r.status === 'occupied').length

        const cleanRate = all.length > 0 ? Math.round((cleanCount / all.length) * 100) : 0

        return {
            cleanRate,
            cleanCount,
            dirtyCount,
            oooCount,
            occupiedCount,
            totalCount: all.length
        }
    }, [rooms])

    const resetForm = () => setFormData({ room_number: '', floor: '', room_type: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isRealPropertyId(propertyId)) return
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
        } catch (error: any) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error?.message || String(error),
                variant: 'destructive'
            })
        }
    }

    const handleSetStatus = (room: Room, nextStatus: Room['status']) => {
        updateStatus.mutate({ id: room.id, status: nextStatus })
    }

    const openInspectionDialog = (room: Room) => {
        setInspectingRoom(room)
        setCheckedItems({
            linens: true,
            bathroom: true,
            minibar: true,
            ac: true,
            amenities: true
        })
    }

    const handleCompleteInspection = () => {
        if (!inspectingRoom) return
        const passedCount = Object.values(checkedItems).filter(Boolean).length
        if (passedCount < INSPECTION_ITEMS.length) {
            toast({
                title: 'Inspection Incomplete',
                description: 'All inspection checklist points must be verified to certify room.',
                variant: 'destructive'
            })
            return
        }

        updateStatus.mutate({ id: inspectingRoom.id, status: 'inspected' })
        toast({
            title: `Room ${inspectingRoom.room_number} Certified`,
            description: 'Room passed supervisor inspection and is ready for guest arrival.'
        })
        setInspectingRoom(null)
    }

    if (!isRealPropertyId(propertyId)) {
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
                description={t('housekeeping:rooms.description', { defaultValue: 'Live housekeeping and occupancy matrix across your property.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm">
                        <Plus className="w-4 h-4 me-2" />
                        {t('housekeeping:rooms.add_room', { defaultValue: 'Add Room' })}
                    </Button>
                }
            />

            {/* KPI Summary Header */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clean / Inspected</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            {metrics.cleanCount} <span className="text-sm font-normal text-emerald-600">({metrics.cleanRate}%)</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500">
                    <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dirty (Needs Cleaning)</p>
                        <p className="text-2xl font-bold text-rose-600 mt-0.5">
                            {metrics.dirtyCount}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-purple-500">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <BedDouble className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Occupied Rooms</p>
                        <p className="text-2xl font-bold text-purple-600 mt-0.5">
                            {metrics.occupiedCount} <span className="text-sm font-normal text-gray-400">/ {metrics.totalCount}</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Out of Order</p>
                        <p className="text-2xl font-bold text-amber-600 mt-0.5">
                            {metrics.oooCount}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by room number or type..."
                        className="ps-9 bg-white"
                    />
                </div>

                {availableFloors.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                            <SelectTrigger className="w-[160px] bg-white">
                                <SelectValue placeholder="All Floors" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Floors</SelectItem>
                                {availableFloors.map(floor => (
                                    <SelectItem key={floor} value={floor}>Floor {floor}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex overflow-x-auto pb-2 gap-2 snap-x hide-scrollbar">
                <Button 
                    variant={activeTab === 'all' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('all')}
                    size="sm"
                    className="snap-start shrink-0"
                >
                    {t('housekeeping:columns.all', { defaultValue: 'All Rooms' })}
                </Button>
                {STATUS_COLUMNS.map(st => (
                    <Button
                        key={st}
                        variant={activeTab === st ? 'default' : 'outline'}
                        onClick={() => setActiveTab(st)}
                        size="sm"
                        className="snap-start shrink-0 capitalize"
                    >
                        {t(`housekeeping:rooms.status_${st}`, { defaultValue: STATUS_CONFIG[st].label })}
                    </Button>
                ))}
            </div>

            {/* Status Board Columns */}
            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading room status…' })}</div>
            ) : rooms && rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
                    {STATUS_COLUMNS.map((statusKey) => {
                        const config = STATUS_CONFIG[statusKey]
                        const columnRooms = roomsByStatus[statusKey] || []
                        const isHiddenOnMobile = activeTab !== 'all' && activeTab !== statusKey

                        return (
                            <div key={statusKey} className={cn('rounded-xl border p-3.5 space-y-3 min-h-[350px] flex-col', config.bg, config.border, isHiddenOnMobile ? 'hidden md:flex' : 'flex')}>
                                {/* Header */}
                                <div className="pb-2 border-b border-gray-200/60 flex items-center justify-between">
                                    <h4 className={cn('font-semibold text-sm capitalize flex items-center gap-1.5', config.text)}>
                                        {t(`housekeeping:rooms.status_${statusKey}`, { defaultValue: config.label })}
                                        <Badge variant="secondary" className={cn('text-xs px-1.5 py-0.5 font-medium', config.badge)}>
                                            {columnRooms.length}
                                        </Badge>
                                    </h4>
                                </div>

                                {/* Room Cards */}
                                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pe-0.5">
                                    {columnRooms.map((room) => (
                                        <motion.div
                                            key={room.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-white rounded-lg border border-gray-200/80 p-3 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-bold text-base text-gray-900">Room {room.room_number}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                    {room.floor && <span>Floor {room.floor}</span>}
                                                    {room.room_type && <span>· {room.room_type}</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {room.status === 'clean' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openInspectionDialog(room)}
                                                        title="Supervisor Audit & Inspection"
                                                        className="h-8 px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <ClipboardCheck className="w-3.5 h-3.5 me-1" />
                                                        Inspect
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium text-gray-500 hover:text-gray-900">
                                                            Status
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {STATUS_COLUMNS.map((st) => (
                                                            <DropdownMenuItem 
                                                                key={st} 
                                                                onClick={() => handleSetStatus(room, st)}
                                                                disabled={room.status === st || updateStatus.isPending}
                                                                className="capitalize text-xs"
                                                            >
                                                                Mark {STATUS_CONFIG[st].label}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {columnRooms.length === 0 && (
                                        <div className="h-20 rounded-lg border border-dashed border-gray-200/80 flex items-center justify-center text-xs text-gray-400 font-medium">
                                            No rooms
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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

            {/* Supervisor Room Inspection Audit Checklist Modal */}
            <Dialog open={Boolean(inspectingRoom)} onOpenChange={(open) => { if (!open) setInspectingRoom(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-700">
                            <ClipboardCheck className="w-5 h-5 text-blue-600" />
                            {t('housekeeping:audit.title', { defaultValue: 'Supervisor Quality Audit' })} - Room {inspectingRoom?.room_number}
                        </DialogTitle>
                        <DialogDescription>
                            {t('housekeeping:audit.subtitle', { defaultValue: 'Verify all room standards before certifying for guest check-in.' })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {INSPECTION_ITEMS.map((item) => (
                            <div key={item.id} className="flex items-start space-x-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                <Checkbox
                                    id={item.id}
                                    checked={Boolean(checkedItems[item.id])}
                                    onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [item.id]: Boolean(checked) }))}
                                    className="mt-0.5"
                                />
                                <Label htmlFor={item.id} className="text-xs font-medium text-gray-800 leading-snug cursor-pointer">
                                    {t(`housekeeping:audit.items.${item.id}`, { defaultValue: item.fallback })}
                                </Label>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setInspectingRoom(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCompleteInspection}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <ShieldCheck className="w-4 h-4 me-1.5" />
                            Certify & Mark Inspected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Room Dialog */}
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
                            <Input id="room_number" value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} placeholder="e.g. 101, 304, 502" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="floor">{t('housekeeping:rooms.floor_label', { defaultValue: 'Floor' })}</Label>
                                <Input id="floor" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="e.g. 1, 3" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room_type">{t('housekeeping:rooms.type_label', { defaultValue: 'Room Type' })}</Label>
                                <Input id="room_type" value={formData.room_type} onChange={(e) => setFormData({ ...formData, room_type: e.target.value })} placeholder={t('housekeeping:rooms.type_placeholder', { defaultValue: 'e.g. Deluxe King, Executive Suite' })} />
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
