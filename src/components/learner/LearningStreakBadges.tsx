import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LearningStreakBadgesProps {
    streakDays: number
    certificatesCount: number
    isRTL: boolean
    className?: string
}

export const LearningStreakBadges: React.FC<LearningStreakBadgesProps> = ({
    streakDays,
    certificatesCount,
    isRTL,
    className,
}) => {
    // KSA workweek days (Sun to Thu)
    const days = [
        { labelEn: 'S', labelAr: 'أ', active: true },
        { labelEn: 'M', labelAr: 'إ', active: true },
        { labelEn: 'T', labelAr: 'ث', active: true },
        { labelEn: 'W', labelAr: 'ر', active: streakDays >= 4 },
        { labelEn: 'T', labelAr: 'خ', active: streakDays >= 5 },
    ]

    return (
        <Card className={cn(
            "overflow-hidden rounded-3xl border border-amber-500/20 border-t-amber-400/35 bg-gradient-to-br from-card/95 via-card/85 to-amber-950/[0.03]",
            "shadow-sm backdrop-blur-xl transition-all duration-300",
            className
        )}>
            <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                        <Flame className={cn("h-5 w-5 text-orange-500", streakDays > 0 && "animate-pulse")} />
                        <span>{isRTL ? 'سلسلة التعلم والشهادات' : 'Learning Streak & Badges'}</span>
                    </CardTitle>

                    <Link
                        to="/training/certificates"
                        className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                        <span>{isRTL ? 'عرض الشهادات' : 'View Credentials'}</span>
                        <ChevronRight className={cn("h-3.5 w-3.5", isRTL && "rotate-180")} />
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-3 space-y-4">
                {/* Streak Counter & Daily Pips */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-orange-500/20 bg-orange-500/[0.04]">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl overflow-hidden border border-orange-500/30 shrink-0 bg-slate-950/80 shadow-md">
                            <img
                                src="/assets/altus/streak-flame.jpg"
                                alt="Streak Trophy"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-mono text-3xl font-extrabold text-orange-500">
                                    {streakDays}
                                </span>
                                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    {isRTL ? 'أيام متتالية' : 'Day Streak'}
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isRTL ? 'حافظ على وتيرة تدريبك اليومية' : 'Consistency unlocks master badges'}
                            </p>
                        </div>
                    </div>

                    {/* KSA Weekday Dots */}
                    <div className="flex items-center gap-1.5">
                        {days.map((day, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-1">
                                <div
                                    className={cn(
                                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                                        day.active
                                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-sm shadow-orange-500/30"
                                             : "bg-slate-800 text-slate-500 border border-slate-700/50"
                                    )}
                                >
                                    {day.active ? <Check className="h-3 w-3 stroke-[3]" /> : (isRTL ? day.labelAr : day.labelEn)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Micro Badge Showcase with ALTUS Assets */}
                <div className="grid grid-cols-3 gap-2.5">
                    {/* Badge 1: Official Accreditation */}
                    <div className="group flex flex-col items-center p-2.5 rounded-xl border border-amber-500/20 bg-background/50 hover:bg-card hover:border-amber-500/40 transition-all text-center">
                        <div className="h-10 w-10 rounded-lg overflow-hidden p-0.5 flex items-center justify-center bg-white/5 border border-white/10 mb-1.5 group-hover:scale-110 transition-transform">
                            <img
                                src="/assets/altus/accreditation-seal.jpg"
                                alt="Accredited"
                                className="h-full w-full object-cover rounded"
                            />
                        </div>
                        <span className="text-[11px] font-bold text-foreground truncate w-full">
                            {isRTL ? 'الاعتماد الفندقي' : 'Accredited'}
                        </span>
                        <span className="text-[9px] font-mono text-amber-500">
                            {certificatesCount > 0 ? `${certificatesCount} ${isRTL ? 'شهادة' : 'earned'}` : (isRTL ? 'قيد الإنجاز' : 'In progress')}
                        </span>
                    </div>

                    {/* Badge 2: SOP Master */}
                    <div className="group flex flex-col items-center p-2.5 rounded-xl border border-emerald-500/20 bg-background/50 hover:bg-card hover:border-emerald-500/40 transition-all text-center">
                        <div className="h-10 w-10 rounded-lg overflow-hidden p-1 flex items-center justify-center bg-white/5 border border-white/10 mb-1.5 group-hover:scale-110 transition-transform">
                            <img
                                src="/assets/altus/sop-checklist.jpg"
                                alt="SOP Master"
                                className="h-full w-full object-contain rounded"
                            />
                        </div>
                        <span className="text-[11px] font-bold text-foreground truncate w-full">
                            {isRTL ? 'معايير التشغيل' : 'SOP Master'}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-500">
                            {isRTL ? '100% تدقيق' : 'Audited'}
                        </span>
                    </div>

                    {/* Badge 3: Mobile Scholar */}
                    <div className="group flex flex-col items-center p-2.5 rounded-xl border border-blue-500/20 bg-background/50 hover:bg-card hover:border-blue-500/40 transition-all text-center">
                        <div className="h-10 w-10 rounded-lg overflow-hidden p-1 flex items-center justify-center bg-white/5 border border-white/10 mb-1.5 group-hover:scale-110 transition-transform">
                            <img
                                src="/assets/altus/mobile-learning.jpg"
                                alt="Mobile Learner"
                                className="h-full w-full object-contain rounded"
                            />
                        </div>
                        <span className="text-[11px] font-bold text-foreground truncate w-full">
                            {isRTL ? 'المتعلم الرقمي' : 'Digital Pro'}
                        </span>
                        <span className="text-[9px] font-mono text-blue-500">
                            {isRTL ? 'نشط' : 'Active'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
