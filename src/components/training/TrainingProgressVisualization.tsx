import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Award,
  Target,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Star,
  Users
} from 'lucide-react'
import { ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

interface TrainingProgressVisualizationProps {
  className?: string
}

export function TrainingProgressVisualization({ className }: TrainingProgressVisualizationProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const { data: userProgress } = useQuery({
    queryKey: ['training-progress', user?.id, timeRange],
    queryFn: async () => {
      if (!user?.id) return null

      const startDate = new Date()
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      const { data, error } = await supabase
        .from('training_completions')
        .select(`
          *,
          training_module:training_module_id(id, title, category, duration_minutes, difficulty_level),
          user:user_id(id, full_name, department_id)
        `)
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true })

      if (error) throw error
      return data
    }
  })

  const { data: departmentProgress } = useQuery({
    queryKey: ['department-training-progress', user?.user_metadata?.department_id, timeRange],
    queryFn: async () => {
      const departmentId = user?.user_metadata?.department_id
      if (!departmentId) return null

      const startDate = new Date()
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      const { data, error } = await supabase
        .from('training_completions')
        .select(`
          *,
          training_module:training_module_id(id, title, category, duration_minutes),
          user:user_id(id, full_name, user_profiles(department_id))
        `)
        .eq('user.user_profiles.department_id', departmentId)
        .gte('completed_at', startDate.toISOString())

      if (error) throw error
      return data
    }
  })

  const { data: achievements } = useQuery({
    queryKey: ['training-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievement_id(id, title, description, icon, points, category)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    }
  })

  // Process data for charts
  const processProgressData = (completions: any[]) => {
    const dailyProgress = completions?.reduce((acc, completion) => {
      const date = new Date(completion.completed_at).toLocaleDateString()
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return Object.entries(dailyProgress).map(([date, count]) => ({
      date,
      completions: count
    }))
  }

  const processCategoryData = (completions: any[]) => {
    const categoryData = completions?.reduce((acc, completion) => {
      const category = completion.training_module?.category || 'Other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return Object.entries(categoryData).map(([category, count]) => ({
      category,
      count,
      fill: getCategoryColor(category)
    }))
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Safety': '#00C49F',
      'Service': '#0088FE',
      'Operations': '#FFBB28',
      'Management': '#FF8042',
      'Compliance': '#8884D8',
      'Technical': '#82CA9D'
    }
    return colors[category] || '#94A3B8'
  }

  const userDailyProgress = processProgressData(userProgress || [])
  const userCategoryData = processCategoryData(userProgress || [])
  const departmentDailyProgress = processProgressData(departmentProgress || [])
  const departmentCategoryData = processCategoryData(departmentProgress || [])

  const totalCompletions = userProgress?.length || 0
  const totalHours = userProgress?.reduce((acc, completion) =>
    acc + (completion.training_module?.duration_minutes || 0) / 60, 0) || 0
  const averageScore = userProgress?.reduce((acc, completion) =>
    acc + (completion.score || 0), 0) / (totalCompletions || 1) || 0
  const totalPoints = achievements?.reduce((acc, achievement) =>
    acc + (achievement.achievement?.points || 0), 0) || 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-muted-foreground">{t('visualization.completed')}</p>
                <p className="text-2xl font-bold">{totalCompletions}</p>
                <p className="text-xs text-muted-foreground">{t('visualization.trainings')}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-muted-foreground">{t('visualization.timeSpent')}</p>
                <p className="text-2xl font-bold">{Math.round(totalHours)}h</p>
                <p className="text-xs text-muted-foreground">{t('visualization.learning')}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-muted-foreground">{t('visualization.avgScore')}</p>
                <p className="text-2xl font-bold">{Math.round(averageScore)}%</p>
                <p className="text-xs text-muted-foreground">{t('visualization.performance')}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-muted-foreground">{t('visualization.points')}</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">{t('visualization.earned')}</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold">{t('visualization.progressAnalytics')}</h3>
        <div className="flex gap-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="capitalize"
            >
              {t(`visualization.${range}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className={isRTL ? 'flex-row-reverse' : ''}>
          <TabsTrigger value="personal">{t('visualization.personalProgress')}</TabsTrigger>
          <TabsTrigger value="department">{t('visualization.department')}</TabsTrigger>
          <TabsTrigger value="achievements">{t('visualization.achievements')}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Progress */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <TrendingUp className="h-5 w-5" />
                  {t('visualization.dailyProgress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={userDailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        stroke="#0088FE"
                        fill="#0088FE"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <PieChartIcon className="h-5 w-5" />
                  {t('visualization.trainingCategories')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userCategoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ category, count }: any) => `${category}: ${count}`}
                      >
                        {userCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="department" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Daily Progress */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Users className="h-5 w-5" />
                  {t('visualization.deptProgress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentDailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completions" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Department Categories */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <BarChart3 className="h-5 w-5" />
                  {t('visualization.deptCategories')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentCategoryData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Star className="h-5 w-5" />
                {t('visualization.recentAchievements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements?.map((userAchievement) => (
                  <Card key={userAchievement.id} className={cn("border-l-4 border-l-yellow-500", isRTL ? "text-right" : "text-left")}>
                    <CardContent className="p-4">
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                          <Award className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{userAchievement.achievement?.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {userAchievement.achievement?.description}
                          </p>
                          <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Badge variant="secondary" className="text-xs">
                              {userAchievement.achievement?.points} {t('skillsManagement.pts')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(userAchievement.earned_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!achievements || achievements.length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('visualization.noAchievements')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
