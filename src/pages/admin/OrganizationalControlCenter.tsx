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
import { OrganizationProfileSettings } from './components/OrganizationProfileSettings'
import { SubscriptionEntitlementsCard } from './components/SubscriptionEntitlementsCard'
import { HotelsManagement } from './components/HotelsManagement'
import { BrandsManagement } from './components/BrandsManagement'
import { DepartmentsManagement } from './components/DepartmentsManagement'
import { RolesManagement } from './components/RolesManagement'
import { MembershipsManagement } from './components/MembershipsManagement'
import { OrgStructureTree } from '@/components/org/OrgStructureTree'
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
    CreditCard,
    FolderTree
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
    const [viewMode, setViewMode] = useState<'hierarchy' | 'department' | 'structure'>('department')

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
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Executive Control Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-card/95 via-card/75 to-card/40 p-6 sm:p-8 backdrop-blur-2xl shadow-lg">
                <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-amber-500/[0.08] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-blue-500/[0.06] blur-3xl" />

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-0.5">
                                <Building2 className="me-1.5 h-3.5 w-3.5" />
                                {t('admin:organization.title', 'Organizational Control Center')}
                            </Badge>
                            {currentOrganization && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                                    {currentOrganization.name}
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl font-serif">
                            {t('admin:organization.title', 'Organizational Control Center')}
                        </h1>
                        <p className="text-xs text-muted-foreground sm:text-sm font-normal max-w-2xl leading-relaxed">
                            {t('admin:organization.description', 'Manage enterprise hierarchy, hotels, brands, departments, tenant roles, and reporting structures.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleGlobalRefresh}
                            className="h-9 rounded-2xl border-border/60 bg-background/70 px-3.5 text-xs font-semibold hover:border-amber-500/40 hover:bg-background/90 shadow-xs"
                        >
                            <RefreshCw className="h-3.5 w-3.5 me-1.5 text-amber-500" />
                            <span>{t('common:refresh', 'Refresh')}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Filters for Org Chart / Assignments */}
            {(activeTab === 'orgchart' || activeTab === 'assignments') && (
                <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-border/50 bg-card/60 p-3 backdrop-blur-xl">
                    <div className="flex-1 relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder={t('admin:organization.search_employees', 'Search employees...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 ps-9 rounded-xl border-border/60 bg-background/80 text-xs focus:ring-amber-500/30"
                        />
                    </div>
                    <Select
                        value={selectedHotelId || "all"}
                        onValueChange={(val) => setSelectedHotelId(val === "all" ? "" : val)}
                    >
                        <SelectTrigger className="w-full sm:w-64 h-9 rounded-xl border-border/60 bg-background/80 text-xs">
                            <Building2 className="h-3.5 w-3.5 me-2 text-amber-500" />
                            <SelectValue placeholder={t('admin:organization.all_properties', 'Consolidated (Cluster)')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">
                                {t('admin:organization.all_properties', 'Consolidated (Cluster)')}
                            </SelectItem>
                            {availableHotels?.map((hotel) => (
                                <SelectItem key={hotel.id} value={hotel.id} className="text-xs">
                                    {hotel.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Comprehensive Hierarchy Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap h-auto gap-1.5 bg-card/60 p-1.5 rounded-2xl border border-border/60 backdrop-blur-xl shadow-xs">
                    {/* 1. Profile & Entitlements */}
                    <TabsTrigger value="profile" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Building className="h-3.5 w-3.5" />
                        <span>{t('admin:organization.tab_profile', 'Profile & Plan')}</span>
                    </TabsTrigger>

                    {/* 2. Brands */}
                    <TabsTrigger value="brands" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Crown className="h-3.5 w-3.5" />
                        <span>{t('admin:organization.tab_brands', 'Brands')}</span>
                    </TabsTrigger>

                    {/* 3. Hotels */}
                    <TabsTrigger value="hotels" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{t('admin:organization.tab_hotels', 'Hotels')}</span>
                    </TabsTrigger>

                    {/* 4. Departments */}
                    <TabsTrigger value="departments" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>{t('admin:departments', 'Departments')}</span>
                    </TabsTrigger>

                    {/* 5. Roles Matrix */}
                    <TabsTrigger value="roles" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Shield className="h-3.5 w-3.5" />
                        <span>{t('admin:roles.title', 'Roles')}</span>
                    </TabsTrigger>

                    {/* 6. Memberships */}
                    <TabsTrigger value="memberships" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Users className="h-3.5 w-3.5" />
                        <span>{t('admin:user_memberships', 'Memberships')}</span>
                    </TabsTrigger>

                    {/* 7. Org Chart */}
                    <TabsTrigger value="orgchart" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>{t('admin:organization.tab_orgchart', 'Org Chart')}</span>
                    </TabsTrigger>

                    {/* 8. Assignments */}
                    <TabsTrigger value="assignments" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Users className="h-3.5 w-3.5" />
                        <span>{t('admin:organization.tab_assignments', 'Assignments')}</span>
                    </TabsTrigger>

                    {/* 9. Pending Changes */}
                    <TabsTrigger value="pending" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{t('admin:organization.tab_pending', 'Pending')}</span>
                    </TabsTrigger>

                    {/* 10. Audit History */}
                    <TabsTrigger value="history" className="gap-1.5 py-2 px-3 rounded-xl text-xs font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-slate-950 transition-all shadow-xs">
                        <History className="h-3.5 w-3.5" />
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
                            <button
                                onClick={() => setViewMode('structure')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    viewMode === 'structure'
                                        ? "bg-card shadow-sm text-primary font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <FolderTree className="h-4 w-4" />
                                {t('admin:organization.by_structure', 'Entity Structure')}
                            </button>
                        </div>
                    </div>

                    {viewMode === 'structure' ? (
                        <OrgStructureTree orgId={currentOrganization?.id || ''} />
                    ) : viewMode === 'department' ? (
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
        <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/45 p-6 shadow-md backdrop-blur-2xl">
            <div className="pb-4 border-b border-border/40">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" />
                    <span>{t('admin:organization.employee_assignments', 'Employee Assignments & Hierarchy')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('admin:organization.assignments_desc', 'View and manage employee locations, departments, and reporting managers.')}
                </p>
            </div>
            <div className="mt-4">
                <div className="rounded-2xl border border-border/60 overflow-hidden bg-background/40">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-border/40 hover:bg-transparent">
                                <TableHead className="text-xs font-bold">{t('admin:organization.staff_id', 'ID')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.employee', 'Employee')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.job_title', 'Job Title')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.reports_to', 'Reports To')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.property', 'Hotel / Location')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.department', 'Department')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.role', 'Tenant Role')}</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.map((emp) => (
                                <TableRow key={emp.id} className="border-border/40 hover:bg-card/70 transition-colors">
                                    <TableCell className="font-mono text-xs text-muted-foreground">{emp.staff_id || '—'}</TableCell>
                                    <TableCell className="font-semibold text-xs text-foreground">{emp.full_name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{emp.job_title || '—'}</TableCell>
                                    <TableCell>
                                        {emp.manager?.full_name ? (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs text-foreground">{emp.manager.full_name}</span>
                                                {emp.manager.staff_id && (
                                                    <span className="text-[10px] text-muted-foreground font-mono">{emp.manager.staff_id}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic text-xs">{t('admin:organization.no_manager', 'No Manager')}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {emp.hotel_name}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {emp.dept_name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[11px] capitalize border-amber-500/30 bg-amber-500/5 text-foreground font-medium">
                                            {emp.role.replace(/_/g, ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
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
            </div>
        </div>
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
            <div className="rounded-3xl border border-border/60 bg-card/60 p-8 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-amber-500 me-2" />
                <span className="text-xs font-semibold">{t('common:loading', 'Loading...')}</span>
            </div>
        )
    }

    const totalPending = (pendingChanges?.promotions?.length || 0) + (pendingChanges?.transfers?.length || 0)

    return (
        <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/45 p-6 shadow-md backdrop-blur-2xl">
            <div className="pb-4 border-b border-border/40 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>{t('organization.pending_changes', 'Pending Organizational Changes')}</span>
                        {totalPending > 0 && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">{totalPending}</Badge>
                        )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t('organization.pending_desc', 'Future-dated promotions and transfers scheduled for automated activation')}
                    </p>
                </div>
            </div>
            <div className="mt-4">
                {totalPending === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-40 text-amber-500" />
                        <p className="text-xs font-semibold">{t('organization.no_pending', 'No pending changes scheduled')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {pendingChanges?.promotions && pendingChanges.promotions.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">{t('organization.pending_promotions', 'Pending Promotions')}</h4>
                                <div className="rounded-2xl border border-border/60 overflow-hidden bg-background/40">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow className="border-border/40">
                                                <TableHead className="text-xs font-bold">{t('organization.employee', 'Employee')}</TableHead>
                                                <TableHead className="text-xs font-bold">{t('organization.change', 'Change')}</TableHead>
                                                <TableHead className="text-xs font-bold">{t('organization.effective_date', 'Effective Date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingChanges.promotions.map((p) => (
                                                <TableRow key={p.id} className="border-border/40">
                                                    <TableCell className="font-semibold text-xs text-foreground">{(Array.isArray(p.employee) ? p.employee[0]?.full_name : p.employee?.full_name) || '—'}</TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="text-muted-foreground">{p.from_title || p.from_role}</span>
                                                        <span className="mx-2 text-amber-500">→</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.to_title || p.to_role}</span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.effective_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {pendingChanges?.transfers && pendingChanges.transfers.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">{t('organization.pending_transfers', 'Pending Transfers')}</h4>
                                <div className="rounded-2xl border border-border/60 overflow-hidden bg-background/40">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow className="border-border/40">
                                                <TableHead className="text-xs font-bold">{t('organization.employee', 'Employee')}</TableHead>
                                                <TableHead className="text-xs font-bold">{t('organization.transfer', 'Transfer')}</TableHead>
                                                <TableHead className="text-xs font-bold">{t('organization.effective_date', 'Effective Date')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingChanges.transfers.map((tr) => (
                                                <TableRow key={tr.id} className="border-border/40">
                                                    <TableCell className="font-semibold text-xs text-foreground">{(Array.isArray(tr.employee) ? tr.employee[0]?.full_name : tr.employee?.full_name) || '—'}</TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="text-muted-foreground">{(Array.isArray(tr.from_property) ? tr.from_property[0]?.name : tr.from_property?.name) || 'N/A'}</span>
                                                        <span className="mx-2 text-amber-500">→</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{Array.isArray(tr.to_property) ? tr.to_property[0]?.name : tr.to_property?.name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(tr.effective_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
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
            <div className="rounded-3xl border border-border/60 bg-card/60 p-8 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-amber-500 me-2" />
                <span className="text-xs font-semibold">{t('common:loading', 'Loading...')}</span>
            </div>
        )
    }

    return (
        <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/95 via-card/75 to-card/45 p-6 shadow-md backdrop-blur-2xl">
            <div className="pb-4 border-b border-border/40">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-amber-500" />
                    <span>{t('organization.change_history', 'Change History & Governance Trail')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('organization.history_desc', 'Recent organizational changes, appointments, transfers, and system audit trail')}
                </p>
            </div>
            <div className="mt-4">
                {!history || history.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-40 text-amber-500" />
                        <p className="text-xs font-semibold">{t('organization.no_history', 'No recent changes found')}</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/60 overflow-hidden bg-background/40">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-border/40">
                                    <TableHead className="text-xs font-bold">{t('organization.date', 'Date')}</TableHead>
                                    <TableHead className="text-xs font-bold">{t('organization.action', 'Action')}</TableHead>
                                    <TableHead className="text-xs font-bold">{t('organization.table', 'Entity')}</TableHead>
                                    <TableHead className="text-xs font-bold">{t('organization.changed_by', 'Changed By')}</TableHead>
                                    <TableHead className="text-xs font-bold">{t('organization.details', 'Details')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry) => (
                                    <TableRow key={entry.id} className="border-border/40 hover:bg-card/70 transition-colors">
                                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                            {formatDateTime(entry.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    entry.action === 'create' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]' :
                                                    entry.action === 'update' ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]' :
                                                    entry.action === 'delete' ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]' :
                                                    'text-[10px]'
                                                }
                                            >
                                                {entry.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                                            {entry.entity_type}
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-foreground">
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
            </div>
        </div>
    )
}
