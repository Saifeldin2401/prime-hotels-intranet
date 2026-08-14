import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ChevronLeft,
    ChevronRight,
    RotateCw,
    CheckCircle2,
    Sparkles,
    Shuffle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FlashcardItem {
    id: string
    front: string
    front_ar?: string
    back: string
    back_ar?: string
    category?: string
}

interface FlashcardDeckWidgetProps {
    title?: string
    cards: FlashcardItem[]
    isRTL?: boolean
}

export function FlashcardDeckWidget({
    title,
    cards: initialCards,
    isRTL = false
}: FlashcardDeckWidgetProps) {
    const [cards, setCards] = useState<FlashcardItem[]>(initialCards || [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set())

    if (!cards || cards.length === 0) return null

    const currentCard = cards[currentIndex]
    const isMastered = masteredIds.has(currentCard.id)

    const handleFlip = () => {
        setIsFlipped(prev => !prev)
    }

    const handleNext = () => {
        setIsFlipped(false)
        setCurrentIndex(prev => (prev + 1) % cards.length)
    }

    const handlePrev = () => {
        setIsFlipped(false)
        setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length)
    }

    const handleShuffle = () => {
        setIsFlipped(false)
        const shuffled = [...cards].sort(() => Math.random() - 0.5)
        setCards(shuffled)
        setCurrentIndex(0)
    }

    const toggleMastered = (e: React.MouseEvent) => {
        e.stopPropagation()
        const next = new Set(masteredIds)
        if (next.has(currentCard.id)) {
            next.delete(currentCard.id)
        } else {
            next.add(currentCard.id)
        }
        setMasteredIds(next)
    }

    const frontText = isRTL && currentCard.front_ar ? currentCard.front_ar : currentCard.front
    const backText = isRTL && currentCard.back_ar ? currentCard.back_ar : currentCard.back

    return (
        <div className="my-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/20 p-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">
                            {title || (isRTL ? 'بطاقات الذاكرة التفاعلية' : 'Interactive Flashcards')}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                            {isRTL ? 'انقر على البطاقة لقلبها واختبار معلوماتك' : 'Click the card to flip and test your knowledge'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-slate-800 text-amber-300 border-slate-700">
                        {currentIndex + 1} / {cards.length}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShuffle}
                        title={isRTL ? 'خلط البطاقات' : 'Shuffle'}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                        <Shuffle className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Flip Card Stage */}
            <div
                onClick={handleFlip}
                className="relative h-56 w-full cursor-pointer perspective-1000 group select-none"
            >
                <div
                    className={cn(
                        "w-full h-full rounded-xl transition-transform duration-500 transform-style-3d shadow-xl relative border",
                        isFlipped
                            ? "rotate-y-180 bg-slate-900 border-amber-500/40 text-amber-200"
                            : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white"
                    )}
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    {/* Front Face */}
                    <div
                        className={cn(
                            "absolute inset-0 p-6 flex flex-col justify-between backface-hidden",
                            isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
                        )}
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="flex items-center justify-between text-xs text-amber-400/80 font-semibold tracking-wider uppercase">
                            <span>{currentCard.category || (isRTL ? 'سؤال / معيار' : 'Standard / Question')}</span>
                            <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800 flex items-center gap-1">
                                <RotateCw className="h-3 w-3" /> {isRTL ? 'انقر للقلب' : 'Click to flip'}
                            </span>
                        </div>

                        <p className="text-base md:text-lg font-medium text-center leading-relaxed text-slate-100">
                            {frontText}
                        </p>

                        <div className="flex justify-end">
                            <button
                                onClick={toggleMastered}
                                className={cn(
                                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all",
                                    isMastered
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white"
                                )}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{isMastered ? (isRTL ? 'تم الإتقان' : 'Mastered') : (isRTL ? 'أتقنتها' : 'Mark Mastered')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Back Face */}
                    <div
                        className={cn(
                            "absolute inset-0 p-6 flex flex-col justify-between backface-hidden rotate-y-180",
                            !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
                        )}
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="flex items-center justify-between text-xs text-amber-400 font-semibold tracking-wider uppercase">
                            <span>{isRTL ? 'الإجابة والمعيار المعتمد' : 'Standard Answer / Key Rule'}</span>
                            <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800 flex items-center gap-1">
                                <RotateCw className="h-3 w-3" /> {isRTL ? 'قلب' : 'Flip'}
                            </span>
                        </div>

                        <p className="text-sm md:text-base font-normal text-center leading-relaxed text-amber-100 whitespace-pre-wrap">
                            {backText}
                        </p>

                        <div className="flex justify-end">
                            <button
                                onClick={toggleMastered}
                                className={cn(
                                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all",
                                    isMastered
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-slate-950/80 text-slate-300 border-slate-700 hover:text-white"
                                )}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{isMastered ? (isRTL ? 'تم الإتقان' : 'Mastered') : (isRTL ? 'أتقنتها' : 'Mark Mastered')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between mt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    className="h-8 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1"
                >
                    <ChevronLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    <span>{isRTL ? 'السابق' : 'Previous'}</span>
                </Button>

                <div className="flex items-center gap-1">
                    {cards.map((c, i) => (
                        <div
                            key={c.id}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === currentIndex
                                    ? "w-6 bg-amber-400"
                                    : masteredIds.has(c.id)
                                        ? "w-2 bg-emerald-400"
                                        : "w-2 bg-slate-800"
                            )}
                        />
                    ))}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    className="h-8 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1"
                >
                    <span>{isRTL ? 'التالي' : 'Next'}</span>
                    <ChevronRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
                </Button>
            </div>
        </div>
    )
}
