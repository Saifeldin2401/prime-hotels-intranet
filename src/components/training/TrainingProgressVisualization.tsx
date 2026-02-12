import { useState } from 'react'
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
  Trophy
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

interface TrainingProgressVisualizationProps {
  className?: string
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

      const { data, error } = await supabase
        .from('training_progress')
        .select(`
          *,
          training_module:training_modules(id, title, category, estimated_duration_minutes, difficulty_level),
          user:profiles(id, full_name)
        `)
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true })

      if (error) throw error
      return data
    }
  })

  // Fetch ALL time progress for Streak calculation to be accurate
  // We can optimize this later, but for now we need full history for streak
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

      /* 
       * Department progress query - temporarily disabled/mocked because 'department_id' 
       * is not directly available on profiles and query complexity is high.
       * Also updating table to training_progress.
       */

      return [] // returning empty for now to avoid errors while we fix schema

      /*
      const { data, error } = await supabase
        .from('training_progress')
        .select(`
          *,
          training_module:training_modules(id, title, category, estimated_duration_minutes),
          user:profiles(id, full_name)
        `)
        // .eq('user.department_id', departmentId) // This relationship path is tricky with Supabase
        .gte('completed_at', startDate.toISOString())
      */

      // if (error) throw error
      // return data
    }
  })

  const { data: achievements } = useQuery({
    queryKey: ['training-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // MOCK: user_achievements table does not exist in schema yet
      // Returning empty array to prevent 404 errors
      const { data, error } = await supabase
        .from('certificates') // using certificates as proxy for now if needed, or just empty
        .select(`*, training_module:training_module_id(title)`)
        .eq('user_id', user.id)
        .limit(10)

      if (error) return []

      // Transform certificates to look like achievements for now
      return data?.map(c => ({
        id: c.id,
        earned_at: c.issued_at,
        achievement: {
          title: c.training_module?.title || 'Certificate',
          description: 'Course Completion',
          points: 10,
          icon: '',
          category: 'Training'
        }
      })) || []

      /* 
        .from('user_achievements')
        .select(`
          *,
          achievement:achievement_id(id, title, description, icon, points, category)
        `)
      */

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
      fullMark: 100, // For Radar chart scaling if needed
      fill: getCategoryColor(category)
    }))
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Safety': '#00C49F', // Green
      'Service': '#0088FE', // Blue
      'Operations': '#FFBB28', // Yellow
      'Management': '#FF8042', // Orange
      'Compliance': '#8884D8', // Purple
      'Technical': '#82CA9D'  // Light Green
    }
    return colors[category] || '#94A3B8' // Gray default
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
  const totalPoints = achievements?.reduce((acc, achievement) =>
    acc + (achievement.achievement?.points || 0), 0) || 0

  const currentStreak = calculateStreak(fullHistory || [])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'personal' | 'department' | 'achievements')} className="space-y-4">
        <TabsList className={isRTL ? 'flex-row-reverse' : ''}>
          <TabsTrigger value="personal">{t('visualization.personalProgress')}</TabsTrigger>
          <TabsTrigger value="department">{t('visualization.department')}</TabsTrigger>
          <TabsTrigger value="achievements">{t('visualization.achievements')}</TabsTrigger>
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
                <div className="h-[250px] min-h-[250px] w-full" style={{ minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={0} debounce={50}>
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
                </div>
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
                <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: 300 }}>
                  <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={50}>
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
                </div>
              </CardContent>
            </Card>

            {/* Skills Radar Chart - New Addition */}
            <Card>
              <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Trophy className="h-5 w-5" />
                  {t('visualization.skillsRadar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: 300 }}>
                  {userCategoryData.length > 2 ? (
                    <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={50}>
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
                </div>
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
                <div className="h-[250px] min-h-[250px] w-full" style={{ minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={0} debounce={50}>
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
                <div className="h-[250px] min-h-[250px] w-full" style={{ minHeight: 250 }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={0} debounce={50}>
                    <BarChart data={departmentCategoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#FFBB28" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {activeTab === 'achievements' && (
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
                  <Card key={userAchievement.id} className={cn("border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow", isRTL ? "text-right" : "text-left")}>
                    <CardContent className="p-4">
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                          {userAchievement.achievement?.icon ? (
                            <img src={userAchievement.achievement.icon} alt="" className="w-8 h-8" />
                          ) : (
                            <Award className="h-6 w-6 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{userAchievement.achievement?.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {userAchievement.achievement?.description}
                          </p>
                          <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-800 hover:bg-yellow-100">
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
                  <div className="col-span-full text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                    <Award className="h-16 w-16 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium">{t('visualization.noAchievements')}</p>
                    <p className="text-sm">{t('visualization.completeTrainingToEarn')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
