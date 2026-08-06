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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreatePurchaseRequest, useDecidePurchaseRequest, usePurchaseRequests } from '@/hooks/usePurchaseRequests'
import { ClipboardList, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    converted_to_po: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
}

export default function PurchaseRequests() {
    const { t } = useTranslation(['procurement', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: requests, isLoading } = usePurchaseRequests(propertyId)
    const createMutation = useCreatePurchaseRequest()
    const decideMutation = useDecidePurchaseRequest()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({ item_description: '', quantity: '1', estimated_cost: '', justification: '' })

    const resetForm = () => setFormData({ item_description: '', quantity: '1', estimated_cost: '', justification: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                item_description: formData.item_description,
                quantity: Number(formData.quantity),
                estimated_cost: formData.estimated_cost ? Number(formData.estimated_cost) : undefined,
                justification: formData.justification || undefined,
                requested_by: user.id
            })
            toast({ title: t('procurement:requests.success.created', { defaultValue: 'Purchase request submitted' }) })
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

    const handleDecide = (id: string, status: 'approved' | 'rejected') => {
        if (!user) return
        decideMutation.mutate({ id, status }, {
            onError: (error: any) => {
                toast({
                    title: t('common:common.error', { defaultValue: 'Error' }),
                    description: error?.message || String(error),
                    variant: 'destructive'
                })
            }
        })
    }

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={ClipboardList}
                    title={t('procurement:requests.no_property', { defaultValue: 'No property assigned' })}
                    description={t('procurement:requests.no_property_desc', { defaultValue: 'You need an assigned property to submit purchase requests.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('procurement:requests.title', { defaultValue: 'Purchase Requests' })}
                description={t('procurement:requests.description', { defaultValue: 'Submit and approve internal purchase requests.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('procurement:requests.new_request', { defaultValue: 'New Request' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : requests && requests.length > 0 ? (
                        <div className="space-y-2">
                            {requests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <ClipboardList className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{request.item_description} × {request.quantity}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {request.estimated_cost != null && <span>{t('procurement:requests.est_cost', { defaultValue: 'Est.' })} {request.estimated_cost.toLocaleString()}</span>}
                                                {request.justification && <span>· {request.justification}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={statusColors[request.status]}>{request.status.replace('_', ' ')}</Badge>
                                        {request.status === 'pending' && request.requested_by !== user?.id && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleDecide(request.id, 'approved')} disabled={decideMutation.isPending}>
                                                    {t('procurement:requests.approve', { defaultValue: 'Approve' })}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDecide(request.id, 'rejected')} disabled={decideMutation.isPending}>
                                                    {t('procurement:requests.reject', { defaultValue: 'Reject' })}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={ClipboardList}
                            title={t('procurement:requests.no_data', { defaultValue: 'No purchase requests yet' })}
                            description={t('procurement:requests.no_data_desc', { defaultValue: 'Submitted requests will appear here.' })}
                            action={{
                                label: t('procurement:requests.new_request', { defaultValue: 'New Request' }),
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
                        <DialogTitle>{t('procurement:requests.new_request', { defaultValue: 'New Request' })}</DialogTitle>
                        <DialogDescription>
                            {t('procurement:requests.add_new_desc', { defaultValue: 'Request a purchase for approval.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="item_description">{t('procurement:requests.item_label', { defaultValue: 'Item' })}</Label>
                            <Input id="item_description" value={formData.item_description} onChange={(e) => setFormData({ ...formData, item_description: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quantity">{t('procurement:requests.quantity_label', { defaultValue: 'Quantity' })}</Label>
                                <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estimated_cost">{t('procurement:requests.cost_label', { defaultValue: 'Estimated Cost' })}</Label>
                                <Input id="estimated_cost" type="number" value={formData.estimated_cost} onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="justification">{t('procurement:requests.justification_label', { defaultValue: 'Justification' })}</Label>
                            <Textarea id="justification" value={formData.justification} onChange={(e) => setFormData({ ...formData, justification: e.target.value })} rows={3} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.item_description}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Submit' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
