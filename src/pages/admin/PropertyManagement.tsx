import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useDepartments } from '@/hooks/useDepartments'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building, Building2, Layers, MapPin, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
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
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
    const [editingDeptName, setEditingDeptName] = useState<string>('')
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

    const startEdit = (dept: { id: string; name: string }) => {
        setEditingDeptId(dept.id)
        setEditingDeptName(dept.name)
    }

    const cancelEdit = () => {
        setEditingDeptId(null)
        setEditingDeptName('')
    }

    const handleSaveEdit = (deptId: string) => {
        const trimmed = editingDeptName.trim()
        if (!trimmed) return

        if (departments.some(d => d.name === trimmed && d.id !== deptId)) {
            toast({ title: t('common.error'), description: t('properties.errors.exists'), variant: 'destructive' })
            return
        }

        updateDepartment.mutate({ id: deptId, name: trimmed }, {
            onSuccess: () => {
                toast({ title: t('properties.success.dept_updated', { defaultValue: 'Department updated' }) })
                cancelEdit()
            },
            onError: (err) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' })
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
                    <Plus className="w-4 h-4 me-1" /> {t('properties.add_dept')}
                </Button>
            </div>
            <Separator />
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {isLoading ? <p className="text-sm text-gray-500">{t('properties.loading_depts')}</p> :
                    departments.length === 0 ? <p className="text-sm text-gray-400 italic">{t('properties.no_depts')}</p> :
                        departments.map(dept => (
                            <div key={dept.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 bg-white shadow-sm">
                                {editingDeptId === dept.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <Input
                                            value={editingDeptName}
                                            onChange={(e) => setEditingDeptName(e.target.value)}
                                            className="h-8"
                                            autoFocus
                                        />
                                        <Button
                                            size="sm"
                                            className="h-8 bg-hotel-gold text-white hover:bg-hotel-gold-dark"
                                            onClick={() => handleSaveEdit(dept.id)}
                                            disabled={updateDepartment.isPending || !editingDeptName.trim()}
                                        >
                                            {t('common.save', { defaultValue: 'Save' })}
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8" onClick={cancelEdit}>
                                            {t('common.cancel', { defaultValue: 'Cancel' })}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-sm text-gray-800">{dept.name}</span>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                                onClick={() => startEdit(dept)}
                                                aria-label={t('accessibility.edit_department', 'Edit department')}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50" 
                                                onClick={() => handleDelete(dept.id)}
                                                aria-label={t('accessibility.delete_department', 'Delete department')}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
            </div>
        </div>
    )
}

export default function PropertyManagement() {
    const { t, i18n } = useTranslation(['admin', 'common'])
    const isRTL = i18n.language === 'ar'
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { 
        currentOrganization, 
        organizations, 
        isPlatformAdmin, 
        isPlatformScope, 
        refreshTenantData 
    } = useTenant()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
    const [managingProperty, setManagingProperty] = useState<Property | null>(null)

    const [deleteProperty, setDeleteProperty] = useState<Property | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)

    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('')
    const [orgFilter, setOrgFilter] = useState<string>(
        currentOrganization?.id || 'all'
    )
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

    // Dialog state
    const [dialogOrgId, setDialogOrgId] = useState<string>('')
    const [dialogBrandId, setDialogBrandId] = useState<string>('none')
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        hotel_code: '',
        address: '',
        phone: '',
        is_active: true
    })

    // Fetch available brands for the selected organization in dialog
    const { data: availableBrands = [] } = useQuery({
        queryKey: ['dialog-brands', dialogOrgId],
        queryFn: async () => {
            if (!dialogOrgId) return []
            const { data, error } = await supabase
                .from('brands')
                .select('id, name, name_ar')
                .eq('organization_id', dialogOrgId)
                .eq('is_deleted', false)
                .order('name')

            if (error) return []
            return (data || []) as { id: string; name: string; name_ar: string | null }[]
        },
        enabled: !!dialogOrgId
    })

    // Fetch Properties / Hotels
    const { data: properties, isLoading } = useQuery({
        queryKey: ['properties', 'hotels', orgFilter, currentOrganization?.id, isPlatformAdmin],
        queryFn: async () => {
            let query = supabase
                .from('hotels')
                .select('*, organizations(id, name, name_ar), brands(id, name, name_ar)')
                .eq('is_deleted', false)
                .order('name')

            if (isPlatformAdmin) {
                if (orgFilter !== 'all') {
                    query = query.eq('organization_id', orgFilter)
                }
            } else if (currentOrganization?.id) {
                query = query.eq('organization_id', currentOrganization.id)
            }

            const { data, error } = await query

            if (error) throw error
            return (data || []) as unknown as Property[]
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (propertyId: string) => {
            const { error } = await supabase
                .from('hotels')
                .update({ is_deleted: true, is_active: false })
                .eq('id', propertyId)

            if (error) throw error
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            queryClient.invalidateQueries({ queryKey: ['hotels'] })
            await refreshTenantData()
            setIsDeleteOpen(false)
            setDeleteProperty(null)
            toast({
                title: t('common:common.success', { defaultValue: 'Success' }),
                description: t('admin:properties.success.deleted', { defaultValue: 'Hotel deleted successfully.' })
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error.message,
                variant: 'destructive'
            })
        }
    })

    // Create/Update Mutation
    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const targetOrgId = isPlatformAdmin 
                ? (dialogOrgId || (orgFilter !== 'all' ? orgFilter : currentOrganization?.id) || organizations[0]?.id)
                : currentOrganization?.id

            if (!targetOrgId) {
                throw new Error(t('admin:properties.errors.select_org', { defaultValue: 'Please select an organization' }))
            }

            const payload = {
                name: data.name.trim(),
                city: data.city.trim() || null,
                hotel_code: data.hotel_code.trim() || null,
                address: data.address.trim() || null,
                phone: data.phone.trim() || null,
                brand_id: dialogBrandId && dialogBrandId !== 'none' ? dialogBrandId : null,
                is_active: data.is_active,
            }

            if (selectedProperty) {
                // Update
                const { error } = await supabase
                    .from('hotels')
                    .update({
                        ...payload,
                        ...(isPlatformAdmin && targetOrgId ? { organization_id: targetOrgId } : {})
                    })
                    .eq('id', selectedProperty.id)
                if (error) throw error
            } else {
                // Create
                const { error } = await supabase
                    .from('hotels')
                    .insert([{
                        ...payload,
                        organization_id: targetOrgId
                    }])
                if (error) throw error
            }
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            queryClient.invalidateQueries({ queryKey: ['hotels'] })
            await refreshTenantData()
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
        const defaultOrg = orgFilter !== 'all' 
            ? orgFilter 
            : (currentOrganization?.id || organizations[0]?.id || '')
        setDialogOrgId(defaultOrg)
        setDialogBrandId('none')
        setFormData({
            name: '',
            city: '',
            hotel_code: '',
            address: '',
            phone: '',
            is_active: true
        })
    }

    const handleOpenAdd = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const handleEdit = (property: Property) => {
        setSelectedProperty(property)
        setDialogOrgId(property.organization_id || currentOrganization?.id || organizations[0]?.id || '')
        setDialogBrandId(property.brand_id || 'none')
        setFormData({
            name: property.name,
            city: property.city || '',
            hotel_code: property.hotel_code || '',
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

    const handleOpenDelete = (property: Property) => {
        setDeleteProperty(property)
        setIsDeleteOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!deleteProperty) return
        await deleteMutation.mutateAsync(deleteProperty.id)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        mutation.mutate(formData)
    }

    // Filter properties in-memory for instant search and status filter
    const filteredProperties = useMemo(() => {
        if (!properties) return []
        return properties.filter(p => {
            if (statusFilter === 'active' && !p.is_active) return false
            if (statusFilter === 'inactive' && p.is_active) return false

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchesName = p.name?.toLowerCase().includes(q)
                const matchesCity = p.city?.toLowerCase().includes(q)
                const matchesCode = p.hotel_code?.toLowerCase().includes(q)
                const matchesAddress = p.address?.toLowerCase().includes(q)
                const matchesOrg = p.organizations?.name?.toLowerCase().includes(q) || 
                                   p.organizations?.name_ar?.toLowerCase().includes(q)
                if (!matchesName && !matchesCity && !matchesCode && !matchesAddress && !matchesOrg) {
                    return false
                }
            }
            return true
        })
    }, [properties, statusFilter, searchQuery])

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('admin:properties.title')}
                description={t('admin:properties.description')}
                actions={
                    <Button onClick={handleOpenAdd} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('admin:properties.add_property')}
                    </Button>
                }
            />

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-card border rounded-lg shadow-sm">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('admin:properties.search_properties', 'Search properties by name, city, address...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ps-9 h-9"
                        />
                    </div>

                    {isPlatformAdmin && organizations.length > 0 && (
                        <Select value={orgFilter} onValueChange={setOrgFilter}>
                            <SelectTrigger className="w-56 h-9">
                                <Building2 className="w-3.5 h-3.5 me-2 text-hotel-gold shrink-0" />
                                <SelectValue placeholder={t('admin:properties.filter_by_org', 'Filter Organization')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('admin:properties.all_organizations', 'All Organizations')}
                                </SelectItem>
                                {organizations.map(org => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {isRTL && org.name_ar ? org.name_ar : org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                        <SelectTrigger className="w-36 h-9">
                            <SelectValue placeholder={t('admin:properties.status', 'Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('admin:properties.all_statuses', 'All Statuses')}</SelectItem>
                            <SelectItem value="active">{t('admin:properties.active', 'Active')}</SelectItem>
                            <SelectItem value="inactive">{t('admin:properties.inactive', 'Inactive')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="text-xs text-muted-foreground font-medium shrink-0 self-end md:self-center">
                    {filteredProperties.length} {t('admin:properties.title', 'Properties')}
                </div>
            </div>

            {isLoading ? (
                <div className="altus-card p-12 text-center text-muted-foreground">
                    {t('admin:properties.loading')}
                </div>
            ) : filteredProperties.length > 0 ? (
                <div className="altus-card">
                    <div className="altus-card-header flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{t('admin:properties.list_title')}</h3>
                            {isPlatformAdmin && orgFilter !== 'all' && (
                                <Badge variant="outline" className="text-xs border-hotel-gold text-hotel-gold-light bg-hotel-gold/10">
                                    {organizations.find(o => o.id === orgFilter)?.name}
                                </Badge>
                            )}
                        </div>
                        <span className="text-xs text-hotel-gold-light font-mono font-medium">
                            {filteredProperties.length} {t('admin:properties.title', 'Properties')}
                        </span>
                    </div>
                    <div className="altus-card-body">
                        <div className="space-y-2.5">
                            {filteredProperties.map((property) => (
                                <div
                                    key={property.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 border border-gray-200 dark:border-hotel-navy-light rounded-lg hover:bg-gray-50 dark:hover:bg-hotel-navy-light/40 transition-colors"
                                >
                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                        <div className="w-11 h-11 rounded-lg bg-hotel-gold/10 dark:bg-hotel-navy-light flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                            <Building2 className="w-5 h-5 text-hotel-gold" />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate">{property.name}</p>
                                                {property.hotel_code && (
                                                    <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0">
                                                        {property.hotel_code}
                                                    </Badge>
                                                )}
                                                {/* Organization Badge */}
                                                {property.organizations && (
                                                    <Badge variant="outline" className="border-hotel-gold/30 text-hotel-gold dark:text-hotel-gold-light bg-hotel-gold/5 text-xs px-2 py-0 flex items-center gap-1">
                                                        <Building className="w-3 h-3" />
                                                        {isRTL && property.organizations.name_ar ? property.organizations.name_ar : property.organizations.name}
                                                    </Badge>
                                                )}
                                                {/* Brand Badge */}
                                                {property.brands && (
                                                    <Badge variant="secondary" className="text-xs px-2 py-0">
                                                        {isRTL && property.brands.name_ar ? property.brands.name_ar : property.brands.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                {property.city && (
                                                    <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                                        <MapPin className="w-3 h-3 text-hotel-gold shrink-0" />
                                                        {property.city}
                                                    </span>
                                                )}
                                                {property.address && <span>{property.address}</span>}
                                                {property.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3 shrink-0" />
                                                        {property.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                        <Badge variant={property.is_active ? 'default' : 'secondary'} className={property.is_active ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}>
                                            {property.is_active ? t('admin:properties.active') : t('admin:properties.inactive')}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={() => handleManageDepartments(property)}>
                                            <Layers className="w-3.5 h-3.5 me-1.5" />
                                            {t('admin:properties.departments')}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleEdit(property)}
                                            aria-label={t('accessibility.edit_property', 'Edit property')}
                                        >
                                            <Pencil className="w-4 h-4 text-gray-500 hover:text-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenDelete(property)}
                                            aria-label={t('accessibility.delete_property', 'Delete property')}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="altus-card p-6">
                    <EmptyState
                        icon={Building2}
                        title={t('admin:properties.no_data')}
                        description={
                            isPlatformAdmin && orgFilter !== 'all'
                                ? `${t('admin:properties.no_data_desc')} (${organizations.find(o => o.id === orgFilter)?.name || ''})`
                                : t('admin:properties.no_data_desc')
                        }
                        action={{
                            label: t('admin:properties.add_property'),
                            onClick: handleOpenAdd,
                            icon: Plus
                        }}
                    />
                </div>
            )}

            {/* Add / Edit Property Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) resetForm()
                setIsDialogOpen(open)
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedProperty ? t('admin:properties.edit_property') : t('admin:properties.add_property')}</DialogTitle>
                        <DialogDescription>
                            {selectedProperty ? t('admin:properties.update_details') : t('admin:properties.add_new_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Target Organization Selector (Platform Admin) or Context Badge (Tenant Admin) */}
                        {isPlatformAdmin ? (
                            <div className="space-y-2">
                                <Label htmlFor="dialog-org" className="font-semibold text-gray-900 dark:text-white">
                                    {t('admin:properties.organization_label', 'Target Organization *')}
                                </Label>
                                <Select value={dialogOrgId} onValueChange={(val) => { setDialogOrgId(val); setDialogBrandId('none') }}>
                                    <SelectTrigger id="dialog-org" className="w-full">
                                        <SelectValue placeholder={t('admin:properties.select_organization', 'Select organization...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map(org => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {isRTL && org.name_ar ? org.name_ar : org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : currentOrganization ? (
                            <div className="p-3 bg-muted/60 dark:bg-hotel-navy-light/60 rounded-lg border flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('admin:properties.organization', 'Organization')}</span>
                                <Badge variant="outline" className="font-semibold text-hotel-gold border-hotel-gold/30">
                                    {isRTL && currentOrganization.name_ar ? currentOrganization.name_ar : currentOrganization.name}
                                </Badge>
                            </div>
                        ) : null}

                        {/* Brand Selector (if organization has brands) */}
                        {availableBrands.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="dialog-brand">{t('admin:properties.brand_label', 'Brand (Optional)')}</Label>
                                <Select value={dialogBrandId} onValueChange={setDialogBrandId}>
                                    <SelectTrigger id="dialog-brand" className="w-full">
                                        <SelectValue placeholder={t('admin:properties.select_brand', 'Select brand...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            {t('admin:properties.no_brand', 'None / Independent')}
                                        </SelectItem>
                                        {availableBrands.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {isRTL && b.name_ar ? b.name_ar : b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Name, Code, City */}
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hotel_code">{t('admin:properties.hotel_code_label', 'Property Code (Optional)')}</Label>
                                <Input
                                    id="hotel_code"
                                    value={formData.hotel_code}
                                    onChange={(e) => setFormData({ ...formData, hotel_code: e.target.value })}
                                    placeholder={t('admin:properties.hotel_code_placeholder', 'e.g. ALT-RUH-01')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">{t('admin:properties.city_label', 'City')}</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder={t('admin:properties.city_placeholder', 'e.g. Riyadh')}
                                />
                            </div>
                        </div>

                        {/* Address & Phone */}
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

                        {/* Active status */}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                            />
                            <Label htmlFor="active" className="font-normal cursor-pointer">{t('admin:properties.active_status')}</Label>
                        </div>

                        <DialogFooter className="pt-4">
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

            <ConfirmationDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open)
                    if (!open) setDeleteProperty(null)
                }}
                title={t('admin:properties.confirm_delete_title', {
                    defaultValue: 'Delete {{name}}?',
                    name: deleteProperty?.name || t('admin:properties.property', { defaultValue: 'property' })
                })}
                description={t('admin:properties.confirm_delete_desc', {
                    defaultValue: 'This will permanently delete the property. Any related departments may also be removed depending on system rules. This action cannot be undone.'
                })}
                confirmLabel={t('common:action.delete', { defaultValue: 'Delete' })}
                cancelLabel={t('common:action.cancel', { defaultValue: 'Cancel' })}
                variant="danger"
                onConfirm={handleConfirmDelete}
                isLoading={deleteMutation.isPending}
            />
        </div>
    )
}
