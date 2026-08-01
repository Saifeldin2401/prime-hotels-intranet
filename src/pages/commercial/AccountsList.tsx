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
import { useCrmAccounts, useCreateCrmAccount, useUpdateCrmAccountStatus } from '@/hooks/useCrmAccounts'
import type { CrmAccount } from '@/lib/types/commercial'
import { Briefcase, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
    prospect: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export default function AccountsList() {
    const { t } = useTranslation(['commercial', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { data: accounts, isLoading } = useCrmAccounts()
    const createMutation = useCreateCrmAccount()
    const updateStatus = useUpdateCrmAccountStatus()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        account_name: '',
        industry: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        account_type: 'corporate' as CrmAccount['account_type']
    })

    const resetForm = () => setFormData({ account_name: '', industry: '', contact_name: '', contact_email: '', contact_phone: '', account_type: 'corporate' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        try {
            await createMutation.mutateAsync({
                account_name: formData.account_name,
                industry: formData.industry || undefined,
                contact_name: formData.contact_name || undefined,
                contact_email: formData.contact_email || undefined,
                contact_phone: formData.contact_phone || undefined,
                account_type: formData.account_type,
                created_by: user.id
            })
            toast({ title: t('commercial:accounts.success.created', { defaultValue: 'Account created' }) })
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

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('commercial:accounts.title', { defaultValue: 'Accounts' })}
                description={t('commercial:accounts.description', { defaultValue: 'Corporate and commercial client accounts.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('commercial:accounts.add_account', { defaultValue: 'Add Account' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : accounts && accounts.length > 0 ? (
                        <div className="space-y-2">
                            {accounts.map((account) => (
                                <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Briefcase className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{account.account_name}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="capitalize">{account.account_type.replace('_', ' ')}</span>
                                                {account.contact_name && <span>· {account.contact_name}</span>}
                                                {account.contact_email && <span>· {account.contact_email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Select value={account.status} onValueChange={(v) => updateStatus.mutate({ id: account.id, status: v as CrmAccount['status'] })}>
                                        <SelectTrigger className="w-[140px]">
                                            <Badge className={statusColors[account.status]}>{account.status}</Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="prospect">{t('commercial:accounts.status_prospect', { defaultValue: 'Prospect' })}</SelectItem>
                                            <SelectItem value="active">{t('commercial:accounts.status_active', { defaultValue: 'Active' })}</SelectItem>
                                            <SelectItem value="inactive">{t('commercial:accounts.status_inactive', { defaultValue: 'Inactive' })}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Briefcase}
                            title={t('commercial:accounts.no_data', { defaultValue: 'No accounts yet' })}
                            description={t('commercial:accounts.no_data_desc', { defaultValue: 'Add your first commercial account.' })}
                            action={{
                                label: t('commercial:accounts.add_account', { defaultValue: 'Add Account' }),
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
                        <DialogTitle>{t('commercial:accounts.add_account', { defaultValue: 'Add Account' })}</DialogTitle>
                        <DialogDescription>
                            {t('commercial:accounts.add_new_desc', { defaultValue: 'Create a new commercial account.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="account_name">{t('commercial:accounts.name_label', { defaultValue: 'Account Name' })}</Label>
                            <Input id="account_name" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="account_type">{t('commercial:accounts.type_label', { defaultValue: 'Account Type' })}</Label>
                            <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v as CrmAccount['account_type'] })}>
                                <SelectTrigger id="account_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="corporate">{t('commercial:accounts.type_corporate', { defaultValue: 'Corporate' })}</SelectItem>
                                    <SelectItem value="travel_agency">{t('commercial:accounts.type_travel_agency', { defaultValue: 'Travel Agency' })}</SelectItem>
                                    <SelectItem value="event_organizer">{t('commercial:accounts.type_event_organizer', { defaultValue: 'Event Organizer' })}</SelectItem>
                                    <SelectItem value="government">{t('commercial:accounts.type_government', { defaultValue: 'Government' })}</SelectItem>
                                    <SelectItem value="other">{t('commercial:accounts.type_other', { defaultValue: 'Other' })}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_name">{t('commercial:accounts.contact_name_label', { defaultValue: 'Contact Name' })}</Label>
                                <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry">{t('commercial:accounts.industry_label', { defaultValue: 'Industry' })}</Label>
                                <Input id="industry" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_email">{t('commercial:accounts.email_label', { defaultValue: 'Contact Email' })}</Label>
                                <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact_phone">{t('commercial:accounts.phone_label', { defaultValue: 'Contact Phone' })}</Label>
                                <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.account_name}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
