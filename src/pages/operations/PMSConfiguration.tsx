import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
    ArrowLeft,
    Building2,
    Settings,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Clock,
    Plug,
    Save,
    Edit,
    XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { usePMSSystems } from '@/hooks/useOperations'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { PMSSystem, PMSType } from '@/types/operations'
import { format } from 'date-fns'

const PMS_TYPE_INFO: Record<PMSType, { name: string; color: string; description: string }> = {
    opera: {
        name: 'Oracle Opera',
        color: 'bg-red-500',
        description: 'Enterprise PMS for large hotel chains'
    },
    cloudbeds: {
        name: 'Cloudbeds',
        color: 'bg-blue-500',
        description: 'All-in-one hospitality management platform'
    },
    mews: {
        name: 'Mews',
        color: 'bg-purple-500',
        description: 'Modern cloud-native PMS'
    },
    local: {
        name: 'Local PMS',
        color: 'bg-gray-500',
        description: 'On-premise or custom PMS solution'
    },
    other: {
        name: 'Other',
        color: 'bg-orange-500',
        description: 'Other or pending configuration'
    }
}

function PMSCard({ pms, onEdit }: { pms: PMSSystem; onEdit: () => void }) {
    const typeInfo = PMS_TYPE_INFO[pms.pms_type]
    const lastSyncFormatted = pms.last_sync_at
        ? format(new Date(pms.last_sync_at), 'MMM d, yyyy HH:mm')
        : 'Never'

    return (
        <Card className={cn("transition-all hover:shadow-md", !pms.is_active && "opacity-60")}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", typeInfo.color)}>
                            <Plug className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{pms.property?.name || 'Unknown Property'}</CardTitle>
                            <CardDescription>{typeInfo.name}</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pms.is_active ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                            <Badge variant="secondary">Inactive</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">PMS Name</p>
                        <p className="font-medium">{pms.pms_name}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Sync Frequency</p>
                        <p className="font-medium capitalize">{pms.sync_frequency}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Cutoff Time</p>
                        <p className="font-medium">{pms.reporting_cutoff_time}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <p className="font-medium">{lastSyncFormatted}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                        {pms.sync_status === 'completed' && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Synced
                            </Badge>
                        )}
                        {pms.sync_status === 'pending' && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                            </Badge>
                        )}
                        {pms.sync_status === 'failed' && (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Failed
                            </Badge>
                        )}
                        {pms.sync_status === 'syncing' && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Syncing
                            </Badge>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Configure
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

interface EditPMSDialogProps {
    pms: PMSSystem | null
    open: boolean
    onClose: () => void
    onSave: () => void
}

function EditPMSDialog({ pms, open, onClose, onSave }: EditPMSDialogProps) {
    const [formData, setFormData] = useState({
        pms_type: pms?.pms_type || 'other',
        pms_name: pms?.pms_name || '',
        api_endpoint: pms?.api_endpoint || '',
        sync_frequency: pms?.sync_frequency || 'daily',
        reporting_cutoff_time: pms?.reporting_cutoff_time || '23:00:00',
        is_active: pms?.is_active ?? true
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!pms?.id) return

        setSaving(true)
        try {
            const { error } = await supabase
                .from('pms_systems')
                .update({
                    pms_type: formData.pms_type,
                    pms_name: formData.pms_name,
                    api_endpoint: formData.api_endpoint || null,
                    sync_frequency: formData.sync_frequency,
                    reporting_cutoff_time: formData.reporting_cutoff_time,
                    is_active: formData.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pms.id)

            if (error) throw error

            toast({
                title: 'Configuration saved',
                description: 'PMS settings have been updated successfully.'
            })
            onSave()
            onClose()
        } catch (err) {
            toast({
                title: 'Error saving configuration',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    // Update form when pms changes
    if (pms && formData.pms_name !== pms.pms_name) {
        setFormData({
            pms_type: pms.pms_type,
            pms_name: pms.pms_name,
            api_endpoint: pms.api_endpoint || '',
            sync_frequency: pms.sync_frequency,
            reporting_cutoff_time: pms.reporting_cutoff_time,
            is_active: pms.is_active
        })
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Configure PMS</DialogTitle>
                    <DialogDescription>
                        {pms?.property?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>PMS Type</Label>
                        <Select
                            value={formData.pms_type}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, pms_type: v as PMSType }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(PMS_TYPE_INFO).map(([key, info]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", info.color)} />
                                            {info.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                            value={formData.pms_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, pms_name: e.target.value }))}
                            placeholder="e.g., Oracle Opera PMS"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>API Endpoint (Optional)</Label>
                        <Input
                            value={formData.api_endpoint}
                            onChange={(e) => setFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                            placeholder="https://api.example.com/v1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Sync Frequency</Label>
                            <Select
                                value={formData.sync_frequency}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, sync_frequency: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Cutoff Time</Label>
                            <Input
                                type="time"
                                value={formData.reporting_cutoff_time.slice(0, 5)}
                                onChange={(e) => setFormData(prev => ({ ...prev, reporting_cutoff_time: e.target.value + ':00' }))}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                            <Label>Active</Label>
                            <p className="text-xs text-muted-foreground">Enable data sync for this PMS</p>
                        </div>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PMSConfiguration() {
    const { t } = useTranslation(['operations', 'common'])
    const queryClient = useQueryClient()
    const { data: pmsSystems, isLoading } = usePMSSystems()
    const [editingPMS, setEditingPMS] = useState<PMSSystem | null>(null)

    const handleSave = () => {
        queryClient.invalidateQueries({ queryKey: ['pms-systems'] })
    }

    const activeSystems = pmsSystems?.filter(p => p.is_active) || []
    const inactiveSystems = pmsSystems?.filter(p => !p.is_active) || []

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/operations">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('operations:config.title', 'PMS Configuration')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('operations:config.subtitle', 'Manage Property Management System integrations')}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{pmsSystems?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Properties</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeSystems.length}</p>
                                <p className="text-sm text-muted-foreground">Active Integrations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <RefreshCw className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {pmsSystems?.filter(p => p.sync_status === 'completed').length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Synced Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {pmsSystems?.filter(p => p.sync_status === 'failed').length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Sync Errors</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PMS Cards */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="h-48" />
                        </Card>
                    ))}
                </div>
            ) : (
                <>
                    {activeSystems.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Active Integrations</h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {activeSystems.map(pms => (
                                    <PMSCard
                                        key={pms.id}
                                        pms={pms}
                                        onEdit={() => setEditingPMS(pms)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {inactiveSystems.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Inactive Integrations</h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {inactiveSystems.map(pms => (
                                    <PMSCard
                                        key={pms.id}
                                        pms={pms}
                                        onEdit={() => setEditingPMS(pms)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit Dialog */}
            <EditPMSDialog
                pms={editingPMS}
                open={!!editingPMS}
                onClose={() => setEditingPMS(null)}
                onSave={handleSave}
            />
        </div>
    )
}
