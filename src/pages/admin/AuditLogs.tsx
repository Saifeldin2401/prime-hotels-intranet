import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Filter, Search, Activity, User, FileText, Shield, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/lib/types'
import { useTranslation } from 'react-i18next'

const actionColors = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  view: 'bg-gray-100 text-gray-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-orange-100 text-orange-800'
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
type AuditUser = { full_name?: string | null; email?: string | null }
type AuditLogWithUser = AuditLog & { user?: AuditUser | AuditUser[] | null }

export default function AuditLogs() {
  const { t } = useTranslation('admin')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [targetFilter, setTargetFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30days')

  // Pagination State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: (val: T) => void, val: T) => {
    setter(val)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', searchTerm, actionFilter, targetFilter, dateRange, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!user_id(full_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`)
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      if (targetFilter !== 'all') {
        query = query.eq('entity_type', targetFilter)
      }

      if (dateRange !== 'all') {
        const now = new Date()
        const startDate = new Date()

        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
          case '7days':
            startDate.setDate(now.getDate() - 7)
            break
          case '30days':
            startDate.setDate(now.getDate() - 30)
            break
          case '90days':
            startDate.setDate(now.getDate() - 90)
            break
        }

        query = query.gte('created_at', startDate.toISOString())
      }

      // Add pagination range
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      return {
        logs: data as (AuditLog & { user: { full_name: string, email: string } })[],
        totalCount: count || 0
      }
    },
    // Keep previous data while fetching new page to prevent flickering
    placeholderData: (previousData) => previousData
  })

  // Extract data safely
  const logs = data?.logs || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Separate stats query
  const { data: stats } = useQuery({
    queryKey: ['audit-stats', dateRange],
    queryFn: async () => {
      // Simple stats for the cards - simplified to just counts to avoid massive grouping queries
      // For a real scalable solution, this should use specific RPCs or materialized views.
      // We will just fetch counts for card display based on date range.

      const getCount = async (filter: any) => {
        let q = supabase.from('audit_logs').select('id', { count: 'exact', head: true })

        // Apply date range
        if (dateRange !== 'all') {
          const now = new Date()
          const startDate = new Date()
          switch (dateRange) {
            case 'today': startDate.setHours(0, 0, 0, 0); break;
            case '7days': startDate.setDate(now.getDate() - 7); break;
            case '30days': startDate.setDate(now.getDate() - 30); break;
            case '90days': startDate.setDate(now.getDate() - 90); break;
          }
          q = q.gte('created_at', startDate.toISOString())
        }

        if (filter.action) q = q.eq('action', filter.action)
        if (filter.entity_type) q = q.eq('entity_type', filter.entity_type)
        if (filter.user_action) q = q.not('user_id', 'is', null) // rough proxy

        const { count } = await q
        return count || 0
      }

      const [total, userActions, docAccess, securityEvents] = await Promise.all([
        getCount({}),
        getCount({ user_action: true }),
        getCount({ entity_type: 'document' }), // simplified
        getCount({ action: 'login' }) // simplified
      ])

      return { total, userActions, docAccess, securityEvents }
    },
    staleTime: 60000 // Cache stats for 1 minute
  })


  const exportLogs = async () => {
    // Export needs to fetch ALL data for the current filter, ignoring pagination
    // Limit to reasonable amount (e.g. 1000) to prevent crash
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
            *,
            user:profiles!user_id(full_name, email)
            `)
        .order('created_at', { ascending: false })
        .limit(1000) // Safety limit

      // Apply same filters...
      if (searchTerm) query = query.or(`action.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`)
      if (actionFilter !== 'all') query = query.eq('action', actionFilter)
      if (targetFilter !== 'all') query = query.eq('entity_type', targetFilter)
      // ... date logic ...
      if (dateRange !== 'all') {
        const now = new Date()
        const startDate = new Date()
        switch (dateRange) {
          case 'today': startDate.setHours(0, 0, 0, 0); break;
          case '7days': startDate.setDate(now.getDate() - 7); break;
          case '30days': startDate.setDate(now.getDate() - 30); break;
          case '90days': startDate.setDate(now.getDate() - 90); break;
        }
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data: exportData, error } = await query
      if (error) throw error
      if (!exportData) return
      const exportRows = exportData as AuditLogWithUser[]

      const csvContent = [
        [
          t('audit_logs.export_headers.date'),
          t('audit_logs.export_headers.user'),
          t('audit_logs.export_headers.action'),
          t('audit_logs.export_headers.entity_type'),
          t('audit_logs.export_headers.entity_id'),
          t('audit_logs.export_headers.details'),
          t('audit_logs.export_headers.ip_address')
        ],
        ...exportRows.map(log => [
          new Date(log.created_at).toLocaleString(),
          (Array.isArray(log.user) ? log.user[0]?.full_name : log.user?.full_name) || 'System',
          log.action,
          log.entity_type,
          log.entity_id,
          JSON.stringify(log.details).replace(/,/g, ';'), // Escape commas
          log.ip_address || ''
        ])
      ].map(e => e.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit_logs.title')}
        description={t('audit_logs.description')}
        actions={
          <Button onClick={exportLogs} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            <Download className="w-4 h-4 me-2" />
            {t('audit_logs.export')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.total_activities')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.user_actions')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.userActions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.document_access')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.docAccess || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.security_events')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.securityEvents || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('audit_logs.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('audit_logs.search_placeholder')}
                value={searchTerm}
                onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                className="w-full ps-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={(val) => handleFilterChange(setActionFilter, val)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue placeholder={t('audit_logs.action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit_logs.actions.all')}</SelectItem>
                <SelectItem value="create">{t('audit_logs.actions.create')}</SelectItem>
                <SelectItem value="update">{t('audit_logs.actions.update')}</SelectItem>
                <SelectItem value="delete">{t('audit_logs.actions.delete')}</SelectItem>
                <SelectItem value="login">{t('audit_logs.actions.login')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetFilter} onValueChange={(val) => handleFilterChange(setTargetFilter, val)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue placeholder={t('audit_logs.entity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit_logs.entities.all')}</SelectItem>
                <SelectItem value="user">{t('audit_logs.entities.user')}</SelectItem>
                <SelectItem value="document">{t('audit_logs.entities.document')}</SelectItem>
                <SelectItem value="role">{t('audit_logs.entities.role')}</SelectItem>
                <SelectItem value="department">{t('audit_logs.entities.department')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(val) => handleFilterChange(setDateRange, val)}>
              <SelectTrigger className="w-[180px]">
                <Clock className="w-4 h-4 me-2" />
                <SelectValue placeholder={t('audit_logs.date_range')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('audit_logs.today')}</SelectItem>
                <SelectItem value="7days">{t('audit_logs.last_7_days')}</SelectItem>
                <SelectItem value="30days">{t('audit_logs.last_30_days')}</SelectItem>
                <SelectItem value="90days">{t('audit_logs.last_90_days')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t('audit_logs.audit_trail')}</CardTitle>
          <div className="text-xs text-muted-foreground mr-2">
            Total Records: {totalCount}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">
              {t('audit_logs.loading')}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('audit_logs.date_range')}</TableHead>
                      <TableHead>{t('audit_logs.action')}</TableHead>
                      <TableHead>{t('audit_logs.entity')}</TableHead>
                      <TableHead>{t('audit_logs.details')}</TableHead>
                      <TableHead>{t('audit_logs.user_ip')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={actionColors[log.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}
                            variant="secondary"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{log.entity_type}</span>
                            {log.entity_id && (
                              <span className="text-xs text-gray-500 font-mono">
                                #{log.entity_id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md text-sm text-gray-600">
                            {log.action === 'update' && log.changes ? (
                              <div className="space-y-1">
                                {Object.entries(log.changes).map(([key, change]: [string, any]) => (
                                  <div key={key} className="text-xs">
                                    <span className="font-medium">{key}:</span>{' '}
                                    <span className="text-red-500 line-through">{String(change.old)}</span>
                                    {' → '}
                                    <span className="text-green-600">{String(change.new)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-[100px]">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="font-medium">
                              {log.user?.full_name || 'System'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {log.ip_address}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          {t('audit_logs.no_logs')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalCount > 0 && (
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Show</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(val) => {
                        setPageSize(Number(val))
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>entries</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 mr-2">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

