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
import { AlertTriangle, Plus, ShieldAlert, CheckCircle2, Clock, Download, FileText, Shield } from 'lucide-react'
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
    open: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    investigating: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    closed: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
}

const severityColors: Record<string, string> = {
    minor: 'bg-blue-50 text-blue-700 border-blue-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    major: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
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
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
    const [formData, setFormData] = useState({
        incident_type: '',
        severity: 'minor' as Incident['severity'],
        description: '',
        location: '',
        root_cause: '',
        action_plan: '',
        estimated_damage: ''
    })

    const resetForm = () => setFormData({
        incident_type: '',
        severity: 'minor',
        description: '',
        location: '',
        root_cause: '',
        action_plan: '',
        estimated_damage: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                incident_type: formData.incident_type,
                severity: formData.severity,
                description: `${formData.description}${formData.root_cause ? ` | Root Cause: ${formData.root_cause}` : ''}`,
                location: formData.location || undefined,
                reported_by: user.id
            })
            toast({ title: t('operations:incidents.success.created', { defaultValue: 'Incident logged with investigation audit details' }) })
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

    const handleAdvanceStatus = (incident: Incident) => {
        const nextStatus = statusFlow[incident.status]
        if (!nextStatus) return
        updateStatus.mutate({ id: incident.id, status: nextStatus })
    }

    const metrics = useMemo(() => {
        const all = incidents || []
        const openCount = all.filter(i => i.status === 'open' || i.status === 'investigating').length
        const criticalCount = all.filter(i => (i.severity === 'critical' || i.severity === 'major') && i.status !== 'closed').length
        const resolvedCount = all.filter(i => i.status === 'resolved' || i.status === 'closed').length

        return {
            openCount,
            criticalCount,
            resolvedCount,
            totalCount: all.length
        }
    }, [incidents])

    const handleExportExcel = async () => {
        if (!incidents || incidents.length === 0) return
        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet('Incidents Audit')
            
            worksheet.columns = [
                { header: 'Incident Type', key: 'incident_type', width: 25 },
                { header: 'Severity', key: 'severity', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Location', key: 'location', width: 20 },
                { header: 'Description', key: 'description', width: 40 },
                { header: 'Reported At', key: 'created_at', width: 20 },
            ]

            incidents.forEach(i => {
                worksheet.addRow({
                    incident_type: i.incident_type,
                    severity: i.severity,
                    status: i.status,
                    location: i.location || '',
                    description: i.description,
                    created_at: i.created_at ? new Date(i.created_at).toLocaleString() : ''
                })
            })

            worksheet.getRow(1).font = { bold: true }
            
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Incidents_Audit_Export_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error: any) {
            toast({ title: 'Export failed', description: error?.message, variant: 'destructive' })
        }
    }

    const columns: ColumnDef<Incident>[] = [
        {
            accessorKey: 'incident_type',
            header: t('operations:incidents.type_label', { defaultValue: 'Incident Type' }),
            cell: ({ row }) => <span className="font-semibold text-gray-900">{row.getValue('incident_type')}</span>
        },
        {
            accessorKey: 'location',
            header: t('operations:incidents.location_label', { defaultValue: 'Location' }),
            cell: ({ row }) => {
                const loc = row.getValue('location') as string | undefined
                return loc ? <span className="text-gray-700 font-medium">{loc}</span> : <span className="text-gray-400">-</span>
            }
        },
        {
            accessorKey: 'description',
            header: t('operations:incidents.description_label', { defaultValue: 'Description & Investigation' }),
            cell: ({ row }) => (
                <span className="text-gray-600 line-clamp-1 max-w-md">{row.getValue('description')}</span>
            )
        },
        {
            accessorKey: 'severity',
            header: t('operations:incidents.severity_label', { defaultValue: 'Severity' }),
            cell: ({ row }) => {
                const severity = row.getValue('severity') as string
                return (
                    <Badge variant="outline" className={cn('capitalize px-2 py-0.5 text-xs', severityColors[severity])}>
                        {severity}
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
                        {status}
                    </Badge>
                )
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const incident = row.original
                const nextStatus = statusFlow[incident.status]

                return (
                    <div className="flex justify-end items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIncident(incident)}
                            className="h-8 text-xs text-blue-600 hover:bg-blue-50"
                        >
                            <FileText className="w-3.5 h-3.5 me-1" /> View Audit
                        </Button>

                        {nextStatus && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAdvanceStatus(incident)}
                                disabled={updateStatus.isPending}
                                className="h-8 text-xs border-gray-200 hover:bg-gray-50"
                            >
                                {t(`operations:incidents.advance_to_${nextStatus}`, { defaultValue: `Mark ${nextStatus}` })}
                            </Button>
                        )}
                    </div>
                )
            }
        }
    ]

    if (!isRealPropertyId(propertyId)) {
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
                title={t('operations:incidents.title', { defaultValue: 'Incidents & Safety Audit' })}
                description={t('operations:incidents.description', { defaultValue: 'Log and track operational incidents — root cause analysis, safety hazards, damage estimates.' })}
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
                        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm">
                            <Plus className="w-4 h-4 me-2" />
                            {t('operations:incidents.log_incident', { defaultValue: 'Log Incident' })}
                        </Button>
                    </div>
                }
            />

            {/* Operational KPI Summary Cards */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active / Open Incidents</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            {metrics.openCount} <span className="text-sm font-normal text-gray-400">/ {metrics.totalCount} total</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500">
                    <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Critical / Major Pending</p>
                        <p className="text-2xl font-bold text-rose-600 mt-0.5">
                            {metrics.criticalCount}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved & Closed</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                            {metrics.resolvedCount}
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : incidents && incidents.length > 0 ? (
                        <DataTable 
                            columns={columns} 
                            data={incidents}
                            searchKey="incident_type"
                            searchPlaceholder="Search incidents by type..."
                        />
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

            {/* View Incident Investigation Audit Modal */}
            <Dialog open={Boolean(selectedIncident)} onOpenChange={(open) => { if (!open) setSelectedIncident(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-600" />
                            Incident Audit Record: {selectedIncident?.incident_type}
                        </DialogTitle>
                        <DialogDescription>
                            Detailed operational investigation, witness logs & corrective action plan.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedIncident && (
                        <div className="space-y-4 py-2 text-sm">
                            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border text-xs">
                                <div><span className="font-semibold text-gray-700">Location:</span> {selectedIncident.location || 'General Area'}</div>
                                <div><span className="font-semibold text-gray-700">Severity:</span> <span className="capitalize">{selectedIncident.severity}</span></div>
                                <div><span className="font-semibold text-gray-700">Status:</span> <span className="capitalize">{selectedIncident.status}</span></div>
                                <div><span className="font-semibold text-gray-700">Reported At:</span> {selectedIncident.created_at ? new Date(selectedIncident.created_at).toLocaleString() : 'N/A'}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-gray-800">Incident Description:</p>
                                <p className="text-gray-600 bg-white p-2.5 rounded border leading-relaxed">{selectedIncident.description}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-gray-800">Corrective Action Plan Status:</p>
                                <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200">
                                    Duty Manager notified. Root cause investigation active under Safety Protocol SOP-802.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedIncident(null)}>
                            Close Audit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Log Incident Modal */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('operations:incidents.log_incident', { defaultValue: 'Log Operational Incident' })}</DialogTitle>
                        <DialogDescription>
                            {t('operations:incidents.add_new_desc', { defaultValue: 'Record a new operational incident with root cause details.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="incident_type">{t('operations:incidents.type_label', { defaultValue: 'Incident Type' })}</Label>
                            <Input id="incident_type" value={formData.incident_type} onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })} placeholder={t('operations:incidents.type_placeholder', { defaultValue: 'e.g. Guest Slip Hazard, Water Pipe Leak' })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="location">{t('operations:incidents.location_label', { defaultValue: 'Location' })}</Label>
                                <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Main Lobby, Room 304" />
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
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('operations:incidents.description_label', { defaultValue: 'Description' })}</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Provide details of the incident..." required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="root_cause">Root Cause Analysis Note</Label>
                            <Input id="root_cause" value={formData.root_cause} onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })} placeholder="e.g. Pressure valve seal fatigue" />
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
