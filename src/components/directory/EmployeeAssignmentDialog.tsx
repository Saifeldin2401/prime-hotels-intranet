import { useState, useMemo, useId } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, Users, Briefcase, Save, ShieldAlert, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { OrgEmployee } from '@/hooks/useOrgHierarchy'
import { cn, escapeSearchQuery } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

interface EmployeeAssignmentDialogProps {
    employee: OrgEmployee | null
    isOpen: boolean
    onClose: () => void
}

// Which roles can be assigned by which admin role
const ASSIGNABLE_ROLES: Record<string, string[]> = {
    'corporate_admin': ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff'],
    'regional_admin': ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff'],
    'regional_hr': ['property_hr', 'department_head', 'staff'],
    'property_manager': ['property_hr', 'department_head', 'staff'],
    'property_hr': ['department_head', 'staff'],
}

const MANAGER_ROLES = ['department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin', 'corporate_admin']

export function EmployeeAssignmentDialog({ employee, isOpen, onClose }: EmployeeAssignmentDialogProps) {
    const { t } = useTranslation('directory')
    const { primaryRole, properties: userProperties } = useAuth()
    const queryClient = useQueryClient()

    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => employee?.propertyId || '')
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(() => employee?.departmentId || 'none')
    const [selectedRole, setSelectedRole] = useState<string>(() => employee?.roles?.[0] || 'staff')
    const [selectedManagerId, setSelectedManagerId] = useState<string | null>(() => employee?.reporting_to || null)
    const [openManagerSelect, setOpenManagerSelect] = useState(false)
    const [managerSearch, setManagerSearch] = useState('')
    const debouncedManagerSearch = useDebounce(managerSearch, 300)
    const managerListId = useId()

    // Check if admin can edit this employee
    const canEditEmployee = useMemo(() => {
        if (!employee || !primaryRole) return false

        // Corporate admins can edit anyone
        if (primaryRole === 'corporate_admin') return true

        // Regional admins can edit anyone
        if (primaryRole === 'regional_admin') return true

        // Regional HR can edit anyone except regional_admin
        if (primaryRole === 'regional_hr') {
            return !employee.roles.includes('regional_admin') && !employee.roles.includes('corporate_admin')
        }

        // Property manager/HR can only edit employees at their property
        if (['property_manager', 'property_hr'].includes(primaryRole)) {
            // Cannot edit corporate employees
            if (employee.roles.some(r => ['corporate_admin', 'regional_admin', 'regional_hr'].includes(r))) {
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
        if (['corporate_admin', 'regional_admin', 'regional_hr'].includes(primaryRole || '')) {
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

    const isCorpAdmin = ['corporate_admin', 'regional_admin', 'regional_hr'].includes(primaryRole || '')
    const allowedPropertyIds = useMemo(() => {
        if (isCorpAdmin) return null
        return userProperties?.map(p => p.id) || []
    }, [isCorpAdmin, userProperties])

    const { data: selectedManagerProfile } = useQuery({
        queryKey: ['org-selected-manager', selectedManagerId],
        queryFn: async () => {
            if (!selectedManagerId) return null
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, job_title, staff_id')
                .eq('id', selectedManagerId)
                .single()
            if (error) throw error
            return data as { id: string; full_name: string; job_title: string | null; staff_id: string | null }
        },
        enabled: !!selectedManagerId
    })

    const { data: managerResults = [] } = useQuery({
        queryKey: ['org-manager-search', debouncedManagerSearch, selectedPropertyId, primaryRole, employee?.id],
        queryFn: async () => {
            const trimmed = debouncedManagerSearch.trim()
            if (trimmed.length < 2) return []
            if (!employee) return []

            const escaped = escapeSearchQuery(trimmed)
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    job_title,
                    staff_id,
                    user_roles(role),
                    user_properties(property_id)
                `)
                .eq('is_active', true)
                .or(`full_name.ilike.%${escaped}%,staff_id.ilike.%${escaped}%,job_title.ilike.%${escaped}%`)
                .limit(25)

            if (error) throw error

            const rows = (data || []) as {
                id: string
                full_name: string
                job_title: string | null
                staff_id: string | null
                user_roles?: { role: string }[]
                user_properties?: { property_id: string }[]
            }[]

            return rows
                .filter((p) => p.id !== employee.id)
                .filter((p) => {
                    const roles = p.user_roles?.map((r) => r.role) || []
                    return roles.some((r) => MANAGER_ROLES.includes(r))
                })
                .filter((p) => {
                    if (isCorpAdmin || !allowedPropertyIds?.length) return true
                    const propIds = p.user_properties?.map((up) => up.property_id) || []
                    return propIds.some((id) => allowedPropertyIds.includes(id))
                })
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
        },
        enabled: debouncedManagerSearch.trim().length >= 2
    })

    const initializeForm = (targetEmployee: OrgEmployee) => {
        setSelectedPropertyId(targetEmployee.propertyId || '')
        setSelectedDepartmentId(targetEmployee.departmentId || 'none')
        setSelectedRole(targetEmployee.roles?.[0] || 'staff')
        setSelectedManagerId(targetEmployee.reporting_to || null)
    }

    const handlePropertyChange = (nextPropertyId: string) => {
        setSelectedPropertyId(nextPropertyId)
        if (employee && nextPropertyId !== employee.propertyId) {
            setSelectedDepartmentId('none')
        }
    }

    const handleDialogOpenChange = (open: boolean) => {
        if (open && employee) {
            initializeForm(employee)
            return
        }
        if (!open) {
            onClose()
        }
    }

    // Mutation to update user assignment
    const updateAssignment = useMutation({
        mutationFn: async () => {
            if (!employee) throw new Error('No employee selected')
            if (!canEditEmployee) throw new Error('You do not have permission to edit this employee')

            const isValidUUID = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

            // 1. Update or insert user_properties
            if (selectedPropertyId) {
                const propertyExists = properties.some((p: any) => p.id === selectedPropertyId)
                if (!isValidUUID(selectedPropertyId) || !propertyExists) {
                    throw new Error('Selected property is invalid')
                }

                const { data: existingProperties, error: existingPropertiesError } = await supabase
                    .from('user_properties')
                    .select('property_id')
                    .eq('user_id', employee.id)
                if (existingPropertiesError) throw existingPropertiesError

                const { error: propError } = await supabase
                    .from('user_properties')
                    .upsert(
                        { user_id: employee.id, property_id: selectedPropertyId },
                        { onConflict: 'user_id,property_id', ignoreDuplicates: true }
                    )
                if (propError) throw propError

                const propertiesToRemove = (existingProperties || [])
                    .map((row) => row.property_id)
                    .filter((id): id is string => !!id && id !== selectedPropertyId)
                if (propertiesToRemove.length > 0) {
                    const { error: removePropertiesError } = await supabase
                        .from('user_properties')
                        .delete()
                        .eq('user_id', employee.id)
                        .in('property_id', propertiesToRemove)
                    if (removePropertiesError) throw removePropertiesError
                }
            }

            // 2. Update or insert user_departments
            const actualDeptId = selectedDepartmentId === 'none' ? null : selectedDepartmentId

            const { data: existingDepartments, error: existingDepartmentsError } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', employee.id)
            if (existingDepartmentsError) throw existingDepartmentsError

            const departmentExists = departments.some((d: any) => d.id === actualDeptId)
            if (actualDeptId) {
                if (!isValidUUID(actualDeptId) || !departmentExists) {
                    throw new Error('Selected department is invalid')
                }

                const { error: deptError } = await supabase
                    .from('user_departments')
                    .upsert(
                        { user_id: employee.id, department_id: actualDeptId },
                        { onConflict: 'user_id,department_id', ignoreDuplicates: true }
                    )
                if (deptError) throw deptError
            }

            const departmentsToRemove = (existingDepartments || [])
                .map((row) => row.department_id)
                .filter((id): id is string => !!id && id !== actualDeptId)
            if (departmentsToRemove.length > 0) {
                const { error: removeDepartmentsError } = await supabase
                    .from('user_departments')
                    .delete()
                    .eq('user_id', employee.id)
                    .in('department_id', departmentsToRemove)
                if (removeDepartmentsError) throw removeDepartmentsError
            }

            // 3. Update user role (only if allowed)
            if (selectedRole && selectedRole !== employee.roles?.[0]) {
                const assignableRoles = ASSIGNABLE_ROLES[primaryRole || ''] || []
                if (!assignableRoles.includes(selectedRole)) {
                    throw new Error('You cannot assign this role')
                }

                const { data: existingRoles, error: existingRolesError } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', employee.id)
                if (existingRolesError) throw existingRolesError

                const { error: roleError } = await supabase
                    .from('user_roles')
                    .upsert(
                        { user_id: employee.id, role: selectedRole },
                        { onConflict: 'user_id,role', ignoreDuplicates: true }
                    )
                if (roleError) throw roleError

                const rolesToRemove = (existingRoles || [])
                    .map((row) => row.role)
                    .filter((roleName): roleName is string => !!roleName && roleName !== selectedRole)
                if (rolesToRemove.length > 0) {
                    const { error: removeRolesError } = await supabase
                        .from('user_roles')
                        .delete()
                        .eq('user_id', employee.id)
                        .in('role', rolesToRemove)
                    if (removeRolesError) throw removeRolesError
                }
            }

            // 4. Update reporting line (manager)
            if (selectedManagerId === employee.id) {
                throw new Error('Employee cannot report to themselves')
            }

            const { error: reportingError } = await supabase
                .from('profiles')
                .update({ reporting_to: selectedManagerId || null })
                .eq('id', employee.id)

            if (reportingError) throw reportingError

            return true
        },
        onSuccess: () => {
            toast.success(t('assignment_updated', 'Employee assignment updated successfully'))
            queryClient.invalidateQueries({ queryKey: ['org-hierarchy-profiles'] })
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
            queryClient.invalidateQueries({ queryKey: ['employee-directory-rpc'] })
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
        <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
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
                            onValueChange={handlePropertyChange}
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

                    {/* Reporting Line */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t('reports_to', 'Reports To (Manager)')}
                        </Label>
                        <Popover open={openManagerSelect} onOpenChange={setOpenManagerSelect}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openManagerSelect}
                                    aria-controls={managerListId}
                                    className="w-full justify-between font-normal text-left"
                                    disabled={!canEditEmployee}
                                >
                                    {selectedManagerId
                                        ? (selectedManagerProfile?.full_name || t('selected_manager', 'Selected manager'))
                                        : t('no_manager', 'No manager')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[360px] p-0" align="start">
                                <Command>
                                    <CommandInput
                                        placeholder={t('search_managers', 'Search managers')}
                                        value={managerSearch}
                                        onValueChange={setManagerSearch}
                                    />
                                    <CommandList id={managerListId}>
                                        <CommandEmpty>
                                            {managerSearch.trim().length >= 2
                                                ? t('manager_none_helper', 'No managers found')
                                                : t('manager_search_helper', 'Type at least 2 characters to search')}
                                        </CommandEmpty>
                                        <CommandGroup heading={t('available_managers', 'Available Managers')}>
                                            <CommandItem
                                                value="no-manager"
                                                onSelect={() => {
                                                    setSelectedManagerId(null)
                                                    setManagerSearch('')
                                                    setOpenManagerSelect(false)
                                                }}
                                                className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                            >
                                                <div className="w-full flex items-center px-2 py-1.5">
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            !selectedManagerId ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <span className="text-muted-foreground">{t('no_manager', 'No manager')}</span>
                                                </div>
                                            </CommandItem>
                                            {managerResults.map((manager: any) => (
                                                <CommandItem
                                                    key={manager.id}
                                                    value={`${manager.full_name} ${manager.staff_id || ''} ${manager.job_title || ''}`}
                                                    onSelect={() => {
                                                        setSelectedManagerId(manager.id)
                                                        setManagerSearch('')
                                                        setOpenManagerSelect(false)
                                                    }}
                                                    className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                >
                                                    <div className="w-full flex items-center px-2 py-1.5">
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedManagerId === manager.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <span>{manager.full_name}</span>
                                                        <span className="ml-2 text-[10px] bg-slate-100 px-1 rounded text-slate-500 font-mono">
                                                            {manager.staff_id || 'no-id'}
                                                        </span>
                                                        <span className="ml-auto text-xs text-muted-foreground">
                                                            {manager.job_title || ''}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                            {t('reporting_line_helper', 'Search and assign the reporting line used in the org chart.')}
                        </p>
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
