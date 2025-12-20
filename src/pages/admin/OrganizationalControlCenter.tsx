import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    GitBranch,
    Users,
    Clock,
    History,
    Search,
    RefreshCw,
    Download,
    Building2,
    Filter
} from 'lucide-react'
import { useOrgHierarchy, buildOrgTree, type OrgTreeNode } from '@/hooks/useOrganization'
import { OrgChartTree, OrgChartStats } from '@/components/admin/OrgChartTree'
import { OrgByDepartment } from '@/components/admin/OrgByDepartment'
import { ReportingLineEditor } from '@/components/admin/ReportingLineEditor'
import { useProperties } from '@/hooks/useProperties'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export default function OrganizationalControlCenter() {
    const { t } = useTranslation(['admin', 'common'])
    const [activeTab, setActiveTab] = useState('orgchart')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
    const [selectedEmployee, setSelectedEmployee] = useState<OrgTreeNode | null>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'hierarchy' | 'department'>('department') // Default to department view

    // Fetch data
    const { data: properties } = useProperties()
    const { data: hierarchyData, isLoading: isLoadingHierarchy, refetch } = useOrgHierarchy(
        selectedPropertyId || undefined
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

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('organization.title', 'Organizational Control Center')}
                description={t('organization.description', 'Manage reporting structures, employee assignments, and organizational hierarchy')}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4 me-2" />
                            {t('common:refresh', 'Refresh')}
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('organization.search_employees', 'Search employees...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select
                    value={selectedPropertyId || "all"}
                    onValueChange={(val) => setSelectedPropertyId(val === "all" ? "" : val)}
                >
                    <SelectTrigger className="w-[200px]">
                        <Building2 className="h-4 w-4 me-2" />
                        <SelectValue placeholder={t('organization.all_properties', 'All Properties')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                            {t('organization.all_properties', 'All Properties')}
                        </SelectItem>
                        {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                                {property.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                    <TabsTrigger value="orgchart" className="gap-2">
                        <GitBranch className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('organization.tab_orgchart', 'Org Chart')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('organization.tab_assignments', 'Assignments')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('organization.tab_pending', 'Pending Changes')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('organization.tab_history', 'History')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Org Chart Tab */}
                <TabsContent value="orgchart" className="mt-6">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-sm text-gray-500">{t('organization.view_mode', 'View Mode:')}</span>
                        <div className="inline-flex rounded-lg border bg-gray-100 dark:bg-gray-800 p-1">
                            <button
                                onClick={() => setViewMode('department')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    viewMode === 'department'
                                        ? "bg-white dark:bg-gray-700 shadow text-primary"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Building2 className="h-4 w-4" />
                                {t('organization.by_department', 'By Department')}
                            </button>
                            <button
                                onClick={() => setViewMode('hierarchy')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    viewMode === 'hierarchy'
                                        ? "bg-white dark:bg-gray-700 shadow text-primary"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <GitBranch className="h-4 w-4" />
                                {t('organization.by_hierarchy', 'By Hierarchy')}
                            </button>
                        </div>
                    </div>

                    {viewMode === 'department' ? (
                        /* Department View */
                        <OrgByDepartment
                            selectedPropertyId={selectedPropertyId || undefined}
                            searchTerm={searchTerm}
                            onEmployeeClick={(emp) => {
                                // Convert to OrgTreeNode format for editor compatibility
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
                        /* Hierarchy View */
                        isLoadingHierarchy ? (
                            <div className="flex items-center justify-center h-64 text-gray-500">
                                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                                {t('common:loading', 'Loading...')}
                            </div>
                        ) : filteredNodes.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <Users className="h-12 w-12 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">{t('organization.no_employees', 'No employees found')}</p>
                                    <p className="text-sm">{t('organization.adjust_filters', 'Try adjusting your filters')}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <OrgChartStats nodes={filteredNodes} />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('organization.hierarchy', 'Organizational Hierarchy')}</CardTitle>
                                        <CardDescription>
                                            {t('organization.hierarchy_desc', 'Click on an employee to view details, or use the menu to edit their reporting line.')}
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

                {/* Assignments Tab */}
                <TabsContent value="assignments" className="mt-6">
                    <AssignmentsTable
                        propertyId={selectedPropertyId || undefined}
                        searchTerm={searchTerm}
                        onEditEmployee={handleEditNode}
                    />
                </TabsContent>

                {/* Pending Changes Tab */}
                <TabsContent value="pending" className="mt-6">
                    <PendingChangesTable />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-6">
                    <OrgChangeHistory />
                </TabsContent>
            </Tabs>

            {/* Reporting Line Editor Dialog */}
            <ReportingLineEditor
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                employee={selectedEmployee}
                propertyId={selectedPropertyId || undefined}
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

// Assignments Table Component
function AssignmentsTable({
    propertyId,
    searchTerm,
    onEditEmployee
}: {
    propertyId?: string
    searchTerm: string
    onEditEmployee: (node: OrgTreeNode) => void
}) {
    const { t } = useTranslation('admin')
    const { data: employees, isLoading } = useQuery({
        queryKey: ['employees-with-reporting', propertyId, searchTerm],
        queryFn: async () => {
            // Fetch profiles without self-join (simpler, avoids FK issues)
            let query = supabase
                .from('profiles')
                .select('id, full_name, email, job_title, reporting_to, is_active')
                .eq('is_active', true)
                .order('full_name')

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,job_title.ilike.%${searchTerm}%`)
            }

            const { data: profiles, error: profilesError } = await query.limit(100)
            if (profilesError) {
                console.error('Profiles query error:', profilesError)
                throw profilesError
            }

            if (!profiles || profiles.length === 0) return []

            const profileIds = profiles.map(p => p.id)
            const managerIds = profiles.map(p => p.reporting_to).filter(Boolean) as string[]

            // Fetch manager names
            const { data: managers } = managerIds.length > 0
                ? await supabase
                    .from('profiles')
                    .select('id, full_name, job_title')
                    .in('id', managerIds)
                : { data: [] }

            // Fetch properties
            const { data: userProps } = await supabase
                .from('user_properties')
                .select('user_id, property_id, properties(name)')
                .in('user_id', profileIds)

            // Fetch departments
            const { data: userDepts } = await supabase
                .from('user_departments')
                .select('user_id, department_id, departments(name)')
                .in('user_id', profileIds)

            // Fetch roles
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('user_id', profileIds)

            // Merge the data
            return profiles.map(profile => {
                const manager = managers?.find(m => m.id === profile.reporting_to)
                return {
                    ...profile,
                    manager: manager || null,
                    user_properties: userProps?.filter(up => up.user_id === profile.id) || [],
                    user_departments: userDepts?.filter(ud => ud.user_id === profile.id) || [],
                    user_roles: userRoles?.filter(ur => ur.user_id === profile.id) || []
                }
            })
        }
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    {t('common:loading', 'Loading...')}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('organization.employee_assignments', 'Employee Assignments')}</CardTitle>
                <CardDescription>
                    {t('organization.assignments_desc', 'View and edit employee property, department, and reporting assignments')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('organization.employee', 'Employee')}</TableHead>
                                <TableHead>{t('organization.job_title', 'Job Title')}</TableHead>
                                <TableHead>{t('organization.reports_to', 'Reports To')}</TableHead>
                                <TableHead>{t('organization.property', 'Property')}</TableHead>
                                <TableHead>{t('organization.department', 'Department')}</TableHead>
                                <TableHead>{t('organization.role', 'Role')}</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.map((emp: any) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                                    <TableCell className="text-gray-500">{emp.job_title || '—'}</TableCell>
                                    <TableCell>
                                        {emp.manager?.full_name || (
                                            <span className="text-gray-400 italic">{t('organization.no_manager', 'No Manager')}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {emp.user_properties?.[0]?.properties?.name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        {emp.user_departments?.[0]?.departments?.name || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {t(`common:roles.${emp.user_roles?.[0]?.role || 'staff'}`, { defaultValue: emp.user_roles?.[0]?.role || 'staff' })}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
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
                                            {t('common:action.edit')}
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
    const { data: pendingChanges, isLoading } = useQuery({
        queryKey: ['pending-org-changes'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0]

            // Get future-dated promotions
            const { data: promotions } = await supabase
                .from('employee_promotions')
                .select(`
          id, employee_id, from_role, to_role, from_title, to_title, effective_date, notes,
          employee:profiles!employee_promotions_employee_id_fkey(full_name)
        `)
                .gt('effective_date', today)
                .order('effective_date')

            // Get future-dated transfers
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
            }
        }
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
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
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t('organization.no_pending', 'No pending changes scheduled')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Promotions */}
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
                                            {pendingChanges.promotions.map((p: any) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.employee?.full_name}</TableCell>
                                                    <TableCell>
                                                        <span className="text-gray-500">{p.from_title || p.from_role}</span>
                                                        <span className="mx-2">→</span>
                                                        <span className="font-medium text-green-600">{p.to_title || p.to_role}</span>
                                                    </TableCell>
                                                    <TableCell>{formatDateTime(p.effective_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Transfers */}
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
                                            {pendingChanges.transfers.map((tr: any) => (
                                                <TableRow key={tr.id}>
                                                    <TableCell className="font-medium">{tr.employee?.full_name}</TableCell>
                                                    <TableCell>
                                                        <span className="text-gray-500">{tr.from_property?.name || 'N/A'}</span>
                                                        <span className="mx-2">→</span>
                                                        <span className="font-medium text-blue-600">{tr.to_property?.name}</span>
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
    const { data: history, isLoading } = useQuery({
        queryKey: ['org-change-history'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
          id, table_name, record_id, operation, old_data, new_data, created_at,
          changed_by_profile:profiles!audit_logs_changed_by_fkey(full_name)
        `)
                .in('table_name', ['profiles', 'employee_promotions', 'employee_transfers', 'user_departments', 'user_properties'])
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            return data
        }
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
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
                    <div className="text-center py-8 text-gray-500">
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
                                    <TableHead>{t('organization.table', 'Table')}</TableHead>
                                    <TableHead>{t('organization.changed_by', 'Changed By')}</TableHead>
                                    <TableHead>{t('organization.details', 'Details')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry: any) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {formatDateTime(entry.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    entry.operation === 'INSERT' ? 'bg-green-50 text-green-700' :
                                                        entry.operation === 'UPDATE' ? 'bg-blue-50 text-blue-700' :
                                                            entry.operation === 'DELETE' ? 'bg-red-50 text-red-700' :
                                                                ''
                                                }
                                            >
                                                {entry.operation}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {entry.table_name}
                                        </TableCell>
                                        <TableCell>
                                            {entry.changed_by_profile?.full_name || 'System'}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-xs text-gray-500">
                                            {entry.operation === 'UPDATE' && entry.old_data?.reporting_to !== entry.new_data?.reporting_to && (
                                                <span>{t('organization.reporting_changed')}</span>
                                            )}
                                            {entry.operation === 'INSERT' && entry.table_name === 'employee_promotions' && (
                                                <span>{t('organization.promotion_created')}</span>
                                            )}
                                            {entry.operation === 'INSERT' && entry.table_name === 'employee_transfers' && (
                                                <span>{t('organization.transfer_created')}</span>
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
