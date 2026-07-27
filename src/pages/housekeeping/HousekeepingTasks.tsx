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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateHousekeepingTask, useHousekeepingTasks, useUpdateHousekeepingTaskStatus } from '@/hooks/useHousekeepingTasks'
import { useRooms } from '@/hooks/useRooms'
import type { HousekeepingTask } from '@/lib/types/housekeeping'
import { ClipboardCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
}

const statusFlow: Record<HousekeepingTask['status'], HousekeepingTask['status'] | null> = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: 'verified',
    verified: null
}

export default function HousekeepingTasks() {
    const { t } = useTranslation(['housekeeping', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: tasks, isLoading } = useHousekeepingTasks(propertyId)
    const { data: rooms } = useRooms(propertyId)
    const createMutation = useCreateHousekeepingTask()
    const updateStatus = useUpdateHousekeepingTaskStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        room_id: '',
        task_type: 'stayover_clean' as HousekeepingTask['task_type'],
        priority: 'normal' as HousekeepingTask['priority'],
        notes: ''
    })

    const resetForm = () => setFormData({ room_id: '', task_type: 'stayover_clean', priority: 'normal', notes: '' })

    const roomNumberFor = (roomId: string) => rooms?.find(r => r.id === roomId)?.room_number || roomId.slice(0, 8)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId || !formData.room_id) return
        try {
            await createMutation.mutateAsync({
                room_id: formData.room_id,
                property_id: propertyId,
                task_type: formData.task_type,
                priority: formData.priority,
                notes: formData.notes || undefined,
                created_by: user.id
            })
            toast({ title: t('housekeeping:tasks.success.created', { defaultValue: 'Task created' }) })
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

    const handleAdvanceStatus = (task: HousekeepingTask) => {
        const nextStatus = statusFlow[task.status]
        if (!nextStatus) return
        updateStatus.mutate({ id: task.id, status: nextStatus })
    }

    if (!propertyId) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={ClipboardCheck}
                    title={t('housekeeping:tasks.no_property', { defaultValue: 'No property assigned' })}
                    description={t('housekeeping:tasks.no_property_desc', { defaultValue: 'You need an assigned property to manage housekeeping tasks.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('housekeeping:tasks.title', { defaultValue: 'Housekeeping Tasks' })}
                description={t('housekeeping:tasks.description', { defaultValue: 'Assign and track room cleaning and inspection tasks.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={!rooms || rooms.length === 0}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('housekeeping:tasks.add_task', { defaultValue: 'New Task' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : tasks && tasks.length > 0 ? (
                        <div className="space-y-2">
                            {tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <ClipboardCheck className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {t('housekeeping:rooms.title_short', { defaultValue: 'Room' })} {roomNumberFor(task.room_id)} · {task.task_type.replace('_', ' ')}
                                            </p>
                                            {task.notes && <p className="text-sm text-gray-500">{task.notes}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{task.priority}</Badge>
                                        <Badge className={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge>
                                        {statusFlow[task.status] && (
                                            <Button size="sm" variant="outline" onClick={() => handleAdvanceStatus(task)} disabled={updateStatus.isPending}>
                                                {t(`housekeeping:tasks.advance_to_${statusFlow[task.status]}`, { defaultValue: `Mark ${statusFlow[task.status]}` })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={ClipboardCheck}
                            title={t('housekeeping:tasks.no_data', { defaultValue: 'No tasks yet' })}
                            description={t('housekeeping:tasks.no_data_desc', { defaultValue: 'Housekeeping tasks will appear here.' })}
                        />
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('housekeeping:tasks.add_task', { defaultValue: 'New Task' })}</DialogTitle>
                        <DialogDescription>
                            {t('housekeeping:tasks.add_new_desc', { defaultValue: 'Assign a housekeeping task to a room.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="room_id">{t('housekeeping:tasks.room_label', { defaultValue: 'Room' })}</Label>
                            <Select value={formData.room_id} onValueChange={(v) => setFormData({ ...formData, room_id: v })}>
                                <SelectTrigger id="room_id">
                                    <SelectValue placeholder={t('housekeeping:tasks.room_placeholder', { defaultValue: 'Select room' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    {rooms?.map((room) => (
                                        <SelectItem key={room.id} value={room.id}>{room.room_number}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task_type">{t('housekeeping:tasks.type_label', { defaultValue: 'Task Type' })}</Label>
                            <Select value={formData.task_type} onValueChange={(v) => setFormData({ ...formData, task_type: v as HousekeepingTask['task_type'] })}>
                                <SelectTrigger id="task_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="checkout_clean">{t('housekeeping:tasks.type_checkout', { defaultValue: 'Checkout Clean' })}</SelectItem>
                                    <SelectItem value="stayover_clean">{t('housekeeping:tasks.type_stayover', { defaultValue: 'Stayover Clean' })}</SelectItem>
                                    <SelectItem value="deep_clean">{t('housekeeping:tasks.type_deep', { defaultValue: 'Deep Clean' })}</SelectItem>
                                    <SelectItem value="inspection">{t('housekeeping:tasks.type_inspection', { defaultValue: 'Inspection' })}</SelectItem>
                                    <SelectItem value="maintenance_flag">{t('housekeeping:tasks.type_maintenance', { defaultValue: 'Maintenance Flag' })}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">{t('housekeeping:tasks.priority_label', { defaultValue: 'Priority' })}</Label>
                            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as HousekeepingTask['priority'] })}>
                                <SelectTrigger id="priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('housekeeping:tasks.priority_low', { defaultValue: 'Low' })}</SelectItem>
                                    <SelectItem value="normal">{t('housekeeping:tasks.priority_normal', { defaultValue: 'Normal' })}</SelectItem>
                                    <SelectItem value="high">{t('housekeeping:tasks.priority_high', { defaultValue: 'High' })}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('housekeeping:tasks.notes_label', { defaultValue: 'Notes' })}</Label>
                            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.room_id}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
