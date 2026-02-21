import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { Calendar, Clock, MapPin, Type, AlignLeft, Globe, Trash2, Edit, Save, X } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useCreateEvent, useDeleteEvent } from '@/hooks/useEvents'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { DeleteConfirmationDialog } from '@/components/common/ConfirmationDialog'

interface EventDialogsProps {
    selectedEvent: any | null
    setSelectedEvent: (event: any | null) => void
    isAddModalOpen: boolean
    setIsAddModalOpen: (open: boolean) => void
    selectedDate: Date | null
}

export function EventDialogs({
    selectedEvent,
    setSelectedEvent,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedDate
}: EventDialogsProps) {
    const { t, i18n } = useTranslation(['dashboard', 'common'])
    const { toast } = useToast()
    const createEvent = useCreateEvent()
    const deleteEvent = useDeleteEvent()
    const isRTL = i18n.dir() === 'rtl'

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'general',
        location: '',
        start_time: '',
        end_time: '',
        is_public: true
    })

    // Reset form when opening add modal
    useEffect(() => {
        if (isAddModalOpen && selectedDate) {
            setFormData({
                title: '',
                description: '',
                type: 'general',
                location: '',
                start_time: format(selectedDate, "yyyy-MM-dd'T'09:00"),
                end_time: format(selectedDate, "yyyy-MM-dd'T'10:00"),
                is_public: true
            })
        }
    }, [isAddModalOpen, selectedDate])

    const handleCreate = async () => {
        try {
            if (!formData.title) {
                toast({
                    title: t('common.error'),
                    description: t('validation.required', { field: t('common.title') }),
                    variant: 'destructive'
                })
                return
            }

            await createEvent.mutateAsync({
                title: formData.title,
                description: formData.description,
                type: formData.type as any,
                location: formData.location,
                start_date: formData.start_time,
                all_day: false,
                is_public: formData.is_public
            })

            toast({
                title: t('common.success'),
                description: t('schedule.event_created', 'Event created successfully')
            })
            setIsAddModalOpen(false)
            setFormData({
                title: '',
                description: '',
                type: 'general',
                location: '',
                start_time: '',
                end_time: '',
                is_public: true
            })
        } catch (error) {
            console.error('Failed to create event:', error)
            toast({
                title: t('common.error'),
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async () => {
        if (!selectedEvent?.id) return
        try {
            await deleteEvent.mutateAsync(selectedEvent.id)
            toast({
                title: t('common.success'),
                description: t('schedule.event_deleted', 'Event deleted successfully')
            })
            setSelectedEvent(null)
            setIsDeleteDialogOpen(false)
        } catch (error) {
            console.error('Failed to delete event:', error)
            toast({
                title: t('common.error'),
                variant: 'destructive'
            })
        }
    }

    return (
        <>
            <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                itemName={selectedEvent?.title || ''}
                onConfirm={handleDelete}
                isLoading={deleteEvent.isPending}
            />
            {/* Event Details Dialog */}
            <Dialog open={!!selectedEvent && !selectedEvent.id.startsWith('holiday-ext')} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="sm:max-w-[500px] overflow-hidden border-0 shadow-2xl p-0 bg-white">
                    {selectedEvent && (
                        <>
                            <div className={cn(
                                "h-2 w-full",
                                selectedEvent.type === 'shift' ? "bg-emerald-500" :
                                    selectedEvent.type === 'holiday' ? "bg-rose-500" :
                                        "bg-hotel-gold"
                            )} />
                            <div className="p-6 space-y-6">
                                <DialogHeader>
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                                            {t(`schedule.calendar.${selectedEvent.type}`, selectedEvent.type)}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            {selectedEvent.id && !selectedEvent.id.toString().startsWith('shift') && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                    onClick={() => setIsDeleteDialogOpen(true)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <DialogTitle className="text-2xl font-bold text-hotel-navy leading-tight">
                                        {selectedEvent.title}
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-hotel-gold">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.date')}</p>
                                            <p className="text-sm font-semibold">{format(parseISO(selectedEvent.start_time), 'EEEE, MMMM d, yyyy')}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-slate-600">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-hotel-gold">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.time')}</p>
                                            <p className="text-sm font-semibold">
                                                {format(parseISO(selectedEvent.start_time), 'h:mm a')}
                                                {selectedEvent.end_time && ` - ${format(parseISO(selectedEvent.end_time), 'h:mm a')}`}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedEvent.location && (
                                        <div className="flex items-center gap-3 text-slate-600">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-hotel-gold">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.location')}</p>
                                                <p className="text-sm font-semibold">{selectedEvent.location}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedEvent.description && (
                                        <div className="pt-4 border-t border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('common.description')}</p>
                                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic">
                                                "{selectedEvent.description}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button variant="outline" className="w-full rounded-xl border-slate-200" onClick={() => setSelectedEvent(null)}>
                                        {t('common.close')}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add Event Dialog */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[500px] overflow-hidden border-0 shadow-2xl p-0 bg-white">
                    <div className="h-2 w-full bg-gradient-to-r from-hotel-navy to-hotel-gold" />
                    <div className="p-6 space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-hotel-navy">{t('schedule.add_event', 'Add New Event')}</DialogTitle>
                            <DialogDescription>
                                {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Type className="w-3 h-3" /> {t('common.title')}
                                </label>
                                <Input
                                    placeholder={t('schedule.event_title_placeholder', 'e.g., Team Briefing')}
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="rounded-xl border-slate-200 focus:ring-hotel-gold/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> {t('common.from')}
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> {t('common.to')}
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Badge className="w-3 h-3 p-0" variant="outline" /> {t('common.type')}
                                </label>
                                <Select value={formData.type} onValueChange={val => setFormData(prev => ({ ...prev, type: val }))}>
                                    <SelectTrigger className="rounded-xl border-slate-200">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">{t('schedule.calendar.general', 'General')}</SelectItem>
                                        <SelectItem value="meeting">{t('schedule.calendar.meeting', 'Meeting')}</SelectItem>
                                        <SelectItem value="training">{t('schedule.calendar.training', 'Training')}</SelectItem>
                                        <SelectItem value="deadline">{t('schedule.calendar.deadline', 'Deadline')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> {t('common.location')}
                                </label>
                                <Input
                                    placeholder={t('schedule.location_placeholder', 'e.g., Conference Room A')}
                                    value={formData.location}
                                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="rounded-xl border-slate-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <AlignLeft className="w-3 h-3" /> {t('common.description')}
                                </label>
                                <Textarea
                                    placeholder={t('schedule.desc_placeholder', 'Add more details...')}
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="rounded-xl border-slate-200 min-h-[80px]"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" className="rounded-xl" onClick={() => setIsAddModalOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                className="rounded-xl bg-hotel-navy text-white hover:bg-hotel-navy/90 px-8"
                                onClick={handleCreate}
                                disabled={createEvent.isPending}
                            >
                                {createEvent.isPending ? t('common.saving') : t('common.save')}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
