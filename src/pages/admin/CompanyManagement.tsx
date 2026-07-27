import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
    useCompanies,
    useCreateCompany,
    useDeleteCompany,
    useUpdateCompany
} from '@/hooks/useCompanies'
import {
    useCompanyScopedUsers,
    useGrantCompanyAccess,
    useRevokeCompanyAccess,
    useScopableAdmins
} from '@/hooks/useUserCompanies'
import type { Company } from '@/lib/types/profile'
import { Building, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function ManageCompanyAccessDialog({ company, open, onOpenChange }: { company: Company | null; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { t } = useTranslation(['admin', 'common'])
    const { toast } = useToast()
    const { data: admins, isLoading: adminsLoading } = useScopableAdmins()
    const { data: scopedUserIds, isLoading: scopedLoading } = useCompanyScopedUsers(company?.id)
    const grantMutation = useGrantCompanyAccess()
    const revokeMutation = useRevokeCompanyAccess()

    const handleToggle = async (userId: string, isCurrentlyScoped: boolean) => {
        if (!company) return
        try {
            if (isCurrentlyScoped) {
                await revokeMutation.mutateAsync({ userId, companyId: company.id })
            } else {
                await grantMutation.mutateAsync({ userId, companyId: company.id })
            }
        } catch (error) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error instanceof Error ? error.message : String(error),
                variant: 'destructive'
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('admin:companies.manage_access', { defaultValue: 'Manage Access' })}</DialogTitle>
                    <DialogDescription>
                        {t('admin:companies.manage_access_desc', {
                            defaultValue: 'Corporate/regional admins with a checkbox here are RESTRICTED to this company. Unchecked admins retain global access across all companies (the default). Checking an admin here for the first time scopes them to only their checked companies.'
                        })}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {adminsLoading || scopedLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : admins && admins.length > 0 ? (
                        admins.map((admin) => {
                            const isScoped = scopedUserIds?.includes(admin.user_id) ?? false
                            return (
                                <div key={`${admin.user_id}-${admin.role}`} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={isScoped}
                                            onCheckedChange={() => handleToggle(admin.user_id, isScoped)}
                                            disabled={grantMutation.isPending || revokeMutation.isPending}
                                        />
                                        <div>
                                            <p className="text-sm font-medium">{admin.full_name || admin.email}</p>
                                            <p className="text-xs text-muted-foreground">{admin.role.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            {t('admin:companies.no_admins', { defaultValue: 'No corporate/regional admins found.' })}
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function CompanyManagement() {
    const { t } = useTranslation(['admin', 'common'])
    const { toast } = useToast()
    const { data: companies, isLoading } = useCompanies()
    const createMutation = useCreateCompany()
    const updateMutation = useUpdateCompany()
    const deleteMutation = useDeleteCompany()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const [deleteCompany, setDeleteCompany] = useState<Company | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [accessCompany, setAccessCompany] = useState<Company | null>(null)
    const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        name_ar: '',
        code: '',
        is_active: true
    })

    const resetForm = () => {
        setSelectedCompany(null)
        setFormData({ name: '', name_ar: '', code: '', is_active: true })
    }

    const handleEdit = (company: Company) => {
        setSelectedCompany(company)
        setFormData({
            name: company.name,
            name_ar: company.name_ar || '',
            code: company.code || '',
            is_active: company.is_active
        })
        setIsDialogOpen(true)
    }

    const handleOpenDelete = (company: Company) => {
        setDeleteCompany(company)
        setIsDeleteOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!deleteCompany) return
        try {
            await deleteMutation.mutateAsync(deleteCompany.id)
            setIsDeleteOpen(false)
            setDeleteCompany(null)
            toast({ title: t('admin:companies.success.deleted', { defaultValue: 'Company deleted' }) })
        } catch (error) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error instanceof Error ? error.message : String(error),
                variant: 'destructive'
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (selectedCompany) {
                await updateMutation.mutateAsync({ id: selectedCompany.id, ...formData })
                toast({ title: t('admin:companies.success.updated', { defaultValue: 'Company updated' }) })
            } else {
                await createMutation.mutateAsync(formData)
                toast({ title: t('admin:companies.success.created', { defaultValue: 'Company created' }) })
            }
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

    const isSaving = createMutation.isPending || updateMutation.isPending

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('admin:companies.title', { defaultValue: 'Companies' })}
                description={t('admin:companies.description', {
                    defaultValue: 'Manage the operating companies at the top of the organizational hierarchy.'
                })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('admin:companies.add_company', { defaultValue: 'Add Company' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-header">
                    <h3 className="text-lg font-semibold">{t('admin:companies.list_title', { defaultValue: 'Companies' })}</h3>
                </div>
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('admin:companies.loading', { defaultValue: 'Loading companies…' })}</div>
                    ) : companies && companies.length > 0 ? (
                        <div className="space-y-2">
                            {companies.map((company) => (
                                <div
                                    key={company.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Building className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{company.name}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {company.code && <span>{company.code}</span>}
                                                {company.name_ar && <span>• {company.name_ar}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={company.is_active ? 'default' : 'secondary'}>
                                            {company.is_active
                                                ? t('admin:companies.active', { defaultValue: 'Active' })
                                                : t('admin:companies.inactive', { defaultValue: 'Inactive' })}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => { setAccessCompany(company); setIsAccessDialogOpen(true) }}
                                        >
                                            <ShieldCheck className="w-4 h-4 me-2" />
                                            {t('admin:companies.manage_access', { defaultValue: 'Manage Access' })}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(company)}
                                            aria-label={t('accessibility.edit_company', { defaultValue: 'Edit company' })}
                                        >
                                            <Pencil className="w-4 h-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenDelete(company)}
                                            aria-label={t('accessibility.delete_company', { defaultValue: 'Delete company' })}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Building}
                            title={t('admin:companies.no_data', { defaultValue: 'No companies yet' })}
                            description={t('admin:companies.no_data_desc', { defaultValue: 'Add the first operating company to get started.' })}
                            action={{
                                label: t('admin:companies.add_company', { defaultValue: 'Add Company' }),
                                onClick: () => { resetForm(); setIsDialogOpen(true) },
                                icon: Plus
                            }}
                        />
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) resetForm()
                setIsDialogOpen(open)
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedCompany
                                ? t('admin:companies.edit_company', { defaultValue: 'Edit Company' })
                                : t('admin:companies.add_company', { defaultValue: 'Add Company' })}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedCompany
                                ? t('admin:companies.update_details', { defaultValue: 'Update company details.' })
                                : t('admin:companies.add_new_desc', { defaultValue: 'Create a new operating company.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admin:companies.name_label', { defaultValue: 'Name' })}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name_ar">{t('admin:companies.name_ar_label', { defaultValue: 'Name (Arabic)' })}</Label>
                            <Input
                                id="name_ar"
                                dir="rtl"
                                value={formData.name_ar}
                                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">{t('admin:companies.code_label', { defaultValue: 'Code' })}</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="Altus Advisory"
                            />
                        </div>
                        {selectedCompany && (
                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                                />
                                <Label htmlFor="active" className="font-normal cursor-pointer">
                                    {t('admin:companies.active_status', { defaultValue: 'Active' })}
                                </Label>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={isSaving}>
                                {isSaving
                                    ? t('admin:companies.saving', { defaultValue: 'Saving…' })
                                    : selectedCompany
                                        ? t('admin:companies.update', { defaultValue: 'Update' })
                                        : t('admin:companies.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open)
                    if (!open) setDeleteCompany(null)
                }}
                title={t('admin:companies.confirm_delete_title', {
                    defaultValue: 'Delete {{name}}?',
                    name: deleteCompany?.name || t('admin:companies.company', { defaultValue: 'company' })
                })}
                description={t('admin:companies.confirm_delete_desc', {
                    defaultValue: 'This will deactivate the company. Properties assigned to it will keep their reference but the company will no longer appear as active.'
                })}
                confirmLabel={t('common:action.delete', { defaultValue: 'Delete' })}
                cancelLabel={t('common:action.cancel', { defaultValue: 'Cancel' })}
                variant="danger"
                onConfirm={handleConfirmDelete}
                isLoading={deleteMutation.isPending}
            />

            <ManageCompanyAccessDialog
                company={accessCompany}
                open={isAccessDialogOpen}
                onOpenChange={(open) => {
                    setIsAccessDialogOpen(open)
                    if (!open) setAccessCompany(null)
                }}
            />
        </div>
    )
}
