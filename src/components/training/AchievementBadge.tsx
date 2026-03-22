/**
 * AchievementBadge Component
 * 
 * Displays a single achievement with icon and details.
 */

import type { Achievement } from '@/hooks/useAchievements'
import { cn } from '@/lib/utils'
import { Award, BookOpen, CheckCircle, Flame, GraduationCap, ShieldCheck, Sunrise, Target, Trophy, Users, Zap } from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'award': Award,
  'graduation-cap': GraduationCap,
  'target': Target,
  'shield-check': ShieldCheck,
  'trophy': Trophy,
  'check-circle': CheckCircle,
  'zap': Zap,
  'book-open': BookOpen,
  'users': Users,
  'sunrise': Sunrise,
  'flame': Flame
}

const colorMap: Record<string, string> = {
  'gold': 'bg-amber-100 text-amber-700 border-amber-200',
  'blue': 'bg-blue-100 text-blue-700 border-blue-200',
  'green': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'purple': 'bg-purple-100 text-purple-700 border-purple-200',
  'orange': 'bg-orange-100 text-orange-700 border-orange-200',
  'indigo': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'pink': 'bg-pink-100 text-pink-700 border-pink-200',
  'amber': 'bg-amber-100 text-amber-700 border-amber-200',
  'red': 'bg-red-100 text-red-700 border-red-200',
  'emerald': 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

interface AchievementBadgeProps {
  achievement: Achievement
  showDate?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function AchievementBadge({ achievement, showDate = true, size = 'md' }: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon] || Award
  const colorClass = colorMap[achievement.color] || colorMap.gold

  const sizeClasses = {
    sm: 'p-2 gap-2',
    md: 'p-3 gap-3',
    lg: 'p-4 gap-4'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className={cn(
      "flex items-center rounded-xl border transition-all hover:shadow-md",
      colorClass,
      sizeClasses[size]
    )}>
      <div className={cn(
        "shrink-0 rounded-lg bg-white/50 p-2",
        size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-2.5' : 'p-2'
      )}>
        <Icon className={cn(iconSizes[size], colorClass.split(' ')[1])} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-semibold truncate",
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {achievement.title}
        </h4>
        {size !== 'sm' && (
          <p className="text-xs opacity-80 line-clamp-1">
            {achievement.description}
          </p>
        )}
        {showDate && (
          <p className="text-[10px] opacity-60 mt-0.5">
            Earned {new Date(achievement.earned_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <span className={cn(
          "font-bold",
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          +{achievement.points}
        </span>
        <span className="text-[10px] opacity-60 block">pts</span>
      </div>
    </div>
  )
}

export default AchievementBadge
