import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePotentialManagers } from '@/hooks/useOrganization'
import { Badge } from '@/components/ui/badge'
import { User, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ManagerSelectProps {
    value: string | null
    onChange: (value: string | null) => void
    propertyId?: string
    excludeUserId?: string
    disabled?: boolean
    placeholder?: string
    allowClear?: boolean
}

export function ManagerSelect({
    value,
    onChange,
    propertyId,
    excludeUserId,
    disabled = false,
    placeholder,
    allowClear = true
}: ManagerSelectProps) {
    const { t } = useTranslation('admin')
    const { data: managers, isLoading } = usePotentialManagers(propertyId, excludeUserId)

    const getRoleBadge = (role: string) => {
        const roleColors: Record<string, string> = {
            regional_admin: 'bg-purple-100 text-purple-800',
            regional_hr: 'bg-pink-100 text-pink-800',
            property_manager: 'bg-blue-100 text-blue-800',
            property_hr: 'bg-green-100 text-green-800',
            department_head: 'bg-orange-100 text-orange-800'
        }
        return roleColors[role] || 'bg-gray-100 text-gray-800'
    }

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            regional_admin: 'Regional Admin',
            regional_hr: 'Regional HR',
            property_manager: 'Property Manager',
            property_hr: 'Property HR',
            department_head: 'Dept. Head'
        }
        return labels[role] || role
    }

    return (
        <Select
            value={value || ''}
            onValueChange={(v) => onChange(v === '__none__' ? null : v)}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder || t('organization.select_manager', 'Select manager...')} />
            </SelectTrigger>
            <SelectContent>
                {allowClear && (
                    <SelectItem value="__none__">
                        <span className="flex items-center gap-2 text-gray-500">
                            <Users className="h-4 w-4" />
                            {t('organization.no_manager', 'No Manager (Top Level)')}
                        </span>
                    </SelectItem>
                )}

                {managers?.map((manager) => {
                    const role = manager.user_roles?.[0]?.role || 'staff'
                    return (
                        <SelectItem key={manager.id} value={manager.id}>
                            <span className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span>{manager.full_name}</span>
                                {manager.job_title && (
                                    <span className="text-gray-400 text-xs">({manager.job_title})</span>
                                )}
                                <Badge className={`${getRoleBadge(role)} text-xs px-1.5 py-0`}>
                                    {getRoleLabel(role)}
                                </Badge>
                            </span>
                        </SelectItem>
                    )
                })}

                {!isLoading && managers?.length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">
                        {t('organization.no_managers_found', 'No managers found')}
                    </div>
                )}
            </SelectContent>
        </Select>
    )
}
