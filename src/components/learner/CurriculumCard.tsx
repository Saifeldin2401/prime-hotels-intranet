import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Play, FileQuestion, BookOpen, AlertCircle, ArrowRight, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CurriculumItem {
    id: string
    title: string
    description?: string
    category?: string
    contentType: 'module' | 'quiz' | 'path'
    estimatedDurationMinutes?: number
    progressPercentage?: number
    isMandatory?: boolean
    isOverdue?: boolean
    dueDate?: string | null
    thumbnailUrl?: string
    actionUrl: string
}

interface CurriculumCardProps {
    item: CurriculumItem
    isRTL: boolean
    t: (key: string, defaultValue?: string) => string
    className?: string
    onBookmarkToggle?: (id: string) => void
    isBookmarked?: boolean
}

function resolveCurriculumThumbnail(item: CurriculumItem): string {
    if (item.thumbnailUrl) return item.thumbnailUrl

    const text = `${item.title} ${item.description || ''} ${item.category || ''}`.toLowerCase()

    if (text.includes('استقبال') || text.includes('كاونتر') || text.includes('reception') || text.includes('front desk') || text.includes('check-in') || text.includes('تسجيل الوصول')) {
        return '/assets/altus/reception-desk.jpg'
    }
    if (text.includes('حقائب') || text.includes('أمتعة') || text.includes('luggage') || text.includes('bellman') || text.includes('طلب') || text.includes('مفقودات') || text.includes('concierge')) {
        return '/assets/altus/luggage-trolley.jpg'
    }
    if (text.includes('طعام') || text.includes('أغذية') || text.includes('مشروبات') || text.includes('culinary') || text.includes('f&b') || text.includes('مطعم') || text.includes('dining')) {
        return '/assets/altus/culinary-fnb.jpg'
    }
    if (text.includes('تدقيق') || text.includes('قائمة') || text.includes('sop') || text.includes('checklist') || text.includes('سلامة') || text.includes('امتثال') || text.includes('معايير')) {
        return '/assets/altus/sop-checklist.jpg'
    }
    if (text.includes('شهادة') || text.includes('اعتماد') || text.includes('quiz') || text.includes('assessment') || text.includes('اختبار') || text.includes('تقييم')) {
        return '/assets/altus/cert-badge.jpg'
    }
    if (text.includes('ترحاب') || text.includes('ترحيب') || text.includes('مرحبا') || text.includes('welcome') || text.includes('etiquette') || text.includes('إتيكيت')) {
        return '/assets/altus/hospitality-welcome.jpg'
    }

    const ALTUS_SHOWCASE_GALLERY = [
        '/assets/altus/concierge-frontdesk.jpg',
        '/assets/altus/reception-desk.jpg',
        '/assets/altus/hospitality-welcome.jpg',
        '/assets/altus/luggage-trolley.jpg',
        '/assets/altus/culinary-fnb.jpg',
    ]
    return ALTUS_SHOWCASE_GALLERY[Math.abs(item.id.charCodeAt(0) || 0) % ALTUS_SHOWCASE_GALLERY.length]
}

