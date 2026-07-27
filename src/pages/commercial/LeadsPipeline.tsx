import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
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
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateCrmLead, useCrmLeads, useUpdateCrmLeadStage } from '@/hooks/useCrmLeads'
import type { CrmLead } from '@/lib/types/commercial'
import { cn } from '@/lib/utils'
import { Plus, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const STAGES: { stage: CrmLead['stage']; color: string }[] = [
    { stage: 'new', color: 'bg-gray-50 border-gray-200' },
    { stage: 'qualified', color: 'bg-blue-50 border-blue-200' },
    { stage: 'proposal', color: 'bg-purple-50 border-purple-200' },
    { stage: 'negotiation', color: 'bg-orange-50 border-orange-200' },
    { stage: 'won', color: 'bg-green-50 border-green-200' },
    { stage: 'lost', color: 'bg-red-50 border-red-200' }
]

export default function LeadsPipeline() {
    const { t } = useTranslation(['commercial', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: leads, isLoading } = useCrmLeads(propertyId)
    const createMutation = useCreateCrmLead()
    const updateStage = useUpdateCrmLeadStage()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ lead_name: '', source: '', estimated_value: '' })

    const leadsByStage = useMemo(() => {
        const grouped: Record<string, CrmLead[]> = {}
        for (const s of STAGES) grouped[s.stage] = []
        for (const lead of leads || []) {
            grouped[lead.stage] = grouped[lead.stage] || []
            grouped[lead.stage].push(lead)
        }
        return grouped
    }, [leads])

    const resetForm = () => setFormData({ lead_name: '', source: '', estimated_value: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                lead_name: formData.lead_name,
                source: formData.source || undefined,
                estimated_value: formData.estimated_value ? Number(formData.estimated_value) : undefined,
                created_by: user.id
            })
            toast({ title: t('commercial:leads.success.created', { defaultValue: 'Lead added' }) })
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

    const handleAdvanceStage = (lead: CrmLead, nextStage: CrmLead['stage']) => {
        updateStage.mutate({ id: lead.id, stage: nextStage })
    }

    if (!propertyId) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Target}
                    title={t('commercial:leads.no_property', { defaultValue: 'No property assigned' })}
                    description={t('commercial:leads.no_property_desc', { defaultValue: 'You need an assigned property to manage leads.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('commercial:leads.title', { defaultValue: 'Leads Pipeline' })}
                description={t('commercial:leads.description', { defaultValue: 'Track sales opportunities from first contact to close.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('commercial:leads.add_lead', { defaultValue: 'Add Lead' })}
                    </Button>
                }
            />

            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
            ) : leads && leads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {STAGES.map((s, idx) => (
                        <div key={s.stage} className={cn('rounded-lg border p-3 space-y-2 min-h-[140px]', s.color)}>
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm capitalize">
                                    {t(`commercial:leads.stage_${s.stage}`, { defaultValue: s.stage })}
                                </h4>
                                <span className="text-xs text-muted-foreground">{leadsByStage[s.stage]?.length || 0}</span>
                            </div>
                            <div className="space-y-1.5">
                                {(leadsByStage[s.stage] || []).map((lead) => {
                                    const nextStage = idx < STAGES.length - 2 ? STAGES[idx + 1].stage : null
                                    return (
                                        <div key={lead.id} className="bg-white rounded border px-2 py-1.5 text-sm space-y-1">
                                            <p className="font-medium">{lead.lead_name}</p>
                                            {lead.estimated_value != null && (
                                                <p className="text-xs text-muted-foreground">{lead.estimated_value.toLocaleString()}</p>
                                            )}
                                            {nextStage && lead.stage !== 'won' && lead.stage !== 'lost' && (
                                                <button
                                                    onClick={() => handleAdvanceStage(lead, nextStage)}
                                                    disabled={updateStage.isPending}
                                                    className="text-xs text-hotel-gold hover:underline"
                                                >
                                                    {t('commercial:leads.advance', { defaultValue: 'Advance →' })}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={Target}
                    title={t('commercial:leads.no_data', { defaultValue: 'No leads yet' })}
                    description={t('commercial:leads.no_data_desc', { defaultValue: 'Add your first sales opportunity.' })}
                    action={{
                        label: t('commercial:leads.add_lead', { defaultValue: 'Add Lead' }),
                        onClick: () => { resetForm(); setIsDialogOpen(true) },
                        icon: Plus
                    }}
                />
            )}

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('commercial:leads.add_lead', { defaultValue: 'Add Lead' })}</DialogTitle>
                        <DialogDescription>
                            {t('commercial:leads.add_new_desc', { defaultValue: 'Record a new sales opportunity.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="lead_name">{t('commercial:leads.name_label', { defaultValue: 'Lead Name' })}</Label>
                            <Input id="lead_name" value={formData.lead_name} onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="source">{t('commercial:leads.source_label', { defaultValue: 'Source' })}</Label>
                                <Input id="source" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estimated_value">{t('commercial:leads.value_label', { defaultValue: 'Estimated Value' })}</Label>
                                <Input id="estimated_value" type="number" value={formData.estimated_value} onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.lead_name}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
