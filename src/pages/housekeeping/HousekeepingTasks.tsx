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
import { ClipboardCheck, Plus, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Download } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'
import { DataTable } from '@/components/ui/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { motion } from 'framer-motion'
import ExcelJS from 'exceljs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
}

const priorityColors: Record<string, string> = {
    low: 'bg-slate-50 text-slate-600 border-slate-200',
    normal: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200 font-medium'
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
        if (!user || !isRealPropertyId(propertyId) || !formData.room_id) return
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
        } catch (error: any) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error?.message || String(error),
                variant: 'destructive'
            })
        }
    }

    const handleAdvanceStatus = (task: HousekeepingTask) => {
        const nextStatus = statusFlow[task.status]
        if (!nextStatus) return
        updateStatus.mutate({ id: task.id, status: nextStatus })
    }

    const metrics = useMemo(() => {
        const all = tasks || []
        const pendingCount = all.filter(t => t.status === 'pending').length
        const inProgressCount = all.filter(t => t.status === 'in_progress').length
        const completedCount = all.filter(t => t.status === 'completed' || t.status === 'verified').length
        const highPriorityCount = all.filter(t => t.priority === 'high' && t.status !== 'verified').length

        return {
            pendingCount,
            inProgressCount,
            completedCount,
            highPriorityCount,
            totalCount: all.length
        }
    }, [tasks])

    const handleExportExcel = async () => {
        if (!tasks || tasks.length === 0) return
        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet('Housekeeping Tasks')
            
            worksheet.columns = [
                { header: 'Room', key: 'room_number', width: 15 },
                { header: 'Task Type', key: 'task_type', width: 25 },
                { header: 'Priority', key: 'priority', width: 15 },
                { header: 'Status', key: 'status', width: 18 },
                { header: 'Notes', key: 'notes', width: 40 },
                { header: 'Created At', key: 'created_at', width: 20 },
            ]

            tasks.forEach(t => {
                worksheet.addRow({
                    room_number: roomNumberFor(t.room_id),
                    task_type: t.task_type.replace('_', ' '),
                    priority: t.priority,
                    status: t.status.replace('_', ' '),
                    notes: t.notes || '',
                    created_at: t.created_at ? new Date(t.created_at).toLocaleString() : ''
                })
            })

            worksheet.getRow(1).font = { bold: true }
            
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Housekeeping_Tasks_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error: any) {
            toast({ title: 'Export failed', description: error?.message, variant: 'destructive' })
        }
    }

    const columns: ColumnDef<HousekeepingTask>[] = [
        {
            accessorFn: (row) => `Room ${roomNumberFor(row.room_id)}`,
            id: 'room',
            header: t('housekeeping:tasks.room_label', { defaultValue: 'Room' }),
            cell: ({ row }) => <span className="font-bold text-gray-900">{row.getValue('room')}</span>
        },
        {
            accessorKey: 'task_type',
            header: t('housekeeping:tasks.type_label', { defaultValue: 'Task Type' }),
            cell: ({ row }) => <span className="capitalize font-medium text-gray-700">{(row.getValue('task_type') as string).replace('_', ' ')}</span>
        },
        {
            accessorKey: 'priority',
            header: t('housekeeping:tasks.priority_label', { defaultValue: 'Priority' }),
            cell: ({ row }) => {
                const priority = row.getValue('priority') as string
                return (
                    <Badge variant="outline" className={cn('capitalize px-2 py-0.5 text-xs', priorityColors[priority])}>
                        {priority}
                    </Badge>
                )
            }
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string
                return (
                    <Badge className={cn('capitalize font-medium px-2 py-0.5 text-xs', statusColors[status])}>
                        {status.replace('_', ' ')}
                    </Badge>
                )
            }
        },
        {
            accessorKey: 'notes',
            header: t('housekeeping:tasks.notes_label', { defaultValue: 'Notes' }),
            cell: ({ row }) => {
                const notes = row.getValue('notes') as string | undefined
                return notes ? <span className="text-gray-600 line-clamp-1 text-xs">{notes}</span> : <span className="text-gray-400">-</span>
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const task = row.original
                const nextStatus = statusFlow[task.status]
                if (!nextStatus) return null

                return (
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdvanceStatus(task)}
                            disabled={updateStatus.isPending}
                            className="h-8 text-xs border-gray-200 hover:bg-gray-50"
                        >
                            {t(`housekeeping:tasks.advance_to_${nextStatus}`, { defaultValue: `Mark ${nextStatus.replace('_', ' ')}` })}
                        </Button>
                    </div>
                )
            }
        }
    ]

    if (!isRealPropertyId(propertyId)) {
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
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="border-gray-200">
                                    <Download className="w-4 h-4 me-2" />
                                    {t('common:action.export', { defaultValue: 'Export' })}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportExcel}>
                                    Export as Excel (.xlsx)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm" disabled={!rooms || rooms.length === 0}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('housekeeping:tasks.add_task', { defaultValue: 'New Task' })}
                        </Button>
                    </div>
                }
            />

            {/* Operational Metrics Cards */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-slate-400">
                    <div className="w-12 h-12 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Tasks</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            {metrics.pendingCount}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</p>
                        <p className="text-2xl font-bold text-amber-600 mt-0.5">
                            {metrics.inProgressCount}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed / Verified</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                            {metrics.completedCount} <span className="text-sm font-normal text-gray-400">/ {metrics.totalCount}</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500">
                    <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">High Priority</p>
                        <p className="text-2xl font-bold text-rose-600 mt-0.5">
                            {metrics.highPriorityCount}
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading tasks…' })}</div>
                    ) : tasks && tasks.length > 0 ? (
                        <DataTable 
                            columns={columns} 
                            data={tasks}
                            searchKey="room"
                            searchPlaceholder="Search tasks by room..."
                        />
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
                                        <SelectItem key={room.id} value={room.id}>Room {room.room_number} {room.room_type ? `(${room.room_type})` : ''}</SelectItem>
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
                            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Optional instructions for housekeeping staff..." />
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
