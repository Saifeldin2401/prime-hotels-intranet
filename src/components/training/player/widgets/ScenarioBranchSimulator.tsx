import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    XCircle,
    RotateCcw,
    Award,
    Sparkles,
    AlertCircle,
    UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScenarioOption {
    id: string
    text: string
    text_ar?: string
    isBestChoice: boolean
    feedback: string
    feedback_ar?: string
    pointsAwarded?: number
}

interface ScenarioBranchSimulatorProps {
    title?: string
    scenarioText: string
    scenarioText_ar?: string
    guestRole?: string
    options: ScenarioOption[]
    isRTL?: boolean
}

export function ScenarioBranchSimulator({
    title,
    scenarioText,
    scenarioText_ar,
    guestRole,
    options,
    isRTL = false
}: ScenarioBranchSimulatorProps) {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleSelect = (id: string) => {
        if (isSubmitted) return
        setSelectedOptionId(id)
        setIsSubmitted(true)
    }

    const handleReset = () => {
        setSelectedOptionId(null)
        setIsSubmitted(false)
    }

    const chosenOption = options.find(o => o.id === selectedOptionId)
    const displayText = isRTL && scenarioText_ar ? scenarioText_ar : scenarioText

    return (
        <div className="my-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                        <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                                {title || (isRTL ? 'محاكي القرارات والمواقف الفندقية' : 'Hotel Scenario Decision Simulator')}
                            </h4>
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                                {guestRole || (isRTL ? 'موقف نزيل' : 'Frontline Scenario')}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            {isRTL ? 'اختر أفضل استجابة مهنية وفق معايير الضيافة الفاخرة' : 'Choose the best 5-star service standard response'}
                        </p>
                    </div>
                </div>

                {isSubmitted && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="h-8 px-2 text-xs text-slate-400 hover:text-white gap-1"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{isRTL ? 'إعادة المحاولة' : 'Try Again'}</span>
                    </Button>
                )}
            </div>

            {/* Scenario Narrative Box */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-sm text-slate-200 leading-relaxed relative">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-amber-400/90 mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>{isRTL ? 'تفاصيل الموقف' : 'Situation Brief'}</span>
                </div>
                <p className="text-slate-100">{displayText}</p>
            </div>

            {/* Decision Choices */}
            <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-300">
                    {isRTL ? 'كيف تتصرف في هذا الموقف؟' : 'What is your immediate course of action?'}
                </span>

                {options.map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id
                    const showCorrect = isSubmitted && opt.isBestChoice
                    const showWrong = isSubmitted && isSelected && !opt.isBestChoice
                    const optText = isRTL && opt.text_ar ? opt.text_ar : opt.text

                    return (
                        <button
                            key={opt.id}
                            disabled={isSubmitted}
                            onClick={() => handleSelect(opt.id)}
                            className={cn(
                                "w-full text-start p-4 rounded-xl border transition-all text-xs md:text-sm flex items-start gap-3 relative group",
                                !isSubmitted && "bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-200 cursor-pointer active:scale-[0.99]",
                                showCorrect && "bg-emerald-950/40 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-500/10",
                                showWrong && "bg-red-950/40 border-red-500 text-red-100",
                                isSubmitted && !isSelected && !opt.isBestChoice && "opacity-40 border-slate-800 bg-slate-950"
                            )}
                        >
                            <span className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                                showCorrect
                                    ? "bg-emerald-500 text-slate-950"
                                    : showWrong
                                        ? "bg-red-500 text-white"
                                        : "bg-slate-800 text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950"
                            )}>
                                {showCorrect ? <CheckCircle2 className="h-4 w-4" /> : showWrong ? <XCircle className="h-4 w-4" /> : String.fromCharCode(65 + idx)}
                            </span>

                            <div className="flex-1">
                                <p className="leading-relaxed font-medium">{optText}</p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Explanation & Feedback Card */}
            {isSubmitted && chosenOption && (
                <div
                    className={cn(
                        "rounded-xl p-4 border animate-in fade-in slide-in-from-top-2 duration-300 text-xs md:text-sm leading-relaxed",
                        chosenOption.isBestChoice
                            ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200"
                            : "bg-amber-950/60 border-amber-500/60 text-amber-200"
                    )}
                >
                    <div className="flex items-center gap-2 font-bold mb-1.5">
                        {chosenOption.isBestChoice ? (
                            <>
                                <Award className="h-4 w-4 text-emerald-400" />
                                <span>{isRTL ? 'إجابة ممتازة ومطابقة للمعايير! (+15 نقطة)' : 'Excellent Choice! 5-Star Standard (+15 XP)'}</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                <span>{isRTL ? 'ملاحظة تدريبية وتوجيه مهني:' : 'Coaching Feedback & Best Practice:'}</span>
                            </>
                        )}
                    </div>
                    <p className="whitespace-pre-wrap">
                        {isRTL && chosenOption.feedback_ar ? chosenOption.feedback_ar : chosenOption.feedback}
                    </p>
                </div>
            )}
        </div>
    )
}
