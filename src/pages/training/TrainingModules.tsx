import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'
import { ModuleFormDialog, type ModuleFormValues } from './components/ModuleFormDialog'
import { AssignmentDialog } from './components/AssignmentDialog'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit,
  Users,
  Clock,
  Settings,
  Eye,
  Loader2,
  FileText,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { useTranslation } from 'react-i18next'

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

export default function TrainingModules() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('training')

  // State management
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null)

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<TrainingModule | null>(null)

  // Assignment states (only need ID now, rest handled by dialog)
  const [assigningModuleId, setAssigningModuleId] = useState<string | null>(null)

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

  // Default values to seed the dropdowns
  const DEFAULT_CATEGORIES = [
    'Front Office',
    'Housekeeping',
    'Food & Beverage',
    'Maintenance',
    'Security',
    'Human Resources',
    'Sales & Marketing',
    'Management',
    'General'
  ]

  const DEFAULT_DURATIONS = [
    '15 minutes',
    '30 minutes',
    '45 minutes',
    '1 hour',
    '1.5 hours',
    '2 hours',
    '3 hours',
    '4 hours',
    '1 day',
    '2 days',
    '1 week'
  ]

  // Get categories for filter and form
  const { data: categories } = useQuery({
    queryKey: ['module-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_modules')
        .select('category')
        .not('category', 'is', null)

      const uniqueCategories = new Set([
        ...DEFAULT_CATEGORIES,
        ...(data?.map(item => item.category) || [])
      ])
      return Array.from(uniqueCategories).sort()
    }
  })

  // Get durations for form
  const { data: durations } = useQuery({
    queryKey: ['module-durations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_modules')
        .select('estimated_duration')
        .not('estimated_duration', 'is', null)

      const uniqueDurations = new Set([
        ...DEFAULT_DURATIONS,
        ...(data?.map(item => item.estimated_duration) || [])
      ])
      return Array.from(uniqueDurations) // Keep default order mostly, or sort if needed. Let's rely on set order for now or maybe not sort durations alphabetically.
    }
  })

  // Fetch users for assignment
  const { data: availableUsers } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')

      if (error) throw error
      // Map to expected format for AssignmentDialog
      return (data || []).map(u => ({
        id: u.id,
        first_name: u.full_name?.split(' ')[0] || '',
        last_name: u.full_name?.split(' ').slice(1).join(' ') || '',
        email: u.email
      }))
    },
    enabled: showAssignDialog
  })

  // Fetch departments for assignment - include property name for disambiguation
  const { data: availableDepartments } = useQuery({
    queryKey: ['departments-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property:properties(id, name)')
        .order('name')

      if (error) throw error
      // Format department name with property for disambiguation
      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.property?.name ? `${d.name} (${d.property.name})` : d.name
      }))
    },
    enabled: showAssignDialog
  })

  // Fetch properties for assignment
  const { data: availableProperties } = useQuery({
    queryKey: ['properties-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: showAssignDialog
  })

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (moduleData: ModuleFormValues) => {
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
      setEditingModule(null)
    }
  })

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, ...moduleData }: ModuleFormValues & { id: string }) => {
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
      setEditingModule(null)
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

  // Assignment Mutation (Unified)
  const assignMutation = useMutation({
    mutationFn: async ({
      targetType,
      targetIds,
      deadline
    }: {
      targetType: 'all' | 'users' | 'departments' | 'properties'
      targetIds: string[]
      deadline?: string
    }) => {
      if (!assigningModuleId) throw new Error("No module selected")

      const assignments = []

      if (targetType === 'all') {
        assignments.push({
          target_type: 'everyone',
          target_id: null,
          content_type: 'module',
          content_id: assigningModuleId,
          assigned_by: profile?.id,
          due_date: deadline || null,
          valid_from: new Date().toISOString(),
          priority: 'normal'
        })
      } else {
        const typeMap = {
          users: 'user',
          departments: 'department',
          properties: 'property'
        }

        targetIds.forEach(id => {
          assignments.push({
            target_type: typeMap[targetType],
            target_id: id,
            content_type: 'module',
            content_id: assigningModuleId,
            assigned_by: profile?.id,
            due_date: deadline || null,
            valid_from: new Date().toISOString(),
            priority: 'normal'
          })
        })
      }

      const { error } = await supabase
        .from('learning_assignments')
        .insert(assignments)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-assignments'] })
      setShowAssignDialog(false)
      setAssigningModuleId(null)
    }
  })


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
    setEditingModule(null)
    setShowCreateDialog(true)
  }

  const handleEdit = (module: TrainingModule) => {
    setEditingModule(module)
    setShowCreateDialog(true)
  }

  const handleDelete = (module: TrainingModule) => {
    setModuleToDelete(module)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (moduleToDelete) {
      await deleteModuleMutation.mutateAsync(moduleToDelete.id)
      setModuleToDelete(null)
    }
  }

  const handleSubmit = async (values: ModuleFormValues) => {
    try {
      if (editingModule) {
        await updateModuleMutation.mutateAsync({
          id: editingModule.id,
          ...values
        })
      } else {
        await createModuleMutation.mutateAsync(values)
      }
    } catch (error) {
      console.error('Error saving module:', error)
    }
  }

  const handleAssign = (moduleId: string) => {
    setAssigningModuleId(moduleId)
    setShowAssignDialog(true)
  }

  const handleAssignSubmit = async (data: {
    targetType: 'all' | 'users' | 'departments' | 'properties'
    targetIds: string[]
    deadline?: string
  }) => {
    await assignMutation.mutateAsync(data)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title={t('modules')}
        description={t('moduleDescription')}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createModule')}
            </Button>
          </div>
        }
      />

      {/* Premium Filters Bar */}
      <div className="mb-8 p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-hotel-muted" />
            <Input
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full md:w-64 border-gray-200 bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold transition-all"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] border-gray-200 bg-gray-50/50">
              <SelectValue placeholder={t('category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: ModuleStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-[140px] border-gray-200 bg-gray-50/50">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allModules')}</SelectItem>
              <SelectItem value="published">{t('published')}</SelectItem>
              <SelectItem value="draft">{t('draft')}</SelectItem>
              <SelectItem value="archived">{t('archived')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm text-muted-foreground mr-2 hidden md:inline-block">{t('sortBy')}</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] border-gray-200 bg-gray-50/50">
              <SelectValue placeholder={t('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">{t('created')}</SelectItem>
              <SelectItem value="updated_at">{t('updated')}</SelectItem>
              <SelectItem value="title">{t('title')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-hotel-gold" />
          </div>
        ) : modules && modules.length > 0 ? (
          modules.map((module) => (
            <Card key={module.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-gray-100 overflow-hidden bg-white/50 backdrop-blur-sm">
              <div className={`h-2 w-full ${module.status === 'published' ? 'bg-hotel-navy' : module.status === 'draft' ? 'bg-gray-300' : 'bg-red-400'}`} />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-xl font-medium font-serif text-hotel-navy line-clamp-1 group-hover:text-hotel-gold transition-colors">
                      {module.title}
                    </CardTitle>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                      {module.description || t('noDescription', 'No description provided')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary" className={cn("rounded-sm font-normal", getStatusColor(module.status || 'draft'))}>
                    {module.status}
                  </Badge>
                  <Badge variant="outline" className={cn("rounded-sm font-normal", getDifficultyColor(module.difficulty || 'beginner'))}>
                    {module.difficulty}
                  </Badge>
                  {module.category && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-normal">
                      {module.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-6 px-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5" title="Estimated Duration">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{module.estimated_duration || '0 min'}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Total Views">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{module.view_count || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 hover:bg-hotel-gold hover:text-white hover:border-hotel-gold transition-colors group"
                    size="sm"
                    onClick={() => handleEdit(module)}
                  >
                    <Edit className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    {t('edit', 'Info')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 hover:bg-hotel-navy hover:text-white hover:border-hotel-navy transition-colors group"
                    size="sm"
                    onClick={() => navigate(`/training/builder/${module.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:translate-x-1" />
                    {t('content', 'Content')}
                  </Button>
                  <Button
                    className={cn(
                      "w-full transition-colors group",
                      module.status === 'published'
                        ? "bg-hotel-navy text-white hover:bg-hotel-navy-light"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                    size="sm"
                    onClick={() => {
                      if (module.status !== 'published') {
                        alert(t('onlyPublishedModulesCanBeAssigned', 'Only published modules can be assigned. Please publish this module first.'));
                        return;
                      }
                      handleAssign(module.id);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
                    {t('assign', 'Assign')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 group"
                    size="sm"
                    onClick={() => handleDelete(module)}
                    disabled={deleteModuleMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                    {t('delete', 'Delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('noModulesFound')}</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              {search || categoryFilter !== 'all' || statusFilter !== 'all'
                ? t('adjustFilters', 'Try adjusting your search or filters to find what you are looking for.')
                : t('createFirstModule', 'Get started by creating your first training module.')}
            </p>
            {!(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
              <Button onClick={handleCreate} className="bg-hotel-navy text-white hover:bg-hotel-navy-light">
                <Plus className="h-4 w-4 mr-2" />
                {t('createModule')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <ModuleFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        initialData={editingModule ? {
          title: editingModule.title,
          description: editingModule.description,
          estimated_duration: editingModule.estimated_duration || '',
          difficulty: editingModule.difficulty || 'beginner',
          category: editingModule.category || '',
          status: editingModule.status,
        } : null}
        onSubmit={handleSubmit}
        isSubmitting={createModuleMutation.isPending || updateModuleMutation.isPending}
        existingCategories={categories || []}
        existingDurations={durations || []}
      />

      {/* Assignment Dialog - Conditionally rendered to prevent infinite loop */}
      {showAssignDialog && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => !open && setShowAssignDialog(false)}
          users={availableUsers || []}
          departments={availableDepartments || []}
          properties={availableProperties || []}
          onAssign={handleAssignSubmit}
          isAssigning={assignMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        itemName={moduleToDelete?.title || ''}
        itemType={t('trainingModule')}
        isLoading={deleteModuleMutation.isPending}
      />
    </div>
  )
}
