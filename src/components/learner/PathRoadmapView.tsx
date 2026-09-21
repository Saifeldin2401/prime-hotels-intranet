import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    Lock,
    Play,
    Sparkles,
    Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrainingPath, TrainingPathModule, TrainingModule } from '@/lib/types'

interface PathWithModules extends TrainingPath {
    training_path_modules: (TrainingPathModule & {
        training_modules: TrainingModule
    })[]
}

interface PathRoadmapViewProps {
    path: PathWithModules
    userProgress?: Array<{
        training_id?: string
        status?: string
        progress_percentage?: number
    }>
    onContinue?: (moduleId: string) => void
    isEnrolled?: boolean
    onEnroll?: (pathId: string) => void
    isEnrolling?: boolean
}

export const PathRoadmapView: React.FC<PathRoadmapViewProps> = ({
    path,
    userProgress = [],
    onContinue,
    isEnrolled = true,
    onEnroll,
    isEnrolling = false,
}) => {
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const navigate = useNavigate()

    // Sort modules by sequence
    const sortedModules = useMemo(() => {
        return [...(path.training_path_modules || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    }, [path.training_path_modules])

    // Progress lookup
    const progressMap = useMemo(() => {
        const map = new Map<string, { status: string; progress_percentage: number }>()
        userProgress.forEach((p) => {
            if (p.training_id) {
                map.set(p.training_id, {
                    status: p.status || 'not_started',
                    progress_percentage: p.progress_percentage || 0,
                })
            }
        })
        return map
    }, [userProgress])

    // Calculate completed count and overall progress
    const { completedCount, overallPercent, currentModuleId } = useMemo(() => {
        let done = 0
        let firstUnfinishedId: string | null = null

        sortedModules.forEach((item) => {
            const modId = item.training_modules?.id || item.module_id
            const prog = progressMap.get(modId)
            if (prog?.status === 'completed' || (prog?.progress_percentage ?? 0) >= 100) {
                done++
            } else if (!firstUnfinishedId) {
                firstUnfinishedId = modId
            }
        })

        const total = sortedModules.length || 1
        const pct = Math.min(100, Math.round((done / total) * 100))

        return {
            completedCount: done,
            overallPercent: pct,
            currentModuleId: firstUnfinishedId || (sortedModules[0]?.training_modules?.id || sortedModules[0]?.module_id),
        }
    }, [sortedModules, progressMap])

    const isPathComplete = overallPercent >= 100 && sortedModules.length > 0

    const handleResume = () => {
        if (!isEnrolled && onEnroll) {
            onEnroll(path.id)
            return
        }
        if (currentModuleId) {
            if (onContinue) {
                onContinue(currentModuleId)
            } else {
                navigate(`/training/player/${currentModuleId}`)
            }
        }
    }

    return (
        <Card className="rounded-3xl border border-border/80 bg-card shadow-lg overflow-hidden transition-all duration-300 hover:border-amber-500/30">
            {/* Path Top Hero Header */}
            <div className="relative bg-gradient-to-r from-[#03103b] via-[#071c59] to-[#0c2770] p-6 sm:p-8 text-white">
                <div className="absolute top-0 end-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-3 py-1 font-bold">
                                <Sparkles className="h-3 w-3 me-1" />
                                {isRTL ? 'مسار التعلم المعتمد' : 'Accredited Learning Path'}
                            </Badge>

                            {path.is_mandatory && (
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-xs px-2.5 py-0.5 font-semibold">
                                    {isRTL ? 'إلزامي' : 'Mandatory'}
                                </Badge>
                            )}

                            {path.certificate_enabled && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-2.5 py-0.5 font-medium">
                                    <Award className="h-3 w-3 me-1" />
                                    {isRTL ? 'شهادة اعتماد مهني' : 'Accredited Credential'}
                                </Badge>
                            )}
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-white">
                            {path.title}
                        </h2>

                        {path.description && (
                            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed font-normal">
                                {path.description}
                            </p>
                        )}

                        {/* Metrics bar */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-blue-200/90 pt-1">
                            <span className="flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                                {sortedModules.length} {isRTL ? 'محطات تدريبية' : 'Milestone Modules'}
                            </span>
                            {path.estimated_duration_hours ? (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-blue-300" />
                                    {path.estimated_duration_hours} {isRTL ? 'ساعات تدريبية' : 'Hours'}
                                </span>
                            ) : null}
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                {completedCount} / {sortedModules.length} {isRTL ? 'مكتمل' : 'Completed'}
                            </span>
                        </div>
                    </div>

                    {/* Action Block */}
                    <div className="shrink-0 flex flex-col items-start md:items-end gap-3 min-w-[180px]">
                        {isEnrolled && (
                            <div className="w-full text-end">
                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                    <span className="text-blue-200">{isRTL ? 'نسبة الإنجاز' : 'Path Progress'}</span>
                                    <span className={isPathComplete ? "text-emerald-400" : "text-amber-400"}>
                                        {overallPercent}%
                                    </span>
                                </div>
                                <Progress value={overallPercent} className="h-2.5 bg-blue-950/80" />
                            </div>
                        )}

                        <Button
                            onClick={handleResume}
                            disabled={isEnrolling}
                            size="lg"
                            className={cn(
                                "w-full rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all",
                                isPathComplete
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                            )}
                        >
                            {isEnrolling ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    {isRTL ? 'جاري التسجيل...' : 'Enrolling...'}
                                </span>
                            ) : !isEnrolled ? (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {isRTL ? 'التسجيل في المسار' : 'Enroll in Path'}
                                </span>
                            ) : isPathComplete ? (
                                <span className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4" />
                                    {isRTL ? 'مراجعة المسار المكتمل' : 'Review Path'}
                                </span>
                            ) : completedCount > 0 ? (
                                <span className="flex items-center gap-2">
                                    <Play className="h-4 w-4 fill-current" />
                                    {isRTL ? 'متابعة المسار التدريبي' : 'Resume Journey'}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Play className="h-4 w-4 fill-current" />
                                    {isRTL ? 'بدء المحطة الأولى' : 'Begin First Stop'}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Interactive Connected Roadmap Timeline */}
            <CardContent className="p-6 sm:p-8">
                <div className="relative">
                    {/* Vertical Connecting Line */}
                    <div
                        className={cn(
                            "absolute top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-800",
                            isRTL ? "end-5 sm:end-6" : "start-5 sm:start-6"
                        )}
                    />

                    <div className="space-y-6 sm:space-y-8 relative">
                        {sortedModules.map((item, idx) => {
                            const mod = item.training_modules
                            if (!mod) return null

                            const prog = progressMap.get(mod.id)
                            const isDone = prog?.status === 'completed' || (prog?.progress_percentage ?? 0) >= 100
                            const isCurrent = mod.id === currentModuleId && !isPathComplete
                            const isLocked = !isDone && !isCurrent && idx > 0 && !(progressMap.get(sortedModules[idx - 1]?.training_modules?.id)?.status === 'completed')

                            return (
                                <div key={mod.id || idx} className="relative flex items-start gap-4 sm:gap-6 group">
                                    {/* Timeline Node Badge */}
                                    <div className="relative z-10 shrink-0">
                                        <div className={cn(
                                            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300",
                                            isDone
                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                : isCurrent
                                                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-4 ring-amber-500/20 animate-pulse"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-border"
                                        )}>
                                            {isDone ? (
                                                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                                            ) : isCurrent ? (
                                                <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current ms-0.5" />
                                            ) : (
                                                <span>{idx + 1}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Module Card Content */}
                                    <div className={cn(
                                        "flex-1 p-4 sm:p-5 rounded-2xl border transition-all duration-200",
                                        isCurrent
                                            ? "bg-amber-500/5 border-amber-500/40 shadow-md"
                                            : isDone
                                            ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30"
                                            : "bg-card border-border/80 hover:border-slate-300 dark:hover:border-slate-700"
                                    )}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                        {isRTL ? `المحطة ${idx + 1}` : `Milestone ${idx + 1}`}
                                                    </span>

                                                    {isCurrent && (
                                                        <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold py-0 px-2">
                                                            {isRTL ? 'المحطة الحالية' : 'Current Stop'}
                                                        </Badge>
                                                    )}

                                                    {isDone && (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border-emerald-500/20 py-0 px-2">
                                                            {isRTL ? 'تم الإنجاز' : 'Completed'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <h3 className="text-base sm:text-lg font-bold text-foreground">
                                                    {mod.title}
                                                </h3>

                                                {mod.description && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                                        {mod.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground font-medium">
                                                    {mod.estimated_duration_minutes ? (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {mod.estimated_duration_minutes} {isRTL ? 'دقيقة' : 'mins'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-xl text-xs font-semibold h-8"
                                                >
                                                    <Link to={`/courses/${mod.id}`}>
                                                        {isRTL ? 'التفاصيل' : 'Syllabus'}
                                                    </Link>
                                                </Button>

                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className={cn(
                                                        "rounded-xl text-xs font-bold h-8 px-3 shadow-xs",
                                                        isDone
                                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                                                            : isCurrent
                                                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
                                                            : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700"
                                                    )}
                                                >
                                                    <Link to={`/training/player/${mod.id}`}>
                                                        {isDone ? (
                                                            <span>{isRTL ? 'مراجعة' : 'Review'}</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1">
                                                                <Play className="h-3 w-3 fill-current" />
                                                                {isRTL ? 'بدء المحطة' : 'Launch'}
                                                            </span>
                                                        )}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Final Milestone: Capstone Credential */}
                        <div className="relative flex items-start gap-4 sm:gap-6">
                            <div className="relative z-10 shrink-0">
                                <div className={cn(
                                    "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300",
                                    isPathComplete
                                        ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/20"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-border"
                                )}>
                                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                            </div>

                            <div className={cn(
                                "flex-1 p-5 rounded-2xl border transition-all duration-200",
                                isPathComplete
                                    ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/40"
                                    : "bg-muted/40 border-border/80"
                            )}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <Badge className={cn(
                                            "text-[10px] font-bold py-0 px-2 mb-1",
                                            isPathComplete
                                                ? "bg-amber-500 text-slate-950"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none"
                                        )}>
                                            {isRTL ? 'الاعتماد النهائي للمسار' : 'Capstone Certification'}
                                        </Badge>
                                        <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                                            {isRTL ? 'شهادة التميز المهني المعتمدة من آلتوس' : 'ALTUS Professional Accreditation'}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                            {isPathComplete
                                                ? (isRTL ? 'تهانينا! لقد أتممت جميع متطلبات المسار التدريبي وحصلت على الاعتماد الكامل.' : 'Congratulations! You have successfully mastered all milestones in this path.')
                                                : (isRTL ? 'أتمم كافة المحطات التدريبية السابقة لإلغاء القفل والحصول على الشهادة الرسمية.' : 'Complete all milestones above to earn your verified credential and digital badge.')}
                                        </p>
                                    </div>

                                    <Button
                                        asChild={isPathComplete}
                                        disabled={!isPathComplete}
                                        className={cn(
                                            "rounded-xl text-xs font-bold h-9 px-4 shrink-0",
                                            isPathComplete
                                                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                        )}
                                    >
                                        {isPathComplete ? (
                                            <Link to="/training/certificates">
                                                <Award className="h-4 w-4 me-1.5 text-slate-950" />
                                                {isRTL ? 'عرض الشهادة' : 'View Certificate'}
                                            </Link>
                                        ) : (
                                            <span>
                                                <Lock className="h-3.5 w-3.5 me-1.5" />
                                                {isRTL ? 'مغلق حتى الإتمام' : 'Locked'}
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
