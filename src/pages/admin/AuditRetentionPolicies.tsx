import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuditRetention, type AuditRetentionPolicy } from '@/hooks/admin/useAuditRetention'
import { Plus, Edit2, Trash2, ShieldCheck, DatabaseZap, CheckCircle2, AlertTriangle, FileText, FileSpreadsheet, FileJson, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { FloatingAdminAI } from '@/components/admin/AdminAIAssistant'

export default function AuditRetentionPolicies() {
    const { data: policies, isLoading, createPolicy, updatePolicy, deletePolicy } = useAuditRetention()
    const [selectedPolicy, setSelectedPolicy] = useState<Partial<AuditRetentionPolicy> | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const handleCreateNew = () => {
        setSelectedPolicy({
            policy_name: '',
            description: '',
            default_retention_days: 90,
            max_retention_days: 365,
            min_retention_days: 30,
            pdf_retention_days: 180,
            excel_retention_days: 90,
            csv_retention_days: 30,
            json_retention_days: 90,
            auto_soft_delete: true,
            auto_purge_after_days: 7,
            corporate_admin_retention_days: 365,
            compliance_officer_retention_days: 180,
            is_active: true,
            is_default: false
        })
        setIsEditing(true)
    }

    const handleSave = () => {
        if (!selectedPolicy?.policy_name) return

        // Clamp logic
        const p = { ...selectedPolicy }
        if (p.default_retention_days! > p.max_retention_days!) p.default_retention_days = p.max_retention_days!
        if (p.default_retention_days! < p.min_retention_days!) p.default_retention_days = p.min_retention_days!

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
                        Control cryptographic storage lifecycles and compliance deletion bounds for exported audit trails.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
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
                                                <CardTitle className="text-base font-semibold text-slate-800">{policy.policy_name}</CardTitle>
                                                <CardDescription className="text-xs line-clamp-2 mt-1">{policy.description}</CardDescription>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedPolicy(policy); setIsEditing(true); }}>
                                                <Edit2 className="h-3 w-3 text-indigo-600" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="flex gap-2 flex-wrap mb-4">
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Base: {policy.default_retention_days} Days
                                            </Badge>
                                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                                                Max: {policy.max_retention_days} Days
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground flex flex-col gap-1">
                                            <div className="flex justify-between"><span>PDF Retention:</span> <span className="font-mono text-slate-700">{policy.pdf_retention_days}d</span></div>
                                            <div className="flex justify-between"><span>CSV Retention:</span> <span className="font-mono text-slate-700">{policy.csv_retention_days}d</span></div>
                                            <div className="flex justify-between"><span>JSON Retention:</span> <span className="font-mono text-slate-700">{policy.json_retention_days}d</span></div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-3 border-t bg-slate-50 flex justify-between items-center text-xs">
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                checked={policy.is_active} 
                                                onCheckedChange={(checked) => updatePolicy.mutate({ id: policy.id, is_active: checked })}
                                            />
                                            <span>Active</span>
                                        </div>
                                        <Button size="icon" variant="ghost" className={`h-8 w-8 ${policy.is_default ? 'opacity-20 cursor-not-allowed' : 'hover:text-red-600'}`} disabled={policy.is_default} onClick={() => handleDelete(policy.id, policy.is_default)}>
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
                                <CardTitle className="text-xl text-slate-800">{selectedPolicy.id ? 'Tune Compliance Engine' : 'Configure New Lifecycle Policy'}</CardTitle>
                                <CardDescription>Establish precise boundaries ensuring exported documents are soft-deleted from storage networks after mandated business timescales.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                
                                <Tabs defaultValue="general" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100">
                                        <TabsTrigger value="general">Core Config</TabsTrigger>
                                        <TabsTrigger value="formats">Formats (PDF/CSV)</TabsTrigger>
                                        <TabsTrigger value="purge">Purge Limits</TabsTrigger>
                                    </TabsList>

                                    {/* GENERAL TAB */}
                                    <TabsContent value="general" className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-2">
                                                <Label>Ruleset Nomenclature</Label>
                                                <Input value={selectedPolicy.policy_name || ''} onChange={e => setSelectedPolicy({...selectedPolicy, policy_name: e.target.value})} placeholder="e.g. EU-GDPR Storage Law" className="font-medium" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label>Internal Description</Label>
                                                <Textarea value={selectedPolicy.description || ''} onChange={e => setSelectedPolicy({...selectedPolicy, description: e.target.value})} placeholder="Explain why this exists..." rows={2} />
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-4">
                                            <h4 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-2">Base Boundary Framework (Days)</h4>
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground text-left block">Absolute Minimum</Label>
                                                    <Input type="number" min={1} value={selectedPolicy.min_retention_days || 30} onChange={e => setSelectedPolicy({...selectedPolicy, min_retention_days: parseInt(e.target.value) || 0})} className="font-mono text-center text-lg" />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground text-left block">Standard Default</Label>
                                                    <Input type="number" min={1} value={selectedPolicy.default_retention_days || 90} onChange={e => setSelectedPolicy({...selectedPolicy, default_retention_days: parseInt(e.target.value) || 0})} className="font-mono text-center text-lg border-indigo-300" />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground text-left block">Absolute Maximum</Label>
                                                    <Input type="number" min={1} value={selectedPolicy.max_retention_days || 365} onChange={e => setSelectedPolicy({...selectedPolicy, max_retention_days: parseInt(e.target.value) || 0})} className="font-mono text-center text-lg text-red-600 bg-red-50 focus-visible:ring-red-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* FORMATS TAB */}
                                    <TabsContent value="formats" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-100 rounded text-red-600"><FileText className="h-5 w-5" /></div>
                                                    <div>
                                                        <Label className="font-medium">PDF Documents</Label>
                                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Signed formal records.</p>
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <Input type="number" value={selectedPolicy.pdf_retention_days || 180} onChange={e => setSelectedPolicy({...selectedPolicy, pdf_retention_days: parseInt(e.target.value) || 0})} className="font-mono" />
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-100 rounded text-green-700"><FileSpreadsheet className="h-5 w-5" /></div>
                                                    <div>
                                                        <Label className="font-medium">Excel (.xlsx)</Label>
                                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Formatted data sheets.</p>
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <Input type="number" value={selectedPolicy.excel_retention_days || 90} onChange={e => setSelectedPolicy({...selectedPolicy, excel_retention_days: parseInt(e.target.value) || 0})} className="font-mono" />
                                                </div>
                                            </div>

                                            <div className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 rounded text-slate-600"><DatabaseZap className="h-5 w-5" /></div>
                                                    <div>
                                                        <Label className="font-medium">CSV Data</Label>
                                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Raw unstructured text.</p>
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <Input type="number" value={selectedPolicy.csv_retention_days || 30} onChange={e => setSelectedPolicy({...selectedPolicy, csv_retention_days: parseInt(e.target.value) || 0})} className="font-mono" />
                                                </div>
                                            </div>

                                            <div className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-yellow-100 rounded text-yellow-600"><FileJson className="h-5 w-5" /></div>
                                                    <div>
                                                        <Label className="font-medium">JSON Payloads</Label>
                                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">API system outputs.</p>
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <Input type="number" value={selectedPolicy.json_retention_days || 90} onChange={e => setSelectedPolicy({...selectedPolicy, json_retention_days: parseInt(e.target.value) || 0})} className="font-mono" />
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* PURGE TAB */}
                                    <TabsContent value="purge" className="space-y-6">
                                        <div className="flex p-4 rounded-lg bg-red-50 border border-red-200 gap-4">
                                            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-bold text-red-900 leading-none">Automated Hard Deletion</h4>
                                                <p className="text-xs text-red-700 mt-2">When enabled, cron jobs will actively destroy physical bucket files and row data once timelines are eclipsed.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 items-start">
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <Switch 
                                                        id="autoSoftDelete" 
                                                        checked={Boolean(selectedPolicy.auto_soft_delete)} 
                                                        onCheckedChange={c => setSelectedPolicy({...selectedPolicy, auto_soft_delete: c})}
                                                    />
                                                    <Label htmlFor="autoSoftDelete" className="font-medium">Enable Automatic Expiration</Label>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Changes database status to `expired` preventing further UI visibility via soft-delete logic.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Hard Purge Grace Period (Days)</Label>
                                                <Input type="number" value={selectedPolicy.auto_purge_after_days || 7} onChange={e => setSelectedPolicy({...selectedPolicy, auto_purge_after_days: parseInt(e.target.value) || 0})} className="font-mono max-w-[150px]" />
                                                <p className="text-[11px] text-muted-foreground">Number of days to wait after soft deletion before executing absolute cryptographic purge from the storage drives.</p>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    
                                </Tabs>

                                <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
                                        <Switch
                                            id="defaultStatus"
                                            checked={Boolean(selectedPolicy.is_default)}
                                            onCheckedChange={checked => setSelectedPolicy({...selectedPolicy, is_default: checked})}
                                        />
                                        <Label htmlFor="defaultStatus" className="text-indigo-900 font-semibold cursor-pointer">Enforce as Application Default</Label>
                                    </div>
                                    
                                    <div className="flex gap-2 shrink-0">
                                        <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedPolicy(null) }}>
                                            Discard Changes
                                        </Button>
                                        <Button onClick={handleSave} disabled={createPolicy.isPending || updatePolicy.isPending || !selectedPolicy.policy_name} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                                            {createPolicy.isPending || updatePolicy.isPending ? 'Propagating...' : 'Commit Protocol'}
                                        </Button>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50/50 text-muted-foreground p-8">
                            <ShieldCheck className="w-16 h-16 mb-4 opacity-10 text-indigo-600" />
                            <h3 className="text-xl font-medium text-slate-800">Retention Matrix</h3>
                            <p className="text-sm text-center max-w-sm mt-3 leading-relaxed">Select a governance framework from the registry to manipulate legal file expiration constraints, or draft a localized regulation protocol.</p>
                        </div>
                    )}
                </div>
            </div>
            <FloatingAdminAI />
        </div>
    )
}
