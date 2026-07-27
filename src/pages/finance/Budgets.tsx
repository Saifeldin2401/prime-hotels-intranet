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
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useBudgets, useCreateBudget } from '@/hooks/useBudgets'
import { useProperty } from '@/contexts/PropertyContext'
import type { Budget } from '@/lib/types/finance'
import { Wallet, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Budgets() {
    const { t } = useTranslation(['finance', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: budgets, isLoading } = useBudgets(propertyId)
    const createMutation = useCreateBudget()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const currentYear = new Date().getFullYear()
    const [formData, setFormData] = useState({
        fiscal_year: String(currentYear),
        period_type: 'annual' as Budget['period_type'],
        category: '',
        allocated_amount: ''
    })

    const totalAllocated = useMemo(
        () => (budgets || []).reduce((sum, b) => sum + Number(b.allocated_amount), 0),
        [budgets]
    )

    const resetForm = () => setFormData({ fiscal_year: String(currentYear), period_type: 'annual', category: '', allocated_amount: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                fiscal_year: Number(formData.fiscal_year),
                period_type: formData.period_type,
                category: formData.category,
                allocated_amount: Number(formData.allocated_amount),
                created_by: user.id
            })
            toast({ title: t('finance:budgets.success.created', { defaultValue: 'Budget line added' }) })
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

    if (!propertyId) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Wallet}
                    title={t('finance:budgets.no_property', { defaultValue: 'No property selected' })}
                    description={t('finance:budgets.no_property_desc', { defaultValue: 'Select a property to view its budget.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('finance:budgets.title', { defaultValue: 'Budgets' })}
                description={t('finance:budgets.description', { defaultValue: 'Budget allocations by category and fiscal period.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('finance:budgets.add_line', { defaultValue: 'Add Budget Line' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-header flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('finance:budgets.list_title', { defaultValue: 'Budget Lines' })}</h3>
                    <Badge variant="outline" className="text-sm">
                        {t('finance:budgets.total_allocated', { defaultValue: 'Total Allocated' })}: {totalAllocated.toLocaleString()}
                    </Badge>
                </div>
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : budgets && budgets.length > 0 ? (
                        <div className="space-y-2">
                            {budgets.map((budget) => (
                                <div key={budget.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Wallet className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{budget.category}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span>{budget.fiscal_year}</span>
                                                <span className="capitalize">{budget.period_type}</span>
                                                {budget.period_label && <span>{budget.period_label}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="font-semibold text-gray-900">{Number(budget.allocated_amount).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Wallet}
                            title={t('finance:budgets.no_data', { defaultValue: 'No budget lines yet' })}
                            description={t('finance:budgets.no_data_desc', { defaultValue: 'Add your first budget allocation.' })}
                            action={{
                                label: t('finance:budgets.add_line', { defaultValue: 'Add Budget Line' }),
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
                        <DialogTitle>{t('finance:budgets.add_line', { defaultValue: 'Add Budget Line' })}</DialogTitle>
                        <DialogDescription>
                            {t('finance:budgets.add_new_desc', { defaultValue: 'Allocate a budget for a category and period.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">{t('finance:budgets.category_label', { defaultValue: 'Category' })}</Label>
                            <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder={t('finance:budgets.category_placeholder', { defaultValue: 'e.g. F&B, Payroll, Maintenance' })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fiscal_year">{t('finance:budgets.year_label', { defaultValue: 'Fiscal Year' })}</Label>
                                <Input id="fiscal_year" type="number" value={formData.fiscal_year} onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="period_type">{t('finance:budgets.period_label', { defaultValue: 'Period' })}</Label>
                                <Select value={formData.period_type} onValueChange={(v) => setFormData({ ...formData, period_type: v as Budget['period_type'] })}>
                                    <SelectTrigger id="period_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="annual">{t('finance:budgets.period_annual', { defaultValue: 'Annual' })}</SelectItem>
                                        <SelectItem value="quarterly">{t('finance:budgets.period_quarterly', { defaultValue: 'Quarterly' })}</SelectItem>
                                        <SelectItem value="monthly">{t('finance:budgets.period_monthly', { defaultValue: 'Monthly' })}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="allocated_amount">{t('finance:budgets.amount_label', { defaultValue: 'Allocated Amount' })}</Label>
                            <Input id="allocated_amount" type="number" value={formData.allocated_amount} onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })} required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.category || !formData.allocated_amount}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
