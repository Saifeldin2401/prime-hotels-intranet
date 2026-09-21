import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, FileQuestion, BookOpen, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { CurriculumItem } from './CurriculumCard'
import { cn } from '@/lib/utils'

interface CurriculumTableProps {
    items: CurriculumItem[]
    isRTL: boolean
    t: (key: string, defaultValue?: string) => string
}

export const CurriculumTable: React.FC<CurriculumTableProps> = ({
    items,
    isRTL,
    t,
}) => {
    if (items.length === 0) {
        return (
            <div className="py-12 text-center rounded-3xl border border-dashed border-border/50 bg-card/40">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h4 className="font-semibold text-sm text-foreground">
                    {isRTL ? 'لا توجد عناصر مطابقة للبحث' : 'No matching curriculum found'}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? 'جرّب تعديل مصطلحات البحث أو تبديل التصنيف.' : 'Try changing your search terms or active category tab.'}
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-border/60 border-t-amber-400/25 bg-card/60 backdrop-blur-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-border/60 bg-muted/40 font-mono text-muted-foreground uppercase text-[10px] tracking-wider">
                            <th className="p-3.5 text-start font-semibold">{isRTL ? 'البرنامج التدريبي' : 'Course / Assessment'}</th>
                            <th className="p-3.5 text-start font-semibold">{isRTL ? 'النوع' : 'Type'}</th>
                            <th className="p-3.5 text-start font-semibold">{isRTL ? 'المدة' : 'Duration'}</th>
                            <th className="p-3.5 text-start font-semibold">{isRTL ? 'الاستحقاق' : 'Due Date'}</th>
                            <th className="p-3.5 text-start font-semibold">{isRTL ? 'التقدم' : 'Progress'}</th>
                            <th className="p-3.5 text-end font-semibold">{isRTL ? 'الإجراء' : 'Action'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {items.map((item) => {
                            const progress = item.progressPercentage ?? 0
                            const isCompleted = progress >= 100
                            const hasStarted = progress > 0

                            return (
                                <tr
                                    key={item.id}
                                    className="group hover:bg-muted/30 transition-colors"
                                >
                                    <td className="p-3.5 min-w-[240px]">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                                                {item.contentType === 'quiz' ? (
                                                    <FileQuestion className="h-4 w-4 text-purple-500" />
                                                ) : (
                                                    <BookOpen className="h-4 w-4" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-foreground truncate group-hover:text-amber-500 transition-colors">
                                                        {item.title}
                                                    </span>
                                                    {item.isMandatory && (
                                                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold">
                                                            {isRTL ? 'إلزامي' : 'Mandatory'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.category && (
                                                    <span className="text-[10px] text-muted-foreground block truncate">
                                                        {item.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                                        {item.contentType === 'quiz' ? (isRTL ? 'تقييم كفاءة' : 'Quiz') : (isRTL ? 'دورة فندقية' : 'Course')}
                                    </td>

                                    <td className="p-3.5 whitespace-nowrap font-mono text-muted-foreground">
                                        {item.estimatedDurationMinutes ? `${item.estimatedDurationMinutes} ${isRTL ? 'د' : 'min'}` : '—'}
                                    </td>

                                    <td className="p-3.5 whitespace-nowrap font-mono">
                                        {item.dueDate ? (
                                            <div className="flex items-center gap-1">
                                                {item.isOverdue && <AlertCircle className="h-3 w-3 text-destructive" />}
                                                <span className={cn(item.isOverdue ? "text-destructive font-bold" : "text-muted-foreground")}>
                                                    {new Date(item.dueDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>

                                    <td className="p-3.5 min-w-[140px]">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                                                <span>{isCompleted ? (isRTL ? 'مكتمل' : 'Completed') : `${progress}%`}</span>
                                                {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                            </div>
                                            <Progress
                                                value={progress}
                                                className={cn("h-1.5 bg-muted", isCompleted && "[&>div]:bg-emerald-500")}
                                            />
                                        </div>
                                    </td>

                                    <td className="p-3.5 text-end whitespace-nowrap">
                                        <Link
                                            to={item.actionUrl}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-transform duration-150 ease-out active:scale-[0.97]",
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
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
