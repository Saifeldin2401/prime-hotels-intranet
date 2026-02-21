import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Users,
  Flame,
  Trophy,
  AlertCircle
} from 'lucide-react'
import { ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer,
  Area, AreaChart, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { cn } from '@/lib/utils'
import { calculateStreak } from '@/lib/training/analytics'
import { useUserAchievements, useAchievementStats } from '@/hooks/useAchievements'
import { AchievementBadge } from './AchievementBadge'

interface TrainingProgressVisualizationProps {
  className?: string
}

function ChartViewport({ height, children }: { height: number; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateReadyState = () => {
      const rect = container.getBoundingClientRect()
      setIsReady(rect.width > 0 && rect.height > 0)
    }

    updateReadyState()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(updateReadyState)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height, minHeight: height }}
    >
      {isReady ? children : null}
    </div>
  )
}

export function TrainingProgressVisualization({ className }: TrainingProgressVisualizationProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [activeTab, setActiveTab] = useState<'personal' | 'department' | 'achievements'>('personal')

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

      const buildProgressQuery = () => supabase
        .from('training_progress')
        .select(`
          *,
          training_module:training_modules(id, title, category, estimated_duration_minutes, difficulty_level),
          user:profiles(id, full_name)
        `)
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())

      let { data, error } = await buildProgressQuery()
        .order('completed_at', { ascending: true })

      if (error) {
        const fallback = await buildProgressQuery().order('updated_at', { ascending: true })
        if (!fallback.error) {
          data = fallback.data
          error = null
        }
      }

      if (error) throw error
      return data
    }
  })

  // Fetch ALL time progress for Streak calculation to be accurate
  const { data: fullHistory } = useQuery({
    queryKey: ['training-history-full', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('training_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      if (error) throw error
      return data
    }
  })

  // REAL Department Progress Query
  const { data: departmentProgress } = useQuery({
    queryKey: ['department-training-progress', user?.id, timeRange],
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

      // Get user's departments from user_departments junction table
      const { data: userDepts, error: userDeptsError } = await supabase
        .from('user_departments')
        .select('department_id')
        .eq('user_id', user.id)

      if (userDeptsError || !userDepts?.length) {
        return []
      }

      const departmentIds = userDepts.map(ud => ud.department_id)

      // Get all users in these departments
      const { data: deptUsers, error: deptUsersError } = await supabase
        .from('user_departments')
        .select('user_id')
        .in('department_id', departmentIds)

      if (deptUsersError || !deptUsers?.length) {
        return []
      }

      const userIds = [...new Set(deptUsers.map(u => u.user_id))]

      // Get training progress for all these users
      const { data, error } = await supabase
        .from('training_progress')
        .select(`
          *,
          training_module:training_modules(id, title, category, estimated_duration_minutes),
          user:profiles(id, full_name)
        `)
        .in('user_id', userIds)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true })

      if (error) throw error
      return data || []
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
      fullMark: 100,
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
    acc + (completion.training_module?.estimated_duration_minutes || 0) / 60, 0) || 0
  const averageScore = userProgress?.reduce((acc, completion) =>
    acc + (completion.score || 0), 0) / (totalCompletions || 1) || 0

  const currentStreak = calculateStreak(fullHistory || [])

  // Real achievements from database
  const { data: achievements } = useUserAchievements()
  const { data: achievementStats } = useAchievementStats()
  
  const totalPoints = achievementStats?.totalPoints || 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-muted-foreground">{t('visualization.streak')}</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {currentStreak} <span className="text-sm font-normal text-muted-foreground">{t('days')}</span>
                </p>
                <p className="text-xs text-muted-foreground">{t('visualization.keepItUp')}</p>
              </div>
              <Flame className={cn("w-8 h-8", currentStreak > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-muted-foreground")} />
            </div>
          </CardContent>
        </Card>

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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'personal' | 'department')} className="space-y-4">
        <TabsList className={isRTL ? 'flex-row-reverse' : ''}>
          <TabsTrigger value="personal">{t('visualization.personalProgress')}</TabsTrigger>
          <TabsTrigger value="department">{t('visualization.department')}</TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="w-4 h-4 mr-1" />
            {t('visualization.achievements')}
            {achievements && achievements.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {achievements.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          {activeTab === 'personal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Progress - Area Chart */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <TrendingUp className="h-5 w-5" />
                  {t('visualization.dailyProgress')}
                </CardTitle>
                <CardDescription>
                  {t('visualization.dailyProgressDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartViewport height={250}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <AreaChart data={userDailyProgress}>
                      <defs>
                        <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        stroke="#0088FE"
                        fillOpacity={1}
                        fill="url(#colorCompletions)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartViewport>
              </CardContent>
            </Card>

            {/* Category Distribution - Pie Chart */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <PieChartIcon className="h-5 w-5" />
                  {t('visualization.trainingCategories')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartViewport height={300}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <PieChart>
                      <Pie
                        data={userCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}
                      >
                        {userCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartViewport>
              </CardContent>
            </Card>

            {/* Skills Radar Chart */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Trophy className="h-5 w-5" />
                  {t('visualization.skillsRadar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartViewport height={300}>
                  {userCategoryData.length > 2 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={userCategoryData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                        <Radar
                          name="Skills"
                          dataKey="count"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>{t('visualization.needMoreDataForRadar')}</p>
                    </div>
                  )}
                </ChartViewport>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="department" className="space-y-4">
          {activeTab === 'department' && (
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
                <ChartViewport height={250}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <BarChart data={departmentDailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completions" fill="#00C49F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartViewport>
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
                <ChartViewport height={250}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <BarChart data={departmentCategoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#FFBB28" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartViewport>
              </CardContent>
            </Card>

            {/* No Department Data Message */}
            {(!departmentProgress || departmentProgress.length === 0) && (
              <Card className="col-span-1 lg:col-span-2">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('visualization.noDeptData')}</h3>
                  <p className="text-muted-foreground">
                    {t('visualization.noDeptDataDesc')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {activeTab === 'achievements' && (
          <div className="space-y-6">
            {/* Achievement Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Achievements</p>
                      <p className="text-2xl font-bold">{achievements?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Points</p>
                      <p className="text-2xl font-bold">{totalPoints}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Flame className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Streak</p>
                      <p className="text-2xl font-bold">{currentStreak} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievements List */}
            {achievements && achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <AchievementBadge 
                    key={achievement.id} 
                    achievement={achievement}
                    size="md"
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Complete training modules, maintain streaks, and help colleagues to earn achievements!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
