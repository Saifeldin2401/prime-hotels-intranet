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
import { ArrowUp } from 'lucide-react'
import type { Profile, Department } from '@/lib/types'
import { ROLES, type AppRole } from '@/lib/constants'
import { useTranslation } from 'react-i18next'

export default function PromotionWorkflow() {
    const { user } = useAuth()
    const { t } = useTranslation(['hr', 'common'])
    const navigate = useNavigate()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)


    const [formData, setFormData] = useState({
        employee_id: '',
        to_role: '' as AppRole | '',
        to_title: '',
        to_department_id: '',
        effective_date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    // Helper to get translated role label
    const getRoleLabel = (role: string) => {
        return t(`roles.${role}`, { defaultValue: ROLES[role as AppRole]?.label || role })
    }

    // Fetch all employees
    const { data: employees } = useQuery({
        queryKey: ['employees-for-promotion'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          *,
          user_roles!inner(role),
          user_departments(department_id, departments(id, name))
        `)
                .eq('is_active', true)
                .order('full_name')

            if (error) throw error
            return data as (Profile & { user_roles: { role: string }[] })[]
        }
    })

    // Fetch departments for selected employee's property
    const { data: departments } = useQuery({
        queryKey: ['departments-for-promotion', formData.employee_id],
        queryFn: async () => {
            if (!formData.employee_id) return []

            // Get employee's property
            const { data: userProperty } = await supabase
                .from('user_properties')
                .select('property_id')
                .eq('user_id', formData.employee_id)
                .single()

            if (!userProperty) return []

            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('property_id', userProperty.property_id)
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data as Department[]
        },
        enabled: !!formData.employee_id
    })

    const selectedEmployee = employees?.find(e => e.id === formData.employee_id)
    const currentRole = selectedEmployee?.user_roles?.[0]?.role || ''

    const promoteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc("promote_employee", {
                p_employee_id: formData.employee_id,
                p_new_role: formData.to_role,
                p_new_job_title: formData.to_title,
                p_new_department_id: formData.to_department_id || null,
                p_effective_date: formData.effective_date,
                p_notes: formData.notes || null,
                p_promoter_id: user?.id,
            });

            if (error) throw error
        },
        onSuccess: () => {
            toast({
                title: t('promotion.success_title'),
                description: t('promotion.success_desc'),
            })
            queryClient.invalidateQueries({ queryKey: ['employees-for-promotion'] })
            navigate('/hr/promotions/history')
        },
        onError: (error: any) => {
            console.error('Promotion error:', error)
            toast({
                title: t('common:error', { defaultValue: 'Error' }),
                description: error.message || t('common:error_occurred', { defaultValue: 'Failed to create promotion' }),
                variant: 'destructive'
            })
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await promoteMutation.mutateAsync()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('promotion.title')}
                description={t('promotion.description')}
            />

            <form onSubmit={handleSubmit} className="max-w-2xl">
                <div className="prime-card">
                    <div className="prime-card-header">
                        <div className="flex items-center gap-2">
                            <ArrowUp className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-semibold">{t('promotion.details')}</h3>
                        </div>
                    </div>
                    <div className="prime-card-body space-y-4">
                        <div>
                            <Label htmlFor="employee">{t('promotion.employee')} *</Label>
                            <Select
                                value={formData.employee_id}
                                onValueChange={(value) => setFormData({ ...formData, employee_id: value, to_department_id: '' })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('promotion.select_employee')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.full_name} ({getRoleLabel(emp.user_roles?.[0]?.role)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedEmployee && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    <strong>{t('promotion.current_role')}:</strong> {getRoleLabel(currentRole)}
                                </p>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="to_role">{t('promotion.new_role')} *</Label>
                            <Select
                                value={formData.to_role}
                                onValueChange={(value) => setFormData({ ...formData, to_role: value as AppRole })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('promotion.select_role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(ROLES).map((key) => (
                                        <SelectItem key={key} value={key}>
                                            {getRoleLabel(key)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="to_title">{t('promotion.new_title')} *</Label>
                            <Input
                                id="to_title"
                                value={formData.to_title}
                                onChange={(e) => setFormData({ ...formData, to_title: e.target.value })}
                                placeholder={t('promotion.new_title_placeholder')}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="to_department">{t('promotion.new_dept')}</Label>
                            <Select
                                value={formData.to_department_id}
                                onValueChange={(value) => setFormData({ ...formData, to_department_id: value })}
                                disabled={!formData.employee_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('promotion.new_dept')} />
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
                            <Label htmlFor="notes">{t('promotion.notes')}</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={t('promotion.notes_placeholder')}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/hr/promotions/history')}
                        disabled={isSubmitting}
                    >
                        {t('common:cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isSubmitting}
                    >
                        <ArrowUp className="h-4 w-4 me-2" />
                        {t('promotion.create')}
                    </Button>
                </div>
            </form>
        </div>
    )
}
