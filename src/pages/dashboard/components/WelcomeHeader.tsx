import { motion } from 'framer-motion'
import { 
  RefreshCw, 
  Sparkles, 
  Building2, 
  MapPin, 
  Briefcase, 
  Bell, 
  Settings,
  Sun,
  Moon,
  Cloud,
  Star,
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useTasks } from '@/hooks/useTasks'
import { useEvents } from '@/hooks/useEvents'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useTranslation } from "react-i18next";
import { ar } from 'date-fns/locale';

interface WelcomeHeaderProps {
  taskCount?: number
  meetingCount?: number
  completionRate?: number
  config: {
    title: string
    subtitle: string
    theme: string
    accentColor: string
  }
  onRefresh: () => void
  isLoading: boolean
  unreadCount: number
  onToggleNotifications: () => void
}

// Animated background particles
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          initial={{ 
            x: `${(i * 17) % 100}%`, 
            y: '100%',
            opacity: 0 
          }}
          animate={{ 
            y: '-10%',
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{ 
            duration: 8 + (i % 3) * 2,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  )
}

// Time-based greeting with icon
function GreetingBadge({ hour }: { hour: number }) {
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.dir() === 'rtl';
  
  const getGreeting = () => {
    if (hour < 6) return { text: t('welcome_header.good_night', 'Good night'), icon: Moon, color: 'from-indigo-400 to-purple-400' }
    if (hour < 12) return { text: t('welcome_header.good_morning', 'Good morning'), icon: Sun, color: 'from-amber-400 to-orange-400' }
    if (hour < 17) return { text: t('welcome_header.good_afternoon', 'Good afternoon'), icon: Cloud, color: 'from-sky-400 to-blue-400' }
    if (hour < 21) return { text: t('welcome_header.good_evening', 'Good evening'), icon: Cloud, color: 'from-orange-400 to-pink-400' }
    return { text: t('welcome_header.good_night', 'Good night'), icon: Star, color: 'from-indigo-400 to-purple-400' }
  }

  const { text, icon: Icon, color } = getGreeting()

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        "bg-gradient-to-r text-white shadow-lg backdrop-blur-sm",
        color
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{text}</span>
    </motion.div>
  )
}

// Live clock component
function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-2 text-white/70 text-sm">
      <Clock className="w-4 h-4" />
      <span className="font-mono">{format(time, 'HH:mm:ss')}</span>
    </div>
  )
}

// Quick stat pill
function QuickStat({ label, value, trend }: { label: string; value: string; trend?: 'up' | 'down' }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
      <span className="text-white/60 text-xs">{label}</span>
      <span className="text-white font-semibold text-sm">{value}</span>
      {trend && (
        <TrendingUp className={cn(
          "w-3 h-3",
          trend === 'up' ? "text-emerald-400" : "text-red-400 rotate-180"
        )} />
      )}
    </div>
  )
}

