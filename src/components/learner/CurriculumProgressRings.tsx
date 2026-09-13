import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Award, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CompetencyRingData {
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
        titleEn: 'Food Safety & Hygiene',
        titleAr: 'سلامة الأغذية والصحة المهنية',
        percentage: 62,
        color: 'amber',
        category: 'HACCP Standards',
    },
    {
        id: 'safety_compliance',
        titleEn: 'Life Safety & Compliance',
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
        category: 'Vision & Protocol',
    },
]

const COLOR_MAP = {
    gold: {
        stroke: '#EAB308',
        glow: 'rgba(234, 179, 8, 0.35)',
        text: 'text-amber-500',
    },
    amber: {
        stroke: '#F59E0B',
        glow: 'rgba(245, 158, 11, 0.35)',
        text: 'text-amber-600 dark:text-amber-400',
    },
    emerald: {
        stroke: '#10B981',
        glow: 'rgba(16, 185, 129, 0.35)',
        text: 'text-emerald-500',
    },
    blue: {
        stroke: '#3B82F6',
        glow: 'rgba(59, 130, 246, 0.35)',
        text: 'text-blue-500',
    },
}

function CircularProgress({ percentage, color }: { percentage: number; color: 'gold' | 'amber' | 'emerald' | 'blue' }) {
    const radius = 34
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    const colors = COLOR_MAP[color]

    return (
        <div className="relative flex items-center justify-center">
            <svg width="88" height="88" className="rotate-[-90deg]">
                {/* Background Ring Track */}
                <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    stroke="#1E293B"
                    strokeWidth="7"
                    fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    stroke={colors.stroke}
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                        filter: `drop-shadow(0 0 6px ${colors.glow})`,
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
            "overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card/90 to-amber-500/[0.02]",
            "shadow-sm backdrop-blur-xl transition-all duration-300",
            className
        )}>
            <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" />
                            <span>{isRTL ? 'مؤشرات الكفاءة والتميز الفندقي' : 'Curriculum Competency Rings'}</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {competencies.map((comp) => (
                        <div
                            key={comp.id}
                            className="group flex flex-col items-center rounded-2xl border border-border/40 bg-background/40 p-3.5 text-center transition-all duration-200 hover:border-amber-500/30 hover:bg-card/70 hover:shadow-sm"
                        >
                            <CircularProgress percentage={comp.percentage} color={comp.color} />
                            <h4 className="font-semibold text-xs text-foreground mt-3 line-clamp-1 group-hover:text-amber-500 transition-colors">
                                {isRTL ? comp.titleAr : comp.titleEn}
                            </h4>
                            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                {comp.category}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
