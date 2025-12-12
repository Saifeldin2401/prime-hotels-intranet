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
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'
import type { Property } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/use-toast'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

export default function PropertyManagement() {
    const { t } = useTranslation('common') // Using common for now, create specific translations later if needed
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

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
                title: selectedProperty ? 'Property Updated' : 'Property Created',
                description: `Successfully ${selectedProperty ? 'updated' : 'added'} the property.`,
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        mutation.mutate(formData)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Property Management"
                description="Manage hotel properties and locations"
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Property
                    </Button>
                }
            />

            <div className="prime-card">
                <div className="prime-card-header">
                    <h3 className="text-lg font-semibold">Properties</h3>
                </div>
                <div className="prime-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading properties...</div>
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
                                        <Badge variant={property.is_active ? 'default' : 'secondary'}>
                                            {property.is_active ? 'Active' : 'Inactive'}
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
                            title="No properties found"
                            description="Get started by adding your first property."
                            action={{
                                label: "Add Property",
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
                        <DialogTitle>{selectedProperty ? 'Edit Property' : 'Add Property'}</DialogTitle>
                        <DialogDescription>
                            {selectedProperty ? 'Update details for this property.' : 'Add a new property to the organization.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Property Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Prime Al Nokhba"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Building, Street, City"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+966 ..."
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
                                <Label htmlFor="active" className="font-normal cursor-pointer">Active Status</Label>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Saving...' : (selectedProperty ? 'Update' : 'Create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
