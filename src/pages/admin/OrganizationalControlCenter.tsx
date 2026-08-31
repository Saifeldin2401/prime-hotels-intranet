import { useState } from 'react'
import { OrgByDepartment } from '@/components/admin/OrgByDepartment'
import { OrgChartStats, OrgChartTree } from '@/components/admin/OrgChartTree'
import { ReportingLineEditor } from '@/components/admin/ReportingLineEditor'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildOrgTree, useOrgHierarchy, type OrgTreeNode } from '@/hooks/useOrganization'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { cn, escapeSearchQuery, formatDateTime } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { OrganizationProfileSettings } from './components/OrganizationProfileSettings'
import { SubscriptionEntitlementsCard } from './components/SubscriptionEntitlementsCard'
import { HotelsManagement } from './components/HotelsManagement'
import { BrandsManagement } from './components/BrandsManagement'
import { DepartmentsManagement } from './components/DepartmentsManagement'
import { RolesManagement } from './components/RolesManagement'
import { MembershipsManagement } from './components/MembershipsManagement'
import {
    Building,
    Building2,
    Clock,
    Crown,
    GitBranch,
    History,
    RefreshCw,
    Search,
    Shield,
    Users,
    Briefcase,
    CreditCard
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

type NamedRelation = { name?: string | null }
type PersonRelation = { full_name?: string | null }
type PromotionRow = {
    id: string
    from_role: string | null
    to_role: string | null
    from_title: string | null
    to_title: string | null
    effective_date: string
    employee: PersonRelation | PersonRelation[] | null
}
type TransferRow = {
    id: string
    effective_date: string
    employee: PersonRelation | PersonRelation[] | null
    from_property: NamedRelation | NamedRelation[] | null
    to_property: NamedRelation | NamedRelation[] | null
}
type PendingOrgChanges = {
    promotions: PromotionRow[]
    transfers: TransferRow[]
}
type OrgChangeHistoryRow = {
    id: string
    entity_type: string
    entity_id: string | null
    action: string
    details: {
        old?: { reporting_to?: string | null }
        new?: { reporting_to?: string | null }
    } | null
    created_at: string
    changed_by_profile: PersonRelation | PersonRelation[] | null
}

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }
    return relation ?? null
}

function getRelationName(relation: NamedRelation | NamedRelation[] | null | undefined, fallback: string) {
    return getFirstRelation(relation)?.name || fallback
}

function getPersonName(relation: PersonRelation | PersonRelation[] | null | undefined, fallback: string) {
    return getFirstRelation(relation)?.full_name || fallback
}

