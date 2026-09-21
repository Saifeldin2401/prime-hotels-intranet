import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, XCircle, Lightbulb, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScenarioOption {
    id: string
    textEn: string
    textAr: string
    isCorrect: boolean
    explanationEn: string
    explanationAr: string
}

interface DailyScenario {
    id: string
    topicEn: string
    topicAr: string
    titleEn: string
    titleAr: string
    scenarioEn: string
    scenarioAr: string
    options: ScenarioOption[]
}

const DEFAULT_SCENARIO: DailyScenario = {
    id: 'guest_arrival_vip',
    topicEn: 'VIP Guest Arrival Etiquette',
    topicAr: 'بروتوكول استقبال كبار الشخصيات',
    titleEn: 'The 10-5 Rule of Hospitality Engagement',
    titleAr: 'قاعدة 10-5 في الترحيب الفندقي الفاخر',
    scenarioEn:
        'A high-profile guest approaches the concierge lounge during peak check-in hours. At what distance should you initiate eye contact with a warm smile, and when should you deliver a warm verbal greeting?',
    scenarioAr:
        'يقترب ضيف من كبار الشخصيات من بهو الفندق خلال ساعات الذروة. في أي مسافة ينبغي أن تبدأ بالتواصل البصري مع ابتسامة ترحيبية، ومتى تبدأ بالترحيب اللفظي؟',
    options: [
        {
            id: 'opt_1',
            textEn: 'Eye contact at 10 feet (3m), verbal greeting at 5 feet (1.5m).',
            textAr: 'التواصل البصري عند 10 أقدام (3 أمتار)، والترحيب اللفظي عند 5 أقدام (1.5 متر).',
            isCorrect: true,
            explanationEn: 'Correct! The 10-5 rule is an internationally recognized gold standard for luxury hospitality engagement.',
            explanationAr: 'صحيح! قاعدة 10-5 هي المعيار الذهبي المعتمد عالمياً للترحيب الاستباقي في فنادق الخمس نجوم.',
        },
        {
            id: 'opt_2',
            textEn: 'Wait until the guest reaches the counter and speaks first.',
            textAr: 'الانتظار حتى يصل الضيف إلى الكاونتر ويبدأ بالحديث أولاً.',
            isCorrect: false,
            explanationEn: 'In luxury hospitality, proactive anticipation of the guest presence is mandatory.',
            explanationAr: 'في الضيافة الفاخرة، المبادرة الاستباقية للترحيب قبل وصول الضيف للكاونتر إلزامية.',
        },
        {
            id: 'opt_3',
            textEn: 'Only verbally greet guests if they make direct eye contact with you.',
            textAr: 'الترحيب فقط إذا بادر الضيف بالتواصل البصري المباشر.',
            isCorrect: false,
            explanationEn: 'Associates must acknowledge all approaching guests proactively regardless of their eye direction.',
            explanationAr: 'يجب على موظف الاستقبال المبادرة بالترحيب دون انتظار نظر الضيف.',
        },
    ],
}

interface DailyKnowledgeBiteProps {
    scenario?: DailyScenario
    isRTL: boolean
    className?: string
}

export const DailyKnowledgeBite: React.FC<DailyKnowledgeBiteProps> = ({
    scenario = DEFAULT_SCENARIO,
    isRTL,
    className,
}) => {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const selectedOption = scenario.options.find((o) => o.id === selectedOptionId)

    const handleSelect = (id: string) => {
        if (isSubmitted) return
        setSelectedOptionId(id)
        setIsSubmitted(true)
    }

    const handleReset = () => {
        setSelectedOptionId(null)
        setIsSubmitted(false)
    }

    return (
        <Card className={cn(
            "relative overflow-hidden rounded-3xl border border-amber-500/25 border-t-amber-400/35 bg-gradient-to-br from-card/95 via-card/85 to-amber-950/[0.04]",
            "shadow-sm backdrop-blur-xl transition-all duration-300",
            className
        )}>
            {/* Top Accent Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

            <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold gap-1">
                            <Sparkles className="h-3 w-3" />
                            <span>{isRTL ? 'معلومة وسيناريو اليوم' : 'Daily SOP Scenario'}</span>
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                            {isRTL ? scenario.topicAr : scenario.topicEn}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-amber-500">
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>60s</span>
                    </div>
                </div>

                <h3 className="font-display text-base font-bold text-foreground">
                    {isRTL ? scenario.titleAr : scenario.titleEn}
                </h3>

                <p className="text-xs text-muted-foreground font-sans mt-1.5 leading-relaxed">
                    {isRTL ? scenario.scenarioAr : scenario.scenarioEn}
                </p>

                {/* Option Selector Pills */}
                <div className="space-y-2 mt-4">
                    {scenario.options.map((opt) => {
                        const isChosen = selectedOptionId === opt.id
                        const showSuccess = isSubmitted && opt.isCorrect
                        const showDanger = isSubmitted && isChosen && !opt.isCorrect

                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelect(opt.id)}
                                disabled={isSubmitted}
                                className={cn(
                                    "w-full text-start p-3 rounded-xl border text-xs font-medium transition-transform duration-160 ease-out flex items-center justify-between gap-3",
                                    !isSubmitted && "border-border/60 bg-background/50 hover:bg-card hover:border-amber-500/40 active:scale-[0.97]",
                                    showSuccess && "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm",
                                    showDanger && "border-destructive/50 bg-destructive/10 text-destructive font-semibold"
                                )}
                            >
                                <span className="flex-1">
                                    {isRTL ? opt.textAr : opt.textEn}
                                </span>

                                {showSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                {showDanger && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                            </button>
                        )
                    })}
                </div>

                {/* Feedback Box & Reset */}
                {isSubmitted && selectedOption && (
                    <div className={cn(
                        "mt-4 p-3.5 rounded-xl border text-xs leading-relaxed animate-fade-in",
                        selectedOption.isCorrect
                            ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300"
                    )}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <span className="font-bold block mb-0.5">
                                    {selectedOption.isCorrect
                                        ? (isRTL ? 'إجابة ممتازة ومطابقة للمعيار!' : 'Standard Mastered!')
                                        : (isRTL ? 'معلومة إرشادية للمعيار الفندقي:' : 'Standard Guidance:')}
                                </span>
                                <p>{isRTL ? selectedOption.explanationAr : selectedOption.explanationEn}</p>
                            </div>

                            <button
                                onClick={handleReset}
                                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                title={isRTL ? 'إعادة المحاولة' : 'Try Again'}
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
