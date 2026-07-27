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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateGuestRequest, useGuestRequests, useUpdateGuestRequestStatus } from '@/hooks/useGuestRequests'
import type { GuestRequest } from '@/lib/types/operations'
import { BellRing, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

const priorityColors: Record<string, string> = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    normal: 'bg-gray-50 text-gray-700 border-gray-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    urgent: 'bg-red-50 text-red-700 border-red-200'
}

export default function GuestRequests() {
    const { t } = useTranslation(['operations', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: requests, isLoading } = useGuestRequests(propertyId)
    const createMutation = useCreateGuestRequest()
    const updateStatus = useUpdateGuestRequestStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        room_number: '',
        guest_name: '',
        request_type: '',
        description: '',
        priority: 'normal' as GuestRequest['priority']
    })

    const resetForm = () => setFormData({ room_number: '', guest_name: '', request_type: '', description: '', priority: 'normal' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                room_number: formData.room_number || undefined,
                guest_name: formData.guest_name || undefined,
                request_type: formData.request_type,
                description: formData.description || undefined,
                priority: formData.priority,
                created_by: user.id
            })
            toast({ title: t('operations:guest_requests.success.created', { defaultValue: 'Guest request logged' }) })
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

    const handleAdvanceStatus = (request: GuestRequest) => {
        const next: Record<GuestRequest['status'], GuestRequest['status'] | null> = {
            open: 'in_progress',
            in_progress: 'completed',
            completed: null,
            cancelled: null
        }
        const nextStatus = next[request.status]
        if (!nextStatus) return
        updateStatus.mutate({ id: request.id, status: nextStatus })
    }

    if (!propertyId) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={BellRing}
                    title={t('operations:guest_requests.no_property', { defaultValue: 'No property assigned' })}
                    description={t('operations:guest_requests.no_property_desc', { defaultValue: 'You need an assigned property to log guest requests.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('operations:guest_requests.title', { defaultValue: 'Guest Requests' })}
                description={t('operations:guest_requests.description', { defaultValue: 'Track and fulfill front-line guest service requests.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('operations:guest_requests.log_request', { defaultValue: 'Log Request' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : requests && requests.length > 0 ? (
                        <div className="space-y-2">
                            {requests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <BellRing className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {request.request_type}
                                                {request.room_number && <span className="text-gray-500 font-normal"> · {t('operations:guest_requests.room', { defaultValue: 'Room' })} {request.room_number}</span>}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {request.guest_name && <span>{request.guest_name}</span>}
                                                {request.description && <span>· {request.description}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={priorityColors[request.priority]}>
                                            {request.priority}
                                        </Badge>
                                        <Badge className={statusColors[request.status]}>
                                            {request.status.replace('_', ' ')}
                                        </Badge>
                                        {(request.status === 'open' || request.status === 'in_progress') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAdvanceStatus(request)}
                                                disabled={updateStatus.isPending}
                                            >
                                                {request.status === 'open'
                                                    ? t('operations:guest_requests.start', { defaultValue: 'Start' })
                                                    : t('operations:guest_requests.complete', { defaultValue: 'Complete' })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={BellRing}
                            title={t('operations:guest_requests.no_data', { defaultValue: 'No guest requests yet' })}
                            description={t('operations:guest_requests.no_data_desc', { defaultValue: 'Requests logged by front-line staff will appear here.' })}
                            action={{
                                label: t('operations:guest_requests.log_request', { defaultValue: 'Log Request' }),
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
                        <DialogTitle>{t('operations:guest_requests.log_request', { defaultValue: 'Log Request' })}</DialogTitle>
                        <DialogDescription>
                            {t('operations:guest_requests.add_new_desc', { defaultValue: 'Record a new guest service request.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="room_number">{t('operations:guest_requests.room_label', { defaultValue: 'Room Number' })}</Label>
                                <Input id="room_number" value={formData.room_number} onChange={(e) => setFormData({ ...formData, room_number: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guest_name">{t('operations:guest_requests.guest_label', { defaultValue: 'Guest Name' })}</Label>
                                <Input id="guest_name" value={formData.guest_name} onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="request_type">{t('operations:guest_requests.type_label', { defaultValue: 'Request Type' })}</Label>
                            <Input id="request_type" value={formData.request_type} onChange={(e) => setFormData({ ...formData, request_type: e.target.value })} placeholder={t('operations:guest_requests.type_placeholder', { defaultValue: 'e.g. Extra towels, Late checkout' })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('operations:guest_requests.description_label', { defaultValue: 'Details' })}</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">{t('operations:guest_requests.priority_label', { defaultValue: 'Priority' })}</Label>
                            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as GuestRequest['priority'] })}>
                                <SelectTrigger id="priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('operations:guest_requests.priority_low', { defaultValue: 'Low' })}</SelectItem>
                                    <SelectItem value="normal">{t('operations:guest_requests.priority_normal', { defaultValue: 'Normal' })}</SelectItem>
                                    <SelectItem value="high">{t('operations:guest_requests.priority_high', { defaultValue: 'High' })}</SelectItem>
                                    <SelectItem value="urgent">{t('operations:guest_requests.priority_urgent', { defaultValue: 'Urgent' })}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.request_type}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
