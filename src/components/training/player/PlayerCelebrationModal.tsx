import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Award,
    Sparkles,
    CheckCircle2,
    Flame,
    Share2,
    Download,
    ArrowRight,
    Trophy,
    Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerCelebrationModalProps {
    isOpen: boolean
    onClose: () => void
    moduleTitle: string
    recipientName?: string
    score?: number | null
    passed?: boolean | null
    timeSpentSeconds?: number
    isRTL?: boolean
    onBackToDashboard: () => void
}

export function PlayerCelebrationModal({
    isOpen,
    onClose,
    moduleTitle,
    recipientName = 'Hospitality Professional',
    score,
    passed = true,
    timeSpentSeconds = 0,
    isRTL = false,
    onBackToDashboard
}: PlayerCelebrationModalProps) {
    const [cardTransform, setCardTransform] = useState('')
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Gold particle burst on mount
    useEffect(() => {
        if (!isOpen) return

        // Lightweight CSS / Canvas particle explosion
        const canvas = document.createElement('canvas')
        canvas.id = 'celebration-gold-particles'
        canvas.style.position = 'fixed'
        canvas.style.inset = '0'
        canvas.style.width = '100vw'
        canvas.style.height = '100vh'
        canvas.style.pointerEvents = 'none'
        canvas.style.zIndex = '9999'
        document.body.appendChild(canvas)

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const particles: Array<{
            x: number
            y: number
            vx: number
            vy: number
            size: number
            color: string
            alpha: number
            rotation: number
            vRot: number
        }> = []

        const colors = ['#C9A54D', '#F59E0B', '#FDE047', '#E2E8F0', '#FFFFFF']

        for (let i = 0; i < 90; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2 + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.8) * 18,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10
            })
        }

        let animFrame: number
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            let alive = false

            particles.forEach((p) => {
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.35 // Gravity
                p.rotation += p.vRot
                p.alpha -= 0.008

                if (p.alpha > 0) {
                    alive = true
                    ctx.save()
                    ctx.globalAlpha = Math.max(0, p.alpha)
                    ctx.translate(p.x, p.y)
                    ctx.rotate((p.rotation * Math.PI) / 180)
                    ctx.fillStyle = p.color
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
                    ctx.restore()
                }
            })

            if (alive) {
                animFrame = requestAnimationFrame(render)
            } else {
                canvas.remove()
            }
        }

        animFrame = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(animFrame)
            canvas.remove()
        }
    }, [isOpen])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        const rotX = -(y / (rect.height / 2)) * 10
        const rotY = (x / (rect.width / 2)) * 10
        setCardTransform(`perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`)
    }

    const handleMouseLeave = () => {
        setCardTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
    }

    if (!isOpen) return null

    const timeSpentMinutes = Math.max(1, Math.round(timeSpentSeconds / 60))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-300">
            <div
                ref={containerRef}
                className="w-full max-w-xl rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 p-6 md:p-8 shadow-2xl text-center relative overflow-hidden"
            >
                {/* Background Ambient Glow */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Top Badge */}
                <div className="flex justify-center mb-4">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-500/10">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isRTL ? 'تهانينا! اكتملت الدورة بنجاح' : 'Course Completed Successfully'}</span>
                    </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                    {isRTL ? 'إنجاز تدريبي متميز' : 'Outstanding Achievement!'}
                </h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
                    {isRTL
                        ? `لقد أتممت متطلبات دورة "${moduleTitle}" وتم توثيق شهادتك وساعاتك التدريبية في ملفك المهني.`
                        : `You have successfully completed "${moduleTitle}". Your certificate and training hours are officially logged.`}
                </p>

                {/* 3D Certificate Preview Card */}
                <div
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        transform: cardTransform,
                        transition: 'transform 0.15s ease-out'
                    }}
                    className="cursor-pointer mb-6 rounded-2xl bg-gradient-to-br from-[#0B1528] via-[#111C33] to-[#0B1528] border-2 border-amber-500/60 p-6 text-slate-100 shadow-2xl relative group overflow-hidden"
                >
                    {/* Gold Foil Corner Accents */}
                    <div className="absolute top-0 start-0 w-8 h-8 border-t-2 border-s-2 border-amber-400 rounded-tl-xl m-2" />
                    <div className="absolute top-0 end-0 w-8 h-8 border-t-2 border-e-2 border-amber-400 rounded-tr-xl m-2" />
                    <div className="absolute bottom-0 start-0 w-8 h-8 border-b-2 border-s-2 border-amber-400 rounded-bl-xl m-2" />
                    <div className="absolute bottom-0 end-0 w-8 h-8 border-b-2 border-e-2 border-amber-400 rounded-br-xl m-2" />

                    <div className="text-center space-y-2 py-2">
                        <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-widest">
                            <Award className="h-4 w-4" />
                            <span>ALTUS ACADEMY • CERTIFICATE OF COMPLETION</span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">
                            {moduleTitle}
                        </h3>
                        <p className="text-xs text-amber-200/90 font-medium">
                            {isRTL ? 'ممنوحة للموظف:' : 'Awarded to:'} <span className="text-white font-bold">{recipientName}</span>
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs text-slate-400">
                        <span>{new Date().toLocaleDateString()}</span>
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>{score !== null && score !== undefined ? `${score}% Score` : 'Certified'}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Row (XP, Streak, Time) */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                            <Trophy className="h-4 w-4" />
                            <span>+50 XP</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{isRTL ? 'نقاط التميز' : 'Earned Points'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1 text-orange-400 text-sm font-bold">
                            <Flame className="h-4 w-4 fill-current" />
                            <span>+1 Day</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{isRTL ? 'سلسلة التعلم' : 'Learning Streak'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
                        <div className="text-slate-200 text-sm font-bold">
                            {timeSpentMinutes} {isRTL ? 'د' : 'min'}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{isRTL ? 'الوقت المستغرق' : 'Time Invested'}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                        size="lg"
                        onClick={onBackToDashboard}
                        className="w-full sm:w-auto px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/25"
                    >
                        <span>{isRTL ? 'العودة إلى مركز التدريب' : 'Back to Training Hub'}</span>
                        <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
