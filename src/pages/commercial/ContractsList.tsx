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
import { FileSignature, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    terminated: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
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
    const [formData, setFormData] = useState({ account_id: '', contract_name: '', contract_value: '', start_date: '', end_date: '' })

    const accountNameFor = (accountId: string) => accounts?.find((a) => a.id === accountId)?.account_name || accountId.slice(0, 8)

    const resetForm = () => setFormData({ account_id: '', contract_name: '', contract_value: '', start_date: '', end_date: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !propertyId || !formData.account_id) return
        try {
            await createMutation.mutateAsync({
                account_id: formData.account_id,
                property_id: propertyId,
                contract_name: formData.contract_name,
                contract_value: formData.contract_value ? Number(formData.contract_value) : undefined,
                start_date: formData.start_date || undefined,
                end_date: formData.end_date || undefined,
                created_by: user.id
            })
            toast({ title: t('commercial:contracts.success.created', { defaultValue: 'Contract created' }) })
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
                title={t('commercial:contracts.title', { defaultValue: 'Contracts' })}
                description={t('commercial:contracts.description', { defaultValue: 'Signed agreements with commercial accounts.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={!accounts || accounts.length === 0}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('commercial:contracts.add_contract', { defaultValue: 'New Contract' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : contracts && contracts.length > 0 ? (
                        <div className="space-y-2">
                            {contracts.map((contract) => (
                                <div key={contract.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <FileSignature className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{contract.contract_name}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span>{accountNameFor(contract.account_id)}</span>
                                                {contract.contract_value != null && <span>· {contract.contract_value.toLocaleString()}</span>}
                                                {contract.start_date && <span>· {contract.start_date} → {contract.end_date || '?'}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Select value={contract.status} onValueChange={(v) => updateStatus.mutate({ id: contract.id, status: v as CrmContract['status'] })}>
                                        <SelectTrigger className="w-[140px]">
                                            <Badge className={statusColors[contract.status]}>{contract.status}</Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{t('commercial:contracts.status_draft', { defaultValue: 'Draft' })}</SelectItem>
                                            <SelectItem value="active">{t('commercial:contracts.status_active', { defaultValue: 'Active' })}</SelectItem>
                                            <SelectItem value="expired">{t('commercial:contracts.status_expired', { defaultValue: 'Expired' })}</SelectItem>
                                            <SelectItem value="terminated">{t('commercial:contracts.status_terminated', { defaultValue: 'Terminated' })}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
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
                            {t('commercial:contracts.add_new_desc', { defaultValue: 'Create a new contract for an account.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="account_id">{t('commercial:contracts.account_label', { defaultValue: 'Account' })}</Label>
                            <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                                <SelectTrigger id="account_id">
                                    <SelectValue placeholder={t('commercial:contracts.account_placeholder', { defaultValue: 'Select account' })} />
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
                            <Input id="contract_name" value={formData.contract_name} onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contract_value">{t('commercial:contracts.value_label', { defaultValue: 'Contract Value' })}</Label>
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
