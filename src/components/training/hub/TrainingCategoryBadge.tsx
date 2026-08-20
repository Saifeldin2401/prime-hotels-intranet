import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Award,
  BookOpen,
  Briefcase,
  Building,
  Coffee,
  Crown,
  FileCheck,
  HeartHandshake,
  KeyRound,
  Layers,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Utensils,
  Wrench
} from 'lucide-react'

export interface CategoryTheme {
  label: string
  bg: string
  text: string
  border: string
  dot: string
  icon: LucideIcon
}

export function getCategoryTheme(categoryName?: string | null): CategoryTheme {
  const cat = (categoryName || '').toLowerCase().trim()

  if (cat.includes('front') || cat.includes('reception') || cat.includes('hafawa') || cat.includes('concierge') || cat.includes('guest')) {
    return {
      label: categoryName || 'Front Desk & Hafawa',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
      icon: HeartHandshake
    }
  }

  if (cat.includes('food') || cat.includes('beverage') || cat.includes('f&b') || cat.includes('dining') || cat.includes('culinary') || cat.includes('kitchen') || cat.includes('restaurant')) {
    return {
      label: categoryName || 'Food & Beverage',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      icon: Utensils
    }
  }

  if (cat.includes('housekeep') || cat.includes('room') || cat.includes('laundry') || cat.includes('clean')) {
    return {
      label: categoryName || 'Housekeeping',
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-800 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800',
      dot: 'bg-sky-500',
      icon: Sparkles
    }
  }

  if (cat.includes('compliance') || cat.includes('safety') || cat.includes('security') || cat.includes('haccp') || cat.includes('fire') || cat.includes('audit')) {
    return {
      label: categoryName || 'Safety & Compliance',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-800 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500',
      icon: ShieldCheck
    }
  }

  if (cat.includes('leader') || cat.includes('manage') || cat.includes('executive') || cat.includes('supervisor')) {
    return {
      label: categoryName || 'Leadership',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      dot: 'bg-purple-500',
      icon: Crown
    }
  }

  if (cat.includes('onboard') || cat.includes('orient') || cat.includes('brand') || cat.includes('culture')) {
    return {
      label: categoryName || 'Brand & Onboarding',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
      icon: Award
    }
  }

  if (cat.includes('engineer') || cat.includes('maint') || cat.includes('facility') || cat.includes('technic')) {
    return {
      label: categoryName || 'Engineering',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      dot: 'bg-orange-500',
      icon: Wrench
    }
  }

  return {
    label: categoryName || 'General',
    bg: 'bg-slate-50 dark:bg-slate-900',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: Tag
  }
}

interface TrainingCategoryBadgeProps {
  category?: string | null
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'default'
}

export function TrainingCategoryBadge({
  category,
  className,
  showIcon = true,
  size = 'default'
}: TrainingCategoryBadgeProps) {
  if (!category) return null

  const theme = getCategoryTheme(category)
  const Icon = theme.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-colors border",
        size === 'sm' ? "text-[10px] px-1.5 py-0.2 h-5 gap-1" : "text-xs px-2 py-0.5 gap-1.5",
        theme.bg,
        theme.text,
        theme.border,
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} />}
      <span className="truncate">{category}</span>
    </Badge>
  )
}
