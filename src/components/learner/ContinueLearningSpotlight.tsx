import React from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, ArrowRight, BookOpen, Compass, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { resolveAssetForTrack } from '@/lib/altusAssetRegistry'

interface InProgressModule {
    content_id: string
    progress_percentage: number
    title?: string
    description?: string
    category?: string
    estimated_duration_minutes?: number
    currentChapter?: string
    thumbnail_url?: string
}

interface ContinueLearningSpotlightProps {
    module?: InProgressModule | null
    isLoading?: boolean
    isRTL: boolean
    t: (key: string, defaultValue?: string) => string
}

export const ContinueLearningSpotlight: React.FC<ContinueLearningSpotlightProps> = ({
    module,
    isLoading = false,
    isRTL,
    t,
}) => {
    if (isLoading) {
        return (
            <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 p-8 animate-pulse h-60">
                <div className="h-6 w-36 bg-slate-800/80 rounded-full mb-4" />
                <div className="h-8 w-3/4 bg-slate-800/80 rounded-lg mb-2" />
                <div className="h-4 w-1/2 bg-slate-800/80 rounded mb-6" />
                <div className="h-3 w-72 bg-slate-800/80 rounded-full" />
            </div>
        )
    }

    if (!module) {
        return (
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 border-t-amber-400/30 bg-gradient-to-br from-card/90 via-card/70 to-amber-950/[0.05] p-6 sm:p-8 text-center backdrop-blur-xl shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3 shadow-inner border border-amber-500/20">
                    <Compass className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                    {isRTL ? 'جاهز لبدء برنامجك التدريبي القادم؟' : 'Ready to start your next learning journey?'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    {isRTL
                        ? 'استكشف مناهج ألتوس المعتمدة وسجل في دورات الضيافة الفاخرة المتاحة لك.'
                        : 'Explore accredited ALTUS curriculum and enroll in luxury hospitality courses tailored for your career.'}
                </p>
                <div className="mt-5">
                    <Link
                        to="/courses"
                        className="inline-flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 text-xs sm:text-sm shadow-md transition-all duration-150 active:scale-[0.97] gap-2"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span>{isRTL ? 'تصفح كتالوج الدورات' : 'Explore Course Catalog'}</span>
                        <ArrowRight className={cn('h-4 w-4', isRTL && 'rotate-180')} />
                    </Link>
                </div>
            </div>
        )
    }

    // High quality luxury hospitality track artwork
    const backgroundPhoto = module.thumbnail_url || resolveAssetForTrack({
        title: module.title,
        description: module.description,
        category: module.category,
        id: module.content_id,
    })

    return (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 border-t-amber-400/40 bg-[#0B0F17] shadow-xl group">
            {/* Cinematic Background Image with Dual Scrim Gradients */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-30"
                style={{ backgroundImage: `url(${backgroundPhoto})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070A0F] via-[#0B0F17]/85 to-[#0B0F17]/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070A0F] via-[#0B0F17]/90 to-transparent" />

            {/* Glowing Accent Aura */}
            <div className="absolute top-0 end-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Content Body */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-4 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 text-xs gap-1.5 shadow-sm">
                            <Play className="h-3 w-3 fill-current" />
                            {isRTL ? 'متابعة التعلم الفوري' : 'Continue Learning'}
                        </Badge>

                        {module.category && (
                            <Badge variant="outline" className="border-slate-700 bg-slate-900/60 text-slate-300 text-xs">
                                {module.category}
                            </Badge>
                        )}

                        {module.estimated_duration_minutes && (
                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1 bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-slate-800">
                                <Clock className="h-3 w-3 text-amber-500" />
                                {module.estimated_duration_minutes} {isRTL ? 'دقيقة متبقية' : 'mins remaining'}
                            </span>
                        )}
                    </div>

                    <div>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                            {module.title ?? `${t('training:module', 'Module')} ${module.content_id.slice(0, 8)}`}
                        </h2>
                        {module.description && (
                            <p className="text-sm text-slate-300 font-sans line-clamp-2 mt-2 leading-relaxed max-w-xl">
                                {module.description}
                            </p>
                        )}
                        {module.currentChapter && (
                            <div className="text-xs font-mono text-amber-400/90 mt-2 flex items-center gap-1.5">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                                <span>{isRTL ? 'الفصل الحالي: ' : 'Active Lesson: '}{module.currentChapter}</span>
                            </div>
                        )}
                    </div>

                    {/* Pace & Progress Bar */}
                    <div className="space-y-2 max-w-md pt-1">
                        <div className="flex justify-between text-xs font-mono text-slate-400">
                            <span>{isRTL ? 'نسبة الإنجاز في المنهج' : 'Curriculum Progression'}</span>
                            <span className="font-bold text-amber-400">{module.progress_percentage}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${module.progress_percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tactile Resume Button */}
                <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0">
                    <Link
                        to={`/learning/training/${module.content_id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-8 py-4 text-sm sm:text-base shadow-xl hover:shadow-amber-500/20 transition-all duration-200 active:scale-[0.97] gap-2.5 group/btn"
                    >
                        <Play className="h-5 w-5 fill-current transition-transform group-hover/btn:scale-110" />
                        <span>{isRTL ? 'استئناف التدريب' : 'Resume Module'}</span>
                        <ArrowRight className={cn('h-5 w-5 transition-transform group-hover/btn:translate-x-1', isRTL && 'rotate-180 group-hover/btn:-translate-x-1')} />
                    </Link>
                </div>
            </div>
        </div>
    )
}
