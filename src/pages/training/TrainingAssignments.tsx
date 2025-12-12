import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus,
  Users,
  Building,
  MapPin,
  Trash2,
  Edit,
  Repeat,
  Search,
  Bell
} from 'lucide-react'
import type {
  TrainingModule,
  TrainingAssignment,
  Profile,
  Department,
  Property
} from '@/lib/types'
import { useTranslation } from 'react-i18next'

// Extended interfaces for assignment data
interface AssignmentWithExtra extends Omit<TrainingAssignment, 'auto_enroll' | 'recurring_type'> {
  recurring_type?: 'none' | 'monthly' | 'quarterly'
  auto_enroll?: boolean
}

interface UpdatePayload {
  deadline?: string
  recurring_type?: 'none' | 'monthly' | 'quarterly'
  auto_enroll?: boolean
}

type AssignmentStatus = 'active' | 'completed' | 'overdue' | 'due_soon'
type TargetType = 'all' | 'users' | 'departments' | 'properties'

interface AssignmentForm {
  module_id: string
  target_type: TargetType
  target_users: string[]
  target_departments: string[]
  target_properties: string[]
  deadline: Date | null
  recurring_type: 'none' | 'monthly' | 'quarterly'
  auto_enroll: boolean
}

export default function TrainingAssignments() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [targetFilter, setTargetFilter] = useState<string>('all')
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([])
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<TrainingAssignment | null>(null)

  // Form state
  const [formData, setFormData] = useState<AssignmentForm>({
    module_id: '',
    target_type: 'all',
    target_users: [],
    target_departments: [],
    target_properties: [],
    deadline: null,
    recurring_type: 'none',
    auto_enroll: false
  })

  // Fetch data
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training_modules(id, title, description),
          profiles!training_assignments_assigned_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (TrainingAssignment & {
        training_modules: TrainingModule
        profiles: Profile
      })[]
    }
  })

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

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
    enabled: formData.target_type === 'users'
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Department[]
    },
    enabled: formData.target_type === 'departments'
  })

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Property[]
    },
    enabled: formData.target_type === 'properties'
  })

  // Mutations
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentForm) => {
      if (!data.module_id) throw new Error('Module is required')
      if (!data.deadline) throw new Error('Deadline is required')

      const payload = {
        training_module_id: data.module_id,
        assigned_to_all: data.target_type === 'all',
        assigned_to_user_id: data.target_type === 'users' ? data.target_users : null,
        assigned_to_department_id: data.target_type === 'departments' ? data.target_departments : null,
        assigned_to_property_id: data.target_type === 'properties' ? data.target_properties : null,
        deadline: data.deadline.toISOString(),
        recurring_type: data.recurring_type,
        auto_enroll: data.auto_enroll,
        assigned_by: profile?.id,
        created_by_role: 'admin'
      }

      const { error } = await supabase.from('training_assignments').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      setShowAssignmentDialog(false)
      resetForm()
      alert(t('assignmentCreated'))
    }
  })

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<AssignmentForm> }) => {
      const payload: UpdatePayload = {}

      if (data.deadline) payload.deadline = data.deadline.toISOString()
      if (data.recurring_type) payload.recurring_type = data.recurring_type
      if (data.auto_enroll !== undefined) payload.auto_enroll = data.auto_enroll

      const { error } = await supabase
        .from('training_assignments')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      setShowAssignmentDialog(false)
      setEditingAssignment(null)
      resetForm()
      alert(t('assignmentUpdated'))
    }
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_assignments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      alert(t('assignmentDeleted'))
    }
  })

  const sendReminderMutation = useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      // This would integrate with your notification system
      // For now, just update the reminder_sent flag
      const { error } = await supabase
        .from('training_assignments')
        .update({ reminder_sent: true })
        .in('id', assignmentIds)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      alert(t('remindersSent'))
    }
  })

  // Helper functions
  const resetForm = () => {
    setFormData({
      module_id: '',
      target_type: 'all',
      target_users: [],
      target_departments: [],
      target_properties: [],
      deadline: null,
      recurring_type: 'none',
      auto_enroll: false
    })
  }

  const handleEdit = (assignment: TrainingAssignment & { training_modules: TrainingModule }) => {
    setEditingAssignment(assignment)
    setFormData({
      module_id: assignment.training_module_id,
      target_type: assignment.assigned_to_all ? 'all' :
        assignment.assigned_to_user_id ? 'users' :
          assignment.assigned_to_department_id ? 'departments' : 'properties',
      target_users: Array.isArray(assignment.assigned_to_user_id) ? assignment.assigned_to_user_id : [],
      target_departments: Array.isArray(assignment.assigned_to_department_id) ? assignment.assigned_to_department_id : [],
      target_properties: Array.isArray(assignment.assigned_to_property_id) ? assignment.assigned_to_property_id : [],
      deadline: assignment.deadline ? new Date(assignment.deadline) : null,
      recurring_type: (assignment as AssignmentWithExtra).recurring_type || 'none',
      auto_enroll: (assignment as AssignmentWithExtra).auto_enroll || false
    })
    setShowAssignmentDialog(true)
  }

  const handleDelete = (id: string) => {
    if (confirm(t('confirmAssignmentDelete'))) {
      deleteAssignmentMutation.mutate(id)
    }
  }

  const handleBulkDelete = () => {
    if (selectedAssignments.length === 0) return
    if (confirm(t('confirmBulkDelete'))) {
      selectedAssignments.forEach(id => deleteAssignmentMutation.mutate(id))
      setSelectedAssignments([])
    }
  }

  const handleSendReminders = () => {
    const overdueIds = assignments
      ?.filter(a => a.deadline && new Date(a.deadline) < new Date())
      .map(a => a.id) || []

    if (overdueIds.length === 0) {
      alert(t('noAssignments')) // Reusing this key or create new one
      return
    }

    sendReminderMutation.mutate(overdueIds)
  }

  const handleSubmit = () => {
    if (editingAssignment) {
      updateAssignmentMutation.mutate({
        id: editingAssignment.id,
        data: formData
      })
    } else {
      createAssignmentMutation.mutate(formData)
    }
  }

  const getAssignmentStatus = (assignment: TrainingAssignment): AssignmentStatus => {
    if (!assignment.deadline) return 'active'

    const now = new Date()
    const deadline = new Date(assignment.deadline)
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

  const getTargetIcon = (assignment: TrainingAssignment) => {
    if (assignment.assigned_to_all) return <Users className="w-4 h-4" />
    if (assignment.assigned_to_user_id) return <Users className="w-4 h-4" />
    if (assignment.assigned_to_department_id) return <Building className="w-4 h-4" />
    if (assignment.assigned_to_property_id) return <MapPin className="w-4 h-4" />
    return <Users className="w-4 h-4" />
  }

  const getTargetLabel = (assignment: TrainingAssignment) => {
    if (assignment.assigned_to_all) return t('allUsers')
    if (assignment.assigned_to_user_id) return t('countUsers', { count: Array.isArray(assignment.assigned_to_user_id) ? assignment.assigned_to_user_id.length : 1 })
    if (assignment.assigned_to_department_id) return t('countDepartments', { count: Array.isArray(assignment.assigned_to_department_id) ? assignment.assigned_to_department_id.length : 1 })
    if (assignment.assigned_to_property_id) return t('countProperties', { count: Array.isArray(assignment.assigned_to_property_id) ? assignment.assigned_to_property_id.length : 1 })
    return t('allUsers')
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')
  }

  // Filter assignments
  const filteredAssignments = assignments?.filter(assignment => {
    const matchesSearch = !search ||
      assignment.training_modules.title.toLowerCase().includes(search.toLowerCase())

    const status = getAssignmentStatus(assignment)
    const matchesStatus = statusFilter === 'all' || status === statusFilter

    const matchesTarget = targetFilter === 'all' ||
      (targetFilter === 'all' && assignment.assigned_to_all) ||
      (targetFilter === 'users' && assignment.assigned_to_user_id) ||
      (targetFilter === 'departments' && assignment.assigned_to_department_id) ||
      (targetFilter === 'properties' && assignment.assigned_to_property_id)

    return matchesSearch && matchesStatus && matchesTarget
  }) || []

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('assignments')}
        description={isRTL ? 'إدارة مهام التدريب والمواعيد النهائية والتذكيرات' : 'Manage training assignments, deadlines, and reminders'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              size="sm"
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
            >
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm" onClick={handleSendReminders}>
              <Bell className="w-4 h-4 mr-2" />
              {t('sendReminders')}
            </Button>
            <Button onClick={() => setShowAssignmentDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('createAssignment')}
            </Button>
          </div>
        }
      />

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('searchAssignments')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 ${isRTL ? 'pr-10' : ''}`}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="completed">{t('completed')}</SelectItem>
                <SelectItem value="overdue">{t('overdue')}</SelectItem>
                <SelectItem value="due_soon">{t('dueSoon')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder={t('filterByTarget')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTargets')}</SelectItem>
                <SelectItem value="all">{t('allUsers')}</SelectItem>
                <SelectItem value="users">{t('specificUsers')}</SelectItem>
                <SelectItem value="departments">{t('departments')}</SelectItem>
                <SelectItem value="properties">{t('properties')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedAssignments.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedAssignments.length} {isRTL ? 'محدد' : 'selected'}
                </span>
                <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setSelectedAssignments([])}>
                  {t('cancelSelection')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('deleteSelected')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('assignments')}</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedAssignments.length === filteredAssignments.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedAssignments(filteredAssignments.map(a => a.id))
                  } else {
                    setSelectedAssignments([])
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">{t('selectAll')}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-700">{t('loading')}</div>
          ) : filteredAssignments.length > 0 ? (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAssignments.includes(assignment.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssignments([...selectedAssignments, assignment.id])
                        } else {
                          setSelectedAssignments(selectedAssignments.filter(id => id !== assignment.id))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      {getTargetIcon(assignment)}
                      <div>
                        <h3 className="font-medium">{assignment.training_modules.title}</h3>
                        <p className="text-sm text-gray-600">
                          {getTargetLabel(assignment)}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          <span>{t('assignedOn')}: {formatDate(new Date(assignment.created_at))}</span>
                          {assignment.deadline && (
                            <span>{t('dueDate')}: {formatDate(new Date(assignment.deadline))}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(getAssignmentStatus(assignment))}>
                      {t(getAssignmentStatus(assignment))}
                    </Badge>
                    {(assignment as AssignmentWithExtra).recurring_type && (assignment as AssignmentWithExtra).recurring_type !== 'none' && (
                      <Badge className="bg-hotel-navy text-white border border-hotel-navy rounded-md">
                        <Repeat className="w-3 h-3 mr-1" />
                        {t((assignment as AssignmentWithExtra).recurring_type!)}
                      </Badge>
                    )}
                    {(assignment as AssignmentWithExtra).reminder_sent && (
                      <Badge className="bg-hotel-navy text-white border border-hotel-navy rounded-md">
                        <Bell className="w-3 h-3 mr-1" />
                        {t('reminderSent')}
                      </Badge>
                    )}
                    <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors" onClick={() => handleEdit(assignment)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" className="bg-red-500 text-white hover:bg-red-600 border border-red-500 rounded-md transition-colors" onClick={() => handleDelete(assignment.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-700">{t('noAssignments')}</div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? t('editAssignment') : t('createAssignment')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('selectModule')}</Label>
              <Select
                value={formData.module_id}
                onValueChange={(value) => setFormData({ ...formData, module_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectModule')} />
                </SelectTrigger>
                <SelectContent>
                  {modules?.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('assignTo')}</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value: TargetType) => setFormData({ ...formData, target_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allUsers')}</SelectItem>
                  <SelectItem value="users">{t('specificUsers')}</SelectItem>
                  <SelectItem value="departments">{t('departments')}</SelectItem>
                  <SelectItem value="properties">{t('properties')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.target_type === 'users' && (
              <div className="space-y-2">
                <Label>{t('specificUsers')}</Label>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {users?.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={user.id}
                        checked={formData.target_users.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              target_users: [...formData.target_users, user.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              target_users: formData.target_users.filter(id => id !== user.id)
                            })
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={user.id} className="text-sm">
                        {user.full_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.target_type === 'departments' && (
              <div className="space-y-2">
                <Label>{t('departments')}</Label>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {departments?.map((dept) => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={dept.id}
                        checked={formData.target_departments.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              target_departments: [...formData.target_departments, dept.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              target_departments: formData.target_departments.filter(id => id !== dept.id)
                            })
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={dept.id} className="text-sm">
                        {dept.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.target_type === 'properties' && (
              <div className="space-y-2">
                <Label>{t('properties')}</Label>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                  {properties?.map((prop) => (
                    <div key={prop.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={prop.id}
                        checked={formData.target_properties.includes(prop.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              target_properties: [...formData.target_properties, prop.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              target_properties: formData.target_properties.filter(id => id !== prop.id)
                            })
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={prop.id} className="text-sm">
                        {prop.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('deadline')}</Label>
              <Input
                type="date"
                value={formData.deadline ? formData.deadline.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value ? new Date(e.target.value) : null })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('recurringType')}</Label>
              <Select
                value={formData.recurring_type}
                onValueChange={(value: 'none' | 'monthly' | 'quarterly') =>
                  setFormData({ ...formData, recurring_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('none')}</SelectItem>
                  <SelectItem value="monthly">{t('monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('quarterly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('autoEnroll')}</Label>
              <input
                type="checkbox"
                checked={formData.auto_enroll}
                onChange={(e) => setFormData({ ...formData, auto_enroll: e.target.checked })}
                className="w-4 h-4"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setShowAssignmentDialog(false)}>
                {t('cancel')}
              </Button>
              <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors" onClick={handleSubmit} disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}>
                {createAssignmentMutation.isPending || updateAssignmentMutation.isPending ? t('loading') :
                  editingAssignment ? t('update') : t('create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
