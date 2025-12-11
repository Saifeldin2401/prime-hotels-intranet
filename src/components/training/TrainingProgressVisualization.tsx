import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  Award, 
  Target, 
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  BarChart3,
  PieChart,
  Activity,
  BookOpen,
  Users,
  Star
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { cn } from '@/lib/utils'

interface TrainingProgressVisualizationProps {
  className?: string
}

export function TrainingProgressVisualization({ className }: TrainingProgressVisualizationProps) {
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{totalCompletions}</p>
                <p className="text-xs text-muted-foreground">trainings</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Spent</p>
                <p className="text-2xl font-bold">{Math.round(totalHours)}h</p>
                <p className="text-xs text-muted-foreground">learning</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">{Math.round(averageScore)}%</p>
                <p className="text-xs text-muted-foreground">performance</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Points</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">earned</p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Progress Analytics</h3>
        <div className="flex gap-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="capitalize"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Progress</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={userDailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="completions" 
                        stroke="#0088FE" 
                        fill="#0088FE" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Training Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={userCategoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ category, count }) => `${category}: ${count}`}
                      >
                        {userCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="department" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Daily Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Department Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={departmentDailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completions" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Department Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Department Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={departmentCategoryData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements?.map((userAchievement) => (
                  <Card key={userAchievement.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Award className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{userAchievement.achievement?.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {userAchievement.achievement?.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {userAchievement.achievement?.points} pts
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
                    <p>No achievements yet. Keep training to earn your first badge!</p>
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