export const CurriculumCard: React.FC<CurriculumCardProps> = ({
    item,
    isRTL,
    t,
    className,
    onBookmarkToggle,
    isBookmarked = false,
}) => {
    const thumbnail = resolveCurriculumThumbnail(item)

    const progress = item.progressPercentage ?? 0
    const hasStarted = progress > 0
    const isCompleted = progress >= 100

    return (
        <Card className={cn(
            "group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/70",
            "shadow-sm backdrop-blur-xl transition-all duration-300",
            "hover:-translate-y-1.5 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5",
            className
        )}>
            {/* 16:9 Image Container with Scrim Gradients */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                <img
                    src={thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

                {/* Top Ribbons & Actions */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
                        {item.isMandatory && (
                            <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5 shadow-sm">
                                {isRTL ? 'إلزامي' : 'Mandatory'}
                            </Badge>
                        )}
                        {item.isOverdue && (
                            <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5 animate-pulse shadow-sm">
                                <AlertCircle className="h-3 w-3 me-1" />
                                {isRTL ? 'متأخر' : 'Overdue'}
                            </Badge>
                        )}
                        {item.category && !item.isMandatory && !item.isOverdue && (
                            <Badge variant="secondary" className="text-[10px] font-medium bg-black/60 text-white backdrop-blur-md border border-white/10 px-2 py-0.5">
                                {item.category}
                            </Badge>
                        )}
                    </div>

                    {onBookmarkToggle && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                onBookmarkToggle(item.id)
                            }}
                            className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all pointer-events-auto",
                                isBookmarked
                                    ? "bg-amber-500 text-slate-950"
                                    : "bg-black/50 text-white hover:bg-black/80"
                            )}
                            title={isRTL ? 'حفظ الدورة' : 'Bookmark course'}
                        >
                            <Bookmark className={cn("h-3.5 w-3.5", isBookmarked && "fill-current")} />
                        </button>
                    )}
                </div>

                {/* Bottom Meta Pill over Image */}
                <div className="absolute bottom-2.5 start-3 flex items-center gap-2 text-[11px] font-mono text-slate-200">
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                        {item.contentType === 'quiz' ? (
                            <FileQuestion className="h-3 w-3 text-purple-400" />
                        ) : (
                            <BookOpen className="h-3 w-3 text-amber-400" />
                        )}
                        <span>{item.contentType === 'quiz' ? (isRTL ? 'تقييم' : 'Assessment') : (isRTL ? 'دورة تدريبية' : 'Course')}</span>
                    </span>

                    {item.estimatedDurationMinutes && (
                        <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{item.estimatedDurationMinutes} {isRTL ? 'د' : 'min'}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <div className="space-y-1.5">
                    <h3 className="font-display text-base font-bold text-foreground line-clamp-1 group-hover:text-amber-500 transition-colors">
                        {item.title}
                    </h3>
                    {item.description && (
                        <p className="text-xs text-muted-foreground font-sans line-clamp-2 leading-relaxed">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Progress or Status */}
                <div className="space-y-3 pt-1">
                    {hasStarted && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                <span>{isCompleted ? (isRTL ? 'مكتمل' : 'Completed') : (isRTL ? 'التقدم' : 'Progress')}</span>
                                <span className={cn("font-bold", isCompleted ? "text-emerald-500" : "text-amber-500")}>
                                    {progress}%
                                </span>
                            </div>
                            <Progress
                                value={progress}
                                className={cn("h-1.5 bg-muted", isCompleted && "[&>div]:bg-emerald-500")}
                            />
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        {item.dueDate ? (
                            <span className={cn(
                                "text-[11px] font-mono flex items-center gap-1",
                                item.isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
                            )}>
                                <Clock className="h-3 w-3" />
                                <span>{isRTL ? 'الاستحقاق: ' : 'Due: '}{new Date(item.dueDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                            </span>
                        ) : (
                            <span className="text-[11px] font-mono text-muted-foreground">
                                {isCompleted ? (isRTL ? 'تم اجتياز المعيار' : 'Certified') : (isRTL ? 'متاح للبدء' : 'Self-paced')}
                            </span>
                        )}

                        <Link
                            to={item.actionUrl}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95",
                                hasStarted && !isCompleted
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                                    : isCompleted
                                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                        : "bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30"
                            )}
                        >
                            <Play className="h-3 w-3 fill-current" />
                            <span>
                                {hasStarted && !isCompleted
                                    ? (isRTL ? 'متابعة' : 'Resume')
                                    : isCompleted
                                        ? (isRTL ? 'مراجعة' : 'Review')
                                        : (isRTL ? 'بدء' : 'Start')}
                            </span>
                            <ArrowRight className={cn("h-3 w-3", isRTL && "rotate-180")} />
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    )
}
