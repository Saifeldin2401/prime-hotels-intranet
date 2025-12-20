import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Plus, Building2, Pencil, Trash2, Layers } from 'lucide-react'
import type { Property } from '@/lib/types'
import { useTranslation, Trans } from 'react-i18next'
import { useToast } from '@/components/ui/use-toast'
import { useDepartments } from '@/hooks/useDepartments'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

// --- Department Manager Component (Inside Property Management) ---
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const STANDARD_DEPARTMENTS = [
    "Front Office",
    "Housekeeping",
    "Food & Beverage",
    "Kitchen / Culinary",
    "Engineering & Maintenance",
    "Security",
    "Sales & Marketing",
    "Human Resources",
    "Finance / Accounting",
    "IT",
    "Executive Office",
    "Spa & Recreation",
    "Concierge",
    "Reservations"
]

function DepartmentManager({ property }: { property: Property }) {
    const { departments, createDepartment, updateDepartment, deleteDepartment, isLoading } = useDepartments(property.id)
    const [selectedDept, setSelectedDept] = useState<string>('')
    const { toast } = useToast()
    const { t } = useTranslation('admin')

    const handleAdd = () => {
        if (!selectedDept) return

        // Check if already exists
        if (departments.some(d => d.name === selectedDept)) {
            toast({ title: t('common.error'), description: t('properties.errors.exists'), variant: 'destructive' })
            return
        }

        createDepartment.mutate({ name: selectedDept, property_id: property.id }, {
            onSuccess: () => {
                setSelectedDept('')
                toast({
                    title: t('properties.success.dept_added'),
                    description: t('properties.success.dept_added_desc', { name: selectedDept, propertyName: property.name })
                })
            },
            onError: (err) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' })
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm(t('properties.confirm_dept_delete'))) return
        deleteDepartment.mutate(id, {
            onSuccess: () => toast({ title: t('properties.success.dept_deleted') }),
            onError: (err) => toast({ title: t('properties.errors.delete_failed'), description: err.message, variant: 'destructive' })
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t('properties.select_dept')} />
                    </SelectTrigger>
                    <SelectContent>
                        {STANDARD_DEPARTMENTS.map(dept => (
                            <SelectItem key={dept} value={dept}>
                                {dept}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleAdd} disabled={createDepartment.isPending || !selectedDept} size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark">
                    <Plus className="w-4 h-4 mr-1" /> {t('properties.add_dept')}
                </Button>
            </div>
            <Separator />
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {isLoading ? <p className="text-sm text-gray-500">{t('properties.loading_depts')}</p> :
                    departments.length === 0 ? <p className="text-sm text-gray-400 italic">{t('properties.no_depts')}</p> :
                        departments.map(dept => (
                            <div key={dept.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 bg-white shadow-sm">
                                <span className="font-medium text-sm text-gray-800">{dept.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(dept.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
            </div>
        </div>
    )
}

export default function PropertyManagement() {
    const { t } = useTranslation(['admin', 'common'])
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
    const [managingProperty, setManagingProperty] = useState<Property | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        is_active: true
    })

    // Fetch Properties
    const { data: properties, isLoading } = useQuery({
        queryKey: ['properties'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .order('name')

            if (error) throw error
            return data as Property[]
        }
    })

    // Create/Update Mutation
    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (selectedProperty) {
                // Update
                const { error } = await supabase
                    .from('properties')
                    .update(data)
                    .eq('id', selectedProperty.id)
                if (error) throw error
            } else {
                // Create
                const { error } = await supabase
                    .from('properties')
                    .insert([data])
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            setIsDialogOpen(false)
            resetForm()
            toast({
                title: selectedProperty ? t('admin:properties.success.updated') : t('admin:properties.success.created'),
                description: selectedProperty ? t('admin:properties.success.updated_desc') : t('admin:properties.success.created_desc'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common:common.error'),
                description: error.message,
                variant: 'destructive',
            })
        }
    })

    const resetForm = () => {
        setSelectedProperty(null)
        setFormData({
            name: '',
            address: '',
            phone: '',
            is_active: true
        })
    }

    const handleEdit = (property: Property) => {
        setSelectedProperty(property)
        setFormData({
            name: property.name,
            address: property.address || '',
            phone: property.phone || '',
            is_active: property.is_active
        })
        setIsDialogOpen(true)
    }

    const handleManageDepartments = (property: Property) => {
        setManagingProperty(property)
        setIsDeptDialogOpen(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        mutation.mutate(formData)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('admin:properties.title')}
                description={t('admin:properties.description')}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin:properties.add_property')}
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-header">
                    <h3 className="text-lg font-semibold">{t('admin:properties.list_title')}</h3>
                </div>
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('admin:properties.loading')}</div>
                    ) : properties && properties.length > 0 ? (
                        <div className="space-y-2">
                            {properties.map((property) => (
                                <div
                                    key={property.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{property.name}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {property.address && <span>{property.address}</span>}
                                                {property.phone && <span>• {property.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="sm" onClick={() => handleManageDepartments(property)}>
                                            <Layers className="w-4 h-4 mr-2" />
                                            {t('admin:properties.departments')}
                                        </Button>
                                        <Badge variant={property.is_active ? 'default' : 'secondary'}>
                                            {property.is_active ? t('admin:properties.active') : t('admin:properties.inactive')}
                                        </Badge>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(property)}>
                                            <Pencil className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Building2}
                            title={t('admin:properties.no_data')}
                            description={t('admin:properties.no_data_desc')}
                            action={{
                                label: t('admin:properties.add_property'),
                                onClick: () => { resetForm(); setIsDialogOpen(true) },
                                icon: Plus
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Edit Property Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) resetForm()
                setIsDialogOpen(open)
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedProperty ? t('admin:properties.edit_property') : t('admin:properties.add_property')}</DialogTitle>
                        <DialogDescription>
                            {selectedProperty ? t('admin:properties.update_details') : t('admin:properties.add_new_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('admin:properties.name_label')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('admin:properties.name_placeholder')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">{t('admin:properties.address_label')}</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder={t('admin:properties.address_placeholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('admin:properties.phone_label')}</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder={t('admin:properties.phone_placeholder')}
                            />
                        </div>
                        {selectedProperty && (
                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                                />
                                <Label htmlFor="active" className="font-normal cursor-pointer">{t('admin:properties.active_status')}</Label>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('admin:properties.cancel')}</Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={mutation.isPending}>
                                {mutation.isPending ? t('admin:properties.saving') : (selectedProperty ? t('admin:properties.update') : t('admin:properties.create'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Departments Dialog */}
            <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('admin:properties.manage_depts')}</DialogTitle>
                        <DialogDescription>
                            {managingProperty?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {managingProperty && <DepartmentManager property={managingProperty} />}
                </DialogContent>
            </Dialog>
        </div>
    )
}
