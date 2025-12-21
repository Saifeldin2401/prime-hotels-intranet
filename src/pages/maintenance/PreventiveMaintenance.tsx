import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Clock, Trash2, Edit2, PlayCircle } from 'lucide-react'
import { useMaintenanceSchedules, useCreateMaintenanceSchedule, useDeleteMaintenanceSchedule, useUpdateMaintenanceSchedule } from '@/hooks/useMaintenanceSchedules'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'

export default function PreventiveMaintenance() {
    const { t } = useTranslation('maintenance')
    const { user, properties } = useAuth()
    const { data: schedules, isLoading } = useMaintenanceSchedules()
    const createMutation = useCreateMaintenanceSchedule()
    const deleteMutation = useDeleteMaintenanceSchedule()
    const updateMutation = useUpdateMaintenanceSchedule()

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newSchedule, setNewSchedule] = useState({
        title: '',
        description: '',
        frequency: 'monthly',
        priority: 'medium',
        next_run_at: format(new Date(), 'yyyy-MM-dd HH:mm'),
        property_id: properties?.[0]?.id || ''
    })

    const handleCreate = async () => {
        await createMutation.mutateAsync({
            ...newSchedule,
            next_run_at: new Date(newSchedule.next_run_at).toISOString(),
            is_active: true
        })
        setIsCreateOpen(false)
        setNewSchedule({
            title: '',
            description: '',
            frequency: 'monthly',
            priority: 'medium',
            next_run_at: format(new Date(), 'yyyy-MM-dd HH:mm'),
            property_id: properties?.[0]?.id || ''
        })
    }

    const handleDelete = (id: string) => {
        if (confirm(t('confirm_delete_schedule'))) {
            deleteMutation.mutate(id)
        }
    }

    const handleToggle = (id: string, currentStatus: boolean | null) => {
        updateMutation.mutate({ id, updates: { is_active: !currentStatus } })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <PageHeader
                    title={t('preventive.title')}
                    description={t('preventive.description')}
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            {t('preventive.new_schedule')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('preventive.create_title')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t('preventive.title_label')}</Label>
                                <Input
                                    value={newSchedule.title}
                                    onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Monthly HVAC Inspection"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('preventive.description_label')}</Label>
                                <Textarea
                                    value={newSchedule.description}
                                    onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Detailed instructions..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('preventive.frequency')}</Label>
                                    <Select
                                        value={newSchedule.frequency}
                                        onValueChange={(val) => setNewSchedule(prev => ({ ...prev, frequency: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">{t('preventive.frequencies.daily')}</SelectItem>
                                            <SelectItem value="weekly">{t('preventive.frequencies.weekly')}</SelectItem>
                                            <SelectItem value="monthly">{t('preventive.frequencies.monthly')}</SelectItem>
                                            <SelectItem value="quarterly">{t('preventive.frequencies.quarterly')}</SelectItem>
                                            <SelectItem value="yearly">{t('preventive.frequencies.yearly')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('preventive.priority')}</Label>
                                    <Select
                                        value={newSchedule.priority}
                                        onValueChange={(val) => setNewSchedule(prev => ({ ...prev, priority: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{t('priority.low')}</SelectItem>
                                            <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                                            <SelectItem value="high">{t('priority.high')}</SelectItem>
                                            <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('preventive.next_run')}</Label>
                                <Input
                                    type="datetime-local"
                                    value={newSchedule.next_run_at}
                                    onChange={(e) => setNewSchedule(prev => ({ ...prev, next_run_at: e.target.value }))}
                                />
                            </div>
                            <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending ? t('preventive.creating') : t('preventive.create_button')}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div>{t('dashboard.loading')}</div>
                ) : schedules?.map((schedule) => (
                    <Card key={schedule.id} className={cn("transition-all hover:shadow-md", !schedule.is_active && "opacity-60")}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg font-bold">{schedule.title}</CardTitle>
                                <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                                    {schedule.is_active ? t('preventive.active') : t('preventive.paused')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 line-clamp-2">{schedule.description}</p>

                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span className="capitalize">{schedule.frequency}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Next: {format(new Date(schedule.next_run_at), 'MMM dd')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t mt-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleToggle(schedule.id, schedule.is_active)}
                                    >
                                        {schedule.is_active ? t('preventive.pause') : t('preventive.resume')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(schedule.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!isLoading && schedules?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 border border-dashed rounded-lg">
                        <p>{t('preventive.no_schedules')}</p>
                        <Button variant="link" onClick={() => setIsCreateOpen(true)}>{t('preventive.create_first')}</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
