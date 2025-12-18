import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OrgEmployee {
    id: string
    full_name: string
    job_title: string | null
    email: string
    phone: string | null
    avatar_url: string | null
    roles: string[]
    propertyId: string | null
    departmentId: string | null
    reporting_to: string | null
}

export interface OrgRoleGroup {
    level: 'head' | 'supervisor' | 'staff'
    label: string
    employees: OrgEmployee[]
}

export interface OrgDepartment {
    id: string
    name: string
    roleGroups: OrgRoleGroup[]
    totalEmployees: number
}

export interface OrgProperty {
    id: string
    name: string
    address: string | null
    city: string | null
    country: string | null
    propertyCode: string | null
    phone: string | null
    isHeadquarters: boolean
    generalManager?: OrgEmployee
    departments: OrgDepartment[]
    totalEmployees: number
}

export interface OrgCorporate {
    executives: OrgEmployee[]
    sharedServices: OrgDepartment[] // HR, Finance, IT, etc. at HQ level
}

export interface OrgHierarchy {
    corporate: OrgCorporate
    properties: OrgProperty[]
    unassigned: OrgEmployee[]
    totalEmployees: number
}

// Role classifications
const EXECUTIVE_ROLES = ['regional_admin', 'regional_hr']
const MANAGEMENT_ROLES = ['property_manager', 'property_hr', 'department_head']
const SUPERVISOR_JOB_TITLES = ['supervisor', 'lead', 'senior', 'chief', 'head waiter', 'captain']

