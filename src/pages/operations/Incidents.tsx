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
import { useCreateIncident, useIncidents, useUpdateIncidentStatus } from '@/hooks/useIncidents'
import type { Incident } from '@/lib/types/operations'
import { AlertTriangle, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    investigating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

const severityColors: Record<string, string> = {
    minor: 'bg-blue-50 text-blue-700 border-blue-200',
    moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    major: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
}

const statusFlow: Record<Incident['status'], Incident['status'] | null> = {
    open: 'investigating',
    investigating: 'resolved',
    resolved: 'closed',
    closed: null
}

export default function Incidents() {
    const { t } = useTranslation(['operations', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: incidents, isLoading } = useIncidents(propertyId)
    const createMutation = useCreateIncident()
    const updateStatus = useUpdateIncidentStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        incident_type: '',
        severity: 'minor' as Incident['severity'],
        description: '',
        location: ''
    })

    const resetForm = () => setFormData({ incident_type: '', severity: 'minor', description: '', location: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                incident_type: formData.incident_type,
                severity: formData.severity,
                description: formData.description,
                location: formData.location || undefined,
                reported_by: user.id
            })
            toast({ title: t('operations:incidents.success.created', { defaultValue: 'Incident logged' }) })
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

    const handleAdvanceStatus = (incident: Incident) => {
        const nextStatus = statusFlow[incident.status]
        if (!nextStatus) return
        updateStatus.mutate({ id: incident.id, status: nextStatus })
    }

    if (!propertyId) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={AlertTriangle}
                    title={t('operations:incidents.no_property', { defaultValue: 'No property assigned' })}
                    description={t('operations:incidents.no_property_desc', { defaultValue: 'You need an assigned property to log incidents.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('operations:incidents.title', { defaultValue: 'Incidents' })}
                description={t('operations:incidents.description', { defaultValue: 'Log and track operational incidents — complaints, safety issues, damage.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('operations:incidents.log_incident', { defaultValue: 'Log Incident' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : incidents && incidents.length > 0 ? (
                        <div className="space-y-2">
                            {incidents.map((incident) => (
                                <div key={incident.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{incident.incident_type}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {incident.location && <span>{incident.location}</span>}
                                                <span>{incident.description}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={severityColors[incident.severity]}>
                                            {incident.severity}
                                        </Badge>
                                        <Badge className={statusColors[incident.status]}>
                                            {incident.status}
                                        </Badge>
                                        {statusFlow[incident.status] && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAdvanceStatus(incident)}
                                                disabled={updateStatus.isPending}
                                            >
                                                {t(`operations:incidents.advance_to_${statusFlow[incident.status]}`, { defaultValue: `Mark ${statusFlow[incident.status]}` })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={AlertTriangle}
                            title={t('operations:incidents.no_data', { defaultValue: 'No incidents logged' })}
                            description={t('operations:incidents.no_data_desc', { defaultValue: 'Incidents reported by staff will appear here.' })}
                            action={{
                                label: t('operations:incidents.log_incident', { defaultValue: 'Log Incident' }),
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
                        <DialogTitle>{t('operations:incidents.log_incident', { defaultValue: 'Log Incident' })}</DialogTitle>
                        <DialogDescription>
                            {t('operations:incidents.add_new_desc', { defaultValue: 'Record a new operational incident.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="incident_type">{t('operations:incidents.type_label', { defaultValue: 'Incident Type' })}</Label>
                            <Input id="incident_type" value={formData.incident_type} onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })} placeholder={t('operations:incidents.type_placeholder', { defaultValue: 'e.g. Guest complaint, Water leak' })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">{t('operations:incidents.location_label', { defaultValue: 'Location' })}</Label>
                            <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('operations:incidents.description_label', { defaultValue: 'Description' })}</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="severity">{t('operations:incidents.severity_label', { defaultValue: 'Severity' })}</Label>
                            <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v as Incident['severity'] })}>
                                <SelectTrigger id="severity">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="minor">{t('operations:incidents.severity_minor', { defaultValue: 'Minor' })}</SelectItem>
                                    <SelectItem value="moderate">{t('operations:incidents.severity_moderate', { defaultValue: 'Moderate' })}</SelectItem>
                                    <SelectItem value="major">{t('operations:incidents.severity_major', { defaultValue: 'Major' })}</SelectItem>
                                    <SelectItem value="critical">{t('operations:incidents.severity_critical', { defaultValue: 'Critical' })}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.incident_type || !formData.description}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
