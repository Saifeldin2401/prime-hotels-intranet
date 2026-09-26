import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WorkspaceHeader, headerActionClass } from '@/ui'
import { useQuery } from '@tanstack/react-query'
import { OrgByDepartment } from '@/components/admin/OrgByDepartment'
import { OrgChartStats, OrgChartTree } from '@/components/admin/OrgChartTree'
import { ReportingLineEditor } from '@/components/admin/ReportingLineEditor'
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
import { BrandsManagement } from './components/BrandsManagement'
import { DepartmentsManagement } from './components/DepartmentsManagement'
import { RolesManagement } from './components/RolesManagement'
import { MembershipsManagement } from './components/MembershipsManagement'
import { OrgStructureTree } from '@/components/org/OrgStructureTree'
import {
    Building,
    Building2,
    Crown,
    GitBranch,
    History,
    RefreshCw,
    Search,
    Shield,
    Users,
    Briefcase,
    FolderTree,
    Network,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

type PersonRelation = { full_name?: string | null }
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

function getPersonName(relation: PersonRelation | PersonRelation[] | null | undefined, fallback: string) {
    return getFirstRelation(relation)?.full_name || fallback
}

export default function OrganizationalControlCenter() {
    const { t } = useTranslation(['admin', 'common', 'nav'])
    const { currentOrganization, refreshTenantData } = useTenant()
    // ?tab= makes each part of the structure linkable (Organization overview
    // links straight to departments or memberships).
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') ?? 'structure'
    const setActiveTab = (tab: string) => {
        const next = new URLSearchParams(searchParams)
        next.set('tab', tab)
        setSearchParams(next, { replace: true })
    }
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState<OrgTreeNode | null>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'hierarchy' | 'department' | 'structure'>('department')

    // Fetch hierarchy data for org tree
    const { data: hierarchyData, isLoading: isLoadingHierarchy, refetch: refetchHierarchy } = useOrgHierarchy()

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
            <WorkspaceHeader
                eyebrow={t('admin:structure.eyebrow', 'Organization')}
                title={t('admin:structure.title_org', 'Structure')}
                context={currentOrganization?.name ?? null}
                actions={
                    <button type="button" onClick={handleGlobalRefresh} className={headerActionClass.secondary}>
                        <RefreshCw aria-hidden="true" className="h-4 w-4" />{t('common:refresh', 'Refresh')}
                    </button>
                }
            />

            {/* Quick Filters for Org Chart / Assignments */}
            {(activeTab === 'orgchart' || activeTab === 'assignments') && (
                <div className="flex flex-col sm:flex-row gap-3 rounded-[8px] border border-border bg-card p-3 shadow-none">
                    <div className="flex-1 relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder={t('admin:organization.search_employees', 'Search employees...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 ps-9 rounded-[6px] border-border bg-background text-xs"
                        />
                    </div>
                </div>
            )}

            {/* Comprehensive Hierarchy Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-none border-b border-ds-border bg-transparent p-0">
                    <TabsTrigger value="structure" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Network aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:structure.tab_structure', 'Structure')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Briefcase aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:departments', 'Departments')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="brands" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Crown aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:organization.tab_brands', 'Brands')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="memberships" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Users aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:structure.tab_people', 'People & placement')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="orgchart" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <GitBranch aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:structure.tab_reporting', 'Reporting lines')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Shield aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:roles.title', 'Roles')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Users aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:organization.tab_assignments', 'Assignments')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <History aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:organization.tab_history', 'History')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="min-h-[40px] gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">
                        <Building aria-hidden="true" className="h-4 w-4" />
                        <span>{t('admin:structure.tab_profile', 'Profile & plan')}</span>
                    </TabsTrigger>
                </TabsList>


                {/* Structure: organization > department */}
                <TabsContent value="structure" className="mt-6">
                    <OrgStructureTree orgId={currentOrganization?.id || ''} />
                </TabsContent>

                {/* Tab 1: Profile & Subscription Entitlements */}
                <TabsContent value="profile" className="mt-6 space-y-6">
                    <SubscriptionEntitlementsCard />
                    <OrganizationProfileSettings />
                </TabsContent>

                {/* Tab 2: Brands Management */}
                <TabsContent value="brands" className="mt-6">
                    <BrandsManagement />
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
                        searchTerm={searchTerm}
                        onEditEmployee={handleEditNode}
                    />
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
    searchTerm,
    onEditEmployee
}: {
    searchTerm: string
    onEditEmployee: (node: OrgTreeNode) => void
}) {
    const { t } = useTranslation(['admin', 'common'])
    const { currentOrganization } = useTenant()

    const { data: employees, isLoading } = useQuery({
        queryKey: ['org-assignments-data', currentOrganization?.id, searchTerm],
        queryFn: async () => {
            if (!currentOrganization?.id) return []

            // Query profiles in active organization memberships
            const memberQuery = supabase
                .from('organization_memberships')
                .select(`
                    id,
                    user_id,
                    role,
                    department_id,
                    department:departments(name),
                    profile:profiles(id, full_name, email, job_title, staff_id, reporting_to, is_active)
                `)
                .eq('organization_id', currentOrganization.id)
                .eq('is_active', true)

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
                    dept_name: '—',
                    role: 'learner',
                    manager: null
                }))
            }

            // Extract profiles and search filter
            let items = memberRows.map(m => {
                const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
                const d = Array.isArray(m.department) ? m.department[0] : m.department
                return {
                    id: p?.id || m.user_id,
                    full_name: p?.full_name || 'Staff Member',
                    email: p?.email || '',
                    job_title: p?.job_title || '—',
                    staff_id: p?.staff_id || '—',
                    reporting_to: p?.reporting_to || null,
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
        <div className="rounded-[8px] border border-border bg-card p-6 shadow-none">
            <div className="pb-4 border-b border-border/40">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-ds-warning" />
                    <span>{t('admin:organization.employee_assignments', 'Employee Assignments & Hierarchy')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('admin:organization.assignments_desc', 'Each person’s department, role and manager.')}
                </p>
            </div>
            <div className="mt-4">
                <div className="rounded-[6px] border border-border overflow-hidden bg-card">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-border/40 hover:bg-transparent">
                                <TableHead className="text-xs font-bold">{t('admin:organization.staff_id', 'ID')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.employee', 'Employee')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.job_title', 'Job Title')}</TableHead>
                                <TableHead className="text-xs font-bold">{t('admin:organization.reports_to', 'Reports To')}</TableHead>
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
                                        {emp.dept_name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[11px] capitalize border-ds-warning/30 bg-ds-warning-soft text-foreground font-medium">
                                            {emp.role.replace(/_/g, ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-ds-warning hover:bg-ds-warning-soft"
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
                .in('entity_type', ['profiles', 'employee_promotions', 'employee_transfers', 'user_departments', 'organization_memberships', 'departments', 'brands'])
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
            <div className="rounded-[8px] border border-border bg-card p-8 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-ds-warning me-2" />
                <span className="text-xs font-semibold">{t('common:loading', 'Loading...')}</span>
            </div>
        )
    }

    return (
        <div className="rounded-3xl border border-border/60 p-6 shadow-md backdrop-blur-2xl">
            <div className="pb-4 border-b border-border/40">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-ds-warning" />
                    <span>{t('organization.change_history', 'Change History & Governance Trail')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('organization.history_desc', 'Recent organizational changes, appointments, transfers, and system audit trail')}
                </p>
            </div>
            <div className="mt-4">
                {!history || history.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-40 text-ds-warning" />
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
                                                    entry.action === 'create' ? 'border-ds-success/30 bg-ds-success-soft text-ds-success font-bold text-[10px]' :
                                                    entry.action === 'update' ? 'border-ds-accent/30 bg-ds-accent-soft text-ds-accent font-bold text-[10px]' :
                                                    entry.action === 'delete' ? 'border-ds-danger/30 bg-ds-danger-soft text-ds-danger font-bold text-[10px]' :
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
