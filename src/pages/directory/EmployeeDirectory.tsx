import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Search,
  Loader2,
  User,
  LayoutGrid,
  Network,
  Download,
  Calendar,
  Filter,
  Settings
} from 'lucide-react'
import { EmployeeCard } from '@/components/directory/EmployeeCard'
import { OrgPyramid } from '@/components/directory/OrgPyramid'
import { useOrgHierarchy } from '@/hooks/useOrgHierarchy'
import {
  useEmployeeDirectory,
  exportMonthlyBirthdays,
  type ManagementLevelFilter,
  type DirectorySort
} from '@/hooks/useEmployeeDirectory'
import { useProperties } from '@/hooks/useProperties'
import { useDepartments } from '@/hooks/useDepartments'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_HIERARCHY, type AppRole } from '@/lib/constants'
import { toast } from 'sonner'

type ViewMode = 'grid' | 'org'
type StatusFilter = 'all' | 'active' | 'inactive'

const HR_ADMIN_ROLES: AppRole[] = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr']

const EXECUTIVE_TITLE_RANK: Record<string, number> = {
  'founder': 1,
  'co-founder': 1,
  'chief executive officer': 2,
  'ceo': 2,
  'president': 3,
  'chief financial officer': 4,
  'cfo': 4,
  'chief operating officer': 5,
  'coo': 5,
  'chief technology officer': 6,
  'cto': 6,
  'chief marketing officer': 7,
  'cmo': 7,
  'chief information officer': 8,
  'cio': 8,
  'chief human resources officer': 9,
  'chro': 9
}

