import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { isRealPropertyId } from '@/lib/propertyScope'
import { Wallet, Plus, Download, AlertTriangle, DollarSign, Layers } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BudgetCharts } from '@/components/finance/BudgetCharts'
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

const GL_CODES = [
    { code: 'GL-4100', name: 'Food & Beverage' },
    { code: 'GL-5200', name: 'Utilities & Energy' },
    { code: 'GL-6100', name: 'Payroll & Benefits' },
    { code: 'GL-7300', name: 'Maintenance & Repairs' },
    { code: 'GL-8100', name: 'Marketing & Corporate Sales' },
    { code: 'GL-9100', name: 'General Administration' }
]

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
        gl_code: 'GL-4100',
        allocated_amount: ''
    })

    const totalAllocated = useMemo(
        () => (budgets || []).reduce((sum, b) => sum + Number(b.allocated_amount), 0),
        [budgets]
    )

    const resetForm = () => setFormData({ fiscal_year: String(currentYear), period_type: 'annual', category: '', gl_code: 'GL-4100', allocated_amount: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                fiscal_year: Number(formData.fiscal_year),
                period_type: formData.period_type,
                category: `${formData.gl_code} - ${formData.category}`,
                allocated_amount: Number(formData.allocated_amount),
                created_by: user.id
            })
            toast({ title: t('finance:budgets.success.created', { defaultValue: 'Budget line added with GL code' }) })
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

    const handleExportExcel = async () => {
        if (!budgets || budgets.length === 0) return
        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet('Budgets & GL Variance')
            
            worksheet.columns = [
                { header: 'GL Category', key: 'category', width: 35 },
                { header: 'Fiscal Year', key: 'fiscal_year', width: 15 },
                { header: 'Period', key: 'period_type', width: 15 },
                { header: 'Allocated (SAR)', key: 'allocated_amount', width: 20 }
            ]

            budgets.forEach(b => {
                worksheet.addRow({
                    category: b.category,
                    fiscal_year: b.fiscal_year,
                    period_type: b.period_type,
                    allocated_amount: Number(b.allocated_amount)
                })
            })

            worksheet.getRow(1).font = { bold: true }
            
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Budgets_Variance_Export_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error: any) {
            toast({ title: 'Export failed', description: error?.message, variant: 'destructive' })
        }
    }

    const columns: ColumnDef<Budget>[] = [
        {
            accessorKey: 'category',
            header: 'GL Code & Category',
            cell: ({ row }) => {
                const cat = row.getValue('category') as string
                const parts = cat.split(' - ')
                const glCode = parts.length > 1 ? parts[0] : 'GL-General'
                const catName = parts.length > 1 ? parts.slice(1).join(' - ') : cat

                return (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 text-slate-700 border-slate-200">
                            {glCode}
                        </Badge>
                        <span className="font-semibold text-gray-900">{catName}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: 'fiscal_year',
            header: t('finance:budgets.year_label', { defaultValue: 'Fiscal Year' }),
        },
        {
            accessorKey: 'period_type',
            header: t('finance:budgets.period_label', { defaultValue: 'Period' }),
            cell: ({ row }) => <span className="capitalize font-medium text-gray-600">{row.getValue('period_type')}</span>
        },
        {
            accessorKey: 'allocated_amount',
            header: t('finance:budgets.amount_label', { defaultValue: 'Allocated Budget' }),
            cell: ({ row }) => (
                <div className="font-bold text-gray-900">
                    SAR {Number(row.getValue('allocated_amount')).toLocaleString()}
                </div>
            )
        },
    ]

    if (!isRealPropertyId(propertyId)) {
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
                title={t('finance:budgets.title', { defaultValue: 'Budgets & GL Allocations' })}
                description={t('finance:budgets.description', { defaultValue: 'Budget allocations by General Ledger (GL) accounts and fiscal periods.' })}
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
                            {t('finance:budgets.add_line', { defaultValue: 'Add Budget Line' })}
                        </Button>
                    </div>
                }
            />

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="grid gap-4 md:grid-cols-2"
            >
                <div className="p-5 bg-white border rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Allocated Budget</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            SAR {totalAllocated.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-white border rounded-xl shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active GL Accounts</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            {budgets?.length || 0} Lines
                        </p>
                    </div>
                </div>
            </motion.div>

            <BudgetCharts budgets={budgets || []} />

            <div className="altus-card">
                <div className="altus-card-header flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('finance:budgets.list_title', { defaultValue: 'Budget Lines' })}</h3>
                </div>
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : budgets && budgets.length > 0 ? (
                        <DataTable 
                            columns={columns} 
                            data={budgets} 
                            searchKey="category"
                            searchPlaceholder="Search by GL Code or category..."
                        />
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
                            <Label htmlFor="gl_code">General Ledger (GL) Account</Label>
                            <Select value={formData.gl_code} onValueChange={(v) => setFormData({ ...formData, gl_code: v })}>
                                <SelectTrigger id="gl_code">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GL_CODES.map((gl) => (
                                        <SelectItem key={gl.code} value={gl.code}>
                                            {gl.code} - {gl.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category Sub-name</Label>
                            <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Kitchen Supplies, Linen Replacement, Energy Tariff" required />
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
                            <Label htmlFor="allocated_amount">{t('finance:budgets.amount_label', { defaultValue: 'Allocated Amount (SAR)' })}</Label>
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
