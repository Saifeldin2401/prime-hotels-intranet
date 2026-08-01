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
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCrmAccounts } from '@/hooks/useCrmAccounts'
import { useCreateCrmContract, useCrmContracts, useUpdateCrmContractStatus } from '@/hooks/useCrmContracts'
import type { CrmContract } from '@/lib/types/commercial'
import { FileSignature, Plus, Download, AlertTriangle, FileCheck, DollarSign, Calendar } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
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

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    terminated: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
}

export default function ContractsList() {
    const { t } = useTranslation(['commercial', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: contracts, isLoading } = useCrmContracts(propertyId)
    const { data: accounts } = useCrmAccounts()
    const createMutation = useCreateCrmContract()
    const updateStatus = useUpdateCrmContractStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        account_id: '',
        contract_name: '',
        contract_value: '',
        start_date: '',
        end_date: '',
        rate_type: 'LRA',
        room_nights_commitment: '300'
    })

    const accountNameFor = (accountId: string) => accounts?.find((a) => a.id === accountId)?.account_name || accountId.slice(0, 8)

    const resetForm = () => setFormData({ account_id: '', contract_name: '', contract_value: '', start_date: '', end_date: '', rate_type: 'LRA', room_nights_commitment: '300' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId) || !formData.account_id) return
        try {
            await createMutation.mutateAsync({
                account_id: formData.account_id,
                property_id: propertyId,
                contract_name: `${formData.contract_name} [${formData.rate_type}]`,
                contract_value: formData.contract_value ? Number(formData.contract_value) : undefined,
                start_date: formData.start_date || undefined,
                end_date: formData.end_date || undefined,
                created_by: user.id
            })
            toast({ title: t('commercial:contracts.success.created', { defaultValue: 'Negotiated Corporate Contract created' }) })
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

    const metrics = useMemo(() => {
        const all = contracts || []
        const active = all.filter(c => c.status === 'active')
        const totalValue = active.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0)
        
        const now = new Date()
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(now.getDate() + 30)

        const expiringSoon = active.filter(c => {
            if (!c.end_date) return false
            const endDate = new Date(c.end_date)
            return endDate >= now && endDate <= thirtyDaysFromNow
        }).length

        return {
            totalValue,
            activeCount: active.length,
            expiringSoonCount: expiringSoon,
            totalCount: all.length
        }
    }, [contracts])

    const handleExportExcel = async () => {
        if (!contracts || contracts.length === 0) return
        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet('Corporate Contracts')
            
            worksheet.columns = [
                { header: 'Contract Name', key: 'contract_name', width: 30 },
                { header: 'Account', key: 'account', width: 25 },
                { header: 'Value (SAR)', key: 'contract_value', width: 18 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Start Date', key: 'start_date', width: 15 },
                { header: 'End Date', key: 'end_date', width: 15 },
            ]

            contracts.forEach(c => {
                worksheet.addRow({
                    contract_name: c.contract_name,
                    account: accountNameFor(c.account_id),
                    contract_value: Number(c.contract_value) || 0,
                    status: c.status,
                    start_date: c.start_date || '',
                    end_date: c.end_date || ''
                })
            })

            worksheet.getRow(1).font = { bold: true }
            
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Contracts_Export_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error: any) {
            toast({ title: 'Export failed', description: error?.message, variant: 'destructive' })
        }
    }

    const columns: ColumnDef<CrmContract>[] = [
        {
            accessorKey: 'contract_name',
            header: t('commercial:contracts.name_label', { defaultValue: 'Contract Name' }),
            cell: ({ row }) => <span className="font-semibold text-gray-900">{row.getValue('contract_name')}</span>
        },
        {
            accessorFn: (row) => accountNameFor(row.account_id),
            id: 'account',
            header: t('commercial:contracts.account_label', { defaultValue: 'Account' }),
            cell: ({ row }) => <span className="font-medium text-gray-700">{row.getValue('account')}</span>
        },
        {
            id: 'agreement_type',
            header: 'Rate Agreement Tier',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px]">
                        LRA Corporate
                    </Badge>
                    <span className="text-[11px] font-medium text-gray-500">300 RNs/Yr</span>
                </div>
            )
        },
        {
            accessorKey: 'contract_value',
            header: t('commercial:contracts.value_label', { defaultValue: 'Contract Value' }),
            cell: ({ row }) => {
                const val = row.getValue('contract_value') as number | undefined
                return val != null ? (
                    <span className="font-bold text-gray-900">SAR {Number(val).toLocaleString()}</span>
                ) : <span className="text-gray-400">-</span>
            }
        },
        {
            id: 'dates',
            header: 'Validity & Blackout Policy',
            cell: ({ row }) => {
                const c = row.original
                const now = new Date()
                const isEndingSoon = c.end_date && c.status === 'active' && new Date(c.end_date) <= new Date(now.getTime() + 30 * 86400000)

                return (
                    <div className="text-xs space-y-0.5">
                        <div className="text-gray-600 font-medium">
                            {c.start_date || '?'} → {c.end_date || '?'}
                        </div>
                        {isEndingSoon && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1 px-1 py-0">
                                <AlertTriangle className="w-3 h-3" /> Expiring Soon
                            </Badge>
                        )}
                    </div>
                )
            }
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const contract = row.original
                return (
                    <Select value={contract.status} onValueChange={(v) => updateStatus.mutate({ id: contract.id, status: v as CrmContract['status'] })}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                            <Badge className={cn('capitalize font-medium', statusColors[contract.status])}>{contract.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">{t('commercial:contracts.status_draft', { defaultValue: 'Draft' })}</SelectItem>
                            <SelectItem value="active">{t('commercial:contracts.status_active', { defaultValue: 'Active' })}</SelectItem>
                            <SelectItem value="expired">{t('commercial:contracts.status_expired', { defaultValue: 'Expired' })}</SelectItem>
                            <SelectItem value="terminated">{t('commercial:contracts.status_terminated', { defaultValue: 'Terminated' })}</SelectItem>
                        </SelectContent>
                    </Select>
                )
            }
        }
    ]

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={FileSignature}
                    title={t('commercial:contracts.no_property', { defaultValue: 'No property assigned' })}
                    description={t('commercial:contracts.no_property_desc', { defaultValue: 'You need an assigned property to manage contracts.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('commercial:contracts.title', { defaultValue: 'Corporate Contracts & Rate Agreements' })}
                description={t('commercial:contracts.description', { defaultValue: 'Signed LRA/NLRA corporate agreements, room night commitments, and blackout policies.' })}
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
                        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white shadow-sm" disabled={!accounts || accounts.length === 0}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('commercial:contracts.add_contract', { defaultValue: 'New Contract' })}
                        </Button>
                    </div>
                }
            />

            {/* KPI Summary Cards */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Contract Value</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            SAR {metrics.totalValue.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Corporate Accounts</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">
                            {metrics.activeCount} <span className="text-sm font-normal text-gray-400">/ {metrics.totalCount} total</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expiring within 30 Days</p>
                        <p className="text-2xl font-bold text-amber-600 mt-0.5">
                            {metrics.expiringSoonCount}
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : contracts && contracts.length > 0 ? (
                        <DataTable 
                            columns={columns} 
                            data={contracts}
                            searchKey="contract_name"
                            searchPlaceholder="Search by contract name..."
                        />
                    ) : (
                        <EmptyState
                            icon={FileSignature}
                            title={t('commercial:contracts.no_data', { defaultValue: 'No contracts yet' })}
                            description={t('commercial:contracts.no_data_desc', {
                                defaultValue: accounts && accounts.length === 0
                                    ? 'Add an account first before creating a contract.'
                                    : 'Contracts will appear here.'
                            })}
                        />
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('commercial:contracts.add_contract', { defaultValue: 'New Contract' })}</DialogTitle>
                        <DialogDescription>
                            {t('commercial:contracts.add_new_desc', { defaultValue: 'Create a new negotiated corporate rate agreement.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="account_id">{t('commercial:contracts.account_label', { defaultValue: 'Account' })}</Label>
                            <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                                <SelectTrigger id="account_id">
                                    <SelectValue placeholder={t('commercial:contracts.account_placeholder', { defaultValue: 'Select corporate account' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts?.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>{account.account_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contract_name">{t('commercial:contracts.name_label', { defaultValue: 'Contract Name' })}</Label>
                            <Input id="contract_name" value={formData.contract_name} onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })} placeholder="e.g. Corporate Preferred Agreement 2026" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rate_type">Rate Type Agreement</Label>
                                <Select value={formData.rate_type} onValueChange={(v) => setFormData({ ...formData, rate_type: v })}>
                                    <SelectTrigger id="rate_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LRA">LRA (Last Room Availability)</SelectItem>
                                        <SelectItem value="NLRA">NLRA (Non-Last Room Availability)</SelectItem>
                                        <SelectItem value="Group Rate">Group / MICE Fixed Rate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room_nights_commitment">Annual Room Nights Goal</Label>
                                <Input id="room_nights_commitment" type="number" value={formData.room_nights_commitment} onChange={(e) => setFormData({ ...formData, room_nights_commitment: e.target.value })} placeholder="300" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contract_value">{t('commercial:contracts.value_label', { defaultValue: 'Contract Value (SAR)' })}</Label>
                            <Input id="contract_value" type="number" value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">{t('commercial:contracts.start_label', { defaultValue: 'Start Date' })}</Label>
                                <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">{t('commercial:contracts.end_label', { defaultValue: 'End Date' })}</Label>
                                <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.account_id || !formData.contract_name}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
