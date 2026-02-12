import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
    useMaintenanceTicket,
    useAssignMaintenanceTicket,
    useCompleteMaintenanceTicket,
    useAddMaintenanceComment,
    useUpdateMaintenanceTicket
} from '@/hooks/useMaintenanceTickets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Send, User, Calendar, MapPin, Download, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    urgent: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse'
}

const statusColors: Record<string, string> = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    pending_parts: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-purple-100 text-purple-800',
    completed: 'bg-purple-100 text-purple-800',
    closed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800 line-through'
}

export default function MaintenanceTicketDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user, roles, primaryRole } = useAuth()
    const { t, i18n } = useTranslation('maintenance')
    const isRTL = i18n.dir() === 'rtl'

    const { data: ticket, isLoading } = useMaintenanceTicket(id!)
    const assignMutation = useAssignMaintenanceTicket()
    const completeMutation = useCompleteMaintenanceTicket()
    const updateMutation = useUpdateMaintenanceTicket()
    const addCommentMutation = useAddMaintenanceComment()

    const [newComment, setNewComment] = useState('')
    const [manageOpen, setManageOpen] = useState(false)
    const [manageStatus, setManageStatus] = useState('open')
    const [managePriority, setManagePriority] = useState('medium')
    const [manageAssignee, setManageAssignee] = useState('')
    const [manageEta, setManageEta] = useState('')
    const [manageParts, setManageParts] = useState('')
    const [manageEstimatedCost, setManageEstimatedCost] = useState('')
    const [manageLaborHours, setManageLaborHours] = useState('')
    const [manageMaterialCost, setManageMaterialCost] = useState('')
    const [manageInternalNote, setManageInternalNote] = useState('')
    const [notifyReporter, setNotifyReporter] = useState(true)
    const [manageSaving, setManageSaving] = useState(false)

    const userRole = primaryRole || roles[0]?.role
    const canManageTickets = ['regional_admin', 'regional_hr', 'property_manager', 'department_head', 'staff'].includes(userRole || '')

    const assignableUsersQuery = useQuery({
        queryKey: ['maintenance-assignable-users', ticket?.property_id],
        enabled: !!ticket?.property_id && canManageTickets,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    user_roles!inner(role),
                    user_properties(property_id)
                `)
                .eq('is_active', true)
                .in('user_roles.role', ['property_manager', 'department_head', 'staff', 'property_hr', 'regional_hr', 'regional_admin'])

            if (error) throw error

            const mapped = (data || []).map((p: any) => ({
                id: p.id as string,
                full_name: p.full_name as string | null,
                email: p.email as string,
                role: p.user_roles?.role as string,
                property_ids: (p.user_properties || []).map((up: any) => up.property_id as string),
            }))

            return ticket?.property_id
                ? mapped.filter((p: any) => p.role === 'regional_hr' || p.role === 'regional_admin' || p.property_ids.includes(ticket.property_id))
                : mapped
        }
    })

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

    if (!ticket) {
        return (
            <div className="container mx-auto py-6">
                <Button variant="ghost" onClick={() => navigate('/maintenance')} className="mb-4">
                    <ArrowLeft className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} /> {t('back_to_dashboard')}
                </Button>
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <h3 className="text-lg font-medium">{t('ticket_not_found')}</h3>
                </div>
            </div>
        )
    }

    const handleAcceptTicket = () => {
        if (!user?.id) return
        assignMutation.mutate({
            ticketId: ticket.id,
            assignedToId: user.id,
            ticketTitle: ticket.title,
            priority: ticket.priority
        })
    }

    const handleComplete = () => {
        completeMutation.mutate({ ticketId: ticket.id })
    }

    const handleAddComment = () => {
        if (!newComment.trim()) return
        addCommentMutation.mutate({
            ticketId: ticket.id,
            comment: newComment
        }, {
            onSuccess: () => setNewComment('')
        })
    }

    const openManageDialog = () => {
        if (!ticket) return
        setManageStatus(ticket.status)
        setManagePriority(ticket.priority)
        setManageAssignee(ticket.assigned_to_id || '')
        setManageEta(ticket.estimated_completion_date ? String(ticket.estimated_completion_date) : '')
        setManageParts(ticket.parts_needed || '')
        setManageEstimatedCost(ticket.estimated_cost ? String(ticket.estimated_cost) : '')
        setManageLaborHours(ticket.labor_hours ? String(ticket.labor_hours) : '')
        setManageMaterialCost(ticket.material_cost ? String(ticket.material_cost) : '')
        setManageInternalNote('')
        setNotifyReporter(true)
        setManageOpen(true)
    }

    const handleManageSave = async () => {
        if (!ticket) return
        setManageSaving(true)
        try {
            const updates: any = {
                status: manageStatus,
                priority: managePriority,
                estimated_completion_date: manageEta || null,
                parts_needed: manageParts || null,
                estimated_cost: manageEstimatedCost ? Number(manageEstimatedCost) : null,
                labor_hours: manageLaborHours ? Number(manageLaborHours) : null,
                material_cost: manageMaterialCost ? Number(manageMaterialCost) : null,
            }

            await updateMutation.mutateAsync({ ticketId: ticket.id, updates })

            if (manageAssignee && manageAssignee !== ticket.assigned_to_id) {
                await assignMutation.mutateAsync({
                    ticketId: ticket.id,
                    assignedToId: manageAssignee,
                    ticketTitle: ticket.title,
                    priority: managePriority
                })
            }

            if (manageInternalNote.trim()) {
                await addCommentMutation.mutateAsync({
                    ticketId: ticket.id,
                    comment: manageInternalNote.trim(),
                    internalOnly: true
                })
            }

            if (notifyReporter && ticket.reported_by_id) {
                await supabase.from('notifications').insert({
                    user_id: ticket.reported_by_id,
                    type: 'maintenance_updated',
                    title: 'Maintenance Ticket Updated',
                    message: `Your maintenance ticket "${ticket.title}" has been updated.`,
                    metadata: { ticket_id: ticket.id }
                })
            }

            setManageOpen(false)
        } finally {
            setManageSaving(false)
        }
    }

    const isOverdue = ticket.due_at ? new Date(ticket.due_at) < new Date() : false

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Button variant="ghost" onClick={() => navigate('/maintenance')} className="mb-2 group">
                <ArrowLeft className={cn("w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1", isRTL ? "ml-2" : "mr-2")} /> {t('back_to_dashboard')}
            </Button>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className={priorityColors[ticket.priority]}>{t(ticket.priority)}</Badge>
                                        <Badge variant="outline" className={statusColors[ticket.status]}>{t(ticket.status)}</Badge>
                                        {ticket.due_at && (
                                            <Badge className={isOverdue ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}>
                                                Due {format(new Date(ticket.due_at), 'MMM d, yyyy')}
                                            </Badge>
                                        )}
                                        {isOverdue && <Badge className="bg-red-100 text-red-800 border border-red-200">Overdue</Badge>}
                                    </div>
                                    <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">#{ticket.id.slice(0, 8)}</p>
                                </div>
                                {canManageTickets && (
                                    <div className="flex gap-2">
                                        {(ticket.status === 'open' || !ticket.assigned_to_id) && (
                                            <Button onClick={handleAcceptTicket} size="sm" disabled={assignMutation.isPending}>
                                                {assignMutation.isPending ? t('processing') : t('accept_ticket')}
                                            </Button>
                                        )}
                                        {ticket.status === 'in_progress' && (
                                            <Button onClick={handleComplete} size="sm" className="bg-green-600 hover:bg-green-700" disabled={completeMutation.isPending}>
                                                {completeMutation.isPending ? t('processing') : t('mark_complete')}
                                            </Button>
                                        )}
                                        <Button onClick={openManageDialog} size="sm" variant="outline">
                                            <Settings className="w-4 h-4 mr-2" />
                                            Manage
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('description')}</h3>
                                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{ticket.property?.name} {ticket.room_number ? `- ${t('room')} ${ticket.room_number}` : ''}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span>{t('reported_by')} {ticket.reported_by?.full_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                                </div>
                                {ticket.assigned_to && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span>{t('assigned_to')} {ticket.assigned_to.full_name}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('attachments')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ticket.attachments && ticket.attachments.length > 0 ? (
                                <div className="grid gap-2">
                                    {ticket.attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                                            <span className="text-sm">{att.file_name}</span>
                                            <Button variant="ghost" size="sm" asChild className="group">
                                                <a href={att.file_path} target="_blank" rel="noopener noreferrer">
                                                    <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('no_attachments')}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('comments')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {ticket.comments && ticket.comments.length > 0 ? (
                                    ticket.comments.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                                                {comment.author?.full_name?.[0]}
                                            </div>
                                            <div className="flex-1 bg-muted/50 p-3 rounded-lg">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-semibold text-sm">{comment.author?.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                                                </div>
                                                <p className="text-sm">{comment.comment}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground py-4">{t('no_comments')}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Textarea
                                    placeholder={t('add_comment_placeholder')}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="min-h-[80px]"
                                />
                                <Button className="self-end group" onClick={handleAddComment} disabled={addCommentMutation.isPending || !newComment.trim()}>
                                    <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Ticket</DialogTitle>
                        <DialogDescription>Update status, priority, assignee, and scheduling details.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={manageStatus} onValueChange={setManageStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="pending_parts">Pending Parts</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={managePriority} onValueChange={setManagePriority}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Assignee</Label>
                            <Select value={manageAssignee} onValueChange={setManageAssignee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(assignableUsersQuery.data || []).map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {(p.full_name || p.email) + ` (${p.role})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Estimated Completion Date</Label>
                            <Input
                                type="date"
                                value={manageEta}
                                onChange={(e) => setManageEta(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Parts Needed</Label>
                            <Input
                                value={manageParts}
                                onChange={(e) => setManageParts(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Estimated Cost</Label>
                            <Input
                                type="number"
                                min="0"
                                value={manageEstimatedCost}
                                onChange={(e) => setManageEstimatedCost(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Labor Hours</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.25"
                                value={manageLaborHours}
                                onChange={(e) => setManageLaborHours(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Material Cost</Label>
                            <Input
                                type="number"
                                min="0"
                                value={manageMaterialCost}
                                onChange={(e) => setManageMaterialCost(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Internal Note</Label>
                            <Textarea
                                value={manageInternalNote}
                                onChange={(e) => setManageInternalNote(e.target.value)}
                                rows={3}
                                placeholder="Add internal notes or instructions"
                            />
                        </div>

                        <div className="flex items-center gap-2 md:col-span-2">
                            <Checkbox
                                id="notify-reporter"
                                checked={notifyReporter}
                                onCheckedChange={(checked) => setNotifyReporter(!!checked)}
                            />
                            <Label htmlFor="notify-reporter">Notify reporter about updates</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setManageOpen(false)} disabled={manageSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleManageSave} disabled={manageSaving}>
                            {manageSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