// Job Title Hierarchy - Lower numbers = higher rank
const JOB_TITLE_HIERARCHY: Record<string, number> = {
    // C-Level & Founders (Rank 1-10)
    'founder': 1,
    'co-founder': 1,
    'ceo': 2,
    'chief executive officer': 2,
    'president': 3,
    'cfo': 4,
    'chief financial officer': 4,
    'coo': 5,
    'chief operating officer': 5,
    'cto': 6,
    'chief technology officer': 6,
    'cmo': 7,
    'chief marketing officer': 7,
    'cio': 8,
    'chief information officer': 8,
    'chro': 9,
    'chief human resources officer': 9,

    // Vice Presidents (Rank 10-20)
    'evp': 10,
    'executive vice president': 10,
    'svp': 11,
    'senior vice president': 11,
    'vp': 12,
    'vice president': 12,

    // Directors (Rank 21-30)
    'executive director': 21,
    'senior director': 22,
    'director': 23,
    'associate director': 24,

    // General & Regional Management (Rank 31-40)
    'general manager': 31,
    'regional manager': 32,
    'area manager': 33,
    'district manager': 34,

    // Property Management (Rank 41-50)
    'property manager': 41,
    'assistant property manager': 42,
    'property director': 40,

    // Department Leadership (Rank 51-60)
    'department head': 51,
    'department manager': 52,
    'department director': 50,

    // Managers (Rank 61-70)
    'senior manager': 61,
    'manager': 62,
    'assistant manager': 63,
    'deputy manager': 64,

    // Supervisors & Team Leads (Rank 71-80)
    'senior supervisor': 71,
    'supervisor': 72,
    'team lead': 73,
    'lead': 74,
    'shift supervisor': 75,
    'floor supervisor': 76,

    // Senior Staff (Rank 81-90)
    'senior specialist': 81,
    'senior coordinator': 82,
    'senior associate': 83,
    'senior analyst': 84,
    'chief': 85,
    'head waiter': 86,
    'captain': 87,

    // Mid-Level Staff (Rank 91-100)
    'specialist': 91,
    'coordinator': 92,
    'associate': 93,
    'analyst': 94,
    'officer': 95,

    // Entry-Level Staff (Rank 101-110)
    'staff': 101,
    'assistant': 102,
    'junior': 103,
    'trainee': 104,
    'intern': 105,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the hierarchical rank for a job title (lower = higher rank)
 */
function getJobTitleRank(jobTitle: string | null): number {
    if (!jobTitle) return 999 // No title goes to bottom

    const title = jobTitle.toLowerCase().trim()

    // Check for exact matches first
    if (JOB_TITLE_HIERARCHY[title]) {
        return JOB_TITLE_HIERARCHY[title]
    }

    // Check for partial matches (e.g., "Senior Manager" contains "manager")
    // Sort by rank to match most specific/senior title first
    const entries = Object.entries(JOB_TITLE_HIERARCHY).sort((a, b) => a[1] - b[1])

    for (const [key, rank] of entries) {
        if (title.includes(key)) {
            return rank
        }
    }

    return 500 // Unknown titles go to middle
}

/**
 * Sort employees by job title hierarchy, then alphabetically by name
 */
function sortByJobTitleHierarchy(employees: OrgEmployee[]): OrgEmployee[] {
    return [...employees].sort((a, b) => {
        const rankA = getJobTitleRank(a.job_title)
        const rankB = getJobTitleRank(b.job_title)

        // Sort by rank first (lower rank = higher position)
        if (rankA !== rankB) {
            return rankA - rankB
        }

        // If same rank, sort alphabetically by name
        return a.full_name.localeCompare(b.full_name)
    })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function classifyEmployeeLevel(emp: OrgEmployee): 'head' | 'supervisor' | 'staff' {
    // Check if department head
    if (emp.roles.includes('department_head')) return 'head'

    // Check job title for supervisor keywords
    const title = emp.job_title?.toLowerCase() || ''
    if (SUPERVISOR_JOB_TITLES.some(keyword => title.includes(keyword))) {
        return 'supervisor'
    }

    return 'staff'
}

function groupByRole(employees: OrgEmployee[]): OrgRoleGroup[] {
    const heads: OrgEmployee[] = []
    const supervisors: OrgEmployee[] = []
    const staff: OrgEmployee[] = []

    employees.forEach(emp => {
        const level = classifyEmployeeLevel(emp)
        if (level === 'head') heads.push(emp)
        else if (level === 'supervisor') supervisors.push(emp)
        else staff.push(emp)
    })

    const groups: OrgRoleGroup[] = []
    if (heads.length) groups.push({
        level: 'head',
        label: 'Department Head',
        employees: sortByJobTitleHierarchy(heads)
    })
    if (supervisors.length) groups.push({
        level: 'supervisor',
        label: 'Supervisors',
        employees: sortByJobTitleHierarchy(supervisors)
    })
    if (staff.length) groups.push({
        level: 'staff',
        label: 'Team Members',
        employees: sortByJobTitleHierarchy(staff)
    })

    return groups
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useOrgHierarchy(searchTerm?: string) {
    const { primaryRole, properties: userProperties, departments: userDepartments } = useAuth()

    // Determine access level for RBAC filtering
    const isCorpLevel = ['regional_admin', 'regional_hr'].includes(primaryRole || '')
    const isPropLevel = ['property_manager', 'property_hr'].includes(primaryRole || '')
    const isDeptLevel = primaryRole === 'department_head'

    // Fetch all profiles with their roles, properties, departments
    const { data: profiles, isLoading: profilesLoading } = useQuery({
        queryKey: ['org-hierarchy-profiles', searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('profiles')
                .select(`
          id,
          full_name,
          email,
          phone,
          job_title,
          avatar_url,
          reporting_to,
          user_roles(role),
          user_properties(property:properties(id, name)),
          user_departments(department:departments(id, name, property_id))
        `)
                .eq('is_active', true)
            // Sorting is now done in memory by job title hierarchy

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,job_title.ilike.%${searchTerm}%`)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        }
    })

    // Fetch all properties with enhanced fields
    const { data: properties, isLoading: propertiesLoading } = useQuery({
        queryKey: ['org-hierarchy-properties-enhanced'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('id, name, address, phone, is_active, is_headquarters, property_code, city, country')
                .eq('is_active', true)
                .order('is_headquarters', { ascending: false }) // HQ first
                .order('name')
            if (error) throw error
            return data
        }
    })

    // Fetch all departments
    const { data: departments, isLoading: departmentsLoading } = useQuery({
        queryKey: ['org-hierarchy-departments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('id, name, property_id')
                .order('name')
            if (error) throw error
            return data
        }
    })

    // Build the hierarchy
    const hierarchy = useMemo<OrgHierarchy>(() => {
        if (!profiles || !properties || !departments) {
            return {
                corporate: { executives: [], sharedServices: [] },
                properties: [],
                unassigned: [],
                totalEmployees: 0
            }
        }

        // Transform profiles to OrgEmployee
        const employees: OrgEmployee[] = profiles.map((p: any) => ({
            id: p.id,
            full_name: p.full_name || 'Unknown',
            job_title: p.job_title,
            email: p.email,
            phone: p.phone,
            avatar_url: p.avatar_url,
            roles: p.user_roles?.map((r: any) => r.role) || [],
            propertyId: p.user_properties?.[0]?.property?.id || null,
            departmentId: p.user_departments?.[0]?.department?.id || null,
            reporting_to: p.reporting_to
        }))

        // Find HQ property
        const hqProperty = properties.find((p: any) => p.is_headquarters)
        const hqPropertyId = hqProperty?.id

        // Separate corporate executives (regional_admin, regional_hr)
        // Sort by job title hierarchy (CEO/Founder first)
        const executives = sortByJobTitleHierarchy(
            employees.filter(e =>
                e.roles.some(r => EXECUTIVE_ROLES.includes(r))
            )
        )
        const executiveIds = new Set(executives.map(e => e.id))

        // Corporate shared services: departments at HQ that aren't specific to hotel operations
        const hqDepts = hqPropertyId
            ? departments.filter((d: any) => d.property_id === hqPropertyId)
            : []

        const sharedServices: OrgDepartment[] = hqDepts.map((dept: any) => {
            const deptEmployees = employees.filter(e =>
                e.departmentId === dept.id && !executiveIds.has(e.id)
            )
            return {
                id: dept.id,
                name: dept.name,
                roleGroups: groupByRole(deptEmployees),
                totalEmployees: deptEmployees.length
            }
        }).filter(d => d.totalEmployees > 0)

        // Build property hierarchy (excluding HQ if it's marked)
        const nonHQProperties = properties.filter((p: any) => !p.is_headquarters)

        const orgProperties: OrgProperty[] = nonHQProperties.map((prop: any) => {
            // Get all employees assigned to this property via user_properties
            const propertyEmployees = employees.filter(e =>
                e.propertyId === prop.id && !executiveIds.has(e.id)
            )

            // Find General Manager (property_manager role at this property)
            const generalManager = propertyEmployees.find(e =>
                e.roles.includes('property_manager')
            )

            // Group remaining employees by their department
            const employeesWithDept = propertyEmployees.filter(e => e.departmentId && e.id !== generalManager?.id)
            const employeesWithoutDept = propertyEmployees.filter(e => !e.departmentId && e.id !== generalManager?.id)

            // Get unique department IDs for this property's employees
            const deptIds = [...new Set(employeesWithDept.map(e => e.departmentId).filter(Boolean))]

            // Build department structure from actual employee assignments
            const orgDepts: OrgDepartment[] = deptIds.map(deptId => {
                const dept = departments.find((d: any) => d.id === deptId)
                const deptEmployees = employeesWithDept.filter(e => e.departmentId === deptId)

                return {
                    id: deptId as string,
                    name: dept?.name || 'Unknown Department',
                    roleGroups: groupByRole(deptEmployees),
                    totalEmployees: deptEmployees.length
                }
            }).filter(d => d.totalEmployees > 0)

            // If there are employees without departments, add them to a "General" department
            if (employeesWithoutDept.length > 0) {
                orgDepts.push({
                    id: `${prop.id}-general`,
                    name: 'General',
                    roleGroups: groupByRole(employeesWithoutDept),
                    totalEmployees: employeesWithoutDept.length
                })
            }

            const totalInProperty = propertyEmployees.length

            return {
                id: prop.id,
                name: prop.name,
                address: prop.address,
                city: prop.city,
                country: prop.country,
                propertyCode: prop.property_code,
                phone: prop.phone,
                isHeadquarters: prop.is_headquarters || false,
                generalManager,
                departments: orgDepts,
                totalEmployees: totalInProperty
            }
        }).filter(p => p.totalEmployees > 0) // Show property if it has ANY employees

        // Apply RBAC filtering
        let filteredProperties = orgProperties
        if (!isCorpLevel) {
            if (isPropLevel && userProperties?.length) {
                const userPropIds = userProperties.map(p => p.id)
                filteredProperties = orgProperties.filter(p => userPropIds.includes(p.id))
            } else if (isDeptLevel && userDepartments?.length) {
                const userDeptIds = userDepartments.map(d => d.id)
                filteredProperties = orgProperties.map(p => ({
                    ...p,
                    departments: p.departments.filter(d => userDeptIds.includes(d.id))
                })).filter(p => p.departments.length > 0)
            }
        }

        // Unassigned employees
        const assignedIds = new Set([
            ...executiveIds,
            ...sharedServices.flatMap(d => d.roleGroups.flatMap(g => g.employees.map(e => e.id))),
            ...orgProperties.flatMap(p => [
                p.generalManager?.id,
                ...p.departments.flatMap(d => d.roleGroups.flatMap(g => g.employees.map(e => e.id)))
            ])
        ].filter(Boolean))

        const unassigned = sortByJobTitleHierarchy(
            employees.filter(e => !assignedIds.has(e.id))
        )

        return {
            corporate: { executives, sharedServices },
            properties: filteredProperties,
            unassigned,
            totalEmployees: employees.length
        }
    }, [profiles, properties, departments, isCorpLevel, isPropLevel, isDeptLevel, userProperties, userDepartments])

    return {
        hierarchy,
        isLoading: profilesLoading || propertiesLoading || departmentsLoading,
        totalEmployees: hierarchy.totalEmployees
    }
}
