
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBulkNotifications } from '@/hooks/useBulkNotifications'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Users,
  Building,
  MapPin,
  Trash2,
  Edit,
  Search,
  Bell,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Download,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrainingModule } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'

// Interface for learning_assignments table
interface LearningAssignment {
  id: string
  target_type: 'all' | 'everyone' | 'user' | 'department' | 'property'
  target_id: string | null
  content_type: string
  content_id: string
  assigned_by: string | null
  due_date: string | null
  valid_from: string
  priority: string
  created_at: string
  // Joined data
  training_modules?: TrainingModule
  profiles?: { id: string; full_name: string }
}

type AssignmentStatus = 'active' | 'completed' | 'overdue' | 'due_soon'

export default function TrainingAssignments() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { notifyTrainingAssigned } = useNotificationTriggers()

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)

  // Progress Data
  const { data: progressData, isLoading: isLoadingProgress } = useLearningProgress()

  // Advanced Filters
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterDept, setFilterDept] = useState<string | null>(null)
  const [filterProp, setFilterProp] = useState<string | null>(null)

  // Form state
  const [formModuleId, setFormModuleId] = useState('')
  const [formTargetType, setFormTargetType] = useState<'all' | 'users' | 'departments' | 'properties'>('all')
  const [formTargetIds, setFormTargetIds] = useState<string[]>([])
  const [formDeadline, setFormDeadline] = useState('')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')

  // Fetch assignments
  const { data: rawAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['learning-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignments')
        .select('*')
        .eq('content_type', 'module')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // Fetch Modules
  const { data: modules } = useQuery({
    queryKey: ['training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title, description')
        .eq('is_active', true)
        .order('title')
      if (error) throw error
      return data as TrainingModule[]
    }
  })

  // Combine assignments with modules
  const assignments = useMemo(() => {
    if (!rawAssignments || !modules) return []
    return rawAssignments.map(a => ({
      ...a,
      training_modules: modules.find(m => m.id === a.content_id)
    })) as LearningAssignment[]
  }, [rawAssignments, modules])

  // Lookups
  const { data: userDepartments } = useQuery({
    queryKey: ['user-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_departments').select('user_id, department:departments(id, name)')
      if (error) throw error
      return data
    }
  })

  const { data: userProperties } = useQuery({
    queryKey: ['user-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_properties').select('user_id, property:properties(id, name)')
      if (error) throw error
      return data
    }
  })

  // Basic lookups
  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
      if (error) throw error
      return data || []
    }
  })

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, name, property:properties(name)').order('name')
      if (error) throw error
      // Format with property name for disambiguation
      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.property?.name ? `${d.name} (${d.property.name})` : d.name,
        propertyName: d.property?.name,
        rawName: d.name
      }))
    }
  })

  const { data: properties } = useQuery({
    queryKey: ['properties-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data || []
    }
  })

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!formModuleId) throw new Error(t('moduleRequired'))

      const assignments: any[] = []
      const typeMap: Record<string, string> = {
        users: 'user',
        departments: 'department',
        properties: 'property'
      }

      if (formTargetType === 'all') {
        assignments.push({
          target_type: 'everyone',
          target_id: null,
          content_type: 'module',
          content_id: formModuleId,
          assigned_by: profile?.id,
          due_date: formDeadline || null,
          valid_from: new Date().toISOString(),
          priority: 'normal'
        })
      } else {
        formTargetIds.forEach(id => {
          assignments.push({
            target_type: typeMap[formTargetType],
            target_id: id,
            content_type: 'module',
            content_id: formModuleId,
            assigned_by: profile?.id,
            due_date: formDeadline || null,
            valid_from: new Date().toISOString(),
            priority: 'normal'
          })
        })
      }

      const { error } = await supabase
        .from('learning_assignments')
        .insert(assignments)
      if (error) throw error

      // Send bulk notifications to affected users
      const moduleTitle = modules?.find(m => m.id === formModuleId)?.title || t('unknownModule')
      const notificationData = {
        title: t('notifications.newAssignmentTitle'),
        message: t('notifications.newAssignmentMessage', { title: moduleTitle }),
        moduleId: formModuleId,
        deadline: formDeadline || undefined
      }

      let userIdsToNotify: string[] = []

      if (formTargetType === 'all') {
        // Get all active user IDs
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true)
        userIdsToNotify = allUsers?.map(u => u.id) || []
      } else if (formTargetType === 'users') {
        userIdsToNotify = formTargetIds
      } else if (formTargetType === 'departments') {
        // Resolve users from departments
        const { data: deptUsers } = await supabase
          .from('user_departments')
          .select('user_id')
          .in('department_id', formTargetIds)
        userIdsToNotify = [...new Set(deptUsers?.map(d => d.user_id) || [])]
      } else if (formTargetType === 'properties') {
        // Resolve users from properties
        const { data: propUsers } = await supabase
          .from('user_properties')
          .select('user_id')
          .in('property_id', formTargetIds)
        userIdsToNotify = [...new Set(propUsers?.map(p => p.user_id) || [])]
      }

      // Use bulk notification system for 10+ users, direct for smaller groups
      if (userIdsToNotify.length >= 10) {
        // Queue for bulk processing
        const { data: session } = await supabase.auth.getSession()
        if (session?.session?.access_token) {
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-notification-processor`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.session.access_token}`
              },
              body: JSON.stringify({
                action: 'create_batch',
                userIds: userIdsToNotify,
                notificationType: 'training_assigned',
                notificationData
              })
            })
            console.log(`Queued ${userIdsToNotify.length} notifications for bulk processing`)
          } catch (err) {
            console.error('Bulk notification error:', err)
          }
        }
      } else {
        // Small group - send directly
        for (const userId of userIdsToNotify) {
          await notifyTrainingAssigned(userId, formModuleId, moduleTitle, formDeadline || undefined)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
      setShowAssignmentDialog(false)
      resetForm()
    }
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_assignments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
    }
  })

  const resetForm = () => {
    setFormModuleId('')
    setFormTargetType('all')
    setFormTargetIds([])
    setFormDeadline('')
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmAssignmentDelete'))) {
      deleteAssignmentMutation.mutate(id)
    }
  }

  // Helpers
  const getAssignmentStatus = (assignment: LearningAssignment): AssignmentStatus => {
    if (!assignment.due_date) return 'active'
    const now = new Date()
    const deadline = new Date(assignment.due_date)
    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 7) return 'due_soon'
    return 'active'
  }

  const getStatusColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'due_soon': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return <Users className="w-4 h-4" />
      case 'user': return <Users className="w-4 h-4" />
      case 'department': return <Building className="w-4 h-4" />
      case 'property': return <MapPin className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getTargetLabel = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return t('allUsers')
      case 'user': return t('specificUser')
      case 'department': return t('department')
      case 'property': return t('property')
      default: return t('allUsers')
    }
  }

  const getTargetRawLabel = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return t('everyone')
      case 'user': return t('specificUser')
      case 'department': return t('department')
      case 'property': return t('property')
      default: return t('everyone')
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')
  }

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments?.filter(assignment => {
      const moduleTitle = assignment.training_modules?.title || ''
      const matchesSearch = !search || moduleTitle.toLowerCase().includes(search.toLowerCase())
      const status = getAssignmentStatus(assignment)
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesSearch && matchesStatus
    }) || []
  }, [assignments, search, statusFilter])

  // Filtered Progress Data
  const filteredProgress = useMemo(() => {
    if (!progressData) return []
    return progressData.filter(item => {
      // Status Filter
      if (filterStatus && filterStatus !== 'all' && item.status !== filterStatus) return false

      // Resolve User Context
      const userDeptData = userDepartments?.find(ud => ud.user_id === item.user_id)?.department
      const userPropData = userProperties?.find(up => up.user_id === item.user_id)?.property

      const userDeptId = Array.isArray(userDeptData) ? userDeptData[0]?.id : (userDeptData as any)?.id
      const userPropId = Array.isArray(userPropData) ? userPropData[0]?.id : (userPropData as any)?.id

      // Department Filter
      if (filterDept && userDeptId !== filterDept) return false

      // Property Filter
      if (filterProp && userPropId !== filterProp) return false

      return true
    })
  }, [progressData, filterStatus, filterDept, filterProp, userDepartments, userProperties])

  // Progress Metrics
  const progressMetrics = useMemo(() => {
    if (!progressData) return { total: 0, completed: 0, in_progress: 0, overdue: 0 }
    return {
      total: progressData.length,
      completed: progressData.filter(p => p.status === 'completed').length,
      in_progress: progressData.filter(p => p.status === 'in_progress').length,
      overdue: progressData.filter(p => p.status === 'overdue').length
    }
  }, [progressData])

  // Get unique properties from departments
  const departmentProperties = useMemo(() => {
    if (!departments) return []
    const props = new Set<string>()
    departments.forEach(d => {
      // Extract property name from the formatted name "Dept (Property)"
      const match = d.name.match(/\((.+)\)$/)
      if (match) props.add(match[1])
    })
    return Array.from(props).sort()
  }, [departments])

  // Form List Items
  const currentListItems = useMemo(() => {
    switch (formTargetType) {
      case 'users': return users?.map(u => ({ id: u.id, name: u.full_name || u.email })) || []
      case 'departments': {
        if (!departments) return []
        // Filter by property if one is selected
        const filtered = propertyFilter === 'all'
          ? departments
          : departments.filter(d => d.name.includes(`(${propertyFilter})`))
        // Return with clean names (remove property suffix)
        return filtered.map(d => ({
          id: d.id,
          name: d.name.replace(/\s*\(.+\)$/, '')
        }))
      }
      case 'properties': return properties?.map(p => ({ id: p.id, name: p.name })) || []
      default: return []
    }
  }, [formTargetType, users, departments, properties, propertyFilter])

  const handleExport = () => {
    if (!filteredProgress.length) return

    const headers = [
      t('employee'),
      t('department') + '/' + t('property'),
      t('module'),
      t('status'),
      t('progress'),
      t('score'),
      t('lastAccess')
    ]
    const csvContent = [
      headers.join(','),
      ...filteredProgress.map(item => {
        const deptData = userDepartments?.find(d => d.user_id === item.user_id)?.department
        const propData = userProperties?.find(p => p.user_id === item.user_id)?.property
        const deptName = Array.isArray(deptData) ? deptData[0]?.name : (deptData as any)?.name
        const propName = Array.isArray(propData) ? propData[0]?.name : (propData as any)?.name
        const user = users?.find(u => u.id === item.user_id)
        const moduleTitle = modules?.find(m => m.id === item.content_id)?.title || t('unknownModule')

        return [
          `"${item.profiles?.full_name || user?.full_name || t('unknownUser')}"`,
          `"${deptName || propName || '-'}"`,
          `"${moduleTitle}"`,
          t(item.status),
          `${item.progress_percentage}%`,
          item.score_percentage ? `${item.score_percentage}%` : '-',
          formatDate(item.last_accessed_at || item.created_at)
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `training_progress_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('trainingCenter')}
        description={t('trainingDescription')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/notifications')}
              className="hidden md:flex"
            >
              <Bell className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('batchStatus')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/training/assignments/rules')}
              className="hidden md:flex"
            >
              <Settings className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('autoAssignRules')}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white p-1 border rounded-lg">
          <TabsTrigger value="overview" className="data-[state=active]:bg-hotel-navy data-[state=active]:text-white">
            <BarChart3 className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-hotel-navy data-[state=active]:text-white">
            <Edit className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('manageAssignments')}
          </TabsTrigger>
        </TabsList>

        {/* PROGRESS TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('totalEnrollments')}</p>
                    <h3 className="text-2xl font-bold mt-1">{progressMetrics.total}</h3>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('completed')}</p>
                    <h3 className="text-2xl font-bold mt-1 text-green-600">{progressMetrics.completed}</h3>
                  </div>
                  <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('inProgress')}</p>
                    <h3 className="text-2xl font-bold mt-1 text-yellow-600">{progressMetrics.in_progress}</h3>
                  </div>
                  <div className="h-10 w-10 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('overdue')}</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-600">{progressMetrics.overdue}</h3>
                  </div>
                  <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('employeeProgress')}</CardTitle>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(filterStatus || filterDept || filterProp ? "bg-blue-50 border-blue-200 text-blue-700" : "", isRTL ? "flex-row-reverse" : "")}>
                      <span className={isRTL ? "ml-2" : "mr-2"}>{t('filter')}</span>
                      {(filterStatus || filterDept || filterProp) && (
                        <span className={cn("flex h-2 w-2 rounded-full bg-blue-600", isRTL ? "ml-2" : "mr-2")} />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-[200px] bg-white">
                    <DropdownMenuLabel>{t('filterBy')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Status Sub-menu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('status')}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-white">
                        <DropdownMenuCheckboxItem
                          checked={filterStatus === 'assigned'}
                          onCheckedChange={() => setFilterStatus(filterStatus === 'assigned' ? null : 'assigned')}
                        >
                          {t('assigned')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={filterStatus === 'in_progress'}
                          onCheckedChange={() => setFilterStatus(filterStatus === 'in_progress' ? null : 'in_progress')}
                        >
                          {t('inProgress')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={filterStatus === 'completed'}
                          onCheckedChange={() => setFilterStatus(filterStatus === 'completed' ? null : 'completed')}
                        >
                          {t('completed')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={filterStatus === 'overdue'}
                          onCheckedChange={() => setFilterStatus(filterStatus === 'overdue' ? null : 'overdue')}
                        >
                          {t('overdue')}
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Department Sub-menu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('department')}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto bg-white">
                        {departments?.map(dept => (
                          <DropdownMenuCheckboxItem
                            key={dept.id}
                            checked={filterDept === dept.id}
                            onCheckedChange={() => setFilterDept(filterDept === dept.id ? null : dept.id)}
                          >
                            {dept.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                        {(!departments || departments.length === 0) && (
                          <DropdownMenuItem disabled>{t('noDepartments')}</DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Property Sub-menu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>{t('property')}</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto bg-white">
                        {properties?.map(prop => (
                          <DropdownMenuCheckboxItem
                            key={prop.id}
                            checked={filterProp === prop.id}
                            onCheckedChange={() => setFilterProp(filterProp === prop.id ? null : prop.id)}
                          >
                            {prop.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                        {(!properties || properties.length === 0) && (
                          <DropdownMenuItem disabled>{t('noProperties')}</DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 justify-center"
                      onClick={() => {
                        setFilterStatus(null)
                        setFilterDept(null)
                        setFilterProp(null)
                      }}
                    >
                      {t('resetFilters')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" size="sm" onClick={handleExport} className={isRTL ? "flex-row-reverse" : ""}>
                  <Download className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('exportReport')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingProgress ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-hotel-gold" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? "text-right" : ""}>{t('employee')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>{t('module')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>{t('status')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>{t('progress')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>{t('score')}</TableHead>
                      <TableHead className={isRTL ? "text-right" : ""}>{t('lastAccess')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProgress.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {t('noProgressFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProgress.map((item) => {
                        const deptData = userDepartments?.find(d => d.user_id === item.user_id)?.department
                        const propData = userProperties?.find(p => p.user_id === item.user_id)?.property

                        const deptName = Array.isArray(deptData) ? deptData[0]?.name : (deptData as any)?.name
                        const propName = Array.isArray(propData) ? propData[0]?.name : (propData as any)?.name

                        const user = users?.find(u => u.id === item.user_id)

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.profiles?.full_name || user?.full_name || t('unknownUser')}</span>
                                <span className="text-xs text-gray-500">
                                  {deptName || propName || t('noDept')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {modules?.find(m => m.id === item.content_id)?.title || t('unknownModule')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                item.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                  item.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                    item.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                      'bg-gray-50 text-gray-700 border-gray-200'
                              }>
                                {t(item.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-[150px]">
                              <div className="flex items-center gap-2">
                                <Progress value={item.progress_percentage} className="h-2" />
                                <span className="text-xs text-gray-500">{item.progress_percentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.score_percentage !== undefined && item.score_percentage !== null ? (
                                <span className={`font-bold ${item.passed ? 'text-green-600' : 'text-red-500'}`}>
                                  {Number(item.score_percentage).toFixed(0)}%
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(item.last_accessed_at || item.created_at)}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSIGNMENTS TAB */}
        <TabsContent value="assignments" className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className={cn("absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={t('searchAssignments')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? "pr-10 text-right" : "pl-10"}
              />
            </div>
            <Button onClick={() => setShowAssignmentDialog(true)} className={cn("bg-hotel-navy", isRTL ? "flex-row-reverse" : "")}>
              <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('createAssignment')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingAssignments ? (
              <div className="col-span-3 flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-hotel-gold" />
              </div>
            ) : filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment) => (
                <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                        {t('module')}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDelete(assignment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2 line-clamp-1" title={assignment.training_modules?.title}>
                      {assignment.training_modules?.title || t('unknownModule')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className={cn("flex items-center text-sm text-gray-600", isRTL ? "flex-row-reverse" : "")}>
                        {getTargetIcon(assignment.target_type)}
                        <span className={cn("truncate max-w-[200px]", isRTL ? "mr-2" : "ml-2")} title={getTargetLabel(assignment.target_type)}>
                          {getTargetLabel(assignment.target_type)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span className={cn("flex items-center", isRTL ? "flex-row-reverse" : "")}>
                          <Clock className={cn("w-3 h-3", isRTL ? "ml-1" : "mr-1")} />
                          {formatDate(assignment.created_at)}
                        </span>
                        {assignment.due_date && (
                          <span className={`${new Date(assignment.due_date) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                            {t('due')}: {formatDate(assignment.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 bg-white rounded-lg border border-dashed">
                <div className="mx-auto h-12 w-12 text-gray-300">
                  <Edit className="h-12 w-12" />
                </div>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">{t('noAssignments')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('startAssigning')}</p>
                <div className="mt-6">
                  <Button onClick={() => setShowAssignmentDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createAssignment')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs >

      {/* CREATE DIALOG */}
      {
        showAssignmentDialog && (
          <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
            <DialogContent className="max-w-lg bg-white">
              <DialogHeader>
                <DialogTitle>
                  {t('createAssignment')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('createAssignmentDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>{t('selectModule')}</Label>
                  <select
                    value={formModuleId}
                    onChange={(e) => setFormModuleId(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                  >
                    <option value="">{t('selectModule')}</option>
                    {modules?.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>{t('assignTo')}</Label>
                  <select
                    value={formTargetType}
                    onChange={(e) => {
                      setFormTargetType(e.target.value as any)
                      setFormTargetIds([])
                      setPropertyFilter('all')
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                  >
                    <option value="all">{t('allUsers')}</option>
                    <option value="users">{t('specificEmployees')}</option>
                    <option value="departments">{t('entireDepartments')}</option>
                    <option value="properties">{t('entireProperties')}</option>
                  </select>
                </div>

                {formTargetType === 'departments' && departmentProperties.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('filterByProperty')}</Label>
                    <select
                      value={propertyFilter}
                      onChange={(e) => setPropertyFilter(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                    >
                      <option value="all">{t('allProperties')}</option>
                      {departmentProperties.map(prop => (
                        <option key={prop} value={prop}>{prop}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formTargetType !== 'all' && (
                  <div className="space-y-2">
                    <Label>
                      {formTargetType === 'users' ? t('selectUsers') :
                        formTargetType === 'departments' ? t('selectDepartments') :
                          t('selectProperties')}
                    </Label>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-gray-50">
                      {currentListItems.length > 0 ? (
                        currentListItems.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formTargetIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormTargetIds([...formTargetIds, item.id])
                                } else {
                                  setFormTargetIds(formTargetIds.filter(id => id !== item.id))
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm">{item.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-center py-4 text-gray-500 text-sm">
                          {t('noItemsFound')}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formTargetIds.length} {t('selected')}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('deadline')} ({t('optional')})</Label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
                  />
                </div>

                <div className={cn("flex justify-end gap-3 pt-4 border-t", isRTL ? "flex-row-reverse" : "")}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAssignmentDialog(false)
                      resetForm()
                    }}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={() => createAssignmentMutation.mutate()}
                    disabled={!formModuleId || createAssignmentMutation.isPending || (formTargetType !== 'all' && formTargetIds.length === 0)}
                    className={cn("bg-hotel-navy text-white hover:bg-hotel-navy-light", isRTL ? "flex-row-reverse" : "")}
                  >
                    {createAssignmentMutation.isPending ? (
                      <Loader2 className={cn("w-4 h-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
                    ) : null}
                    {t('create')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    </div >
  )
}
