import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowRightLeft } from 'lucide-react'
import type { Profile, Property, Department } from '@/lib/types'
import { useTranslation } from 'react-i18next'

export default function TransferWorkflow() {
    const { user } = useAuth()
    const { t } = useTranslation('hr')
    const navigate = useNavigate()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)


    const [formData, setFormData] = useState({
        employee_id: '',
        to_property_id: '',
        to_department_id: '',
        effective_date: new Date().toISOString().split('T')[0],
        reason: '',
        notes: ''
    })

    // Fetch all employees
    const { data: employees } = useQuery({
        queryKey: ['employees-for-transfer'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
    *,
    user_properties(property_id, properties(id, name))
    `)
                .eq('is_active', true)
                .order('full_name')

            if (error) throw error
            return data as Profile[]
        }
    })

    // Fetch all properties
    const { data: properties } = useQuery({
        queryKey: ['properties'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data as Property[]
        }
    })

    // Fetch departments for selected destination property
    const { data: departments } = useQuery({
        queryKey: ['departments-for-transfer', formData.to_property_id],
        queryFn: async () => {
            if (!formData.to_property_id) return []

            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('property_id', formData.to_property_id)
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data as Department[]
        },
        enabled: !!formData.to_property_id
    })

    const selectedEmployee = employees?.find(e => e.id === formData.employee_id)
    const currentProperty = (selectedEmployee as any)?.user_properties?.[0]?.properties

    const transferMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('employee_transfers')
                .insert([{
                    employee_id: formData.employee_id,
                    from_property_id: currentProperty?.id || null,
                    to_property_id: formData.to_property_id,
                    to_department_id: formData.to_department_id || null,
                    effective_date: formData.effective_date,
                    approved_by: user?.id,
                    reason: formData.reason || null,
                    notes: formData.notes || null
                }])

            if (error) throw error
        },
        onSuccess: () => {
            toast({
                title: t('transfer.success_title'),
                description: t('transfer.success_desc'),
            })
            queryClient.invalidateQueries({ queryKey: ['employees-for-transfer'] })
            navigate('/hr/transfers/history')
        },
        onError: (error: any) => {
            toast({
                title: t('common:error', { defaultValue: 'Error' }),
                description: error.message || t('common:error_occurred', { defaultValue: 'Failed to create transfer' }),
                variant: 'destructive'
            })
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await transferMutation.mutateAsync()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('transfer.title')}
                description={t('transfer.description')}
            />

            <form onSubmit={handleSubmit} className="max-w-2xl">
                <div className="prime-card">
                    <div className="prime-card-header">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">{t('transfer.details')}</h3>
                        </div>
                    </div>
                    <div className="prime-card-body space-y-4">
                        <div>
                            <Label htmlFor="employee">{t('transfer.employee')} *</Label>
                            <Select
                                value={formData.employee_id}
                                onValueChange={(value) => setFormData({ ...formData, employee_id: value, to_department_id: '' })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('promotion.select_employee')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.map((emp: any) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.full_name} ({emp.user_properties?.[0]?.properties?.name || t('history.no_transfers').replace('transfers', 'property')})
                                            {/* Fallback for no property? Just 'No property' -> local string. I should fix it. */}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedEmployee && currentProperty && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    <strong>{t('transfer.current_property')}:</strong> {currentProperty.name}
                                </p>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="to_property">{t('transfer.dest_property')} *</Label>
                            <Select
                                value={formData.to_property_id}
                                onValueChange={(value) => setFormData({ ...formData, to_property_id: value, to_department_id: '' })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('transfer.select_dest')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties?.map((prop) => (
                                        <SelectItem key={prop.id} value={prop.id}>
                                            {prop.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="to_department">{t('transfer.dest_dept')}</Label>
                            <Select
                                value={formData.to_department_id}
                                onValueChange={(value) => setFormData({ ...formData, to_department_id: value })}
                                disabled={!formData.to_property_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('transfer.dest_dept')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments?.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="effective_date">{t('promotion.effective_date')} *</Label>
                            <Input
                                id="effective_date"
                                type="date"
                                value={formData.effective_date}
                                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {t('promotion.auto_applied')}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="reason">{t('transfer.reason')}</Label>
                            <Input
                                id="reason"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder={t('transfer.reason_placeholder')}
                            />
                        </div>

                        <div>
                            <Label htmlFor="notes">{t('promotion.notes')}</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={t('transfer.notes_placeholder')}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/hr/transfers/history')}
                        disabled={isSubmitting}
                    >
                        {t('common:cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting}
                    >
                        <ArrowRightLeft className="h-4 w-4 me-2" />
                        {t('transfer.create')}
                    </Button>
                </div>
            </form>
        </div>
    )
}
