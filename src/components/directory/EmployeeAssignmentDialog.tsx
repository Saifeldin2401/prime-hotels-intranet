import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, Users, Briefcase, Save, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { OrgEmployee } from '@/hooks/useOrgHierarchy'

interface EmployeeAssignmentDialogProps {
    employee: OrgEmployee | null
    isOpen: boolean
    onClose: () => void
}

// Role hierarchy - higher number = more power
const ROLE_HIERARCHY: Record<string, number> = {
    'regional_admin': 100,
    'regional_hr': 90,
    'property_manager': 50,
    'property_hr': 40,
    'department_head': 30,
    'staff': 10
}

// Which roles can be assigned by which admin role
const ASSIGNABLE_ROLES: Record<string, string[]> = {
    'regional_admin': ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff'],
    'regional_hr': ['property_hr', 'department_head', 'staff'],
    'property_manager': ['property_hr', 'department_head', 'staff'],
    'property_hr': ['department_head', 'staff'],
}

export function EmployeeAssignmentDialog({ employee, isOpen, onClose }: EmployeeAssignmentDialogProps) {
    const { t } = useTranslation('directory')
    const { primaryRole, properties: userProperties } = useAuth()
    const queryClient = useQueryClient()

    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('none')
    const [selectedRole, setSelectedRole] = useState<string>('')

    // Determine admin's permission level
    const adminRoleLevel = ROLE_HIERARCHY[primaryRole || ''] || 0
    const targetRoleLevel = ROLE_HIERARCHY[employee?.roles?.[0] || 'staff'] || 0

    // Check if admin can edit this employee
    const canEditEmployee = useMemo(() => {
        if (!employee || !primaryRole) return false

        // Regional admins can edit anyone
        if (primaryRole === 'regional_admin') return true

        // Regional HR can edit anyone except regional_admin
        if (primaryRole === 'regional_hr') {
            return !employee.roles.includes('regional_admin')
        }

        // Property manager/HR can only edit employees at their property
        if (['property_manager', 'property_hr'].includes(primaryRole)) {
            // Cannot edit corporate employees
            if (employee.roles.some(r => ['regional_admin', 'regional_hr'].includes(r))) {
                return false
            }
            // Must be at same property
            const userPropIds = userProperties?.map(p => p.id) || []
            return employee.propertyId ? userPropIds.includes(employee.propertyId) : false
        }

        return false
    }, [employee, primaryRole, userProperties])

    // Get available roles based on admin's role
    const availableRoles = useMemo(() => {
        const assignable = ASSIGNABLE_ROLES[primaryRole || ''] || []
        return [
            { value: 'staff', label: 'Staff' },
            { value: 'department_head', label: 'Department Head' },
            { value: 'property_hr', label: 'Property HR' },
            { value: 'property_manager', label: 'Property Manager' },
            { value: 'regional_hr', label: 'Regional HR' },
            { value: 'regional_admin', label: 'Regional Admin' },
        ].filter(role => assignable.includes(role.value))
    }, [primaryRole])

    // Fetch properties - filtered based on admin role
    const { data: allProperties = [] } = useQuery({
        queryKey: ['admin-properties'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('id, name, is_headquarters')
                .eq('is_active', true)
                .order('is_headquarters', { ascending: false })
                .order('name')
            if (error) throw error
            return data
        }
    })

    // Filter properties based on admin role
    const properties = useMemo(() => {
        if (['regional_admin', 'regional_hr'].includes(primaryRole || '')) {
            return allProperties
        }
        // Property managers/HR can only assign to their properties
        const userPropIds = userProperties?.map(p => p.id) || []
        return allProperties.filter((p: any) => userPropIds.includes(p.id))
    }, [allProperties, primaryRole, userProperties])

    // Fetch departments for selected property
    const { data: departments = [] } = useQuery({
        queryKey: ['admin-departments', selectedPropertyId],
        queryFn: async () => {
            if (!selectedPropertyId) return []
            const { data, error } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', selectedPropertyId)
                .order('name')
            if (error) throw error
            return data
        },
        enabled: !!selectedPropertyId
    })

    // Initialize form when employee changes
    useEffect(() => {
        if (employee) {
            setSelectedPropertyId(employee.propertyId || '')
            setSelectedDepartmentId(employee.departmentId || 'none')
            setSelectedRole(employee.roles?.[0] || 'staff')
        }
    }, [employee])

    // Reset department when property changes
    useEffect(() => {
        if (employee && selectedPropertyId !== employee.propertyId) {
            setSelectedDepartmentId('none')
        }
    }, [selectedPropertyId, employee])

    // Mutation to update user assignment
    const updateAssignment = useMutation({
        mutationFn: async () => {
            if (!employee) throw new Error('No employee selected')
            if (!canEditEmployee) throw new Error('You do not have permission to edit this employee')

            // 1. Update or insert user_properties
            if (selectedPropertyId) {
                await supabase
                    .from('user_properties')
                    .delete()
                    .eq('user_id', employee.id)

                const { error: propError } = await supabase
                    .from('user_properties')
                    .insert({ user_id: employee.id, property_id: selectedPropertyId })

                if (propError) throw propError
            }

            // 2. Update or insert user_departments
            const actualDeptId = selectedDepartmentId === 'none' ? null : selectedDepartmentId

            await supabase
                .from('user_departments')
                .delete()
                .eq('user_id', employee.id)

            if (actualDeptId) {
                const { error: deptError } = await supabase
                    .from('user_departments')
                    .insert({ user_id: employee.id, department_id: actualDeptId })

                if (deptError) throw deptError
            }

            // 3. Update user role (only if allowed)
            if (selectedRole && selectedRole !== employee.roles?.[0]) {
                const assignableRoles = ASSIGNABLE_ROLES[primaryRole || ''] || []
                if (!assignableRoles.includes(selectedRole)) {
                    throw new Error('You cannot assign this role')
                }

                await supabase
                    .from('user_roles')
                    .delete()
                    .eq('user_id', employee.id)

                const { error: roleError } = await supabase
                    .from('user_roles')
                    .insert({ user_id: employee.id, role: selectedRole })

                if (roleError) throw roleError
            }

            return true
        },
        onSuccess: () => {
            toast.success(t('assignment_updated', 'Employee assignment updated successfully'))
            queryClient.invalidateQueries({ queryKey: ['org-hierarchy-profiles'] })
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.message || t('assignment_error', 'Failed to update assignment'))
        }
    })

    if (!employee) return null

    const initials = employee.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || '??'

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            {employee.avatar_url ? (
                                <AvatarImage src={employee.avatar_url} alt={employee.full_name} />
                            ) : (
                                <AvatarFallback>{initials}</AvatarFallback>
                            )}
                        </Avatar>
                        <div>
                            <div>{employee.full_name}</div>
                            <div className="text-sm font-normal text-muted-foreground">
                                {employee.job_title || 'No title'}
                            </div>
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        {t('assign_description', 'Manage property, department, and role assignment')}
                    </DialogDescription>
                </DialogHeader>

                {/* Permission Warning */}
                {!canEditEmployee && (
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertDescription>
                            {t('no_permission', 'You do not have permission to edit this employee. Only users with higher access levels or from the same property can make changes.')}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 py-4">
                    {/* Property Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {t('property', 'Property / Hotel')}
                        </Label>
                        <Select
                            value={selectedPropertyId}
                            onValueChange={setSelectedPropertyId}
                            disabled={!canEditEmployee}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('select_property', 'Select a property')} />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map((prop: any) => (
                                    <SelectItem key={prop.id} value={prop.id}>
                                        {prop.name}
                                        {prop.is_headquarters && (
                                            <Badge variant="secondary" className="ml-2 text-xs">HQ</Badge>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Department Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('department', 'Department')}
                        </Label>
                        <Select
                            value={selectedDepartmentId}
                            onValueChange={setSelectedDepartmentId}
                            disabled={!selectedPropertyId || !canEditEmployee}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    selectedPropertyId
                                        ? t('select_department', 'Select a department')
                                        : t('select_property_first', 'Select property first')
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground">{t('no_department', 'No specific department')}</span>
                                </SelectItem>
                                {departments.map((dept: any) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            {t('role', 'Role')}
                        </Label>
                        <Select
                            value={selectedRole}
                            onValueChange={setSelectedRole}
                            disabled={!canEditEmployee || availableRoles.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('select_role', 'Select a role')} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRoles.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {availableRoles.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                {t('no_roles_available', 'You cannot change this employee\'s role')}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t('cancel', 'Cancel')}
                    </Button>
                    <Button
                        onClick={() => updateAssignment.mutate()}
                        disabled={updateAssignment.isPending || !selectedPropertyId || !canEditEmployee}
                    >
                        {updateAssignment.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {t('save_changes', 'Save Changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
