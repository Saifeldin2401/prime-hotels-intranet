import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { cn, escapeSearchQuery } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
    Briefcase,
    Building2,
    ChevronDown,
    ChevronRight,
    User,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Employee {
    id: string
    full_name: string
    email: string
    job_title: string | null
    reporting_to: string | null
    is_active: boolean
}

interface Department {
    id: string
    name: string
    employees: Employee[]
}

interface OrgByDepartmentProps {
    onEmployeeClick?: (employee: Employee) => void
    searchTerm?: string
}

interface EmployeeRow {
    id: string
    full_name: string
    email: string
    job_title: string | null
    reporting_to: string | null
    is_active: boolean
    organization_memberships?: { department_id: string | null; organization_id: string | null }[]
}

/** People of the current organization, grouped by department. */
export function OrgByDepartment({ onEmployeeClick, searchTerm }: OrgByDepartmentProps) {
    const { t } = useTranslation('admin')
    const { currentOrganization } = useTenant()
    const organizationId = currentOrganization?.id
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    const { data: departments, isLoading } = useQuery({
        queryKey: ['org-by-department', organizationId, searchTerm],
        enabled: !!organizationId,
        queryFn: async (): Promise<Department[]> => {
            const { data: deptRows, error: deptError } = await supabase
                .from('departments')
                .select('id, name')
                .eq('organization_id', organizationId!)
                .eq('is_active', true)
                .order('name')
            if (deptError) throw deptError

            let empQuery = supabase
                .from('profiles')
                .select(`
          id,
          full_name,
          email,
          job_title,
          reporting_to,
          is_active,
          organization_memberships!inner(department_id, organization_id)
        `)
                .eq('is_active', true)
                .eq('organization_memberships.organization_id', organizationId!)
                .order('full_name')

            if (searchTerm) {
                const escaped = escapeSearchQuery(searchTerm)
                empQuery = empQuery.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,job_title.ilike.%${escaped}%`)
            }

            const { data: employees, error: empError } = await empQuery
            if (empError) throw empError
            const employeeRows = (employees || []) as EmployeeRow[]

            return (deptRows || [])
                .map((dept) => ({
                    id: dept.id,
                    name: dept.name,
                    employees: employeeRows
                        .filter((emp) => emp.organization_memberships?.some((om) => om.department_id === dept.id))
                        .map((emp) => ({
                            id: emp.id,
                            full_name: emp.full_name,
                            email: emp.email,
                            job_title: emp.job_title,
                            reporting_to: emp.reporting_to,
                            is_active: emp.is_active
                        }))
                }))
                .filter((d) => d.employees.length > 0 || !searchTerm) // Show empty departments only when not searching
        }
    })

    const toggleDepartment = (deptId: string) => {
        setCollapsed(prev => {
            const next = new Set(prev)
            if (next.has(deptId)) next.delete(deptId)
            else next.add(deptId)
            return next
        })
    }

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center text-ds-muted">
                <Users className="me-2 h-6 w-6 animate-pulse" />
                {t('common:loading', 'Loading...')}
            </div>
        )
    }

    if (!departments || departments.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-ds-muted">
                    <Building2 className="mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium">{t('organization.no_data', 'No data available')}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden">
            <div className="divide-y divide-ds-border">
                {departments.map(dept => {
                    const open = !collapsed.has(dept.id)
                    return (
                        <div key={dept.id}>
                            <button
                                type="button"
                                aria-expanded={open}
                                className="flex w-full items-center gap-3 bg-ds-surface-subtle px-4 py-3 text-start transition-colors hover:bg-ds-accent-soft"
                                onClick={() => toggleDepartment(dept.id)}
                            >
                                {open ? (
                                    <ChevronDown className="h-4 w-4 text-ds-muted" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-ds-muted rtl:rotate-180" />
                                )}
                                <Briefcase className="h-5 w-5 text-ds-accent" />
                                <span className="font-medium text-ds-ink">{dept.name}</span>
                                <Badge variant="outline" className="ms-auto text-xs">
                                    <Users className="me-1 h-3 w-3" />
                                    {dept.employees.length}
                                </Badge>
                            </button>

                            {open && dept.employees.length > 0 && (
                                <div className="bg-ds-surface">
                                    {dept.employees.map(emp => (
                                        <div
                                            key={emp.id}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-3 border-s-4 border-transparent px-10 py-2.5 transition-colors hover:bg-ds-surface-subtle",
                                                onEmployeeClick && "hover:border-s-ds-accent"
                                            )}
                                            onClick={() => onEmployeeClick?.(emp)}
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-accent-soft text-xs font-semibold text-ds-accent">
                                                {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-ds-ink">{emp.full_name}</p>
                                                <p className="truncate text-sm text-ds-muted">{emp.job_title || emp.email}</p>
                                            </div>
                                            <User className="h-4 w-4 text-ds-muted" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {open && dept.employees.length === 0 && (
                                <div className="px-10 py-4 text-sm italic text-ds-muted">
                                    {t('organization.no_employees_dept', 'No employees assigned to this department')}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
