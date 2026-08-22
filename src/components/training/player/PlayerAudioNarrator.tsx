import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    VolumeX,
    Gauge,
    Sparkles,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'

interface PlayerAudioNarratorProps {
    text: string
    title?: string
    isRTL?: boolean
    targetLang?: string | null
    onClose?: () => void
}

function stripHtml(html: string): string {
    const clean = sanitizeHtml(html)
    const tmp = document.createElement('div')
    tmp.innerHTML = clean
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
}

export function PlayerAudioNarrator({
    text,
    title,
    isRTL = false,
    targetLang,
    onClose
}: PlayerAudioNarratorProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [speed, setSpeed] = useState<number>(1.0)
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0)
    const [sentences, setSentences] = useState<string[]>([])
    const [isMuted, setIsMuted] = useState(false)
    const [isSupported, setIsSupported] = useState(true)

    const synthRef = useRef<SpeechSynthesis | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    // Parse text into sentences
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis
        } else {
            setIsSupported(false)
            return
        }

        const clean = stripHtml(text)
        if (!clean) {
            setSentences([])
            return
        }

        // Split sentences by punctuation (. ! ? ؛ .)
        const parsed = clean
            .split(/(?<=[.!?؟\n])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 2)

        setSentences(parsed.length > 0 ? parsed : [clean])
        setCurrentSentenceIndex(0)
        handleStop()
    }, [text])

    const speakSentence = useCallback((index: number) => {
        if (!synthRef.current || !sentences[index]) return

        synthRef.current.cancel()

        const sentence = sentences[index]
        const utterance = new SpeechSynthesisUtterance(sentence)
        utteranceRef.current = utterance

        // Choose appropriate voice/language
        const isArabicText = /[\u0600-\u06FF]/.test(sentence) || targetLang === 'ar'
        utterance.lang = isArabicText ? 'ar-SA' : 'en-US'
        utterance.rate = speed
        utterance.volume = isMuted ? 0 : 1

        utterance.onend = () => {
            if (index + 1 < sentences.length) {
                setCurrentSentenceIndex(index + 1)
                speakSentence(index + 1)
            } else {
                setIsPlaying(false)
                setIsPaused(false)
                setCurrentSentenceIndex(0)
            }
        }

        utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('Speech synthesis error:', e)
            }
            setIsPlaying(false)
            setIsPaused(false)
        }

        synthRef.current.speak(utterance)
        setIsPlaying(true)
        setIsPaused(false)
    }, [sentences, speed, isMuted, targetLang])

    const handlePlay = () => {
        if (!synthRef.current || sentences.length === 0) return

        if (isPaused) {
            synthRef.current.resume()
            setIsPlaying(true)
            setIsPaused(false)
        } else {
            speakSentence(currentSentenceIndex)
        }
    }

    const handlePause = () => {
        if (!synthRef.current) return
        synthRef.current.pause()
        setIsPlaying(false)
        setIsPaused(true)
    }

    const handleStop = () => {
        if (synthRef.current) {
            synthRef.current.cancel()
        }
        setIsPlaying(false)
        setIsPaused(false)
    }

    const handleRestart = () => {
        handleStop()
        setCurrentSentenceIndex(0)
        speakSentence(0)
    }

    const cycleSpeed = () => {
        const speeds = [0.8, 1.0, 1.25, 1.5]
        const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length
        const nextSpeed = speeds[nextIdx]
        setSpeed(nextSpeed)
        if (isPlaying) {
            handleStop()
            speakSentence(currentSentenceIndex)
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel()
            }
        }
    }, [])

    if (!isSupported || sentences.length === 0) return null

    const progressPct = sentences.length > 0
        ? Math.round(((currentSentenceIndex + 1) / sentences.length) * 100)
        : 0

    return (
        <div className="w-full bg-slate-900/95 text-white backdrop-blur-md border-y border-amber-500/30 px-4 py-3 shadow-xl transition-all duration-300">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Status & Current Sentence Indicator */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                    <div className="h-9 w-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 animate-pulse">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                                {isRTL ? 'قارئ صوتي ذكي' : 'AI Voice Narrator'}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-700 text-slate-300">
                                {sentences.length > 0 ? `${currentSentenceIndex + 1}/${sentences.length}` : 'Ready'}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-300 truncate max-w-md">
                            {sentences[currentSentenceIndex] || title || (isRTL ? 'جاهز للقراءة' : 'Ready to narrate')}
                        </p>
                    </div>
                </div>

                {/* Audio Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRestart}
                        title={isRTL ? 'إعادة من البداية' : 'Restart'}
                        className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>

                    {isPlaying ? (
                        <Button
                            size="sm"
                            onClick={handlePause}
                            className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5 shadow-md shadow-amber-500/20"
                        >
                            <Pause className="h-4 w-4 fill-current" />
                            <span className="text-xs">{isRTL ? 'إيقاف مؤقت' : 'Pause'}</span>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handlePlay}
                            className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5 shadow-md shadow-amber-500/20"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            <span className="text-xs">{isRTL ? 'استماع' : 'Listen'}</span>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={cycleSpeed}
                        className="h-8 px-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
                        title={isRTL ? 'سرعة القراءة' : 'Playback Speed'}
                    >
                        <Gauge className="h-3.5 w-3.5" />
                        <span>{speed}x</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMuted(prev => !prev)}
                        className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                        title={isMuted ? (isRTL ? 'إلغاء الكتم' : 'Unmute') : (isRTL ? 'كتم' : 'Mute')}
                    >
                        {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
                    </Button>

                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                handleStop()
                                onClose()
                            }}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 ms-1"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Micro Progress Line */}
            {isPlaying && (
                <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div
                        className="bg-amber-400 h-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            )}
        </div>
    )
}
