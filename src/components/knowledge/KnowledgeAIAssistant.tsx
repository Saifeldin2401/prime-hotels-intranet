/**
 * KnowledgeAIAssistant - AI-Powered Knowledge Base Q&A Assistant
 * 
 * Provides instant answers to staff questions by searching the knowledge base
 * and using AI to synthesize relevant information.
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    X,
    Send,
    Sparkles,
    Bot,
    User,
    Loader2,
    BookOpen,
    ExternalLink,
    AlertCircle,
    RefreshCcw,
    Zap,
    BrainCircuit,
    Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'error'
    content: string
    sources?: ArticleSource[]
    timestamp: Date
}

interface ArticleSource {
    id: string
    title: string
    content_type: string
    relevance: number
}

interface KnowledgeAIAssistantProps {
    isOpen: boolean
    onClose: () => void
}

// 🛡️ PRIMARY MODEL (Confirmed working on HF Router via 'together' provider)
const FALLBACK_MODELS = [
    'Qwen/Qwen2.5-7B-Instruct'
]

export function KnowledgeAIAssistant({ isOpen, onClose }: KnowledgeAIAssistantProps) {
    const { t, i18n } = useTranslation(['knowledge', 'common'])
    const [messages, setMessages] = useState<Message[]>([])

    // Initialize welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: t('ai_welcome_message'),
                timestamp: new Date()
            }])
        }
    }, [t, messages.length])

    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    const searchKnowledgeBase = async (query: string): Promise<ArticleSource[]> => {
        try {
            const keywords = query.toLowerCase()
                .replace(/[?.,!]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'sops', 'sop', 'ksa'].includes(w))

            const searchTerms = keywords.length > 0 ? keywords : [query]

            const orFilter = searchTerms.map(term =>
                `title.ilike.%${term}%,content.ilike.%${term}%,description.ilike.%${term}%`
            ).join(',')

            const { data, error } = await supabase
                .from('documents')
                .select('id, title, content, content_type, description')
                .or(orFilter)
                .eq('status', 'PUBLISHED')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(8)

            if (error) throw error

            const scoredResults = (data || []).map(doc => {
                let score = 0
                const docTitle = (doc.title || '').toLowerCase()
                const docContent = (doc.content || '').toLowerCase()

                searchTerms.forEach(term => {
                    if (docTitle.includes(term)) score += 10
                    if (docContent.includes(term)) score += 2
                })

                return {
                    id: doc.id,
                    title: doc.title,
                    content_type: doc.content_type || 'document',
                    relevance: score
                }
            })

            return scoredResults
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 5)
        } catch (error) {
            console.error('Knowledge base search failed:', error)
            return []
        }
    }

    const getArticleContext = async (articleIds: string[]): Promise<string> => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('title, content, description')
                .in('id', articleIds)

            if (error) throw error

            return (data || [])
                .map(doc => `### ${doc.title}\n${doc.description || ''}\n${doc.content?.substring(0, 1500) || ''}`)
                .join('\n\n---\n\n')
        } catch (error) {
            console.error('Failed to get article context:', error)
            return ''
        }
    }

    const callAI = async (prompt: string): Promise<string | null> => {
        for (const model of FALLBACK_MODELS) {
            try {
                const { data, error } = await supabase.functions.invoke('process-ai-request', {
                    body: { model, prompt }
                })

                if (error) throw error
                if (data?.success === false) throw new Error(data.error)

                // Support both 'generated_text' (HF style) and 'result' (OpenAI style)
                return (data.generated_text || data.result) as string
            } catch (e) {
                console.warn(`Model ${model} failed:`, e)
            }
        }
        return null
    }

    const askQuestion = async (question: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
            timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const sources = await searchKnowledgeBase(question)

            if (sources.length === 0) {
                let noResultsMsg = "I couldn't find any relevant articles in our knowledge base for your question. Try rephrasing your question or using different keywords."
                if (i18n.language === 'ar') {
                    noResultsMsg = "لم أتمكن من العثور على أي مقالات ذات صلة في قاعدة المعرفة الخاصة بنا لسؤالك. حاول إعادة صياغة سؤالك أو استخدام كلمات رئيسية مختلفة."
                }

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: noResultsMsg,
                    timestamp: new Date()
                }])
                return
            }

            const context = await getArticleContext(sources.map(s => s.id))
            const targetLanguage = i18n.language === 'ar' ? 'Arabic' : 'English'

            const prompt = `You are a helpful multilingual Knowledge Base Assistant for a hotel chain.
            
Your task is to answer the user's question based ONLY on the provided knowledge base content below.

CRITICAL RULES:
1. TARGET LANGUAGE: You MUST respond in ${targetLanguage}. Even if the context documents are in a different language, translate your answer to ${targetLanguage}.
2. ADHERENCE: Answer ONLY based on the provided context. Do not use external knowledge or make up information.
3. HONESTY: If the context doesn't contain the answer, politely state that you couldn't find information on that specific topic in our records.
4. FORMATTING: Use bullet points for steps and professional business tone.
5. CITATION: Mention the article titles you are using.

KNOWLEDGE BASE CONTENT:
${context}

USER QUESTION: ${question}

ASSISTANT RESPONSE:`


            const aiResponse = await callAI(prompt)

            if (aiResponse) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: aiResponse.trim(),
                    sources: sources,
                    timestamp: new Date()
                }])
            } else {
                let fallbackMsg = `I found ${sources.length} relevant article(s) that may help answer your question. Please review them below:`
                if (i18n.language === 'ar') {
                    fallbackMsg = `وجدت ${sources.length} مقال(ات) ذات صلة قد تساعد في الإجابة على سؤالك. يرجى مراجعتها أدناه:`
                }

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: fallbackMsg,
                    sources: sources,
                    timestamp: new Date()
                }])
            }
        } catch (error) {
            console.error('AI Assistant error:', error)
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'error',
                content: i18n.language === 'ar' ? "عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى." : "I'm sorry, I encountered an error while processing your question. Please try again.",
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (input.trim() && !isLoading) {
            askQuestion(input.trim())
        }
    }

    const clearChat = () => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: t('ai_welcome_message'),
            timestamp: new Date()
        }])
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-hotel-navy/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-2xl h-[85vh] max-h-[750px] relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Glowing Aura Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-hotel-gold via-blue-500 to-purple-600 rounded-3xl blur opacity-20 animate-pulse" />

                    <Card className="h-full flex flex-col border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden relative">
                        {/* Header: Redesigned for Maximum Pop */}
                        <CardHeader className="bg-gradient-to-br from-hotel-navy via-[#1e293b] to-[#0f172a] text-white py-6 px-8 flex-shrink-0 relative overflow-hidden ring-1 ring-white/10">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-hotel-gold/10 rounded-full blur-3xl -mr-32 -mt-32" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24" />

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg transform rotate-3 ring-1 ring-white/20">
                                        <img
                                            src="/prime-logo-light.png"
                                            alt="Prime Hotels"
                                            className="h-10 w-auto object-contain"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-2xl font-black tracking-tight text-white uppercase">AI Knowledge Pro</CardTitle>
                                            <Badge className="bg-hotel-gold text-hotel-navy font-bold border-none px-2 py-0 text-[10px]">PREMIUM</Badge>
                                        </div>
                                        <p className="text-white/70 text-sm font-medium flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            Intelligence Active & System Ready
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={clearChat}
                                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all h-10 w-10"
                                        title="Reset Conversation"
                                    >
                                        <RefreshCcw className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all h-10 w-10"
                                    >
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        {/* Messages Area: Glassmorphism and Depth */}
                        <CardContent className="flex-1 p-0 overflow-hidden bg-gray-50/50">
                            <ScrollArea className="h-full px-6 py-8">
                                <div className="space-y-8 max-w-3xl mx-auto">
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={cn(
                                                "flex gap-4 group",
                                                message.role === 'user' ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            {/* Avatar with Glow */}
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transform transition-transform group-hover:scale-110",
                                                message.role === 'user' && "bg-hotel-navy text-white shadow-hotel-navy/20",
                                                message.role === 'assistant' && "bg-white text-hotel-gold shadow-black/5 ring-1 ring-gray-100",
                                                message.role === 'error' && "bg-red-500 text-white shadow-red-200"
                                            )}>
                                                {message.role === 'user' ? <User className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                                            </div>

                                            {/* Content Bubble */}
                                            <div className={cn(
                                                "max-w-[85%] flex flex-col",
                                                message.role === 'user' ? "items-end" : "items-start"
                                            )}>
                                                <div className={cn(
                                                    "px-6 py-4 rounded-3xl shadow-sm text-base leading-relaxed relative",
                                                    message.role === 'user' && "bg-hotel-navy text-white rounded-tr-none shadow-hotel-navy/10",
                                                    message.role === 'assistant' && "bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-black/[0.02]",
                                                    message.role === 'error' && "bg-red-50 text-red-700 rounded-tl-none border border-red-100"
                                                )}>
                                                    <p className="whitespace-pre-wrap">{message.content}</p>

                                                    {/* Sources Section: Elegant Cards */}
                                                    {message.sources && message.sources.length > 0 && (
                                                        <div className="mt-6 pt-5 border-t border-gray-100">
                                                            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                                <BookOpen className="h-4 w-4 text-hotel-gold" />
                                                                Knowledge Citations
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {message.sources.map((source) => (
                                                                    <Link
                                                                        key={source.id}
                                                                        to={`/knowledge/${source.id}`}
                                                                        onClick={onClose}
                                                                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-hotel-gold/50 hover:bg-white transition-all group/source"
                                                                    >
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold py-0 h-5">
                                                                                {source.content_type}
                                                                            </Badge>
                                                                            <span className="text-sm font-semibold text-gray-700 truncate">{source.title}</span>
                                                                        </div>
                                                                        <ExternalLink className="h-4 w-4 text-gray-300 group-hover/source:text-hotel-gold transition-colors flex-shrink-0" />
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-2 px-1 font-medium">
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Advanced Loading State */}
                                    {isLoading && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex gap-4"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center ring-1 ring-gray-100">
                                                <Loader2 className="h-6 w-6 text-hotel-gold animate-spin" />
                                            </div>
                                            <div className="bg-white border border-gray-100 rounded-3xl rounded-tl-none px-8 py-5 shadow-sm max-w-[80%]">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 text-hotel-gold font-bold text-sm">
                                                        <BrainCircuit className="h-4 w-4 animate-pulse" />
                                                        <span>Consulting Knowledge Library</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="h-2 bg-gray-100 rounded-full w-48 animate-pulse" />
                                                        <div className="h-2 bg-gray-50 rounded-full w-32 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                        </CardContent>

                        {/* Input Area: Redesigned with 'Command Center' feel */}
                        <div className="border-t bg-white p-6 flex-shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-hotel-gold to-orange-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                                    <div className="relative bg-gray-50 rounded-2xl flex items-center p-1.5 transition-all group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-hotel-navy/5 shadow-inner">
                                        <Input
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            placeholder="Request info on SOPs, check-in, or laundry services..."
                                            disabled={isLoading}
                                            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 text-lg px-6 py-6 h-auto"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            className={cn(
                                                "rounded-xl h-14 w-14 shadow-xl transition-all relative overflow-hidden",
                                                input.trim() ? "bg-hotel-navy hover:bg-[#0f172a] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            )}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            ) : (
                                                <Zap className={cn("h-6 w-6 transition-transform", input.trim() && "group-hover:scale-125")} />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-6 mt-4 opacity-50">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <BrainCircuit size={12} />
                                        Advanced RAG
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <Info size={12} />
                                        Always Verify
                                    </div>
                                </div>
                            </form>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
