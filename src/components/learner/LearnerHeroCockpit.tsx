import React from 'react'
import { Calendar as CalendarIcon, Sparkles, Award } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LearnerHeroCockpitProps {
    firstName: string
    greetingText: string
    greetingEmoji?: string
    subtitleText?: string
    avatarUrl?: string
    gregorianDate: string
    hijriDate: string
    propertyName?: string
    departmentName?: string
    masteryLevel?: {
        level: number
        title: string
        titleAr: string
        progress: number
    }
    stats: {
        inProgress: number
        completed: number
        certificatesCount: number
        streakDays: number
    }
    isRTL: boolean
    t: (key: string, defaultValue?: string) => string
}

export const LearnerHeroCockpit: React.FC<LearnerHeroCockpitProps> = ({
    firstName,
    greetingText,
    greetingEmoji = '✨',
    subtitleText,
    avatarUrl,
    gregorianDate,
    hijriDate,
    propertyName,
    departmentName,
    masteryLevel = {
        level: 3,
        title: 'Senior Hospitality Associate',
        titleAr: 'أخصائي ضيافة متقدم',
        progress: 75,
    },
    stats,
    isRTL,
    t,
}) => {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 border-t-amber-400/35 bg-gradient-to-br from-card/95 via-card/85 to-amber-950/[0.08] p-6 sm:p-7 backdrop-blur-2xl shadow-lg transition-all duration-300">
            {/* Ambient Warm Champagne Glows */}
            <div className="absolute top-0 end-0 -mt-10 -me-10 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 start-0 -mb-8 -ms-8 h-48 w-48 rounded-full bg-amber-600/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Branding, Dates, Greeting, Mastery Level */}
                <div className="space-y-4 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 font-semibold text-xs gap-1.5 backdrop-blur-md shadow-sm"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                            <span>{isRTL ? 'منظومة التميز الفندقي • ألتوس' : 'ALTUS Hospitality Excellence Cockpit'}</span>
                        </Badge>

                        {(propertyName || departmentName) && (
                            <Badge
                                variant="secondary"
                                className="bg-slate-900/60 text-slate-300 border-slate-700/60 px-2.5 py-0.5 text-xs font-mono backdrop-blur-md"
                            >
                                {[propertyName, departmentName].filter(Boolean).join(' • ')}
                            </Badge>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-background/50 px-2.5 py-1 rounded-full border border-border/50 backdrop-blur-md">
                            <CalendarIcon className="h-3.5 w-3.5 text-amber-500" />
                            <span>{gregorianDate}</span>
                            {hijriDate && (
                                <>
                                    <span className="text-border">•</span>
                                    <span className="text-amber-600/90 dark:text-amber-400/90 font-medium">{hijriDate}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-md bg-slate-900/80 ring-4 ring-amber-500/15">
                                <img
                                    src={avatarUrl || '/assets/altus/learner-male.jpg'}
                                    alt={firstName}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/assets/altus/learner-male.jpg'
                                    }}
                                />
                            </div>
                            <span className="absolute -bottom-1 -end-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background ring-2 ring-emerald-400/40" />
                        </div>

                        <div className="min-w-0">
                            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                                {greetingText}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600">{firstName}</span> {greetingEmoji}
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1 max-w-xl line-clamp-2">
                                {subtitleText || (isRTL
                                    ? 'لوحة القيادة التعليمية من ألتوس: تابع برامجك التدريبية وأتقن معايير الضيافة العالمية.'
                                    : 'Your executive ALTUS learning command center. Elevate Forbes 5-star hospitality standards and track your credentials.')}
                            </p>
                        </div>
                    </div>

                    {/* Integrated Mastery Tier Capsule */}
                    <div className="flex items-center gap-3 pt-0.5">
                        <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                            <Award className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 max-w-sm">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-foreground text-[11px] truncate">
                                    {isRTL ? masteryLevel.titleAr : masteryLevel.title}
                                </span>
                                <span className="text-[11px] font-mono text-amber-500 font-bold">
                                    {isRTL ? `المستوى ${masteryLevel.level}` : `Level ${masteryLevel.level}`} • {masteryLevel.progress}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/40">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                                    style={{ width: `${masteryLevel.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Sleek Integrated Frosted Metrics Capsule */}
                <div className="flex items-center justify-around divide-x divide-border/50 rtl:divide-x-reverse rounded-2xl border border-amber-500/20 bg-background/50 p-2.5 sm:p-3 backdrop-blur-xl shadow-inner min-w-[280px] sm:min-w-[340px] shrink-0">
                    <div className="px-3 text-center">
                        <div className="font-mono text-xl sm:text-2xl font-bold text-amber-500">
                            {stats.inProgress}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                            {t('training:inProgress', 'In Progress')}
                        </div>
                    </div>

                    <div className="px-3 text-center">
                        <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-500">
                            {stats.completed}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                            {t('training:completed', 'Completed')}
                        </div>
                    </div>

                    <div className="px-3 text-center">
                        <div className="font-mono text-xl sm:text-2xl font-bold text-blue-500">
                            {stats.certificatesCount}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                            {t('training:certificates', 'Certificates')}
                        </div>
                    </div>

                    <div className="px-3 text-center">
                        <div className="font-mono text-xl sm:text-2xl font-bold text-orange-500">
                            {stats.streakDays}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                            {t('training:streakDays', 'Day Streak')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
