import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Award } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompetencyRingData {
    id: string
    titleEn: string
    titleAr: string
    percentage: number
    color: 'gold' | 'amber' | 'emerald' | 'blue'
    category: string
}

interface CurriculumProgressRingsProps {
    overallCompletionRate?: number | null
    competencies?: CompetencyRingData[]
    isRTL: boolean
    className?: string
}

const DEFAULT_COMPETENCIES: CompetencyRingData[] = [
    {
        id: 'guest_service',
        titleEn: 'Luxury Guest Services',
        titleAr: 'خدمات الضيافة الفاخرة',
        percentage: 85,
        color: 'gold',
        category: 'Front of House',
    },
    {
        id: 'culinary_safety',
        titleEn: 'Food Safety & HACCP',
        titleAr: 'سلامة الأغذية والهاسب',
        percentage: 62,
        color: 'amber',
        category: 'Culinary Core',
    },
    {
        id: 'safety_compliance',
        titleEn: 'Life Safety & Security',
        titleAr: 'السلامة والدفاع المدني',
        percentage: 90,
        color: 'emerald',
        category: 'Statutory SOP',
    },
    {
        id: 'brand_culture',
        titleEn: 'ALTUS Brand Culture',
        titleAr: 'ثقافة وهوية ألتوس',
        percentage: 70,
        color: 'blue',
        category: 'Forbes 5-Star',
    },
]

const COLOR_MAP = {
    gold: {
        stroke: '#EAB308',
        track: '#332704',
        glow: 'rgba(234, 179, 8, 0.35)',
        text: 'text-amber-500',
        badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    amber: {
        stroke: '#F59E0B',
        track: '#331F04',
        glow: 'rgba(245, 158, 11, 0.35)',
        text: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    emerald: {
        stroke: '#10B981',
        track: '#042D1C',
        glow: 'rgba(16, 185, 129, 0.35)',
        text: 'text-emerald-500',
        badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
    blue: {
        stroke: '#3B82F6',
        track: '#061D3D',
        glow: 'rgba(59, 130, 246, 0.35)',
        text: 'text-blue-500',
        badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
}

function CircularProgress({ percentage, color }: { percentage: number; color: 'gold' | 'amber' | 'emerald' | 'blue' }) {
    const radius = 32
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    const colors = COLOR_MAP[color]

    return (
        <div className="relative flex items-center justify-center">
            <svg width="84" height="84" className="rotate-[-90deg]">
                {/* Background Ring Track */}
                <circle
                    cx="42"
                    cy="42"
                    r={radius}
                    stroke={colors.track}
                    strokeWidth="6"
                    fill="transparent"
                    className="opacity-70"
                />
                {/* Active Progress Ring */}
                <circle
                    cx="42"
                    cy="42"
                    r={radius}
                    stroke={colors.stroke}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                        filter: `drop-shadow(0 0 5px ${colors.glow})`,
                        transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={cn("font-mono text-sm font-bold tracking-tight", colors.text)}>
                    {percentage}%
                </span>
            </div>
        </div>
    )
}

export const CurriculumProgressRings: React.FC<CurriculumProgressRingsProps> = ({
    competencies = DEFAULT_COMPETENCIES,
    isRTL,
    className,
}) => {
    return (
        <Card className={cn(
            "overflow-hidden rounded-3xl border border-border/50 border-t-amber-400/25 bg-gradient-to-br from-card/95 via-card/80 to-amber-950/[0.04]",
            "shadow-sm backdrop-blur-xl transition-all duration-300",
            className
        )}>
            <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" />
                            <span>{isRTL ? 'مؤشرات الكفاءة والتميز الفندقي' : 'Curriculum Competency Matrix'}</span>
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            {isRTL
                                ? 'معدلات الإنجاز التراكمية في معايير الضيافة والسلامة المعتمدة لدى ألتوس.'
                                : 'Cumulative mastery tracking across key operational and compliance domains.'}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {competencies.map((comp) => (
                        <div
                            key={comp.id}
                            className="group flex flex-col items-center rounded-2xl border border-border/50 bg-background/50 p-3.5 text-center transition-all duration-200 hover:border-amber-500/30 hover:bg-card/70 hover:shadow-sm"
                        >
                            <CircularProgress percentage={comp.percentage} color={comp.color} />
                            <h4 className="font-semibold text-xs text-foreground mt-2.5 line-clamp-1 group-hover:text-amber-500 transition-colors">
                                {isRTL ? comp.titleAr : comp.titleEn}
                            </h4>
                            <span className={cn(
                                "text-[10px] font-mono px-2 py-0.5 rounded-full border mt-1",
                                COLOR_MAP[comp.color].badge
                            )}>
                                {comp.category}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