export function WelcomeHeader({ 
  config, 
  onRefresh, 
  isLoading: isLoadingParent, 
  unreadCount,
  onToggleNotifications,
  taskCount: taskCountProp,
  meetingCount: meetingCountProp,
  completionRate: completionRateProp
}: WelcomeHeaderProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { user, profile } = useAuth()
  const { currentProperty } = useProperty()
  
  // Fetch real data
  const { data: tasks, isLoading: isLoadingTasks } = useTasks({ status: 'pending' })
  const { events: upcomingEvents, isLoading: isLoadingEvents } = useEvents()
  const { data: dashboardStats, isLoading: isLoadingStats } = useDashboardStats()
  
  const hour = new Date().getHours()
  
  // Calculate real stats
  const realTaskCount = taskCountProp ?? (tasks?.length || 0)
  const realMeetingCount = meetingCountProp ?? (upcomingEvents?.length || 0)
  
  // Calculate completion rate from dashboard stats
  const totalTasks = (dashboardStats?.pendingTasks || 0) + (dashboardStats?.completedTraining || 0)
  const completedTasks = dashboardStats?.completedTraining || 0
  const realCompletionRate = completionRateProp ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0)
  
  const isLoading = isLoadingParent || isLoadingTasks || isLoadingEvents || isLoadingStats

  const themeGradients: Record<string, string> = {
    navy: 'from-slate-900 via-slate-800 to-slate-900',
    purple: 'from-violet-900 via-violet-800 to-purple-900',
    gold: 'from-amber-700 via-amber-600 to-orange-700',
    emerald: 'from-emerald-800 via-emerald-700 to-teal-800',
    blue: 'from-blue-900 via-blue-800 to-indigo-900',
    orange: 'from-orange-800 via-orange-700 to-amber-800'
  }

  const accentGradients: Record<string, string> = {
    navy: 'from-blue-500/20 to-cyan-500/20',
    purple: 'from-violet-500/20 to-fuchsia-500/20',
    gold: 'from-amber-500/20 to-yellow-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/20',
    blue: 'from-blue-500/20 to-indigo-500/20',
    orange: 'from-orange-500/20 to-red-500/20'
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden",
        "bg-gradient-to-br",
        themeGradients[config.theme] || themeGradients.navy
      )}
    >
      {/* Animated Background Layers */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <motion.div 
          className={cn(
            "absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-40",
            "bg-gradient-to-br",
            accentGradients[config.theme] || accentGradients.navy
          )}
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 bg-gradient-to-tr from-amber-500/20 to-transparent"
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating particles */}
        <FloatingParticles />
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          
          {/* Left Section - Main Info */}
          <div className="flex-1 space-y-4">
            {/* Top Row: Greeting & Date */}
            <div className="flex flex-wrap items-center gap-3">
              <GreetingBadge hour={hour} />
              
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              
              <LiveClock />
            </div>

            {/* Title Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {config.title}
              </h1>
              <p className="text-lg text-white/70 mt-2 font-light">
                {config.subtitle}
              </p>
            </motion.div>

            {/* Badges Row */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-2"
            >
              {currentProperty?.name && (
                <Badge 
                  variant="secondary" 
                  className="bg-white/10 text-white border-0 backdrop-blur-sm hover:bg-white/20 transition-all cursor-default"
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5" />
                  {currentProperty.name}
                </Badge>
              )}
              {profile?.job_title && (
                <Badge 
                  variant="secondary" 
                  className="bg-white/10 text-white border-0 backdrop-blur-sm hover:bg-white/20 transition-all cursor-default"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  {profile.job_title}
                </Badge>
              )}
            </motion.div>

            {/* Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-2 pt-2"
            >
              <QuickStat label={t('quick_stats.tasks', 'Tasks')} value={realTaskCount.toString()} trend={realTaskCount > 5 ? 'up' : 'down'} />
              <QuickStat label={t('quick_stats.meetings', 'Meetings')} value={realMeetingCount.toString()} />
              <QuickStat label={t('quick_stats.completion', 'Completion')} value={`${realCompletionRate}%`} trend={realCompletionRate > 50 ? 'up' : 'down'} />
            </motion.div>
          </div>

          {/* Right Section - Actions & Profile */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3"
          >
            {/* Action Buttons */}
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl p-1.5 border border-white/10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleNotifications}
                className="relative h-10 w-10 rounded-lg bg-white/10 text-white hover:bg-white/20 hover:text-white transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-semibold ring-2 ring-slate-800"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-10 w-10 rounded-lg bg-white/10 text-white hover:bg-white/20 hover:text-white transition-all"
              >
                <RefreshCw className={cn("w-5 h-5", isLoading && 'animate-spin')} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg bg-white/10 text-white hover:bg-white/20 hover:text-white transition-all"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium text-sm">{profile?.full_name || user?.email}</p>
                <p className="text-white/50 text-xs">{t('welcome_header.online', 'Online')}</p>
              </div>
              <Avatar className="w-12 h-12 ring-2 ring-white/20 ring-offset-2 ring-offset-transparent">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
                  {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>
        </div>

        {/* Bottom Decorative Line */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        />
      </div>
    </motion.div>
  )
}
