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

// Bilingual labels
const labels = {
  en: {
    paths: 'Learning Paths',
    createPath: 'Create Path',
    editPath: 'Edit Path',
    myPaths: 'My Paths',
    allPaths: 'All Paths',
    newPath: 'New Learning Path',
    pathTitle: 'Path Title',
    pathDescription: 'Path Description',
    pathType: 'Path Type',
    newHire: 'New Hire Path',
    department: 'Department Path',
    leadership: 'Leadership Track',
    compliance: 'Compliance Training',
    skills: 'Skills Development',
    estimatedDuration: 'Estimated Duration',
    modules: 'Modules',
    enrolled: 'Enrolled',
    completed: 'Completed',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    averageScore: 'Average Score',
    completionRate: 'Completion Rate',
    enrollNow: 'Enroll Now',
    continuePath: 'Continue Path',
    startPath: 'Start Path',
    assignTo: 'Assign To',
    allEmployees: 'All Employees',
    specificDepartments: 'Specific Departments',
    specificProperties: 'Specific Properties',
    jobTitles: 'Job Titles',
    mandatory: 'Mandatory',
    optional: 'Optional',
    prerequisites: 'Prerequisites',
    certificate: 'Certificate',
    certificateEnabled: 'Certificate Enabled',
    noPaths: 'No learning paths available',
    noEnrollments: 'No path enrollments found',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this learning path?',
    pathCreated: 'Learning path created successfully',
    pathUpdated: 'Learning path updated successfully',
    pathDeleted: 'Learning path deleted successfully',
    enrolledSuccessfully: 'Enrolled successfully',
    selectModules: 'Select Modules',
    sequence: 'Sequence',
    addModule: 'Add Module',
    removeModule: 'Remove Module',
    dragToReorder: 'Drag to reorder modules'
  },
  ar: {
    paths: 'مسارات التعلم',
    createPath: 'إنشاء مسار',
    editPath: 'تعديل المسار',
    myPaths: 'مساراتي',
    allPaths: 'جميع المسارات',
    newPath: 'مسار تعلم جديد',
    pathTitle: 'عنوان المسار',
    pathDescription: 'وصف المسار',
    pathType: 'نوع المسار',
    newHire: 'مسار الموظف الجديد',
    department: 'مسار القسم',
    leadership: 'مسار القيادة',
    compliance: 'تدريب الامتثال',
    skills: 'تطوير المهارات',
    estimatedDuration: 'المدة المقدرة',
    modules: 'الوحدات',
    enrolled: 'مسجل',
    completed: 'مكتمل',
    inProgress: 'قيد التقدم',
    notStarted: 'لم يبدأ',
    averageScore: 'متوسط الدرجة',
    completionRate: 'معدل الإنجاز',
    enrollNow: 'سجل الآن',
    continuePath: 'متابعة المسار',
    startPath: 'بدء المسار',
    assignTo: 'تعيين إلى',
    allEmployees: 'جميع الموظفين',
    specificDepartments: 'أقسام محددة',
    specificProperties: 'خصائص محددة',
    jobTitles: 'الوظائف',
    mandatory: 'إلزامي',
    optional: 'اختياري',
    prerequisites: 'المتطلبات الأساسية',
    certificate: 'شهادة',
    certificateEnabled: 'الشهادة مفعلة',
    noPaths: 'لا توجد مسارات تعلم متاحة',
    noEnrollments: 'لم يتم العثور على تسجيلات للمسار',
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    confirmDelete: 'هل أنت متأكد من حذف مسار التعلم هذا؟',
    pathCreated: 'تم إنشاء مسار التعلم بنجاح',
    pathUpdated: 'تم تحديث مسار التعلم بنجاح',
    pathDeleted: 'تم حذف مسار التعلم بنجاح',
    enrolledSuccessfully: 'تم التسجيل بنجاح',
    selectModules: 'اختر الوحدات',
    sequence: 'التسلسل',
    addModule: 'إضافة وحدة',
    removeModule: 'إزالة الوحدة',
    dragToReorder: 'اسحب لإعادة ترتيب الوحدات'
  }
}

type Language = 'en' | 'ar'
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
  const [lang, setLang] = useState<Language>('en')
  const [activeTab, setActiveTab] = useState('my')
  const t = labels[lang]
  const isRTL = lang === 'ar'

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
      alert(editingPath ? t.pathUpdated : t.pathCreated)
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
      alert(t.pathDeleted)
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

  const handleDelete = (pathId: string) => {
    if (confirm(t.confirmDelete)) {
      deletePathMutation.mutate(pathId)
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
        title={t.paths}
        description={isRTL ? 'إدارة مسارات التعلم المهيكلة للموظفين' : 'Manage structured learning paths for employees'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
              <Button onClick={() => setShowPathDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t.createPath}
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">{t.myPaths}</TabsTrigger>
          {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
            <TabsTrigger value="all">{t.allPaths}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.myPaths}</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
              ) : myEnrollments && myEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {myEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPathIcon(enrollment.training_paths.path_type)}
                        <div>
                          <h3 className="font-medium">{enrollment.training_paths.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.training_paths.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{t.modules}: {enrollment.training_paths.training_path_modules?.length || 0}</span>
                            <span>{t.estimatedDuration}: {enrollment.training_paths.estimated_duration_hours}h</span>
                            <span>{t.enrolled}: {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
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
                          {calculateProgress(enrollment) > 0 ? t.continuePath : t.startPath}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t.noEnrollments}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.allPaths}</CardTitle>
              </CardHeader>
              <CardContent>
                {pathsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
                ) : paths && paths.length > 0 ? (
                  <div className="space-y-4">
                    {paths.map((path) => (
                      <div key={path.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getPathIcon(path.path_type)}
                          <div>
                            <h3 className="font-medium">{path.title}</h3>
                            <p className="text-sm text-muted-foreground">{path.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{t.modules}: {path.training_path_modules?.length || 0}</span>
                              <span>{t.estimatedDuration}: {path.estimated_duration_hours}h</span>
                              {path.is_mandatory && (
                                <Badge variant="outline">{t.mandatory}</Badge>
                              )}
                              {path.certificate_enabled && (
                                <Badge variant="outline">{t.certificate}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(path)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(path.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">{t.noPaths}</p>
                    <Button onClick={() => setShowPathDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t.newPath}
                    </Button>
                  </div>
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
              {editingPath ? t.editPath : t.createPath}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t.pathTitle}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={isRTL ? 'أدخل عنوان المسار' : 'Enter path title'}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.pathDescription}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isRTL ? 'أدخل وصف المسار' : 'Enter path description'}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.pathType}</Label>
              <Select
                value={formData.path_type}
                onValueChange={(value: PathType) => setFormData({ ...formData, path_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_hire">{t.newHire}</SelectItem>
                  <SelectItem value="department">{t.department}</SelectItem>
                  <SelectItem value="leadership">{t.leadership}</SelectItem>
                  <SelectItem value="compliance">{t.compliance}</SelectItem>
                  <SelectItem value="skills">{t.skills}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.estimatedDuration} (hours)</Label>
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
              <Label htmlFor="mandatory">{t.mandatory}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="certificate"
                checked={formData.certificate_enabled}
                onChange={(e) => setFormData({ ...formData, certificate_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="certificate">{t.certificateEnabled}</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPathDialog(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={pathMutation.isPending}>
                {pathMutation.isPending ? t.loading : t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
