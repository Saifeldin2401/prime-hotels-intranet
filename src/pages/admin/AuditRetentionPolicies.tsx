import { FloatingAdminAI } from '@/components/admin/AdminAIAssistant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuditRetention, type AuditRetentionPolicy } from '@/hooks/admin/useAuditRetention'
import { AlertTriangle, CheckCircle2, Clock, DatabaseZap, Edit2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const EXPORT_FORMATS = ['pdf', 'excel', 'csv', 'json']

export default function AuditRetentionPolicies() {
    const { t } = useTranslation(['admin', 'common'])
    const { data: policies, isLoading, createPolicy, updatePolicy, deletePolicy } = useAuditRetention()
    const [selectedPolicy, setSelectedPolicy] = useState<Partial<AuditRetentionPolicy> | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const handleCreateNew = () => {
        setSelectedPolicy({
            name: '',
            description: '',
            retention_days: 90,
            applies_to_formats: [...EXPORT_FORMATS],
            auto_delete: false,
            notify_before_delete_days: 7,
            is_default: false
        })
        setIsEditing(true)
    }

    const toggleFormat = (format: string, checked: boolean) => {
        setSelectedPolicy(prev => {
            if (!prev) return prev
            const formats = new Set(prev.applies_to_formats || [])
            if (checked) formats.add(format)
            else formats.delete(format)
            return { ...prev, applies_to_formats: Array.from(formats) }
        })
    }

    const handleSave = () => {
        if (!selectedPolicy?.name) return

        const p = { ...selectedPolicy }
        if (p.id) {
            updatePolicy.mutate(p as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedPolicy(null)
                }
            })
        } else {
            createPolicy.mutate(p as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedPolicy(null)
                }
            })
        }
    }

    const handleDelete = (id: string, isDefault: boolean) => {
        if (isDefault) return
        if (window.confirm("Permanently destroy this retention ruleset? Extracted data will fall back to other policies.")) {
            deletePolicy.mutate(id)
            if (selectedPolicy?.id === id) {
                setIsEditing(false)
                setSelectedPolicy(null)
            }
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-hotel-slate flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-indigo-600" />
                        Audit Export Retention Policies
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Control how long exported audit trails are kept and when they're deleted.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="h-4 w-4 me-2" />
                        Draft New Policy
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: List of Policies */}
                <div className={`lg:col-span-4 space-y-4 ${isEditing ? 'hidden lg:block opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid grid-cols-1 gap-4">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Scanning compliance rules...</p>
                        ) : policies?.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                                    <DatabaseZap className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                                    <p className="text-sm font-medium">No retention policies discovered.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Files may be stored indefinitely without limits.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            policies?.map(policy => (
                                <Card key={policy.id} className={`overflow-hidden transition-all hover:border-indigo-400 ${policy.is_default ? 'border-2 border-indigo-500 shadow-md ring-1 ring-indigo-200' : ''}`}>
                                    {policy.is_default && (
                                        <div className="bg-indigo-600 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> PRIMARY DATA GOVERNANCE
                                        </div>
                                    )}
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base font-semibold text-slate-800">{policy.name}</CardTitle>
                                                <CardDescription className="text-xs line-clamp-2 mt-1">{policy.description}</CardDescription>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedPolicy(policy); setIsEditing(true); }} aria-label={t('accessibility.edit_policy', 'Edit Policy')}>
                                                <Edit2 className="h-3 w-3 text-indigo-600" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="flex gap-2 flex-wrap mb-4">
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Retention: {policy.retention_days} Days
                                            </Badge>
                                            {policy.auto_delete && (
                                                <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                                                    Auto-delete
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                                            {(policy.applies_to_formats || []).map(fmt => (
                                                <Badge key={fmt} variant="outline" className="uppercase text-[10px]">{fmt}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-3 border-t bg-slate-50 flex justify-end items-center text-xs">
                                        <Button size="icon" variant="ghost" className={`h-8 w-8 ${policy.is_default ? 'opacity-20 cursor-not-allowed' : 'hover:text-red-600'}`} disabled={policy.is_default} onClick={() => handleDelete(policy.id, policy.is_default)} aria-label={t('accessibility.delete_policy', 'Delete Policy')}>
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
                    {isEditing && selectedPolicy ? (
                        <Card className="border-t-4 border-t-indigo-600 shadow-xl overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b pb-6">
                                <CardTitle className="text-xl text-slate-800">{selectedPolicy.id ? 'Edit Retention Policy' : 'New Retention Policy'}</CardTitle>
                                <CardDescription>Set how long exported audit files are kept before being deleted.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Policy Name</Label>
                                        <Input value={selectedPolicy.name || ''} onChange={e => setSelectedPolicy({ ...selectedPolicy, name: e.target.value })} placeholder="e.g. EU-GDPR Storage Policy" className="font-medium" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Description</Label>
                                        <Textarea value={selectedPolicy.description || ''} onChange={e => setSelectedPolicy({ ...selectedPolicy, description: e.target.value })} placeholder="Explain why this exists..." rows={2} />
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Retention Period (Days)</Label>
                                    <Input type="number" min={1} value={selectedPolicy.retention_days ?? 90} onChange={e => setSelectedPolicy({ ...selectedPolicy, retention_days: parseInt(e.target.value) || 0 })} className="font-mono max-w-[150px]" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Applies To Formats</Label>
                                    <div className="flex gap-4 flex-wrap">
                                        {EXPORT_FORMATS.map(fmt => (
                                            <div key={fmt} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`fmt-${fmt}`}
                                                    checked={(selectedPolicy.applies_to_formats || []).includes(fmt)}
                                                    onCheckedChange={(checked) => toggleFormat(fmt, checked === true)}
                                                />
                                                <Label htmlFor={`fmt-${fmt}`} className="uppercase text-sm font-normal">{fmt}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex p-4 rounded-lg bg-red-50 border border-red-200 gap-4">
                                    <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-red-900 leading-none">Automated Deletion</h4>
                                            <p className="text-xs text-red-700 mt-2">When enabled, matching audit exports are deleted once the retention period has passed.</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="autoDelete"
                                                checked={Boolean(selectedPolicy.auto_delete)}
                                                onCheckedChange={c => setSelectedPolicy({ ...selectedPolicy, auto_delete: c })}
                                            />
                                            <Label htmlFor="autoDelete" className="font-medium">Enable Automatic Deletion</Label>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Notify Before Delete (Days)</Label>
                                            <Input type="number" min={0} value={selectedPolicy.notify_before_delete_days ?? 7} onChange={e => setSelectedPolicy({ ...selectedPolicy, notify_before_delete_days: parseInt(e.target.value) || 0 })} className="font-mono max-w-[150px]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
                                        <Switch
                                            id="defaultStatus"
                                            checked={Boolean(selectedPolicy.is_default)}
                                            onCheckedChange={checked => setSelectedPolicy({ ...selectedPolicy, is_default: checked })}
                                        />
                                        <Label htmlFor="defaultStatus" className="text-indigo-900 font-semibold cursor-pointer">Set as Default Policy</Label>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedPolicy(null) }}>
                                            Discard Changes
                                        </Button>
                                        <Button onClick={handleSave} disabled={createPolicy.isPending || updatePolicy.isPending || !selectedPolicy.name} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                                            {createPolicy.isPending || updatePolicy.isPending ? 'Saving...' : 'Save Policy'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50/50 text-muted-foreground p-8">
                            <ShieldCheck className="w-16 h-16 mb-4 opacity-10 text-indigo-600" />
                            <h3 className="text-xl font-medium text-slate-800">Retention Policies</h3>
                            <p className="text-sm text-center max-w-sm mt-3 leading-relaxed">Select a policy from the list to edit it, or draft a new one.</p>
                        </div>
                    )}
                </div>
            </div>
            <FloatingAdminAI />
        </div>
    )
}
