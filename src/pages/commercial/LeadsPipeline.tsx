import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateCrmLead, useCrmLeads, useUpdateCrmLeadStage } from '@/hooks/useCrmLeads'
import type { CrmLead } from '@/lib/types/commercial'
import { cn } from '@/lib/utils'
import { Plus, Target, TrendingUp, DollarSign, Award, ArrowRight, Search, CheckCircle, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'
import { motion } from 'framer-motion'

const STAGES: { stage: CrmLead['stage']; labelKey: string; color: string; badgeColor: string }[] = [
    { stage: 'new', labelKey: 'New', color: 'bg-slate-50/80 border-slate-200', badgeColor: 'bg-slate-100 text-slate-700' },
    { stage: 'qualified', labelKey: 'Qualified', color: 'bg-blue-50/60 border-blue-200', badgeColor: 'bg-blue-100 text-blue-700' },
    { stage: 'proposal', labelKey: 'Proposal', color: 'bg-purple-50/60 border-purple-200', badgeColor: 'bg-purple-100 text-purple-700' },
    { stage: 'negotiation', labelKey: 'Negotiation', color: 'bg-amber-50/60 border-amber-200', badgeColor: 'bg-amber-100 text-amber-700' },
    { stage: 'won', labelKey: 'Won', color: 'bg-emerald-50/60 border-emerald-200', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { stage: 'lost', labelKey: 'Lost', color: 'bg-rose-50/60 border-rose-200', badgeColor: 'bg-rose-100 text-rose-700' }
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

    const [searchQuery, setSearchQuery] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ lead_name: '', source: '', estimated_value: '' })

    const filteredLeads = useMemo(() => {
        if (!leads) return []
        if (!searchQuery.trim()) return leads
        const q = searchQuery.toLowerCase()
        return leads.filter(l => l.lead_name.toLowerCase().includes(q) || (l.source && l.source.toLowerCase().includes(q)))
    }, [leads, searchQuery])

    const leadsByStage = useMemo(() => {
        const grouped: Record<string, CrmLead[]> = {}
        for (const s of STAGES) grouped[s.stage] = []
        for (const lead of filteredLeads) {
            grouped[lead.stage] = grouped[lead.stage] || []
            grouped[lead.stage].push(lead)
        }
        return grouped
    }, [filteredLeads])

    const metrics = useMemo(() => {
        const allLeads = leads || []
        const activeLeads = allLeads.filter(l => l.stage !== 'won' && l.stage !== 'lost')
        const pipelineValue = activeLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
        const wonValue = allLeads.filter(l => l.stage === 'won').reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
        const closedCount = allLeads.filter(l => l.stage === 'won' || l.stage === 'lost').length
        const wonCount = allLeads.filter(l => l.stage === 'won').length
        const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0

        return {
            pipelineValue,
            wonValue,
            activeCount: activeLeads.length,
            winRate
        }
    }, [leads])

    const resetForm = () => setFormData({ lead_name: '', source: '', estimated_value: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
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
        } catch (error: any) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error?.message || String(error),
                variant: 'destructive'
            })
        }
    }

    const handleAdvanceStage = (lead: CrmLead, nextStage: CrmLead['stage']) => {
        updateStage.mutate({ id: lead.id, stage: nextStage })
    }

    if (!isRealPropertyId(propertyId)) {
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
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm">
                        <Plus className="w-4 h-4 me-2" />
                        {t('commercial:leads.add_lead', { defaultValue: 'Add Lead' })}
                    </Button>
                }
            />

            {/* KPI Summary Cards */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pipeline Value</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            SAR {metrics.pipelineValue.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Won Revenue</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                            SAR {metrics.wonValue.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Deals</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            {metrics.activeCount}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</p>
                        <p className="text-2xl font-bold text-purple-600 mt-0.5">
                            {metrics.winRate}%
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Filter & Search Bar */}
            <div className="flex items-center justify-between gap-4 py-2">
                <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search leads by name or source..."
                        className="ps-9 bg-white"
                    />
                </div>
            </div>

            {/* Pipeline Columns */}
            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading pipeline…' })}</div>
            ) : leads && leads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
                    {STAGES.map((s, idx) => {
                        const stageLeads = leadsByStage[s.stage] || []
                        const stageTotal = stageLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)

                        return (
                            <div key={s.stage} className={cn('rounded-xl border p-3.5 space-y-3 min-h-[350px] flex flex-col', s.color)}>
                                {/* Stage Header */}
                                <div className="pb-2 border-b border-gray-200/60 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-sm text-gray-900 capitalize flex items-center gap-1.5">
                                            {t(`commercial:leads.stage_${s.stage}`, { defaultValue: s.labelKey })}
                                            <Badge variant="secondary" className={cn('text-xs px-1.5 py-0.5 font-medium', s.badgeColor)}>
                                                {stageLeads.length}
                                            </Badge>
                                        </h4>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                                            SAR {stageTotal.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Cards List */}
                                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pe-0.5">
                                    {stageLeads.map((lead) => {
                                        const nextStage = idx < STAGES.length - 2 ? STAGES[idx + 1].stage : null

                                        return (
                                            <motion.div
                                                key={lead.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className="bg-white rounded-lg border border-gray-200/80 p-3 shadow-sm hover:shadow-md transition-shadow space-y-2"
                                            >
                                                <div className="flex items-start justify-between gap-1">
                                                    <p className="font-semibold text-sm text-gray-900 leading-tight">{lead.lead_name}</p>
                                                    {lead.source && (
                                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-gray-500 border-gray-200 px-1 py-0">
                                                            {lead.source}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {lead.estimated_value != null && (
                                                    <p className="text-xs font-bold text-gray-800">
                                                        SAR {Number(lead.estimated_value).toLocaleString()}
                                                    </p>
                                                )}

                                                {/* Stage Action Controls */}
                                                {lead.stage !== 'won' && lead.stage !== 'lost' && (
                                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-xs">
                                                        {nextStage && (
                                                            <button
                                                                onClick={() => handleAdvanceStage(lead, nextStage)}
                                                                disabled={updateStage.isPending}
                                                                className="text-hotel-gold hover:text-hotel-gold-dark font-medium flex items-center gap-1 transition-colors"
                                                            >
                                                                <span>Advance</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        <div className="flex items-center gap-1.5 ms-auto">
                                                            <button
                                                                onClick={() => handleAdvanceStage(lead, 'won')}
                                                                disabled={updateStage.isPending}
                                                                title="Mark Won"
                                                                className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAdvanceStage(lead, 'lost')}
                                                                disabled={updateStage.isPending}
                                                                title="Mark Lost"
                                                                className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )
                                    })}

                                    {stageLeads.length === 0 && (
                                        <div className="h-24 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 font-medium">
                                            No deals
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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

            {/* Add Lead Dialog */}
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
                            <Input id="lead_name" value={formData.lead_name} onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })} placeholder="e.g. Corporate Annual Booking - Saudi Aramco" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="source">{t('commercial:leads.source_label', { defaultValue: 'Source' })}</Label>
                                <Input id="source" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="e.g. Direct, Trade Show, Referral" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estimated_value">{t('commercial:leads.value_label', { defaultValue: 'Estimated Value (SAR)' })}</Label>
                                <Input id="estimated_value" type="number" value={formData.estimated_value} onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })} placeholder="50000" />
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
