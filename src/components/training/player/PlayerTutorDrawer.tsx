import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { multiProviderRouter } from '@/lib/ai/providers/multiProviderRouter'
import {
    Sparkles,
    Send,
    Bot,
    User,
    X,
    RotateCcw,
    Copy,
    Check,
    HelpCircle,
    ListChecks,
    Lightbulb,
    Languages,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'

interface ChatMessage {
    id: string
    sender: 'user' | 'ai'
    text: string
    timestamp: Date
    quickAction?: string
}

interface PlayerTutorDrawerProps {
    isOpen: boolean
    onClose: () => void
    moduleTitle?: string
    blockTitle?: string
    blockContentText: string
    isRTL?: boolean
}

function stripHtml(html: string): string {
    const clean = sanitizeHtml(html)
    const tmp = document.createElement('div')
    tmp.innerHTML = clean
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
}

export function PlayerTutorDrawer({
    isOpen,
    onClose,
    moduleTitle,
    blockTitle,
    blockContentText,
    isRTL = false
}: PlayerTutorDrawerProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            sender: 'ai',
            text: isRTL
                ? `مرحباً بك! أنا مرشدك الذكي في ألتوس (Altus AI Tutor). يمكنك سؤالي عن أي جزء في هذا الدرس، أو طلب تلخيص سريع، أو اختبار معلوماتك قبل الاختبار النهائي.`
                : `Hello! I am your Altus AI Learning Coach. Ask me anything about this training section, request a quick 3-bullet summary, or ask for a practice scenario.`,
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    const handleSend = async (customPrompt?: string, actionTag?: string) => {
        const textToSend = (customPrompt || input).trim()
        if (!textToSend || loading) return

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'user',
            text: textToSend,
            timestamp: new Date(),
            quickAction: actionTag
        }

        setMessages(prev => [...prev, userMsg])
        if (!customPrompt) setInput('')
        setLoading(true)

        try {
            const contextSummary = stripHtml(blockContentText).slice(0, 3000)
            const prompt = `You are a friendly, highly professional 5-star hotel hospitality coach and corporate trainer for Altus Hospitality.
You are tutoring an employee currently learning a module titled "${moduleTitle || 'Hospitality Operations'}" inside section "${blockTitle || 'Current Section'}".

CONTENT CONTEXT:
"""
${contextSummary || 'No specific text provided. Answer hospitality best practices.'}
"""

EMPLOYEE'S QUESTION OR REQUEST:
"""
${textToSend}
"""

INSTRUCTIONS:
1. Answer concisely, professionally, and directly in 2-4 sentences or clear bullet points.
2. Ground your answer in the provided training text and real luxury hotel standards (Forbes/LQA standards).
3. If the user asks in Arabic, answer in Arabic. If in English, answer in English.
4. Keep the tone inspiring, practical, and clear for frontline hotel associates.`

            const res = await multiProviderRouter.execute(prompt, {
                task: 'reasoning',
                temperature: 0.5,
            })

            const replyText = res.rawText || (isRTL ? 'عذراً، حدث خطأ في معالجة الإجابة. يرجى المحاولة مرة أخرى.' : 'Sorry, I encountered an issue generating a response. Please try again.')

            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    sender: 'ai',
                    text: replyText,
                    timestamp: new Date()
                }
            ])
        } catch (err) {
            console.error('Tutor error:', err)
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    sender: 'ai',
                    text: isRTL
                        ? 'عذراً، تعذر الاتصال بمساعد ألتوس الذكي حالياً. يرجى التحقق من اتصالك بالإنترنت.'
                        : 'Could not connect to the Altus AI Coach right now. Please verify your connection.',
                    timestamp: new Date()
                }
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleResetChat = () => {
        setMessages([
            {
                id: 'welcome',
                sender: 'ai',
                text: isRTL
                    ? `تمت إعادة تعيين المحادثة. كيف يمكنني مساعدتك في درس "${blockTitle || 'الحالي'}"؟`
                    : `Chat reset. How can I assist you with "${blockTitle || 'this section'}"?`,
                timestamp: new Date()
            }
        ])
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                onClick={onClose}
                className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed inset-y-0 z-[100] w-full sm:w-[440px] bg-slate-950 text-slate-100 shadow-2xl border-s border-slate-800 flex flex-col transition-transform duration-300 animate-in slide-in-from-right",
                    isRTL ? "left-0 border-r border-s-0 slide-in-from-left" : "right-0"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-white whitespace-nowrap">
                                    {isRTL ? 'المرشد الذكي ألتوس' : 'Altus AI Coach'}
                                </h3>
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] h-4 px-1">
                                    GPT-4o
                                </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {blockTitle || moduleTitle || (isRTL ? 'مساعد التعلم المباشر' : 'Live Learning Assistant')}
                            </p>
                        </div>
                    </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetChat}
                        title={isRTL ? 'محادثة جديدة' : 'Reset Chat'}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-3 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                <button
                    onClick={() => handleSend(
                        isRTL ? 'لخص هذا الدرس في 3 نقاط محددة وسريعة.' : 'Summarize this section in 3 clear, actionable bullet points.',
                        'summary'
                    )}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700/60 text-slate-300 transition-colors text-[11px]"
                >
                    <ListChecks className="h-3 w-3 text-amber-400" />
                    <span>{isRTL ? 'ملخص سريع' : '3-Bullet Summary'}</span>
                </button>

                <button
                    onClick={() => handleSend(
                        isRTL ? 'أعطني مثالاً واقعياً لموقف مع نزيل يطبق هذا الإجراء.' : 'Give me a realistic hotel guest scenario applying this rule.',
                        'scenario'
                    )}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700/60 text-slate-300 transition-colors text-[11px]"
                >
                    <Lightbulb className="h-3 w-3 text-amber-400" />
                    <span>{isRTL ? 'موقف وسيناريو' : 'Guest Scenario'}</span>
                </button>

                <button
                    onClick={() => handleSend(
                        isRTL ? 'اختبرني بسؤال سريع من هذا الدرس للتأكد من فهمي.' : 'Quiz me with 1 quick practice question from this section.',
                        'practice'
                    )}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700/60 text-slate-300 transition-colors text-[11px]"
                >
                    <HelpCircle className="h-3 w-3 text-amber-400" />
                    <span>{isRTL ? 'اختبر فهمي' : 'Practice Question'}</span>
                </button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-2.5 text-xs",
                                msg.sender === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            {msg.sender === 'ai' && (
                                <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                                    <Bot className="h-3.5 w-3.5" />
                                </div>
                            )}

                            <div
                                className={cn(
                                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed relative group",
                                    msg.sender === 'user'
                                        ? "bg-amber-500 text-slate-950 font-medium rounded-tr-xs"
                                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md"
                                )}
                            >
                                <p className="whitespace-pre-wrap">{msg.text}</p>

                                {msg.sender === 'ai' && (
                                    <button
                                        onClick={() => handleCopy(msg.id, msg.text)}
                                        className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                                        title={isRTL ? 'نسخ الإجابة' : 'Copy'}
                                    >
                                        {copiedId === msg.id ? (
                                            <Check className="h-3 w-3 text-emerald-400" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                    </button>
                                )}
                            </div>

                            {msg.sender === 'user' && (
                                <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                                    <User className="h-3.5 w-3.5" />
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 ps-8">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{isRTL ? 'جاري إعداد الإجابة...' : 'Thinking...'}</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                    }}
                    className="flex items-center gap-2"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isRTL ? 'اسأل عن أي نقطة في هذا الدرس...' : 'Ask about this section...'}
                        className="bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-500 focus-visible:ring-amber-500 h-9"
                    />
                    <Button
                        type="submit"
                        disabled={!input.trim() || loading}
                        size="sm"
                        className="h-9 w-9 p-0 bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0 disabled:opacity-50"
                    >
                        <Send className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    </Button>
                </form>
            </div>
            </div>
        </>
    )
}
