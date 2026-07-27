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
import { useAuth } from '@/hooks/useAuth'
import { useCreateSupplier, useSuppliers } from '@/hooks/useSuppliers'
import { Plus, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Suppliers() {
    const { t } = useTranslation(['procurement', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { data: suppliers, isLoading } = useSuppliers()
    const createMutation = useCreateSupplier()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ supplier_name: '', category: '', contact_name: '', contact_email: '', contact_phone: '' })

    const resetForm = () => setFormData({ supplier_name: '', category: '', contact_name: '', contact_email: '', contact_phone: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        try {
            await createMutation.mutateAsync({
                supplier_name: formData.supplier_name,
                category: formData.category || undefined,
                contact_name: formData.contact_name || undefined,
                contact_email: formData.contact_email || undefined,
                contact_phone: formData.contact_phone || undefined,
                created_by: user.id
            })
            toast({ title: t('procurement:suppliers.success.created', { defaultValue: 'Supplier added' }) })
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

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('procurement:suppliers.title', { defaultValue: 'Suppliers' })}
                description={t('procurement:suppliers.description', { defaultValue: 'Corporate-wide supplier registry.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('procurement:suppliers.add_supplier', { defaultValue: 'Add Supplier' })}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : suppliers && suppliers.length > 0 ? (
                        <div className="space-y-2">
                            {suppliers.map((supplier) => (
                                <div key={supplier.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Truck className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {supplier.category && <span>{supplier.category}</span>}
                                                {supplier.contact_name && <span>· {supplier.contact_name}</span>}
                                                {supplier.contact_email && <span>· {supplier.contact_email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Truck}
                            title={t('procurement:suppliers.no_data', { defaultValue: 'No suppliers yet' })}
                            description={t('procurement:suppliers.no_data_desc', { defaultValue: 'Add your first supplier.' })}
                            action={{
                                label: t('procurement:suppliers.add_supplier', { defaultValue: 'Add Supplier' }),
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
                        <DialogTitle>{t('procurement:suppliers.add_supplier', { defaultValue: 'Add Supplier' })}</DialogTitle>
                        <DialogDescription>
                            {t('procurement:suppliers.add_new_desc', { defaultValue: 'Register a new supplier.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier_name">{t('procurement:suppliers.name_label', { defaultValue: 'Supplier Name' })}</Label>
                            <Input id="supplier_name" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">{t('procurement:suppliers.category_label', { defaultValue: 'Category' })}</Label>
                            <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder={t('procurement:suppliers.category_placeholder', { defaultValue: 'e.g. Linens, F&B, Maintenance supplies' })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact_name">{t('procurement:suppliers.contact_name_label', { defaultValue: 'Contact Name' })}</Label>
                                <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact_phone">{t('procurement:suppliers.phone_label', { defaultValue: 'Phone' })}</Label>
                                <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_email">{t('procurement:suppliers.email_label', { defaultValue: 'Email' })}</Label>
                            <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.supplier_name}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
