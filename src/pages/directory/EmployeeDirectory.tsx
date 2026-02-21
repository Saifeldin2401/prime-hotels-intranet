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
  Filter
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
  const [sortBy, setSortBy] = useState<DirectorySort>('name_asc')
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear())
  const [exportingBirthdays, setExportingBirthdays] = useState(false)

  const canExportBirthdays = HR_ADMIN_ROLES.includes((primaryRole || 'staff') as AppRole)

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

  const groupedByProperty = useMemo(() => {
    const groups = new Map<string, typeof filteredEmployees>()
    filteredEmployees.forEach((employee) => {
      const key = employee.primary_property_name || t('unassigned', 'Unassigned')
      const existing = groups.get(key) || []
      existing.push(employee)
      groups.set(key, existing)
    })
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredEmployees, t])

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
          <OrgPyramid hierarchy={hierarchy} isRTL={isRTL} />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">{t('no_results')}</h3>
        </div>
      ) : (
        <div className="space-y-6">
          <Badge variant="secondary" className="text-sm">
            {filteredEmployees.length} {t('employees', 'Employees')}
          </Badge>

          {groupedByProperty.map(([propertyName, group]) => (
            <Card key={propertyName} className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{propertyName}</span>
                  <Badge variant="outline">{group.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.map((employee) => (
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

