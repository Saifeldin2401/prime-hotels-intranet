import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import {
    Building2,
    Users,
    ChevronDown,
    ChevronRight,
    Briefcase,
    User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    property_id: string
    employees: Employee[]
}

interface PropertyGroup {
    id: string
    name: string
    departments: Department[]
    employeeCount: number
}

interface OrgByDepartmentProps {
    onEmployeeClick?: (employee: Employee) => void
    selectedPropertyId?: string
    searchTerm?: string
}

export function OrgByDepartment({ onEmployeeClick, selectedPropertyId, searchTerm }: OrgByDepartmentProps) {
    const { t } = useTranslation('admin')
    const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
    const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set())

    // Fetch all data needed
    const { data: propertyGroups, isLoading } = useQuery({
        queryKey: ['org-by-department', selectedPropertyId, searchTerm],
        queryFn: async () => {
            // 1. Fetch properties
            let propQuery = supabase.from('properties').select('id, name').eq('is_active', true).order('name')
            if (selectedPropertyId) {
                propQuery = propQuery.eq('id', selectedPropertyId)
            }
            const { data: properties, error: propError } = await propQuery
            if (propError) throw propError

            // 2. Fetch departments
            const { data: departments, error: deptError } = await supabase
                .from('departments')
                .select('id, name, property_id')
                .eq('is_deleted', false)
                .order('name')
            if (deptError) throw deptError

            // 3. Fetch employees with their departments
            let empQuery = supabase
                .from('profiles')
                .select(`
          id,
          full_name,
          email,
          job_title,
          reporting_to,
          is_active,
          user_departments(department_id),
          user_properties(property_id)
        `)
                .eq('is_active', true)
                .order('full_name')

            if (searchTerm) {
                empQuery = empQuery.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,job_title.ilike.%${searchTerm}%`)
            }

            const { data: employees, error: empError } = await empQuery
            if (empError) throw empError

            // 4. Build grouped structure
            const groups: PropertyGroup[] = (properties || []).map(prop => {
                const propertyDepts = (departments || [])
                    .filter(d => d.property_id === prop.id)
                    .map(dept => {
                        const deptEmployees = (employees || []).filter((emp: any) =>
                            emp.user_departments?.some((ud: any) => ud.department_id === dept.id)
                        ).map((emp: any) => ({
                            id: emp.id,
                            full_name: emp.full_name,
                            email: emp.email,
                            job_title: emp.job_title,
                            reporting_to: emp.reporting_to,
                            is_active: emp.is_active
                        }))

                        return {
                            id: dept.id,
                            name: dept.name,
                            property_id: dept.property_id,
                            employees: deptEmployees
                        }
                    })
                    .filter(d => d.employees.length > 0 || !searchTerm) // Show empty depts only when not searching

                const totalEmps = propertyDepts.reduce((sum, d) => sum + d.employees.length, 0)

                return {
                    id: prop.id,
                    name: prop.name,
                    departments: propertyDepts,
                    employeeCount: totalEmps
                }
            }).filter(g => g.departments.length > 0 || !searchTerm)

            return groups
        }
    })

    const toggleProperty = (propertyId: string) => {
        setExpandedProperties(prev => {
            const next = new Set(prev)
            if (next.has(propertyId)) {
                next.delete(propertyId)
            } else {
                next.add(propertyId)
            }
            return next
        })
    }

    const toggleDepartment = (deptId: string) => {
        setExpandedDepartments(prev => {
            const next = new Set(prev)
            if (next.has(deptId)) {
                next.delete(deptId)
            } else {
                next.add(deptId)
            }
            return next
        })
    }

    // Expand all by default
    if (propertyGroups && expandedProperties.size === 0) {
        const allProps = new Set(propertyGroups.map(p => p.id))
        const allDepts = new Set(propertyGroups.flatMap(p => p.departments.map(d => d.id)))
        setExpandedProperties(allProps)
        setExpandedDepartments(allDepts)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">
                <Users className="h-6 w-6 animate-pulse mr-2" />
                {t('common:loading', 'Loading...')}
            </div>
        )
    }

    if (!propertyGroups || propertyGroups.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Building2 className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">{t('organization.no_data', 'No data available')}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {propertyGroups.map(property => (
                <Card key={property.id} className="overflow-hidden">
                    {/* Property Header */}
                    <div
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 cursor-pointer hover:bg-blue-100/50 transition-colors"
                        onClick={() => toggleProperty(property.id)}
                    >
                        <button className="p-1">
                            {expandedProperties.has(property.id) ? (
                                <ChevronDown className="h-5 w-5 text-blue-600" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-blue-600" />
                            )}
                        </button>
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{property.name}</h3>
                            <p className="text-sm text-gray-500">{property.departments.length} {t('organization.departments', 'Departments')}</p>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {property.employeeCount} {t('organization.employees', 'Employees')}
                        </Badge>
                    </div>

                    {/* Departments */}
                    {expandedProperties.has(property.id) && (
                        <div className="divide-y">
                            {property.departments.map(dept => (
                                <div key={dept.id}>
                                    {/* Department Header */}
                                    <div
                                        className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        onClick={() => toggleDepartment(dept.id)}
                                    >
                                        <button className="p-0.5">
                                            {expandedDepartments.has(dept.id) ? (
                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-500" />
                                            )}
                                        </button>
                                        <Briefcase className="h-5 w-5 text-green-600" />
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{dept.name}</span>
                                        <Badge variant="outline" className="ml-auto text-xs">
                                            {dept.employees.length}
                                        </Badge>
                                    </div>

                                    {/* Employees */}
                                    {expandedDepartments.has(dept.id) && dept.employees.length > 0 && (
                                        <div className="bg-white dark:bg-gray-900">
                                            {dept.employees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    className={cn(
                                                        "flex items-center gap-3 px-10 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-l-4 border-transparent",
                                                        onEmployeeClick && "hover:border-l-primary"
                                                    )}
                                                    onClick={() => onEmployeeClick?.(emp)}
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                        {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white truncate">{emp.full_name}</p>
                                                        <p className="text-sm text-gray-500 truncate">{emp.job_title || emp.email}</p>
                                                    </div>
                                                    <User className="h-4 w-4 text-gray-400" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {expandedDepartments.has(dept.id) && dept.employees.length === 0 && (
                                        <div className="px-10 py-4 text-sm text-gray-400 italic">
                                            {t('organization.no_employees_dept', 'No employees assigned to this department')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ))}
        </div>
    )
}