export default function EmployeeDirectory() {
  const { t, i18n } = useTranslation('directory')
  const isRTL = i18n.dir() === 'rtl'
  const { primaryRole } = useAuth()

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all')
  const [managementLevel, setManagementLevel] = useState<ManagementLevelFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [sortBy, setSortBy] = useState<DirectorySort>('job_title_asc')
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear())
  const [exportingBirthdays, setExportingBirthdays] = useState(false)
  const [orgEditMode, setOrgEditMode] = useState(false)

  const canExportBirthdays = HR_ADMIN_ROLES.includes((primaryRole || 'staff') as AppRole)
  const canEditOrgMap = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'].includes(primaryRole || '')

  const { data: properties = [] } = useProperties()
  const { departments = [] } = useDepartments(propertyFilter !== 'all' ? propertyFilter : undefined)
  const { hierarchy, isLoading: isOrgLoading } = useOrgHierarchy(search)

  const { data: employees = [], isLoading: isDirectoryLoading } = useEmployeeDirectory({
    search,
    propertyId: propertyFilter,
    departmentId: departmentFilter,
    role: roleFilter,
    managementLevel,
    sort: sortBy,
    includeInactive: statusFilter !== 'active'
  })

  const filteredEmployees = useMemo(() => {
    if (statusFilter === 'all') return employees
    if (statusFilter === 'inactive') return employees.filter((e) => !e.is_active)
    return employees.filter((e) => e.is_active)
  }, [employees, statusFilter])

  const ceoEmployee = useMemo(() => {
    const normalize = (value?: string | null) => (value || '').toLowerCase().trim()
    const isCeoTitle = (title?: string | null) => {
      const normalized = normalize(title)
      return normalized.includes('chief executive officer') || normalized.includes('ceo')
    }
    const getTitleRank = (title?: string | null) => {
      const normalized = normalize(title)
      if (!normalized) return 999
      if (EXECUTIVE_TITLE_RANK[normalized]) return EXECUTIVE_TITLE_RANK[normalized]
      const entries = Object.entries(EXECUTIVE_TITLE_RANK).sort((a, b) => a[1] - b[1])
      for (const [key, rank] of entries) {
        if (normalized.includes(key)) return rank
      }
      return 500
    }

    const execCandidates = filteredEmployees.filter((e) =>
      e.management_level === 'executive' ||
      e.roles?.includes('corporate_admin') ||
      e.roles?.includes('regional_admin') ||
      e.roles?.includes('regional_hr')
    )

    if (execCandidates.length === 0) return null

    const topLevelExecs = execCandidates.filter((e) => !e.manager_id)
    const pool = topLevelExecs.length > 0 ? topLevelExecs : execCandidates

    const ceos = pool.filter((e) => isCeoTitle(e.job_title))
    if (ceos.length > 0) {
      return ceos.sort((a, b) => a.full_name.localeCompare(b.full_name))[0]
    }

    const ranked = pool.map((e) => ({ e, rank: getTitleRank(e.job_title) }))
    const minRank = Math.min(...ranked.map((r) => r.rank))
    const topRanked = ranked.filter((r) => r.rank === minRank).map((r) => r.e)
    if (topRanked.length === 1) return topRanked[0]

    const reportCounts = new Map<string, number>()
    filteredEmployees.forEach((e) => {
      if (!e.manager_id) return
      reportCounts.set(e.manager_id, (reportCounts.get(e.manager_id) || 0) + 1)
    })

    return topRanked.sort((a, b) => {
      const aReports = reportCounts.get(a.id) || 0
      const bReports = reportCounts.get(b.id) || 0
      if (aReports !== bReports) return bReports - aReports
      return a.full_name.localeCompare(b.full_name)
    })[0]
  }, [filteredEmployees])

  const employeesForGrouping = useMemo(() => {
    if (!ceoEmployee) return filteredEmployees
    return filteredEmployees.filter((e) => e.id !== ceoEmployee.id)
  }, [filteredEmployees, ceoEmployee])

  const groupedByProperty = useMemo(() => {
    const normalize = (value?: string | null) => (value || '').toLowerCase().trim()
    const compareByName = (a: typeof employeesForGrouping[number], b: typeof employeesForGrouping[number]) =>
      a.full_name.localeCompare(b.full_name)
    const compareByJoiningDate = (a: typeof employeesForGrouping[number], b: typeof employeesForGrouping[number]) => {
      const aDate = a.joining_date ? new Date(a.joining_date).getTime() : 0
      const bDate = b.joining_date ? new Date(b.joining_date).getTime() : 0
      return aDate - bDate
    }
    const compareByJobTitle = (a: typeof employeesForGrouping[number], b: typeof employeesForGrouping[number]) => {
      const aTitle = normalize(a.job_title)
      const bTitle = normalize(b.job_title)
      if (aTitle && bTitle && aTitle !== bTitle) return aTitle.localeCompare(bTitle)
      if (aTitle && !bTitle) return -1
      if (!aTitle && bTitle) return 1
      return compareByName(a, b)
    }

    const getEmployeeComparator = () => {
      switch (sortBy) {
        case 'name_desc':
          return (a: typeof employeesForGrouping[number], b: typeof employeesForGrouping[number]) => compareByName(b, a)
        case 'joining_date_asc':
          return compareByJoiningDate
        case 'joining_date_desc':
          return (a: typeof employeesForGrouping[number], b: typeof employeesForGrouping[number]) => compareByJoiningDate(b, a)
        case 'job_title_asc':
          return compareByJobTitle
        case 'job_title_desc':
          return (a: typeof employeesForGrouping[number], b: typeof employeesForGrouping[number]) => compareByJobTitle(b, a)
        case 'name_asc':
        default:
          return compareByName
      }
    }

    const employeeComparator = getEmployeeComparator()
    const groups = new Map<string, { id: string; name: string; isHeadquarters: boolean; employees: typeof employeesForGrouping }>()
    const unassignedKey = 'unassigned'

    employeesForGrouping.forEach((employee) => {
      const propertyIds = employee.property_ids?.length
        ? employee.property_ids
        : (employee.primary_property_id ? [employee.primary_property_id] : [])
      const propertyNames = employee.property_names?.length
        ? employee.property_names
        : (employee.primary_property_name ? [employee.primary_property_name] : [])
      const propertyNameById = new Map(propertyIds.map((id, idx) => [id, propertyNames[idx]]))

      const idsToShow = propertyFilter !== 'all'
        ? propertyIds.filter((id) => id === propertyFilter)
        : propertyIds

      if (idsToShow.length === 0) {
        const existing = groups.get(unassignedKey) || {
          id: unassignedKey,
          name: t('unassigned', 'Unassigned'),
          isHeadquarters: false,
          employees: []
        }
        existing.employees.push(employee)
        groups.set(unassignedKey, existing)
        return
      }

      idsToShow.forEach((propertyId) => {
        const propertyMeta = properties.find((p) => p.id === propertyId)
        const name = propertyMeta?.name || propertyNameById.get(propertyId) || employee.primary_property_name || t('unassigned', 'Unassigned')
        const isHeadquarters = !!propertyMeta?.is_headquarters

        const existing = groups.get(propertyId) || {
          id: propertyId,
          name,
          isHeadquarters,
          employees: []
        }

        existing.employees.push(employee)
        groups.set(propertyId, existing)
      })
    })

    return Array.from(groups.values()).map((group) => ({
      ...group,
      employees: [...group.employees].sort(employeeComparator)
    })).sort((a, b) => {
      if (a.id === unassignedKey && b.id !== unassignedKey) return 1
      if (b.id === unassignedKey && a.id !== unassignedKey) return -1
      if (a.isHeadquarters !== b.isHeadquarters) return a.isHeadquarters ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [employeesForGrouping, properties, propertyFilter, sortBy, t])

  const gridDisplayCount = useMemo(() => {
    const groupCount = groupedByProperty.reduce((sum, group) => sum + group.employees.length, 0)
    return groupCount + (ceoEmployee ? 1 : 0)
  }, [groupedByProperty, ceoEmployee])

  const handleExportBirthdays = async () => {
    try {
      setExportingBirthdays(true)
      await exportMonthlyBirthdays({
        month: exportMonth,
        year: exportYear,
        propertyId: propertyFilter !== 'all' ? propertyFilter : undefined
      })
      toast.success('Birthday list exported')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export birthdays')
    } finally {
      setExportingBirthdays(false)
    }
  }

  const roleOptions = ROLE_HIERARCHY
  const currentYear = new Date().getFullYear()
  const exportYearOptions = [currentYear - 1, currentYear, currentYear + 1]

  const isLoading = viewMode === 'org' ? isOrgLoading : isDirectoryLoading

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid grid-cols-2 w-[220px]">
              <TabsTrigger value="grid" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                {t('grid_view', 'Grid')}
              </TabsTrigger>
              <TabsTrigger value="org" className="gap-1.5">
                <Network className="h-4 w-4" />
                {t('org_chart', 'Org Chart')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {canEditOrgMap && (
            <Button
              variant={orgEditMode ? 'default' : 'outline'}
              onClick={() => {
                if (!orgEditMode && viewMode !== 'org') {
                  setViewMode('org')
                }
                setOrgEditMode((prev) => !prev)
              }}
              className="gap-1.5"
            >
              <Settings className="h-4 w-4" />
              {orgEditMode ? t('editing_map', 'Editing Map') : t('edit_map', 'Edit Map')}
            </Button>
          )}

          <div className="relative w-full md:w-72">
            <Search className={`absolute top-2.5 h-4 w-4 text-gray-500 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <Input
              type="search"
              placeholder={t('search_placeholder')}
              className={isRTL ? 'pr-9' : 'pl-9'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('filters', 'Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select value={propertyFilter} onValueChange={(val) => {
              setPropertyFilter(val)
              setDepartmentFilter('all')
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('property', 'Property')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_locations', 'All Properties')}</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('department', 'Department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_departments', 'All Departments')}</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as 'all' | AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder={t('role', 'Role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('role', 'All Roles')}</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={managementLevel} onValueChange={(val) => setManagementLevel(val as ManagementLevelFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Management Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val) => setSortBy(val as DirectorySort)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">A-Z</SelectItem>
                <SelectItem value="name_desc">Z-A</SelectItem>
                <SelectItem value="job_title_asc">{t('job_title_asc', 'Job Title (A-Z)')}</SelectItem>
                <SelectItem value="job_title_desc">{t('job_title_desc', 'Job Title (Z-A)')}</SelectItem>
                <SelectItem value="joining_date_desc">Joining Date (Newest)</SelectItem>
                <SelectItem value="joining_date_asc">Joining Date (Oldest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canExportBirthdays && viewMode === 'grid' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <Badge variant="outline" className="gap-1.5">
                <Calendar className="h-3 w-3" />
                Birthday Export
              </Badge>
              <Select value={String(exportMonth)} onValueChange={(val) => setExportMonth(Number(val))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={String(month)}>
                      {new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(exportYear)} onValueChange={(val) => setExportYear(Number(val))}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportYearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleExportBirthdays} disabled={exportingBirthdays}>
                {exportingBirthdays ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 me-2" />
                )}
                Export Monthly Birthdays
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : viewMode === 'org' ? (
        <div className="overflow-x-auto">
          <OrgPyramid
            hierarchy={hierarchy}
            isRTL={isRTL}
            adminMode={orgEditMode}
            onAdminModeChange={setOrgEditMode}
            showAdminToggle={false}
          />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">{t('no_results')}</h3>
        </div>
      ) : (
        <div className="space-y-6">
          <Badge variant="secondary" className="text-sm">
            {gridDisplayCount} {t('employees', 'Employees')}
          </Badge>

          {ceoEmployee && (
            <Card className="border-indigo-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {t('ceo', 'CEO')}
                    <Badge variant="secondary" className="text-xs">
                      {t('executive', 'Executive')}
                    </Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <EmployeeCard
                    key={ceoEmployee.id}
                    isRTL={isRTL}
                    profile={{
                      id: ceoEmployee.id,
                      full_name: ceoEmployee.full_name,
                      avatar_url: ceoEmployee.avatar_url,
                      job_title: ceoEmployee.job_title,
                      email: ceoEmployee.work_email,
                      phone: ceoEmployee.phone_extension ? `Ext. ${ceoEmployee.phone_extension}` : null,
                      staff_id: ceoEmployee.staff_id,
                      manager_name: ceoEmployee.manager_name,
                      properties: ceoEmployee.primary_property_name ? [{ name: ceoEmployee.primary_property_name }] : [],
                      departments: ceoEmployee.primary_department_name ? [{ name: ceoEmployee.primary_department_name }] : [],
                      is_active: ceoEmployee.is_active
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {groupedByProperty.map((group) => (
            <Card key={group.id} className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {group.name}
                    {group.isHeadquarters && (
                      <Badge variant="secondary" className="text-xs">
                        {t('head_office', 'Head Office')}
                      </Badge>
                    )}
                  </span>
                  <Badge variant="outline">{group.employees.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.employees.map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      isRTL={isRTL}
                      profile={{
                        id: employee.id,
                        full_name: employee.full_name,
                        avatar_url: employee.avatar_url,
                        job_title: employee.job_title,
                        email: employee.work_email,
                        phone: employee.phone_extension ? `Ext. ${employee.phone_extension}` : null,
                        staff_id: employee.staff_id,
                        manager_name: employee.manager_name,
                        properties: employee.primary_property_name ? [{ name: employee.primary_property_name }] : [],
                        departments: employee.primary_department_name ? [{ name: employee.primary_department_name }] : [],
                        is_active: employee.is_active
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