export default function OrganizationalControlCenter() {
    const { t } = useTranslation(['admin', 'common', 'nav'])
    const { currentOrganization, availableHotels, refreshTenantData } = useTenant()
    const [activeTab, setActiveTab] = useState('profile')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedHotelId, setSelectedHotelId] = useState<string>('')
    const [selectedEmployee, setSelectedEmployee] = useState<OrgTreeNode | null>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'hierarchy' | 'department'>('department')

    // Fetch hierarchy data for org tree
    const { data: hierarchyData, isLoading: isLoadingHierarchy, refetch: refetchHierarchy } = useOrgHierarchy(
        selectedHotelId || undefined
    )

    // Build tree structure
    const treeNodes = hierarchyData ? buildOrgTree(hierarchyData) : []

    // Filter nodes by search term
    const filteredNodes = searchTerm
        ? filterTreeNodes(treeNodes, searchTerm)
        : treeNodes

    const handleNodeClick = (node: OrgTreeNode) => {
        setSelectedEmployee(node)
    }

    const handleEditNode = (node: OrgTreeNode) => {
        setSelectedEmployee(node)
        setIsEditorOpen(true)
    }

    const handleGlobalRefresh = async () => {
        await Promise.all([
            refetchHierarchy(),
            refreshTenantData()
        ])
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('admin:organization.title', 'Organizational Control Center')}
                description={t('admin:organization.description', 'Manage enterprise hierarchy, hotels, brands, departments, tenant roles, and reporting structures.')}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleGlobalRefresh}>
                            <RefreshCw className="h-4 w-4 me-2" />
                            {t('common:refresh', 'Refresh')}
                        </Button>
                    </div>
                }
            />

            {/* Quick Filters for Org Chart / Assignments */}
            {(activeTab === 'orgchart' || activeTab === 'assignments') && (
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={t('admin:organization.search_employees', 'Search employees...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ps-10"
                        />
                    </div>
                    <Select
                        value={selectedHotelId || "all"}
                        onValueChange={(val) => setSelectedHotelId(val === "all" ? "" : val)}
                    >
                        <SelectTrigger className="w-[240px]">
                            <Building2 className="h-4 w-4 me-2 text-primary" />
                            <SelectValue placeholder={t('admin:organization.all_properties', 'Consolidated (Cluster)')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('admin:organization.all_properties', 'Consolidated (Cluster)')}
                            </SelectItem>
                            {availableHotels?.map((hotel) => (
                                <SelectItem key={hotel.id} value={hotel.id}>
                                    {hotel.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Comprehensive Hierarchy Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
                    {/* 1. Profile & Entitlements */}
                    <TabsTrigger value="profile" className="gap-2 py-2 px-3">
                        <Building className="h-4 w-4" />
                        <span>{t('admin:organization.tab_profile', 'Profile & Plan')}</span>
                    </TabsTrigger>

                    {/* 2. Brands */}
                    <TabsTrigger value="brands" className="gap-2 py-2 px-3">
                        <Crown className="h-4 w-4" />
                        <span>{t('admin:organization.tab_brands', 'Brands')}</span>
                    </TabsTrigger>

                    {/* 3. Hotels */}
                    <TabsTrigger value="hotels" className="gap-2 py-2 px-3">
                        <Building2 className="h-4 w-4" />
                        <span>{t('admin:organization.tab_hotels', 'Hotels')}</span>
                    </TabsTrigger>

                    {/* 4. Departments */}
                    <TabsTrigger value="departments" className="gap-2 py-2 px-3">
                        <Briefcase className="h-4 w-4" />
                        <span>{t('admin:departments', 'Departments')}</span>
                    </TabsTrigger>

                    {/* 5. Roles Matrix */}
                    <TabsTrigger value="roles" className="gap-2 py-2 px-3">
                        <Shield className="h-4 w-4" />
                        <span>{t('admin:roles.title', 'Roles')}</span>
                    </TabsTrigger>

                    {/* 6. Memberships */}
                    <TabsTrigger value="memberships" className="gap-2 py-2 px-3">
                        <Users className="h-4 w-4" />
                        <span>{t('admin:user_memberships', 'Memberships')}</span>
                    </TabsTrigger>

                    {/* 7. Org Chart */}
                    <TabsTrigger value="orgchart" className="gap-2 py-2 px-3">
                        <GitBranch className="h-4 w-4" />
                        <span>{t('admin:organization.tab_orgchart', 'Org Chart')}</span>
                    </TabsTrigger>

                    {/* 8. Assignments */}
                    <TabsTrigger value="assignments" className="gap-2 py-2 px-3">
                        <Users className="h-4 w-4" />
                        <span>{t('admin:organization.tab_assignments', 'Assignments')}</span>
                    </TabsTrigger>

                    {/* 9. Pending Changes */}
                    <TabsTrigger value="pending" className="gap-2 py-2 px-3">
                        <Clock className="h-4 w-4" />
                        <span>{t('admin:organization.tab_pending', 'Pending')}</span>
                    </TabsTrigger>

                    {/* 10. Audit History */}
                    <TabsTrigger value="history" className="gap-2 py-2 px-3">
                        <History className="h-4 w-4" />
                        <span>{t('admin:organization.tab_history', 'History')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Profile & Subscription Entitlements */}
                <TabsContent value="profile" className="mt-6 space-y-6">
                    <SubscriptionEntitlementsCard />
                    <OrganizationProfileSettings />
                </TabsContent>

                {/* Tab 2: Brands Management */}
                <TabsContent value="brands" className="mt-6">
                    <BrandsManagement />
                </TabsContent>

                {/* Tab 3: Hotels & Locations */}
                <TabsContent value="hotels" className="mt-6">
                    <HotelsManagement />
                </TabsContent>

                {/* Tab 4: Departments */}
                <TabsContent value="departments" className="mt-6">
                    <DepartmentsManagement />
                </TabsContent>

                {/* Tab 5: Tenant Roles */}
                <TabsContent value="roles" className="mt-6">
                    <RolesManagement />
                </TabsContent>

                {/* Tab 6: User Memberships */}
                <TabsContent value="memberships" className="mt-6">
                    <MembershipsManagement />
                </TabsContent>

                {/* Tab 7: Org Chart */}
                <TabsContent value="orgchart" className="mt-6">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-sm text-muted-foreground">{t('admin:organization.view_mode', 'View Mode:')}</span>
                        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                            <button
                                onClick={() => setViewMode('department')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    viewMode === 'department'
                                        ? "bg-card shadow-sm text-primary font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Building2 className="h-4 w-4" />
                                {t('admin:organization.by_department', 'By Department')}
                            </button>
                            <button
                                onClick={() => setViewMode('hierarchy')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    viewMode === 'hierarchy'
                                        ? "bg-card shadow-sm text-primary font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <GitBranch className="h-4 w-4" />
                                {t('admin:organization.by_hierarchy', 'By Hierarchy')}
                            </button>
                        </div>
                    </div>

                    {viewMode === 'department' ? (
                        <OrgByDepartment
                            selectedPropertyId={selectedHotelId || undefined}
                            searchTerm={searchTerm}
                            onEmployeeClick={(emp) => {
                                setSelectedEmployee({
                                    id: emp.id,
                                    full_name: emp.full_name,
                                    job_title: emp.job_title,
                                    email: emp.email,
                                    reporting_to: emp.reporting_to,
                                    manager_name: null,
                                    depth: 0,
                                    path: [],
                                    path_names: [],
                                    children: []
                                })
                            }}
                        />
                    ) : (
                        isLoadingHierarchy ? (
                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                <RefreshCw className="h-6 w-6 animate-spin me-2" />
                                {t('common:loading', 'Loading...')}
                            </div>
                        ) : filteredNodes.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Users className="h-12 w-12 mb-4 opacity-40" />
                                    <p className="text-lg font-medium">{t('admin:organization.no_employees', 'No employees found')}</p>
                                    <p className="text-sm">{t('admin:organization.adjust_filters', 'Try adjusting your filters')}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <OrgChartStats nodes={filteredNodes} />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('admin:organization.hierarchy', 'Organizational Hierarchy')}</CardTitle>
                                        <CardDescription>
                                            {t('admin:organization.hierarchy_desc', 'Click on an employee to view details, or use the menu to edit their reporting line.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <OrgChartTree
                                            nodes={filteredNodes}
                                            onNodeClick={handleNodeClick}
                                            onEditNode={handleEditNode}
                                            selectedNodeId={selectedEmployee?.id}
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        )
                    )}
                </TabsContent>

                {/* Tab 8: Assignments */}
                <TabsContent value="assignments" className="mt-6">
                    <AssignmentsTable
                        hotelId={selectedHotelId || undefined}
                        searchTerm={searchTerm}
                        onEditEmployee={handleEditNode}
                    />
                </TabsContent>

                {/* Tab 9: Pending Changes */}
                <TabsContent value="pending" className="mt-6">
                    <PendingChangesTable />
                </TabsContent>

                {/* Tab 10: Audit History */}
                <TabsContent value="history" className="mt-6">
                    <OrgChangeHistory />
                </TabsContent>
            </Tabs>

            {/* Reporting Line Editor Dialog */}
            <ReportingLineEditor
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                employee={selectedEmployee}
                propertyId={selectedHotelId || undefined}
            />
        </div>
    )
}

// Helper function to filter tree nodes
function filterTreeNodes(nodes: OrgTreeNode[], term: string): OrgTreeNode[] {
    const lowerTerm = term.toLowerCase()

    return nodes.reduce<OrgTreeNode[]>((acc, node) => {
        const matches =
            node.full_name?.toLowerCase().includes(lowerTerm) ||
            node.job_title?.toLowerCase().includes(lowerTerm) ||
            node.email?.toLowerCase().includes(lowerTerm)

        const filteredChildren = filterTreeNodes(node.children, term)

        if (matches || filteredChildren.length > 0) {
            acc.push({
                ...node,
                children: filteredChildren
            })
        }

        return acc
    }, [])
}

// Assignments Table Component (Clean Multi-Tenant Architecture)
function AssignmentsTable({
    hotelId,
    searchTerm,
    onEditEmployee
}: {
    hotelId?: string
    searchTerm: string
    onEditEmployee: (node: OrgTreeNode) => void
}) {
    const { t } = useTranslation(['admin', 'common'])
    const { currentOrganization, availableHotels } = useTenant()

    const { data: employees, isLoading } = useQuery({
        queryKey: ['org-assignments-data', currentOrganization?.id, hotelId, searchTerm],
        queryFn: async () => {
            if (!currentOrganization?.id) return []

            // Query profiles in active organization memberships
            let memberQuery = supabase
                .from('organization_memberships')
                .select(`
                    id,
                    user_id,
                    role,
                    hotel_id,
                    department_id,
                    hotel:hotels(name),
                    department:departments(name),
                    profile:profiles(id, full_name, email, job_title, staff_id, reporting_to, is_active)
                `)
                .eq('organization_id', currentOrganization.id)
                .eq('is_active', true)

            if (hotelId) {
                memberQuery = memberQuery.eq('hotel_id', hotelId)
            }

            const { data: memberRows, error: memberErr } = await memberQuery.limit(150)

            if (memberErr || !memberRows) {
                console.warn('Membership query error, trying direct profiles:', memberErr)
                // Fallback to active profiles
                let query = supabase
                    .from('profiles')
                    .select('id, full_name, email, job_title, staff_id, reporting_to, is_active')
                    .eq('is_active', true)
                    .order('full_name')

                if (searchTerm) {
                    const escaped = escapeSearchQuery(searchTerm)
                    query = query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,job_title.ilike.%${escaped}%`)
                }
                const { data: directProfiles } = await query.limit(50)
                return (directProfiles || []).map(p => ({
                    id: p.id,
                    full_name: p.full_name,
                    email: p.email,
                    job_title: p.job_title,
                    staff_id: p.staff_id,
                    reporting_to: p.reporting_to,
                    hotel_name: '—',
                    dept_name: '—',
                    role: 'learner',
                    manager: null
                }))
            }

            // Extract profiles and search filter
            let items = memberRows.map(m => {
                const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
                const h = Array.isArray(m.hotel) ? m.hotel[0] : m.hotel
                const d = Array.isArray(m.department) ? m.department[0] : m.department
                return {
                    id: p?.id || m.user_id,
                    full_name: p?.full_name || 'Staff Member',
                    email: p?.email || '',
                    job_title: p?.job_title || '—',
                    staff_id: p?.staff_id || '—',
                    reporting_to: p?.reporting_to || null,
                    hotel_name: h?.name || 'All Locations',
                    dept_name: d?.name || '—',
                    role: m.role || 'learner',
                    manager: null as { full_name?: string; staff_id?: string } | null
                }
            })

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                items = items.filter(i => 
                    i.full_name.toLowerCase().includes(term) ||
                    i.email.toLowerCase().includes(term) ||
                    i.job_title.toLowerCase().includes(term)
                )
            }

            // Fetch manager names in bulk
            const managerIds = items.map(i => i.reporting_to).filter(Boolean) as string[]
            if (managerIds.length > 0) {
                const { data: managers } = await supabase
                    .from('profiles')
                    .select('id, full_name, staff_id')
                    .in('id', managerIds)

                if (managers) {
                    items.forEach(i => {
                        const mgr = managers.find(m => m.id === i.reporting_to)
                        if (mgr) i.manager = mgr
                    })
                }
            }

            return items
        },
        enabled: !!currentOrganization?.id
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin me-2" />
                    {t('common:loading', 'Loading...')}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin:organization.employee_assignments', 'Employee Assignments & Hierarchy')}</CardTitle>
                <CardDescription>
                    {t('admin:organization.assignments_desc', 'View and manage employee locations, departments, and reporting managers.')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin:organization.staff_id', 'ID')}</TableHead>
                                <TableHead>{t('admin:organization.employee', 'Employee')}</TableHead>
                                <TableHead>{t('admin:organization.job_title', 'Job Title')}</TableHead>
                                <TableHead>{t('admin:organization.reports_to', 'Reports To')}</TableHead>
                                <TableHead>{t('admin:organization.property', 'Hotel / Location')}</TableHead>
                                <TableHead>{t('admin:organization.department', 'Department')}</TableHead>
                                <TableHead>{t('admin:organization.role', 'Tenant Role')}</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{emp.staff_id || '—'}</TableCell>
                                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{emp.job_title || '—'}</TableCell>
                                    <TableCell>
                                        {emp.manager?.full_name ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{emp.manager.full_name}</span>
                                                {emp.manager.staff_id && (
                                                    <span className="text-[10px] text-muted-foreground font-mono">{emp.manager.staff_id}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic text-xs">{t('admin:organization.no_manager', 'No Manager')}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {emp.hotel_name}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {emp.dept_name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {emp.role.replace(/_/g, ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEditEmployee({
                                                id: emp.id,
                                                full_name: emp.full_name,
                                                job_title: emp.job_title,
                                                email: emp.email,
                                                reporting_to: emp.reporting_to,
                                                manager_name: emp.manager?.full_name,
                                                depth: 0,
                                                path: [],
                                                path_names: [],
                                                children: []
                                            })}
                                        >
                                            {t('common:action.edit', 'Edit')}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

// Pending Changes Table
function PendingChangesTable() {
    const { t } = useTranslation('admin')
    const { data: pendingChanges, isLoading } = useQuery<PendingOrgChanges>({
        queryKey: ['pending-org-changes'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0]

            const { data: promotions } = await supabase
                .from('employee_promotions')
                .select(`
                    id, employee_id, from_role, to_role, from_title, to_title, effective_date, notes,
                    employee:profiles!employee_promotions_employee_id_fkey(full_name)
                `)
                .gt('effective_date', today)
                .order('effective_date')

            const { data: transfers } = await supabase
                .from('employee_transfers')
                .select(`
                    id, employee_id, from_property_id, to_property_id, effective_date, reason,
                    employee:profiles!employee_transfers_employee_id_fkey(full_name),
                    from_property:properties!employee_transfers_from_property_id_fkey(name),
                    to_property:properties!employee_transfers_to_property_id_fkey(name)
                `)
                .gt('effective_date', today)
                .order('effective_date')

            return {
                promotions: promotions || [],
                transfers: transfers || []
            } as PendingOrgChanges
        }
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin me-2" />
                    {t('common:loading', 'Loading...')}
                </CardContent>
            </Card>
        )
    }

    const totalPending = (pendingChanges?.promotions?.length || 0) + (pendingChanges?.transfers?.length || 0)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {t('organization.pending_changes', 'Pending Organizational Changes')}
                    {totalPending > 0 && (
                        <Badge variant="secondary">{totalPending}</Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    {t('organization.pending_desc', 'Future-dated promotions and transfers that will be applied automatically')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {totalPending === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t('organization.no_pending', 'No pending changes scheduled')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {pendingChanges?.promotions && pendingChanges.promotions.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">{t('organization.pending_promotions', 'Pending Promotions')}</h4>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('organization.employee', 'Employee')}</TableHead>
                                                <TableHead>{t('organization.change', 'Change')}</TableHead>
                                                <TableHead>{t('organization.effective_date', 'Effective Date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingChanges.promotions.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{(Array.isArray(p.employee) ? p.employee[0]?.full_name : p.employee?.full_name) || '—'}</TableCell>
                                                    <TableCell>
                                                        <span className="text-muted-foreground">{p.from_title || p.from_role}</span>
                                                        <span className="mx-2">→</span>
                                                        <span className="font-medium text-emerald-600">{p.to_title || p.to_role}</span>
                                                    </TableCell>
                                                    <TableCell>{formatDateTime(p.effective_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {pendingChanges?.transfers && pendingChanges.transfers.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">{t('organization.pending_transfers', 'Pending Transfers')}</h4>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('organization.employee', 'Employee')}</TableHead>
                                                <TableHead>{t('organization.transfer', 'Transfer')}</TableHead>
                                                <TableHead>{t('organization.effective_date', 'Effective Date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingChanges.transfers.map((tr) => (
                                                <TableRow key={tr.id}>
                                                    <TableCell className="font-medium">{(Array.isArray(tr.employee) ? tr.employee[0]?.full_name : tr.employee?.full_name) || '—'}</TableCell>
                                                    <TableCell>
                                                        <span className="text-muted-foreground">{(Array.isArray(tr.from_property) ? tr.from_property[0]?.name : tr.from_property?.name) || 'N/A'}</span>
                                                        <span className="mx-2">→</span>
                                                        <span className="font-medium text-blue-600">{Array.isArray(tr.to_property) ? tr.to_property[0]?.name : tr.to_property?.name}</span>
                                                    </TableCell>
                                                    <TableCell>{formatDateTime(tr.effective_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Org Change History Component
function OrgChangeHistory() {
    const { t } = useTranslation('admin')
    const { data: history, isLoading } = useQuery<OrgChangeHistoryRow[]>({
        queryKey: ['org-change-history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs_v')
                .select(`
                    id, entity_type, entity_id, action, details, created_at,
                    changed_by_profile:profiles!user_id(full_name)
                `)
                .in('entity_type', ['profiles', 'employee_promotions', 'employee_transfers', 'user_departments', 'user_properties', 'organization_memberships', 'departments', 'hotels', 'brands'])
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) {
                console.warn('Audit logs query error:', error)
                return []
            }
            return (data || []) as OrgChangeHistoryRow[]
        }
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin me-2" />
                    {t('common:loading', 'Loading...')}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('organization.change_history', 'Change History')}</CardTitle>
                <CardDescription>
                    {t('organization.history_desc', 'Recent organizational changes and audit trail')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!history || history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t('organization.no_history', 'No recent changes found')}</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('organization.date', 'Date')}</TableHead>
                                    <TableHead>{t('organization.action', 'Action')}</TableHead>
                                    <TableHead>{t('organization.table', 'Entity')}</TableHead>
                                    <TableHead>{t('organization.changed_by', 'Changed By')}</TableHead>
                                    <TableHead>{t('organization.details', 'Details')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {formatDateTime(entry.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    entry.action === 'create' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                                    entry.action === 'update' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                                    entry.action === 'delete' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                                    ''
                                                }
                                            >
                                                {entry.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {entry.entity_type}
                                        </TableCell>
                                        <TableCell>
                                            {getPersonName(entry.changed_by_profile, 'System')}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                            {entry.action === 'update' && entry.details?.old?.reporting_to !== entry.details?.new?.reporting_to && (
                                                <span>{t('organization.reporting_changed', 'Reporting line changed')}</span>
                                            )}
                                            {entry.action === 'create' && entry.entity_type === 'employee_promotions' && (
                                                <span>{t('organization.promotion_created', 'Promotion scheduled')}</span>
                                            )}
                                            {entry.action === 'create' && entry.entity_type === 'employee_transfers' && (
                                                <span>{t('organization.transfer_created', 'Transfer scheduled')}</span>
                                            )}
                                            {entry.action === 'update' && entry.entity_type === 'profiles' && !(
                                                entry.details?.old?.reporting_to !== entry.details?.new?.reporting_to
                                            ) && (
                                                <span>{t('organization.profile_updated', 'Profile updated')}</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
