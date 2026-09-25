import { PageHeader } from '@/components/layout/PageHeader'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { EmptyState } from '@/components/shared/EmptyState'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useTrainingProgress } from '@/hooks/useTraining'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'
import type {
    TrainingModule,
    TrainingPath,
    TrainingPathModule,
    UserPathEnrollment
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    BookOpen,
    Briefcase,
    Compass,
    Edit,
    GraduationCap,
    Loader2,
    Plus,
    Target,
    Trash2,
    Users
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PathRoadmapView } from '@/components/learner/PathRoadmapView'
import { useTenant } from '@/contexts/TenantContext'

type PathType = 'new_hire' | 'department' | 'leadership' | 'compliance' | 'skills'

interface PathForm {
  title: string
  description: string
  path_type: PathType
  estimated_duration_hours: number
  is_mandatory: boolean
  certificate_enabled: boolean
  module_ids: string[]
  target_role?: Database['public']['Enums']['app_role'] | null
  target_department_id?: string | null
  target_property_id?: string | null
  target_user_ids: string[]
}

export default function TrainingPaths() {
  const { profile, primaryRole } = useAuth()
  const { currentOrganization } = useTenant()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const [activeTab, setActiveTab] = useState('my')
  const isRTL = i18n.dir() === 'rtl'

  // Fetch all user progress to calculate path completion
  const { data: allUserProgress } = useTrainingProgress(profile?.id)

  // Enroll in path mutation
  const enrollInPathMutation = useMutation({
    mutationFn: async (pathId: string) => {
      if (!profile?.id) throw new Error('Not authenticated')
      const orgId = currentOrganization?.id || (profile as any)?.organization_id || '00000000-0000-0000-0000-000000000000'
      const { data, error } = await supabase
        .from('user_path_enrollments')
        .insert({
          user_id: profile.id,
          path_id: pathId,
          organization_id: orgId,
          enrolled_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-path-enrollments', profile?.id] })
      toast.success(isRTL ? 'تم التسجيل في المسار التدريبي بنجاح' : 'Enrolled in learning path successfully')
      setActiveTab('my')
    },
    onError: (err: any) => {
      toast.error(err?.message || (isRTL ? 'تعذر التسجيل في المسار' : 'Failed to enroll in path'))
    }
  })

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
            courses(id, title, description, estimated_duration_minutes)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return ((data || []).map(p => ({
        ...p,
        is_published: p.is_active ?? true,
      })) as unknown) as (TrainingPath & {
        training_path_modules: (TrainingPathModule & {
          courses: TrainingModule
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
              courses(id, title, description, estimated_duration_minutes)
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return ((data || []).map(row => ({
        ...row,
        training_paths: {
          ...row.training_paths,
          is_published: row.training_paths?.is_active ?? true,
        }
      })) as unknown) as (UserPathEnrollment & {
        training_paths: TrainingPath & {
          training_path_modules: (TrainingPathModule & {
            courses: TrainingModule
          })[]
        }
      })[]
    },
    enabled: !!profile?.id
  })

  const enrolledPathIds = useMemo(() => {
    return new Set((myEnrollments || []).map(e => e.training_paths?.id).filter(Boolean))
  }, [myEnrollments])

  // Fetch available modules
  const { data: availableModules } = useQuery({
    queryKey: ['available-training-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, estimated_duration_minutes')
        .eq('is_deleted', false)
      if (error) throw error
      return data as TrainingModule[]
    }
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property_id')
      if (error) throw error
      return data as { id: string; name: string; property_id: string }[]
    }
  })

  // Fetch properties / hotels for targeting
  const { data: properties } = useQuery({
    queryKey: ['properties', 'hotels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name')
        .eq('is_deleted', false)
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
            target_role: data.target_role ?? null,
            target_department_id: data.target_department_id ?? null,
            target_property_id: data.target_property_id ?? null,
            target_user_ids: data.target_user_ids ?? [],
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
            target_role: data.target_role ?? null,
            target_department_id: data.target_department_id ?? null,
            target_property_id: data.target_property_id ?? null,
            target_user_ids: data.target_user_ids ?? [],
            created_by: profile?.id ?? null
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
      toast.success(editingPath ? t('pathUpdated') : t('pathCreated'))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('error', 'Unexpected error'))
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
      toast.success(t('pathDeleted'))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('error', 'Unexpected error'))
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
      module_ids: (path as any).training_path_modules?.map((m) => m.module_id) || [],
      target_role: (path.target_role as Database['public']['Enums']['app_role'] | null) || null,
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

  const calculateProgress = (enrollment) => {
    if (!enrollment.training_paths?.training_path_modules) return 0
    const modules = enrollment.training_paths.training_path_modules
    if (modules.length === 0) return 0

    if (!allUserProgress) return 0

    // Count completed modules that are part of this path
    const completedCount = modules.filter((m) => {
      const progress = allUserProgress.find(p => p.training_id === m.module_id)
      return progress?.status === 'completed'
    }).length

    return modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-end' : 'text-start'}`}>
      <PageHeader
        title={t('paths')}
        description={t('paths_description')}
        actions={
          <div className="flex items-center gap-2">
            {['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
              <Button onClick={() => setShowPathDialog(true)} className={isRTL ? "flex-row-reverse" : ""}>
                <Plus className={cn("w-4 h-4", isRTL ? "ms-2" : "me-2")} />
                {t('createPath')}
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
          <TabsTrigger value="my" className="rounded-xl text-xs sm:text-sm font-bold">{t('myPaths', 'My Active Roadmaps')}</TabsTrigger>
          <TabsTrigger value="explore" className="rounded-xl text-xs sm:text-sm font-bold">{t('explorePaths', 'Explore All Paths')}</TabsTrigger>
          {['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
            <TabsTrigger value="all" className="rounded-xl text-xs sm:text-sm font-bold">{t('allPaths', 'Path Management')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my" className="space-y-6">
          {enrollmentsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : myEnrollments && myEnrollments.length > 0 ? (
            <div className="space-y-8">
              {myEnrollments.map((enrollment) => (
                <PathRoadmapView
                  key={enrollment.id}
                  path={enrollment.training_paths as any}
                  userProgress={allUserProgress}
                  isEnrolled={true}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-3xl p-12 text-center border-dashed">
              <BookOpen className="h-12 w-12 text-amber-500/60 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">
                {isRTL ? 'لم تسجل في أي مسار تدريبي حتى الآن' : 'No active learning paths enrolled'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                {isRTL
                  ? 'استكشف المسارات التدريبية المعتمدة لاكتساب كفاءات متقدمة والحصول على اعتمادات مهنية موثقة.'
                  : 'Browse available executive pathways to build mastery and achieve accredited credentials.'}
              </p>
              <Button
                onClick={() => setActiveTab('explore')}
                className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                <Compass className="h-4 w-4 me-2" />
                {isRTL ? 'استكشاف المسارات المتاحة' : 'Explore Available Paths'}
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="explore" className="space-y-6">
          {pathsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : paths && paths.length > 0 ? (
            <div className="space-y-8">
              {paths.map((path) => {
                const isUserEnrolled = enrolledPathIds.has(path.id)
                return (
                  <PathRoadmapView
                    key={path.id}
                    path={path as any}
                    userProgress={allUserProgress}
                    isEnrolled={isUserEnrolled}
                    onEnroll={(pId) => enrollInPathMutation.mutate(pId)}
                    isEnrolling={enrollInPathMutation.isPending}
                  />
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title={t('noPaths', 'No Paths Found')}
              description={t('no_paths_desc', 'No published learning paths are currently available.')}
            />
          )}
        </TabsContent>

        {['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
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
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
              <TabsTrigger value="general">{t('general')}</TabsTrigger>
              <TabsTrigger value="modules">{t('modules')}</TabsTrigger>
              <TabsTrigger value="targeting">{t('targeting')}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className={cn("space-y-4 pt-4", isRTL ? "text-end" : "text-start")}>
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

            <TabsContent value="modules" className={cn("space-y-4 pt-4", isRTL ? "text-end" : "text-start")}>
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

            <TabsContent value="targeting" className={cn("space-y-4 pt-4", isRTL ? "text-end" : "text-start")}>
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
                  <GroupedDepartmentSelector
                    departments={departments as any}
                    properties={properties as any}
                    value={formData.target_department_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, target_department_id: value === 'none' ? null : value })}
                    placeholder={t('selectDepartment')}
                    generalLabel={t('allDepartments')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('targetRole')}</Label>
                <Select
                  value={formData.target_role || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, target_role: value === 'none' ? null : (value as Database['public']['Enums']['app_role']) })}
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
                <Target className={cn("w-4 h-4 mt-0.5 text-blue-600", isRTL ? "ms-2" : "")} />
                <p className={isRTL ? "text-end" : ""}>
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
              {pathMutation.isPending ? <Loader2 className={cn("w-4 h-4 animate-spin", isRTL ? "ms-2" : "me-1")} /> : null}
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
