import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { BrainCircuit, Loader2, RefreshCcw, Settings, Sparkles, User, X, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'error'
    content: string
    timestamp: Date
}

const FALLBACK_MODELS = ['Qwen/Qwen2.5-7B-Instruct']

const SYSTEM_PROMPT = `You are the PRIME Connect Configuration Assistant, an AI built to guide Corporate Administrators and HR Managers in modifying system variables. 
You understand the following 5 modules deeply:
1. Hospitality News Publisher: Broadcasts dual-language articles.
2. SIEM Integrations: Maps security event webhooks.
3. Motivational Content Manager: Modifies dual-language quotes for employee dashboards.
4. Audit Retention Policies: Manages data lifecycles (PDF, CSV).
5. Enterprise Report Builder: Schedules dynamic postgres queries via JSON filters.
Answer questions directly and professionally about how to configure these systems.`

export function AdminAIAssistant({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { t } = useTranslation()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: 'Hello Admin! I am the System Configuration Assistant. Need help configuring the SIEM webhooks, Motivational Quotes, or Retention Policies? I understand our entire infrastructure.',
                timestamp: new Date()
            }])
        }
    }, [messages.length])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
    }, [isOpen])

    const callAI = async (prompt: string): Promise<string | null> => {
        for (const model of FALLBACK_MODELS) {
            try {
                const { data, error } = await supabase.functions.invoke('process-ai-request', {
                    body: { model, prompt }
                })
                if (error) throw error
                if (data?.success === false) throw new Error(data.error)
                return (data.generated_text || data.result) as string
            } catch (e) {
                console.warn(`Model ${model} failed:`, e)
            }
        }
        return null
    }

    const askQuestion = async (question: string) => {
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: question, timestamp: new Date() }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const prompt = `${SYSTEM_PROMPT}\n\nUSER QUESTION: ${question}\n\nASSISTANT RESPONSE:`
            const aiResponse = await callAI(prompt)

            if (aiResponse) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: aiResponse.trim(),
                    timestamp: new Date()
                }])
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'error',
                    content: "I'm having trouble connecting to the intelligence node. Please try again.",
                    timestamp: new Date()
                }])
            }
        } catch (_error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'error',
                content: "An execution error occurred.",
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (input.trim() && !isLoading) askQuestion(input.trim())
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-hotel-navy/40 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-xl h-[85vh] max-h-[700px] relative" onClick={e => e.stopPropagation()}>
                    <Card className="h-full flex flex-col border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] bg-slate-50 overflow-hidden relative">
                        <CardHeader className="bg-gradient-to-r from-hotel-navy to-[#1e293b] text-white py-5 px-6 flex-shrink-0 relative">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 ring-1 ring-white/20">
                                        <Settings className="text-hotel-gold h-7 w-7" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-xl font-bold tracking-tight text-white">Sys-Config AI</CardTitle>
                                            <Badge className="bg-hotel-gold text-hotel-navy font-bold border-none px-2 py-0 text-[10px]">CONFIG</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setMessages([{ id: 'w', role: 'assistant', content: 'Resetting node. How can I help?', timestamp: new Date() }])} 
                                        className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10"
                                        aria-label={t("accessibility.reset_chat", "Reset chat")}
                                    >
                                        <RefreshCcw className="h-5 w-5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={onClose} 
                                        className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10"
                                        aria-label={t("accessibility.close", "Close")}
                                    >
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 p-0 overflow-hidden bg-gray-50/50">
                            <ScrollArea className="h-full px-4 py-6">
                                <div className="space-y-6 max-w-full mx-auto">
                                    {messages.map((message) => (
                                        <motion.div key={message.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", message.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg", message.role === 'user' ? "bg-hotel-navy text-white" : message.role === 'assistant' ? "bg-white text-hotel-gold" : "bg-red-500 text-white")}>
                                                {message.role === 'user' ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                                            </div>
                                            <div className={cn("max-w-[85%] flex flex-col", message.role === 'user' ? "items-end" : "items-start")}>
                                                <div className={cn("px-5 py-3 rounded-2xl text-sm leading-relaxed", message.role === 'user' && "bg-hotel-navy text-white rounded-tr-none", message.role === 'assistant' && "bg-white text-gray-800 rounded-tl-none border shadow-sm", message.role === 'error' && "bg-red-50 text-red-700 rounded-tl-none border")}>
                                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isLoading && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                                                <Loader2 className="h-5 w-5 text-hotel-gold animate-spin" />
                                            </div>
                                            <div className="bg-white border rounded-2xl rounded-tl-none px-6 py-4 shadow-sm w-48 flex items-center gap-2">
                                                <BrainCircuit className="h-4 w-4 text-hotel-gold animate-pulse" />
                                                <span className="text-xs text-muted-foreground animate-pulse">Analyzing...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                        </CardContent>

                        <div className="border-t bg-white p-4 flex-shrink-0">
                            <form onSubmit={handleSubmit}>
                                <div className="relative bg-gray-50 rounded-xl flex items-center p-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-hotel-navy/5 shadow-inner">
                                    <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask how to configure retention policies..." disabled={isLoading} className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm px-4 py-4 h-auto" />
                                    <Button 
                                        type="submit" 
                                        disabled={!input.trim() || isLoading} 
                                        className={cn("rounded-lg h-10 w-10 transition-all", input.trim() ? "bg-hotel-navy hover:bg-[#0f172a] text-white" : "bg-gray-200 text-gray-400")}
                                        aria-label={isLoading ? t("accessibility.sending", "Sending...") : t("accessibility.send_message", "Send message")}
                                    >
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export function FloatingAdminAI() {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-hotel-navy hover:bg-[#0f172a] text-white z-50 group transition-all"
                title="System Configuration Assistant"
            >
                <Settings className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
            </Button>
            <AdminAIAssistant isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}
