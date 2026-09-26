import { PageHeader } from '@/components/layout/PageHeader'
import { FloatingAdminAI } from '@/components/admin/AdminAIAssistant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useReports, type ReportDefinition } from '@/hooks/admin/useReports'
import { format } from 'date-fns'
import { AlertCircle, Clock, Code, Database, Edit2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ReportBuilder() {
    const { t } = useTranslation(['admin', 'common'])
    const { reports, isLoading, createReport, updateReport, deleteReport } = useReports()
    const [selectedReport, setSelectedReport] = useState<Partial<ReportDefinition> | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [filtersJson, setFiltersJson] = useState('{}')

    const handleCreateNew = () => {
        setSelectedReport({
            name: '',
            description: '',
            scope_type: 'global',
            department_id: null,
            report_type: 'financial_summary',
            filters: {},
            schedule_cron: '0 0 * * *',
            is_active: true
        })
        setFiltersJson('{\n  "status": "completed",\n  "include_deleted": false\n}')
        setIsEditing(true)
    }

    const startEditing = (report) => {
        setSelectedReport(report)
        setFiltersJson(JSON.stringify(report.filters || {}, null, 2))
        setIsEditing(true)
    }

    const handleSave = () => {
        if (!selectedReport?.name) return

        let parsedFilters = {}
        try {
            parsedFilters = JSON.parse(filtersJson)
        } catch (_e) {
            alert("Invalid JSON strictly provided in the filters box.")
            return
        }

        const payload = {
            ...selectedReport,
            filters: parsedFilters
        }

        // Clean up based on scope
        if (payload.scope_type === 'global') {
            payload.department_id = null
        }

        if (payload.id) {
            updateReport.mutate(payload as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedReport(null)
                }
            })
        } else {
            createReport.mutate(payload as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedReport(null)
                }
            })
        }
    }

    const handleDelete = (id: string) => {
        if (window.confirm("Permanently destroy this report query schema? This stops all automated exports immediately.")) {
            deleteReport.mutate(id)
            if (selectedReport?.id === id) {
                setIsEditing(false)
                setSelectedReport(null)
            }
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-2">
            <PageHeader
                backTo="/manage/reports"
                title="Custom reports"
                description="Choose the data, columns and filters, then run a report now or on a schedule."
                actions={!isEditing ? (
                    <Button onClick={handleCreateNew} className="min-h-[44px] bg-ds-ink text-ds-on-ink hover:bg-ds-ink/90">
                        <Plus aria-hidden="true" className="me-2 h-4 w-4" />
                        New report
                    </Button>
                ) : undefined}
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Report List */}
                <div className={`xl:col-span-5 space-y-4 ${isEditing ? 'hidden xl:block opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid grid-cols-1 gap-4">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Loading reports…</p>
                        ) : reports?.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center bg-ds-surface-subtle">
                                    <Code className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                                    <p className="text-sm font-medium">No Custom Reports Generated.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Design your first data query to initiate tracking.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            reports?.map((report) => (
                                <Card key={report.id} className="overflow-hidden transition-all hover:border-ds-accent/30">
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base font-semibold text-ds-ink flex items-center gap-2">
                                                    {report.name}
                                                    {!report.is_active && <Badge variant="secondary" className="text-[10px] bg-ds-surface-subtle text-ds-muted">PAUSED</Badge>}
                                                </CardTitle>
                                                <CardDescription className="text-xs line-clamp-1 mt-1">{report.description}</CardDescription>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEditing(report)} aria-label={t('accessibility.edit_report', 'Edit Report')}>
                                                <Edit2 className="h-3 w-3 text-ds-accent" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="flex gap-2 flex-wrap mb-2">
                                            <Badge variant="outline" className="bg-ds-surface-subtle uppercase tracking-wider text-[10px]">
                                                {report.scope_type}
                                            </Badge>
                                            <Badge variant="outline" className="text-ds-accent border-ds-accent/30 bg-ds-accent-soft font-mono text-[10px]">
                                                {report.report_type}
                                            </Badge>
                                        </div>
                                        {report.schedule_cron && (
                                            <div className="text-[11px] text-ds-muted flex items-center gap-1 mt-2">
                                                <Clock className="h-3 w-3" /> CRON: {report.schedule_cron}
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-3 border-t bg-ds-surface-subtle flex justify-between items-center text-xs text-muted-foreground">
                                        <div>Created {format(new Date(report.created_at), 'MMM dd, yyyy')}</div>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-ds-danger" onClick={() => handleDelete(report.id)} aria-label={t('accessibility.delete_report', 'Delete Report')}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className={`xl:col-span-7 ${!isEditing ? 'hidden xl:block' : ''}`}>
                    {isEditing && selectedReport ? (
                        <Card className="border-t-4 border-t-indigo-600 shadow-xl overflow-hidden">
                            <CardHeader className="bg-ds-surface-subtle border-b pb-4">
                                <CardTitle className="text-xl text-ds-ink">{selectedReport.id ? 'Edit System Query' : 'Draft Advanced Extract'}</CardTitle>
                                <CardDescription>Architect complex Postgres data extractions through visual configurations and JSON injections.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Report System Name</Label>
                                        <Input value={selectedReport.name || ''} onChange={e => setSelectedReport({...selectedReport, name: e.target.value})} placeholder="e.g. Total Revenue Aggregation" className="font-medium" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Internal Contextual Description</Label>
                                        <Textarea value={selectedReport.description || ''} onChange={e => setSelectedReport({...selectedReport, description: e.target.value})} placeholder="Explain what data this pulls and why..." rows={2} />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Underlying Engine Type</Label>
                                        <Select value={selectedReport.report_type} onValueChange={v => setSelectedReport({...selectedReport, report_type: v})}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="financial_summary">Financial Summary Ledger</SelectItem>
                                                <SelectItem value="audit_logs">Audit Logs Trail</SelectItem>
                                                <SelectItem value="employee_activity">Employee Activity Tracker</SelectItem>
                                                <SelectItem value="compliance_status">Compliance Enforcement Map</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Target Execution Scope</Label>
                                        <Select value={selectedReport.scope_type} onValueChange={(v: 'global'|'department') => setSelectedReport({...selectedReport, scope_type: v})}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">Whole organization</SelectItem>
                                                <SelectItem value="department">Isolated Department</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedReport.scope_type !== 'global' && (
                                        <div className="space-y-2 col-span-2 border rounded-lg p-4 bg-ds-surface-subtle">
                                            <Label>Narrow Bound Target ID (Optional UUID)</Label>
                                            <Input 
                                                placeholder="Department UUID..."
                                                value={selectedReport.department_id || ''}
                                                onChange={e => setSelectedReport({...selectedReport, department_id: e.target.value})}
                                                className="font-mono text-sm"
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> If left blank, runs against ALL matching scopes.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <Label className="flex items-center gap-2 text-ds-accent border-b border-ds-accent/30 pb-1 w-full"><Code className="h-4 w-4" /> JSONB Query Filters Configuration</Label>
                                    </div>
                                    <Textarea 
                                        value={filtersJson} 
                                        onChange={e => setFiltersJson(e.target.value)} 
                                        className="font-mono text-xs bg-ds-ink text-ds-success p-4 min-h-[150px] whitespace-pre" 
                                        spellCheck={false}
                                    />
                                    <p className="text-[11px] text-muted-foreground">Inject dynamic JSON filtering parameters intercepted natively by Supabase edge functions.</p>
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Cron Automation Schedule (UTC)</Label>
                                    <Input 
                                        value={selectedReport.schedule_cron || ''} 
                                        onChange={e => setSelectedReport({...selectedReport, schedule_cron: e.target.value})} 
                                        placeholder="0 2 * * *" 
                                        className="font-mono bg-ds-surface-subtle w-full sm:w-1/2" 
                                    />
                                    <p className="text-[11px] text-muted-foreground">Standard Linux cron syntax mapping to background pg_cron queues.</p>
                                </div>
                                
                                <div className="mt-8 pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="activeStatus"
                                            checked={Boolean(selectedReport.is_active)}
                                            onCheckedChange={checked => setSelectedReport({...selectedReport, is_active: checked})}
                                        />
                                        <Label htmlFor="activeStatus" className="font-semibold cursor-pointer">Enable Automation Routine</Label>
                                    </div>
                                    
                                    <div className="flex gap-2 shrink-0">
                                        <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedReport(null) }}>
                                            Discard Layout
                                        </Button>
                                        <Button onClick={handleSave} disabled={createReport.isPending || updateReport.isPending || !selectedReport.name} className="bg-ds-ink hover:bg-ds-ink/90 text-ds-on-ink shadow-md">
                                            {createReport.isPending || updateReport.isPending ? 'Syncing...' : 'Deploy Analytics Query'}
                                        </Button>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-ds-surface-subtle text-muted-foreground p-8">
                            <Database className="w-16 h-16 mb-4 opacity-10 text-ds-accent" />
                            <h3 className="text-xl font-medium text-ds-ink">Dynamic Queries Array</h3>
                            <p className="text-sm text-center max-w-sm mt-3 leading-relaxed">Establish automated extractions polling live datasets and outputting directly into secure file matrices.</p>
                        </div>
                    )}
                </div>
            </div>
            <FloatingAdminAI />
        </div>
    )
}
