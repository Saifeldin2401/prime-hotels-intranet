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
import { Download, Filter, Search, Activity, User, FileText, Shield, Clock } from 'lucide-react'
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

export default function AuditLogs() {
  const { t } = useTranslation('admin')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [targetFilter, setTargetFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30days')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', searchTerm, actionFilter, targetFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!user_id(full_name, email)
        `)
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
        let startDate = new Date()

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

      const { data, error } = await query

      if (error) throw error
      return data as (AuditLog & { user: { full_name: string, email: string } })[]
    }
  })

  // Calculate stats
  const stats = {
    total: logs?.length || 0,
    byAction: logs?.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byType: logs?.reduce((acc, log) => {
      acc[log.entity_type] = (acc[log.entity_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const exportLogs = () => {
    if (!logs) return

    const csvContent = [
      ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'],
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user?.full_name || 'System',
        log.action,
        log.entity_type,
        log.entity_id,
        JSON.stringify(log.details),
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
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.user_actions')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.byType || {})
                .filter(([key]) => key === 'user')
                .reduce((acc, [, val]) => acc + val, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.document_access')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.byType || {})
                .filter(([key]) => key === 'document' || key === 'sop')
                .reduce((acc, [, val]) => acc + val, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('audit_logs.security_events')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.byAction || {})
                .filter(([key]) => key === 'login' || key === 'failed_login')
                .reduce((acc, [, val]) => acc + val, 0)}
            </div>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 rtl:left-auto rtl:right-3" />
              <Input
                placeholder={t('audit_logs.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue placeholder={t('audit_logs.action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit_logs.all_actions')}</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue placeholder={t('audit_logs.entity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit_logs.all_entities')}</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
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
        <CardHeader>
          <CardTitle>{t('audit_logs.audit_trail')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">
              {t('audit_logs.loading')}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('audit_logs.date_range')}</TableHead>
                    <TableHead>{t('audit_logs.action')}</TableHead>
                    <TableHead>{t('audit_logs.entity')}</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>User / IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
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
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
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

                  {logs?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {t('audit_logs.no_logs')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
