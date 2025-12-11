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
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  Search, 
  Edit, 
  Users, 
  Clock,
  Settings,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Type definitions
type Language = 'en' | 'ar'
type ModuleStatus = 'draft' | 'published' | 'archived'

interface TrainingModule {
  id: string
  title: string
  description?: string
  estimated_duration?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  category?: string
  status: ModuleStatus
  view_count?: number
  created_by?: string
  updated_by?: string
  created_at?: string
  updated_at?: string
}

// Translation labels (temporary mock)
const labels = {
  en: {
    modules: 'Training Modules',
    moduleDescription: 'Manage training modules and assignments',
    createModule: 'Create Module',
    editModule: 'Edit Module',
    search: 'Search modules...',
    status: 'Status',
    category: 'Category',
    duration: 'Duration',
    difficulty: 'Difficulty',
    title: 'Title',
    description: 'Description',
    cancel: 'Cancel',
    create: 'Create',
    update: 'Update',
    assign: 'Assign',
    assignModule: 'Assign Module',
    assignTo: 'Assign to',
    allUsers: 'All Users',
    specificUsers: 'Specific Users',
    departments: 'Departments',
    properties: 'Properties',
    deadline: 'Deadline',
    allModules: 'All Modules',
    published: 'Published',
    draft: 'Draft',
    archived: 'Archived',
    allCategories: 'All Categories',
    loading: 'Loading...',
    noModulesFound: 'No modules found',
    views: 'views',
    enterTitle: 'Enter title',
    enterDescription: 'Enter description',
    enterCategory: 'Enter category',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  },
  ar: {
    modules: 'وحدات التدريب',
    moduleDescription: 'إدارة وحدات التدريب والتكليفات',
    createModule: 'إنشاء وحدة',
    editModule: 'تحرير وحدة',
    search: 'البحث في الوحدات...',
    status: 'الحالة',
    category: 'الفئة',
    duration: 'المدة',
    difficulty: 'الصعوبة',
    title: 'العنوان',
    description: 'الوصف',
    cancel: 'إلغاء',
    create: 'إنشاء',
    update: 'تحديث',
    assign: 'تكليف',
    assignModule: 'تكليف الوحدة',
    assignTo: 'تكليف إلى',
    allUsers: 'جميع المستخدمين',
    specificUsers: 'مستخدمين محددين',
    departments: 'الأقسام',
    properties: 'الممتلكات',
    deadline: 'الموعد النهائي',
    allModules: 'جميع الوحدات',
    published: 'منشور',
    draft: 'مسودة',
    archived: 'مؤرشف',
    allCategories: 'جميع الفئات',
    loading: 'جاري التحميل...',
    noModulesFound: 'لم يتم العثور على وحدات',
    views: 'مشاهدات',
    enterTitle: 'أدخل العنوان',
    enterDescription: 'أدخل الوصف',
    enterCategory: 'أدخل الفئة',
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم'
  }
}

