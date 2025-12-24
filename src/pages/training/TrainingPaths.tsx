import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTrainingProgress } from '@/hooks/useTraining'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  BookOpen,
  Users,
  Target,
  Plus,
  Edit,
  Trash2,
  Briefcase,
  GraduationCap,
  Loader2
} from 'lucide-react'
import type {
  TrainingPath,
  TrainingPathModule,
  UserPathEnrollment,
  TrainingModule
} from '@/lib/types'
import { useTranslation } from 'react-i18next'

type PathType = 'new_hire' | 'department' | 'leadership' | 'compliance' | 'skills'

interface PathForm {
  title: string
  description: string
  path_type: PathType
  estimated_duration_hours: number
  is_mandatory: boolean
  certificate_enabled: boolean
  module_ids: string[]
  target_role?: string | null
  target_department_id?: string | null
  target_property_id?: string | null
  target_user_ids: string[]
}

export default function TrainingPaths() {
  const { profile, primaryRole } = useAuth()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const [activeTab, setActiveTab] = useState('my')
  const isRTL = i18n.dir() === 'rtl'

  // Fetch all user progress to calculate path completion
  const { data: allUserProgress } = useTrainingProgress(profile?.id)

  // State for dialogs
  const [showPathDialog, setShowPathDialog] = useState(false)
  const [editingPath, setEditingPath] = useState<TrainingPath | null>(null)
  const [formData, setFormData] = useState<PathForm>({
    title: '',
    description: '',
    path_type: 'skills',
    estimated_duration_hours: 0,
    is_mandatory: false,
    certificate_enabled: true,
    module_ids: [],
    target_role: null,
    target_department_id: null,
    target_property_id: null,
    target_user_ids: []
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pathToDelete, setPathToDelete] = useState<TrainingPath | null>(null)

  // Fetch all learning paths
  const { data: paths, isLoading: pathsLoading } = useQuery({
    queryKey: ['training-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_paths')
        .select(`
          *,
          training_path_modules(
            sequence,
            training_modules(id, title, description, estimated_duration_minutes)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (TrainingPath & {
        training_path_modules: (TrainingPathModule & {
          training_modules: TrainingModule
        })[]
      })[]
    }
  })

  // Fetch user's path enrollments
  const { data: myEnrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['my-path-enrollments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('user_path_enrollments')
        .select(`
          *,
          training_paths(
            *,
            training_path_modules(
              sequence,
              training_modules(id, title, description, estimated_duration_minutes)
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return data as (UserPathEnrollment & {
        training_paths: TrainingPath & {
          training_path_modules: (TrainingPathModule & {
            training_modules: TrainingModule
          })[]
        }
      })[]
    },
    enabled: !!profile?.id
  })

  // Fetch available modules
  const { data: availableModules } = useQuery({
    queryKey: ['available-training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title, estimated_duration_minutes')
        .eq('is_deleted', false)
      if (error) throw error
      return data as TrainingModule[]
    }
  })

  // Fetch departments for targeting
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
      if (error) throw error
      return data as { id: string; name: string }[]
    }
  })

  // Fetch properties for targeting
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
      if (error) throw error
      return data as { id: string; name: string }[]
    }
  })

  // Fetch active staff for specific targeting
  const { data: staffList } = useQuery({
    queryKey: ['active-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title')
        .eq('is_deleted', false)
        .order('full_name')
      if (error) throw error
      return data as { id: string; full_name: string; job_title: string }[]
    }
  })

  // Create/update path mutation
  const pathMutation = useMutation({
    mutationFn: async (data: PathForm & { id?: string }) => {
      if (data.id) {
        // Update existing path
        const { error } = await supabase
          .from('training_paths')
          .update({
            title: data.title,
            description: data.description,
            path_type: data.path_type,
            estimated_duration_hours: data.estimated_duration_hours,
            is_mandatory: data.is_mandatory,
            certificate_enabled: data.certificate_enabled,
            target_role: data.target_role || null,
            target_department_id: data.target_department_id || null,
            target_property_id: data.target_property_id || null,
            target_user_ids: data.target_user_ids || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
        if (error) throw error

        // Sync modules for update
        await supabase
          .from('training_path_modules')
          .delete()
          .eq('path_id', data.id)

        if (data.module_ids.length > 0) {
          const pathModules = data.module_ids.map((moduleId, index) => ({
            path_id: data.id,
            module_id: moduleId,
            sequence: index + 1,
            is_mandatory: true
          }))
          const { error: modulesError } = await supabase
            .from('training_path_modules')
            .insert(pathModules)
          if (modulesError) throw modulesError
        }
      } else {
        // Create new path
        const { data: newPath, error } = await supabase
          .from('training_paths')
          .insert({
            title: data.title,
            description: data.description,
            path_type: data.path_type,
            estimated_duration_hours: data.estimated_duration_hours,
            is_mandatory: data.is_mandatory,
            certificate_enabled: data.certificate_enabled,
            target_role: data.target_role || null,
            target_department_id: data.target_department_id || null,
            target_property_id: data.target_property_id || null,
            target_user_ids: data.target_user_ids || [],
            created_by: profile?.id
          })
          .select()
          .single()
        if (error) throw error

        // Save modules
        if (newPath && data.module_ids.length > 0) {
          const pathModules = data.module_ids.map((moduleId, index) => ({
            path_id: newPath.id,
            module_id: moduleId,
            sequence: index + 1,
            is_mandatory: true
          }))
          const { error: modulesError } = await supabase
            .from('training_path_modules')
            .insert(pathModules)
          if (modulesError) throw modulesError
        }

        return newPath
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-paths'] })
      setShowPathDialog(false)
      setEditingPath(null)
      resetForm()
      alert(editingPath ? t('pathUpdated') : t('pathCreated'))
    },
    onError: (error) => {
      alert(error.message)
    }
  })

  // Delete path mutation
  const deletePathMutation = useMutation({
    mutationFn: async (pathId: string) => {
      const { error } = await supabase
        .from('training_paths')
        .delete()
        .eq('id', pathId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-paths'] })
      alert(t('pathDeleted'))
    },
    onError: (error) => {
      alert(error.message)
    }
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      path_type: 'skills',
      estimated_duration_hours: 0,
      is_mandatory: false,
      certificate_enabled: true,
      module_ids: [],
      target_role: null,
      target_department_id: null,
      target_property_id: null,
      target_user_ids: []
    })
  }

  const handleEdit = (path: TrainingPath) => {
    setEditingPath(path)
    setFormData({
      title: path.title,
      description: path.description,
      path_type: path.path_type,
      estimated_duration_hours: path.estimated_duration_hours,
      is_mandatory: path.is_mandatory,
      certificate_enabled: path.certificate_enabled,
      module_ids: (path as any).training_path_modules?.map((m: any) => m.module_id) || [],
      target_role: path.target_role || null,
      target_department_id: path.target_department_id || null,
      target_property_id: path.target_property_id || null,
      target_user_ids: path.target_user_ids || []
    })
    setShowPathDialog(true)
  }

  const handleDelete = (path: TrainingPath) => {
    setPathToDelete(path)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (pathToDelete) {
      await deletePathMutation.mutateAsync(pathToDelete.id)
      setPathToDelete(null)
    }
  }

  const handleSubmit = () => {
    if (editingPath) {
      pathMutation.mutate({ ...formData, id: editingPath.id })
    } else {
      pathMutation.mutate(formData)
    }
  }

  const getPathIcon = (pathType: PathType) => {
    switch (pathType) {
      case 'new_hire': return <Users className="w-5 h-5" />
      case 'department': return <Briefcase className="w-5 h-5" />
      case 'leadership': return <GraduationCap className="w-5 h-5" />
      case 'compliance': return <Target className="w-5 h-5" />
      case 'skills': return <BookOpen className="w-5 h-5" />
      default: return <BookOpen className="w-5 h-5" />
    }
  }

  const calculateProgress = (enrollment: any) => {
    if (!enrollment.training_paths?.training_path_modules) return 0
    const modules = enrollment.training_paths.training_path_modules
    if (modules.length === 0) return 0

    if (!allUserProgress) return 0

    // Count completed modules that are part of this path
    const completedCount = modules.filter((m: any) => {
      const progress = allUserProgress.find(p => p.training_id === m.module_id)
      return progress?.status === 'completed'
    }).length

    return Math.round((completedCount / modules.length) * 100)
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('paths')}
        description={t('paths_description')}
        actions={
          <div className="flex items-center gap-2">
            {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
              <Button onClick={() => setShowPathDialog(true)} className={isRTL ? "flex-row-reverse" : ""}>
                <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('createPath')}
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">{t('myPaths')}</TabsTrigger>
          {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
            <TabsTrigger value="all">{t('allPaths')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('myPaths')}</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
                </div>
              ) : myEnrollments && myEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {myEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPathIcon(enrollment.training_paths.path_type)}
                        <div>
                          <h3 className="font-medium">{enrollment.training_paths.title}</h3>
                          <p className="text-sm text-gray-600">
                            {enrollment.training_paths.description}
                          </p>
                          <div className={cn("flex items-center gap-4 mt-2 text-sm text-gray-600", isRTL ? "flex-row-reverse" : "")}>
                            <span>{t('modules')}: {enrollment.training_paths.training_path_modules?.length || 0}</span>
                            <span>{t('estimatedDuration')}: {enrollment.training_paths.estimated_duration_hours}{t('h')}</span>
                            <span>{t('enrolled')}: {new Date(enrollment.enrolled_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                        <div className={isRTL ? "text-left" : "text-right"}>
                          <div className="text-sm font-medium">{calculateProgress(enrollment)}%</div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${calculateProgress(enrollment)}%` }}
                            />
                          </div>
                        </div>
                        <Button size="sm">
                          {calculateProgress(enrollment) > 0 ? t('continuePath') : t('startPath')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title={t('noEnrollments')}
                  description={t('no_enrollments_desc')}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('allPaths')}</CardTitle>
              </CardHeader>
              <CardContent>
                {pathsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
                  </div>
                ) : paths && paths.length > 0 ? (
                  <div className="space-y-4">
                    {paths.map((path) => (
                      <div key={path.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getPathIcon(path.path_type)}
                          <div>
                            <h3 className="font-medium">{path.title}</h3>
                            <p className="text-sm text-gray-600">{path.description}</p>
                            <div className={cn("flex items-center gap-4 mt-2 text-sm text-gray-600", isRTL ? "flex-row-reverse" : "")}>
                              <span>{t('modules')}: {path.training_path_modules?.length || 0}</span>
                              <span>{t('estimatedDuration')}: {path.estimated_duration_hours}{t('h')}</span>
                              {path.is_mandatory && (
                                <Badge className="bg-hotel-gold text-white border border-hotel-gold rounded-md">{t('mandatory')}</Badge>
                              )}
                              {path.certificate_enabled && (
                                <Badge className="bg-hotel-navy text-white border border-hotel-navy rounded-md">{t('certificate')}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors" onClick={() => handleEdit(path)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" className="bg-red-500 text-white hover:bg-red-600 border border-red-500 rounded-md transition-colors" onClick={() => handleDelete(path)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title={t('noPaths')}
                    description={t('no_paths_desc')}
                    action={{
                      label: t('newPath'),
                      onClick: () => setShowPathDialog(true),
                      icon: Plus
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Path Creation/Edit Dialog */}
      <Dialog open={showPathDialog} onOpenChange={setShowPathDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPath ? t('editPath') : t('createPath')}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">{t('general')}</TabsTrigger>
              <TabsTrigger value="modules">{t('modules')}</TabsTrigger>
              <TabsTrigger value="targeting">{t('targeting')}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className={cn("space-y-4 pt-4", isRTL ? "text-right" : "text-left")}>
              <div className="space-y-2">
                <Label>{t('pathTitle')}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('enter_path_title')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('pathDescription')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('enter_path_description')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('pathType')}</Label>
                  <Select
                    value={formData.path_type}
                    onValueChange={(value: PathType) => setFormData({ ...formData, path_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_hire">{t('newHire')}</SelectItem>
                      <SelectItem value="department">{t('department')}</SelectItem>
                      <SelectItem value="leadership">{t('leadership')}</SelectItem>
                      <SelectItem value="compliance">{t('compliance')}</SelectItem>
                      <SelectItem value="skills">{t('skills')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('estimatedDuration')} ({t('hours')})</Label>
                  <Input
                    type="number"
                    value={formData.estimated_duration_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={cn("flex gap-4", isRTL ? "flex-row-reverse" : "")}>
                <div className={cn("flex items-center", isRTL ? "space-x-reverse space-x-2" : "space-x-2")}>
                  <input
                    type="checkbox"
                    id="mandatory"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="mandatory">{t('mandatory')}</Label>
                </div>

                <div className={cn("flex items-center", isRTL ? "space-x-reverse space-x-2" : "space-x-2")}>
                  <input
                    type="checkbox"
                    id="certificate"
                    checked={formData.certificate_enabled}
                    onChange={(e) => setFormData({ ...formData, certificate_enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="certificate">{t('certificateEnabled')}</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modules" className={cn("space-y-4 pt-4", isRTL ? "text-right" : "text-left")}>
              <div className="space-y-2">
                <Label>{t('selectModules')}</Label>
                <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-2">
                  {availableModules?.map(module => (
                    <div key={module.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.module_ids.includes(module.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, module_ids: [...formData.module_ids, module.id] })
                            } else {
                              setFormData({ ...formData, module_ids: formData.module_ids.filter(id => id !== module.id) })
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">{module.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {module.estimated_duration_minutes} {t('min')}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 italic">
                  * {t('modulesOrderHint')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="targeting" className={cn("space-y-4 pt-4", isRTL ? "text-right" : "text-left")}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('targetHotel')}</Label>
                  <Select
                    value={formData.target_property_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, target_property_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectAllHotels')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('allHotels')}</SelectItem>
                      {properties?.map(prop => (
                        <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('targetDepartment')}</Label>
                  <Select
                    value={formData.target_department_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, target_department_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('allDepartments')}</SelectItem>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('targetRole')}</Label>
                <Select
                  value={formData.target_role || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, target_role: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('everyone')}</SelectItem>
                    <SelectItem value="staff">{t('staff')}</SelectItem>
                    <SelectItem value="department_head">{t('departmentHead')}</SelectItem>
                    <SelectItem value="property_manager">{t('propertyManager')}</SelectItem>
                    <SelectItem value="property_hr">{t('propertyHR')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('specificEmployees')} ({formData.target_user_ids.length})</Label>
                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-1">
                  {staffList?.map(staff => (
                    <div key={staff.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={formData.target_user_ids.includes(staff.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, target_user_ids: [...formData.target_user_ids, staff.id] })
                          } else {
                            setFormData({ ...formData, target_user_ids: formData.target_user_ids.filter(id => id !== staff.id) })
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="font-medium">{staff.full_name}</span>
                      <span className="text-gray-500 text-[11px]">— {staff.job_title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn("p-3 bg-blue-50 text-blue-800 text-[11px] rounded border border-blue-100 flex items-start gap-2", isRTL ? "flex-row-reverse" : "")}>
                <Target className={cn("w-4 h-4 mt-0.5 text-blue-600", isRTL ? "ml-2" : "")} />
                <p className={isRTL ? "text-right" : ""}>
                  <strong>{t('targeting_logic')}:</strong> {t('targeting_logic_desc')}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 border-t mt-4">
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setShowPathDialog(false)}>
              {t('cancel')}
            </Button>
            <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors px-6" onClick={handleSubmit} disabled={pathMutation.isPending}>
              {pathMutation.isPending ? <Loader2 className={cn("w-4 h-4 animate-spin", isRTL ? "ml-2" : "mr-1")} /> : null}
              {pathMutation.isPending ? t('saving') : t('savePath')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        itemName={pathToDelete?.title || ''}
        itemType={t('learningPath')}
        isLoading={deletePathMutation.isPending}
      />
    </div>
  )
}
