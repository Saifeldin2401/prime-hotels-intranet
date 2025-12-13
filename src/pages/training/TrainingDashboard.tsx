import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  Search,
  Target,
  Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type {
  TrainingProgress,
  TrainingModule,
  TrainingAssignment,
  TrainingCertificate,
  Profile
} from '@/lib/types'
import { useTranslation } from 'react-i18next'

export default function TrainingDashboard() {
  const { profile, primaryRole } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('training')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const isRTL = i18n.dir() === 'rtl'

  // Fetch user's training progress
  const { data: myProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['my-training-progress', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('training_progress')
        .select(`
          *,
          training_modules(id, title, description, estimated_duration_minutes)
        `)
        .eq('user_id', profile.id)
      if (error) throw error
      return data as (TrainingProgress & { training_modules: TrainingModule })[]
    },
    enabled: !!profile?.id
  })

  // Fetch assignments for the user
  const { data: myAssignments } = useQuery({
    queryKey: ['my-training-assignments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training_modules(id, title, description)
        `)
        .or(`assigned_to_user_id.eq.${profile.id},assigned_to_all.eq.true`)
      if (error) throw error
      return data as (TrainingAssignment & { training_modules: TrainingModule })[]
    },
    enabled: !!profile?.id
  })

  // Fetch certificates
  const { data: myCertificates } = useQuery({
    queryKey: ['my-certificates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('training_certificates')
        .select(`
          *,
          training_progress!inner(
            *,
            training_modules(id, title),
            profiles!inner(id, full_name, email)
          )
        `)
        .eq('training_progress.user_id', profile.id)
      if (error) throw error
      return data as (TrainingCertificate & {
        training_progress: TrainingProgress & {
          training_modules: TrainingModule;
          profiles: Profile
        }
      })[]
    },
    enabled: !!profile?.id
  })

  // Fetch path enrollments
  const { data: myPaths } = useQuery({
    queryKey: ['my-paths', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('user_path_enrollments')
        .select(`
          *,
          training_paths(id, title, description, path_type, estimated_duration_hours)
        `)
        .eq('user_id', profile.id)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!profile?.id
  })

  // Manager/Admin: Fetch team overview
  const { data: teamProgress } = useQuery({
    queryKey: ['team-training-progress', primaryRole],
    queryFn: async () => {
      if (!['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole || '')) return []
      const { data, error } = await supabase
        .from('training_progress')
        .select(`
          *,
          profiles(id, full_name),
          training_modules(id, title)
        `)
      if (error) throw error
      return data
    },
    enabled: !!primaryRole && ['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole)
  })

  // Calculate stats
  const stats = {
    totalModules: myProgress?.length || 0,
    completed: myProgress?.filter(p => p.status === 'completed').length || 0,
    inProgress: myProgress?.filter(p => p.status === 'in_progress').length || 0,
    overdue: myAssignments?.filter(a => a.deadline && new Date(a.deadline) < new Date() &&
      !myProgress?.some(p => p.training_id === a.training_module_id && p.status === 'completed')).length || 0,
    dueSoon: myAssignments?.filter(a => {
      if (!a.deadline) return false
      const deadline = new Date(a.deadline)
      const now = new Date()
      const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return daysUntil <= 7 && daysUntil > 0 &&
        !myProgress?.some(p => p.training_id === a.training_module_id && p.status === 'completed')
    }).length || 0,
    certificates: myCertificates?.length || 0,
    paths: myPaths?.length || 0,
  }

  const completionRate = stats.totalModules > 0 ? Math.round((stats.completed / stats.totalModules) * 100) : 0

  // Filter and search
  const filteredProgress = myProgress?.filter(item => {
    const matchesSearch = !search || item.training_modules.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'not_started': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'not_started': return <BookOpen className="w-4 h-4" />
      case 'expired': return <AlertTriangle className="w-4 h-4" />
      default: return null
    }
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className={cn("space-y-8 animate-fade-in", isRTL && "text-right")}>
      <PageHeader
        title={t('dashboard')}
        description={t('dashboardDescription')}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
              <Button
                onClick={() => navigate('/training/modules')}
                className="bg-primary hover:bg-hotel-navy shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createModule')}
              </Button>
            )}
            {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
              <Button onClick={() => navigate('/training/builder')} className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors hover-lift">
                <Target className="w-4 h-4 mr-2" />
                {t('trainingBuilder')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={toggleLanguage}
              className="bg-hotel-navy text-white hover:bg-hotel-navy-light border border-hotel-navy rounded-md transition-colors hover-lift"
            >
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button size="sm" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors hover-lift">
              <Download className="w-4 h-4 mr-2" />
              {t('exportReport')}
            </Button>
          </div>
        }
      />

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">{t('modules')}</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-gray-600">
              {stats.completed} {t('completed')}
            </p>
            <div className="mt-2">
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">{t('completionRate')}</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-gray-600">
              {stats.inProgress} {t('inProgress')}
            </p>
            <div className="mt-2">
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">{t('overdue')}</CardTitle>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
            <p className="text-xs text-gray-600">
              {stats.dueSoon} {t('dueSoon')}
            </p>
            <div className="mt-2">
              <div className="h-2 w-full bg-red-100 dark:bg-red-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.overdue / Math.max(stats.totalModules, 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-600">{t('certificates')}</CardTitle>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificates}</div>
            <p className="text-xs text-gray-600">
              {stats.paths} {t('paths')}
            </p>
            <div className="mt-2">
              <div className="h-2 w-full bg-purple-100 dark:bg-purple-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((stats.certificates / Math.max(stats.totalModules, 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-training" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-training">{t('myTraining')}</TabsTrigger>
          {(['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole || '')) && (
            <TabsTrigger value="team">{t('teamOverview')}</TabsTrigger>
          )}
          <TabsTrigger value="certificates">{t('certificates')}</TabsTrigger>
          <TabsTrigger value="paths">{t('paths')}</TabsTrigger>
        </TabsList>

        <TabsContent value="my-training" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 ${isRTL ? 'pr-10' : ''}`}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="not_started">{t('notStarted')}</SelectItem>
                <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                <SelectItem value="completed">{t('completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Training List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('modules')}</CardTitle>
            </CardHeader>
            <CardContent>
              {progressLoading ? (
                <div className="text-center py-8 text-gray-700">{t('loading')}</div>
              ) : filteredProgress.length > 0 ? (
                <div className="space-y-4">
                  {filteredProgress.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.training_modules.title}</h3>
                        {item.training_modules.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.training_modules.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          {item.started_at && (
                            <span>{t('assignedOn')}: {new Date(item.started_at).toLocaleDateString()}</span>
                          )}
                          {item.quiz_score && (
                            <span>{t('score')}: {item.quiz_score}%</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{t(item.status)}</span>
                        </Badge>
                        {item.status === 'not_started' && (
                          <Button size="sm">{t('startTraining')}</Button>
                        )}
                        {item.status === 'in_progress' && (
                          <Button size="sm">{t('continueTraining')}</Button>
                        )}
                        {item.status === 'completed' && item.quiz_score && item.quiz_score < 80 && (
                          <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors">{t('retakeQuiz')}</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-hotel-navy" />
                  <p className="text-gray-700 mb-4">
                    {t('noModulesFound')}
                  </p>
                  {['regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '') && (
                    <Button onClick={() => navigate('/training/modules')}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('createTrainingModule')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Overview Tab (for managers) */}
        {(['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole || '')) && (
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('teamOverview')}</CardTitle>
              </CardHeader>
              <CardContent>
                {teamProgress && teamProgress.length > 0 ? (
                  <div className="space-y-4">
                    {teamProgress.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{(item as any).profiles?.full_name}</h3>
                          <p className="text-sm text-gray-600">{(item as any).training_modules?.title}</p>
                        </div>
                        <Badge className={getStatusColor(item.status)}>
                          {t(item.status as string)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-700">{t('noData')}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('certificates')}</CardTitle>
            </CardHeader>
            <CardContent>
              {myCertificates && myCertificates.length > 0 ? (
                <div className="space-y-4">
                  {myCertificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">
                          {(cert as any).training_progress?.training_modules?.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {t('assignedOn')}: {new Date((cert as any).training_progress?.created_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors">
                        {t('viewCertificate')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700">{t('noData')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Paths Tab */}
        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('paths')}</CardTitle>
            </CardHeader>
            <CardContent>
              {myPaths && myPaths.length > 0 ? (
                <div className="space-y-4">
                  {myPaths.map((enrollment) => (
                    <div key={enrollment.id} className="p-4 border rounded-lg">
                      <h3 className="font-medium">{enrollment.training_paths.title}</h3>
                      {enrollment.training_paths.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {enrollment.training_paths.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4">
                        <Badge className="bg-hotel-navy text-white border border-hotel-navy rounded-md">
                          {enrollment.training_paths.path_type}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {enrollment.completed_at
                            ? `${t('completed')}: ${new Date(enrollment.completed_at).toLocaleDateString()}`
                            : `${t('inProgress')}`
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700">{t('noData')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