export default function TrainingModules() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [lang] = useState<Language>('en')
  const t = labels[lang]

  // State management
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<ModuleStatus>('draft')

  // Assignment states
  const [assigningModuleId, setAssigningModuleId] = useState<string | null>(null)
  const [assignTargetType, setAssignTargetType] = useState<'all' | 'users' | 'departments' | 'properties'>('all')

  // Data fetching
  const { data: modules, isLoading } = useQuery({
    queryKey: ['training-modules', statusFilter, categoryFilter, search, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from('training_modules')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      if (search) {
        query = query.ilike('title', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TrainingModule[]
    }
  })

  // Get categories for filter
  const { data: categories } = useQuery({
    queryKey: ['module-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_modules')
        .select('category')
        .not('category', 'is', null)
      
      const uniqueCategories = [...new Set(data?.map(item => item.category) || [])]
      return uniqueCategories
    }
  })

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (moduleData: Partial<TrainingModule>) => {
      const { data, error } = await supabase
        .from('training_modules')
        .insert([{
          ...moduleData,
          created_by: profile?.id,
          updated_by: profile?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      setShowCreateDialog(false)
      resetForm()
    }
  })

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, ...moduleData }: TrainingModule) => {
      const { data, error } = await supabase
        .from('training_modules')
        .update({
          ...moduleData,
          updated_by: profile?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      setShowCreateDialog(false)
      setShowAssignDialog(false)
      resetForm()
    }
  })

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
    }
  })

  const assignToAllMutation = useMutation({
    mutationFn: async ({ moduleId, deadline }: { moduleId: string; deadline?: string }) => {
      const { error } = await supabase
        .from('user_training_assignments')
        .insert([{
          user_id: null, // Will be updated to assign to all users
          training_module_id: moduleId,
          assigned_by: profile?.id,
          assigned_at: new Date().toISOString(),
          deadline: deadline,
          status: 'assigned'
        }])
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      setShowAssignDialog(false)
    }
  })

  // Utility functions
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setEstimatedDuration('')
    setDifficulty('beginner')
    setCategory('')
    setStatus('draft')
    setEditingModule(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-blue-100 text-blue-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Event handlers
  const handleCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const handleEdit = (module: TrainingModule) => {
    setEditingModule(module)
    setTitle(module.title || '')
    setDescription(module.description || '')
    setEstimatedDuration(module.estimated_duration || '')
    setDifficulty(module.difficulty || 'beginner')
    setCategory(module.category || '')
    setStatus(module.status || 'draft')
    setShowCreateDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this training module?')) {
      await deleteModuleMutation.mutateAsync(id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingModule) {
        await updateModuleMutation.mutateAsync({
          id: editingModule.id,
          title,
          description,
          estimated_duration: estimatedDuration,
          difficulty,
          category,
          status
        })
      } else {
        await createModuleMutation.mutateAsync({
          title,
          description,
          estimated_duration: estimatedDuration,
          difficulty,
          category,
          status
        })
      }
    } catch (error) {
      console.error('Error saving module:', error)
    }
  }

  const handleAssign = (moduleId: string) => {
    setAssigningModuleId(moduleId)
    setShowAssignDialog(true)
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assigningModuleId) return

    try {
      const deadline = (e.target as HTMLFormElement).deadline?.value

      switch (assignTargetType) {
        case 'all':
          await assignToAllMutation.mutateAsync({ moduleId: assigningModuleId, deadline })
          break
        default:
          console.log('Assignment type not implemented yet:', assignTargetType)
      }
    } catch (error) {
      console.error('Error assigning module:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader 
        title={t.modules}
        description={t.moduleDescription}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t.createModule}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={(value: ModuleStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-[150px] border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <SelectValue placeholder={t.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allModules}</SelectItem>
            <SelectItem value="published">{t.published}</SelectItem>
            <SelectItem value="draft">{t.draft}</SelectItem>
            <SelectItem value="archived">{t.archived}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <SelectValue placeholder={t.category} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allCategories}</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created</SelectItem>
            <SelectItem value="updated_at">Updated</SelectItem>
            <SelectItem value="title">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">{t.loading}</div>
        ) : modules && modules.length > 0 ? (
          modules.map((module) => (
            <Card key={module.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold line-clamp-2">{module.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={cn(getStatusColor(module.status))}>
                      {module.status}
                    </Badge>
                    <Badge className={cn(getDifficultyColor(module.difficulty))}>
                      {module.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{module.estimated_duration || ''} {t.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{module.view_count || 0} {t.views}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(module)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssign(module.id)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(module.id)}
                      disabled={deleteModuleMutation.isPending}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {t.noModulesFound}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? t.editModule : t.createModule}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t.title}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.enterTitle}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t.description}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.enterDescription}
                  rows={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedDuration">{t.duration}</Label>
                <Input
                  id="estimatedDuration"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g., 2 hours"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">{t.difficulty}</Label>
                <Select value={difficulty} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setDifficulty(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{t.beginner}</SelectItem>
                    <SelectItem value="intermediate">{t.intermediate}</SelectItem>
                    <SelectItem value="advanced">{t.advanced}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t.category}</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t.enterCategory}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t.status}</Label>
              <Select value={status} onValueChange={(value: ModuleStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="published">{t.published}</SelectItem>
                  <SelectItem value="archived">{t.archived}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
              >
                {editingModule ? t.update : t.create}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.assignModule}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.assignTo}</Label>
              <Select value={assignTargetType} onValueChange={(value: 'all' | 'users' | 'departments' | 'properties') => setAssignTargetType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allUsers}</SelectItem>
                  <SelectItem value="users">{t.specificUsers}</SelectItem>
                  <SelectItem value="departments">{t.departments}</SelectItem>
                  <SelectItem value="properties">{t.properties}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deadline">{t.deadline}</Label>
              <Input
                id="deadline"
                type="datetime-local"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignDialog(false)}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                disabled={assignToAllMutation.isPending}
              >
                {t.assign}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
