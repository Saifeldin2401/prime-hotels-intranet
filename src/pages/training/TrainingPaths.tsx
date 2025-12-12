import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  GraduationCap
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
}

export default function TrainingPaths() {
  const { profile, primaryRole } = useAuth()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('training')
  const [activeTab, setActiveTab] = useState('my')
  const isRTL = i18n.dir() === 'rtl'

  // State for dialogs
  const [showPathDialog, setShowPathDialog] = useState(false)
  const [editingPath, setEditingPath] = useState<TrainingPath | null>(null)
  const [formData, setFormData] = useState<PathForm>({
    title: '',
    description: '',
    path_type: 'skills',
    estimated_duration_hours: 0,
    is_mandatory: false,
    certificate_enabled: true
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
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
        if (error) throw error
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
            created_by: profile?.id
          })
          .select()
          .single()
        if (error) throw error
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
      certificate_enabled: true
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
      certificate_enabled: path.certificate_enabled
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
    if (!enrollment.training_paths.training_path_modules) return 0
    const totalModules = enrollment.training_paths.training_path_modules.length
    if (totalModules === 0) return 0

    // This would need to be calculated based on actual progress
    // For now, return a placeholder based on enrollment ID for consistency
    const hash = enrollment.id.split('-').reduce((acc: number, part: string) => acc + part.charCodeAt(0), 0)
    return (hash % 100)
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('paths')}
        description={isRTL ? 'إدارة مسارات التعلم المهيكلة للموظفين' : 'Manage structured learning paths for employees'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="bg-hotel-navy text-white hover:bg-hotel-navy-light border border-hotel-navy rounded-md transition-colors"
              size="sm"
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
            >
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Button>
            {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
              <Button onClick={() => setShowPathDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
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
                <div className="text-center py-8 text-gray-700">{t('loading')}</div>
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
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>{t('modules')}: {enrollment.training_paths.training_path_modules?.length || 0}</span>
                            <span>{t('estimatedDuration')}: {enrollment.training_paths.estimated_duration_hours}h</span>
                            <span>{t('enrolled')}: {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
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
                  description={isRTL ? 'ابدأ رحلة التعلم الخاصة بك عن طريق التسجيل في مسار تعلم.' : 'Start your learning journey by enrolling in a learning path.'}
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
                  <div className="text-center py-8 text-gray-700">{t('loading')}</div>
                ) : paths && paths.length > 0 ? (
                  <div className="space-y-4">
                    {paths.map((path) => (
                      <div key={path.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getPathIcon(path.path_type)}
                          <div>
                            <h3 className="font-medium">{path.title}</h3>
                            <p className="text-sm text-gray-600">{path.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>{t('modules')}: {path.training_path_modules?.length || 0}</span>
                              <span>{t('estimatedDuration')}: {path.estimated_duration_hours}h</span>
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
                            <Trash2 className="w-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title={t('noPaths')}
                    description={isRTL ? 'قم بإنشاء مسارات تعلم منظمة لتوجيه تطوير الموظفين.' : 'Create structured learning paths to guide employee development.'}
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
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('pathTitle')}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isRTL ? 'أدخل عنوان المسار' : 'Enter path title'}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('pathDescription')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isRTL ? 'أدخل وصف المسار' : 'Enter path description'}
              />
            </div>

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
              <Label>{t('estimatedDuration')} (hours)</Label>
              <Input
                type="number"
                value={formData.estimated_duration_hours}
                onChange={(e) => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mandatory"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="mandatory">{t('mandatory')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="certificate"
                checked={formData.certificate_enabled}
                onChange={(e) => setFormData({ ...formData, certificate_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="certificate">{t('certificateEnabled')}</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setShowPathDialog(false)}>
                {t('cancel')}
              </Button>
              <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors" onClick={handleSubmit} disabled={pathMutation.isPending}>
                {pathMutation.isPending ? t('loading') : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        itemName={pathToDelete?.title || ''}
        itemType="learning path"
        isLoading={deletePathMutation.isPending}
      />
    </div>
  )
}
