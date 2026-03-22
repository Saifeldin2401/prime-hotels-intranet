import { FloatingAdminAI } from '@/components/admin/AdminAIAssistant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from '@/components/ui/textarea'
import { useSIEMIntegrations, type SIEMAuthType, type SIEMIntegration, type SIEMProvider } from '@/hooks/admin/useSIEMIntegrations'
import { format } from 'date-fns'
import { Activity, AlertCircle, CheckCircle2, Edit2, Filter, Key, Plus, Server, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function SIEMIntegrations() {
    const { t } = useTranslation(['admin', 'common'])
    const { data: integrations, isLoading, createIntegration, updateIntegration, deleteIntegration, toggleStatus } = useSIEMIntegrations()

    const [selectedIntegration, setSelectedIntegration] = useState<Partial<SIEMIntegration> | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const providers: { value: SIEMProvider; label: string }[] = [
        { value: 'splunk', label: 'Splunk HEC' },
        { value: 'elastic', label: 'Elasticsearch / ELK' },
        { value: 'datadog', label: 'Datadog' },
        { value: 'sumo_logic', label: 'Sumo Logic' },
        { value: 'azure_sentinel', label: 'Azure Sentinel' },
        { value: 'google_chronicle', label: 'Google Chronicle' },
        { value: 'custom_webhook', label: 'Custom HTTP Webhook' }
    ]

    const handleCreateNew = () => {
        setSelectedIntegration({
            name: '',
            description: '',
            provider: 'splunk',
            webhook_url: '',
            auth_type: 'bearer',
            auth_config: {},
            event_filter: { entity_types: [], actions: [], min_severity: 'info' },
            rate_limit_per_minute: 100,
            is_active: true
        })
        setIsEditing(true)
    }

    const handleSave = () => {
        if (!selectedIntegration?.name || !selectedIntegration?.webhook_url) return

        if (selectedIntegration.id) {
            updateIntegration.mutate({ id: selectedIntegration.id, ...selectedIntegration } as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedIntegration(null)
                }
            })
        } else {
            createIntegration.mutate(selectedIntegration as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedIntegration(null)
                }
            })
        }
    }

    const handleDelete = (id: string) => {
        if (window.confirm(t('common:actions.delete', 'Are you sure you want to delete this?'))) {
            deleteIntegration.mutate(id)
            if (selectedIntegration?.id === id) {
                setIsEditing(false)
                setSelectedIntegration(null)
            }
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-hotel-slate">
                        {t('admin:siem.title', 'SIEM Integrations')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('admin:siem.desc', 'Configure outbound audit webhooks for monitoring tools.')}
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={handleCreateNew} className="bg-hotel-gold hover:bg-hotel-gold/90 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('admin:siem.add_integration', 'Add Integration')}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: List of Integrations */}
                <div className={`lg:col-span-4 space-y-4 ${isEditing ? 'hidden lg:block opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid grid-cols-1 gap-4">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Loading connections...</p>
                        ) : integrations?.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                                    <Server className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                                    <p className="text-sm font-medium">No integrations configured</p>
                                    <p className="text-xs text-muted-foreground mt-1">Audit logs are currently only stored internally.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            integrations?.map(integration => (
                                <Card key={integration.id} className="overflow-hidden hover:border-hotel-gold/50 transition-colors">
                                    <div className={`h-1 w-full ${integration.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base font-semibold">{integration.name}</CardTitle>
                                                <CardDescription className="text-xs uppercase tracking-wider text-hotel-gold mt-1">
                                                    {providers.find(p => p.value === integration.provider)?.label || integration.provider}
                                                </CardDescription>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedIntegration(integration); setIsEditing(true); }}>
                                                    <Edit2 className="h-3 w-3 text-blue-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="flex flex-col gap-2 text-xs">
                                            <div className="flex justify-between items-center text-muted-foreground">
                                                <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Sent</span>
                                                <span className="font-mono">{integration.total_events_sent.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-red-600">
                                                <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed</span>
                                                <span className="font-mono">{integration.total_events_failed.toLocaleString()}</span>
                                            </div>
                                            {integration.last_success_at && (
                                                <div className="flex items-center gap-1 text-green-600 mt-2">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span className="truncate">Last Ping: {format(new Date(integration.last_success_at), 'PP p')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-2 border-t bg-slate-50 flex justify-between items-center">
                                        <div className="flex items-center space-x-2 px-2">
                                            <Switch 
                                                checked={integration.is_active} 
                                                onCheckedChange={(checked) => toggleStatus.mutate({ id: integration.id, is_active: checked })}
                                            />
                                            <span className="text-xs font-medium">{integration.is_active ? 'Active' : 'Paused'}</span>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-600" onClick={() => handleDelete(integration.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className={`lg:col-span-8 ${!isEditing ? 'hidden lg:block' : ''}`}>
                    {isEditing && selectedIntegration ? (
                        <Card className="border-t-4 border-t-brand-purple shadow-lg">
                            <CardHeader>
                                <CardTitle>{selectedIntegration.id ? 'Edit Configuration' : 'New Configuration'}</CardTitle>
                                <CardDescription>Map audit events to an external system for compliance cold-storage and threat detection.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="connection" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 mb-6">
                                        <TabsTrigger value="connection"><Server className="h-4 w-4 mr-2" /> Connection</TabsTrigger>
                                        <TabsTrigger value="auth"><Key className="h-4 w-4 mr-2" /> Authentication</TabsTrigger>
                                        <TabsTrigger value="filtering"><Filter className="h-4 w-4 mr-2" /> Filtering</TabsTrigger>
                                    </TabsList>

                                    {/* CONNECTION TAB */}
                                    <TabsContent value="connection" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Integration Name</Label>
                                                <Input value={selectedIntegration.name || ''} onChange={e => setSelectedIntegration({...selectedIntegration, name: e.target.value})} placeholder="e.g. Splunk SOC Primary" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Target Provider</Label>
                                                <Select value={selectedIntegration.provider} onValueChange={(v: SIEMProvider) => setSelectedIntegration({...selectedIntegration, provider: v})}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {providers.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Webhook Endpoint URL</Label>
                                            <Input value={selectedIntegration.webhook_url || ''} onChange={e => setSelectedIntegration({...selectedIntegration, webhook_url: e.target.value})} placeholder="https://api.your-splunk-cloud.com/services/collector/raw" className="font-mono text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Optional Description</Label>
                                            <Textarea value={selectedIntegration.description || ''} onChange={e => setSelectedIntegration({...selectedIntegration, description: e.target.value})} placeholder="Receives PII read access logs..." rows={2} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Rate Limit (Events per minute)</Label>
                                            <Input type="number" value={selectedIntegration.rate_limit_per_minute || 100} onChange={e => setSelectedIntegration({...selectedIntegration, rate_limit_per_minute: parseInt(e.target.value) || 100})} />
                                        </div>
                                    </TabsContent>

                                    {/* AUTHENTICATION TAB */}
                                    <TabsContent value="auth" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Authentication Strategy</Label>
                                            <Select value={selectedIntegration.auth_type} onValueChange={(v: SIEMAuthType) => setSelectedIntegration({...selectedIntegration, auth_type: v})}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Authentication</SelectItem>
                                                    <SelectItem value="bearer">Bearer Token</SelectItem>
                                                    <SelectItem value="basic">Basic Auth</SelectItem>
                                                    <SelectItem value="api_key">API Key Header</SelectItem>
                                                    <SelectItem value="hmac">HMAC Signature</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 p-4 bg-slate-50 border rounded-lg">
                                            <Label>Auth JSON Configuration</Label>
                                            <p className="text-xs text-muted-foreground mb-2">Define the token or keys required by the strategy above.</p>
                                            <Textarea 
                                                value={JSON.stringify(selectedIntegration.auth_config || {}, null, 2)} 
                                                onChange={e => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        setSelectedIntegration({...selectedIntegration, auth_config: parsed});
                                                    } catch (_err) {
                                                        // Ignore invalid JSON while the admin is editing.
                                                    }
                                                }}
                                                className="font-mono text-sm min-h-[150px]" 
                                                placeholder={'{\n  "token": "your-splunk-hec-token"\n}'}
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* FILTERING TAB */}
                                    <TabsContent value="filtering" className="space-y-4">
                                        <div className="space-y-2 p-4 bg-slate-50 border rounded-lg">
                                            <Label>Event Filter JSON Payload</Label>
                                            <p className="text-xs text-muted-foreground mb-2">Restrict which audit events trigger this webhook.</p>
                                            <Textarea 
                                                value={JSON.stringify(selectedIntegration.event_filter || {}, null, 2)} 
                                                onChange={e => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        setSelectedIntegration({...selectedIntegration, event_filter: parsed});
                                                    } catch (_err) {
                                                        // Ignore invalid JSON while the admin is editing.
                                                    }
                                                }}
                                                className="font-mono text-sm min-h-[150px]" 
                                                placeholder={'{\n  "entity_types": ["profiles", "documents"],\n  "actions": ["create", "delete", "export"]\n}'}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline">Entity Type Filtering</Badge>
                                            <Badge variant="outline">Action Filtering</Badge>
                                            <Badge variant="outline">Severity Thresholds</Badge>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="flex items-center space-x-2 pt-6 mt-6 border-t">
                                    <Switch
                                        id="activeStatus"
                                        checked={Boolean(selectedIntegration.is_active)}
                                        onCheckedChange={checked => setSelectedIntegration({...selectedIntegration, is_active: checked})}
                                    />
                                    <Label htmlFor="activeStatus">Enable event streaming immediately</Label>
                                </div>

                                <div className="flex flex-row-reverse gap-3 pt-6">
                                    <Button onClick={handleSave} disabled={createIntegration.isPending || updateIntegration.isPending} className="bg-brand-purple hover:bg-brand-purple/90 text-white">
                                        {createIntegration.isPending || updateIntegration.isPending ? 'Saving...' : t('common:actions.save', 'Save Configuration')}
                                    </Button>
                                    <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedIntegration(null) }}>
                                        {t('common:actions.cancel', 'Cancel')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50 text-muted-foreground p-8">
                            <Server className="w-12 h-12 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-slate-700">SIEM Settings</h3>
                            <p className="text-sm text-center max-w-sm mt-2">Select an endpoint config to view connection strings or filter rules, or add a new Integration.</p>
                        </div>
                    )}
                </div>
            </div>
            <FloatingAdminAI />
        </div>
    )
}
