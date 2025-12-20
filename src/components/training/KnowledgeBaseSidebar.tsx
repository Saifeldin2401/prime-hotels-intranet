/**
 * KnowledgeBaseSidebar
 * 
 * Side panel for Training Builder that shows:
 * - Related documents from knowledge base
 * - Suggested quizzes
 * - Question bank for the topic
 * - One-click import of content
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Search,
    FileText,
    ClipboardCheck,
    HelpCircle,
    Plus,
    ChevronRight,
    Sparkles,
    BookOpen,
    Loader2,
    Link2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAITrainingContent } from '@/hooks/training/useAITrainingContent'
import { useTranslation } from 'react-i18next'

interface KnowledgeBaseSidebarProps {
    moduleId?: string
    moduleTopic?: string
    onInsertContent?: (content: { type: string; title: string; content: string; sourceId?: string }) => void
    onLinkDocument?: (documentId: string) => void
    onLinkQuiz?: (quizId: string) => void
    onAddQuestions?: (questionIds: string[]) => void
    className?: string
}

export function KnowledgeBaseSidebar({
    moduleId,
    moduleTopic = '',
    onInsertContent,
    onLinkDocument,
    onLinkQuiz,
    onAddQuestions,
    className
}: KnowledgeBaseSidebarProps) {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('documents')
    const [generatingFor, setGeneratingFor] = useState<string | null>(null)

    const { generateFromDocument, generating: aiGenerating } = useAITrainingContent()

    // Fetch related documents
    const { data: documents, isLoading: docsLoading } = useQuery({
        queryKey: ['kb-documents', search, moduleTopic],
        queryFn: async () => {
            const query = supabase
                .from('documents')
                .select('id, title, description, content_type, updated_at')
                .in('status', ['PUBLISHED', 'APPROVED'])
                .order('updated_at', { ascending: false })
                .limit(20)

            if (search || moduleTopic) {
                const searchTerm = search || moduleTopic
                query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        }
    })

    // Fetch related quizzes
    const { data: quizzes, isLoading: quizzesLoading } = useQuery({
        queryKey: ['kb-quizzes', search, moduleTopic],
        queryFn: async () => {
            const query = supabase
                .from('learning_quizzes')
                .select('id, title, description, question_count')
                .in('status', ['PUBLISHED', 'APPROVED'])
                .order('created_at', { ascending: false })
                .limit(10)

            if (search || moduleTopic) {
                const searchTerm = search || moduleTopic
                query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        }
    })

    // Fetch related questions
    const { data: questions, isLoading: questionsLoading } = useQuery({
        queryKey: ['kb-questions', search, moduleTopic],
        queryFn: async () => {
            const query = supabase
                .from('knowledge_questions')
                .select('id, question_text, question_type, difficulty_level')
                .in('status', ['PUBLISHED', 'APPROVED'])
                .order('created_at', { ascending: false })
                .limit(30)

            if (search || moduleTopic) {
                const searchTerm = search || moduleTopic
                query.ilike('question_text', `%${searchTerm}%`)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        }
    })

    const handleGenerateFromDoc = async (doc: { id: string; title: string }) => {
        setGeneratingFor(doc.id)
        const result = await generateFromDocument(doc.id, { format: 'training_text' })
        setGeneratingFor(null)

        if (result && onInsertContent) {
            onInsertContent({
                type: 'ai_generated',
                title: result.title,
                content: result.content,
                sourceId: doc.id
            })
        }
    }

    const getDocTypeIcon = (type: string) => {
        switch (type) {
            case 'sop': return <FileText className="h-4 w-4 text-blue-500" />
            case 'policy': return <BookOpen className="h-4 w-4 text-purple-500" />
            default: return <FileText className="h-4 w-4 text-gray-500" />
        }
    }

    const getDifficultyColor = (level: string) => {
        switch (level) {
            case 'easy': return 'bg-green-100 text-green-700'
            case 'medium': return 'bg-yellow-100 text-yellow-700'
            case 'hard': return 'bg-orange-100 text-orange-700'
            case 'expert': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <Card className={cn("h-full flex flex-col", className)}>
            <CardHeader className="pb-3">
                <CardTitle className={`text-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <BookOpen className="h-5 w-5 text-hotel-navy" />
                    {t('knowledgeBase.title')}
                </CardTitle>
                <div className="relative mt-2">
                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
                    <Input
                        placeholder={t('knowledgeBase.searchResources')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={isRTL ? 'pr-9 text-right' : 'pl-9 text-left'}
                    />
                </div>
            </CardHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className={`mx-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <TabsTrigger value="documents" className="flex-1">
                        <FileText className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
                        {t('knowledgeBase.docs')}
                    </TabsTrigger>
                    <TabsTrigger value="quizzes" className="flex-1">
                        <ClipboardCheck className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
                        {t('knowledgeBase.quizzes')}
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="flex-1">
                        <HelpCircle className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
                        {t('knowledgeBase.qa')}
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 px-4 py-2">
                    <TabsContent value="documents" className="mt-0 space-y-2">
                        {docsLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))
                        ) : documents?.length === 0 ? (
                            <div className={`text-center py-8 text-gray-500`}>
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t('knowledgeBase.noDocuments')}</p>
                            </div>
                        ) : (
                            documents?.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-3 rounded-lg border border-gray-100 hover:border-hotel-gold/50 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                                        {getDocTypeIcon(doc.content_type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{doc.title}</p>
                                            {doc.description && (
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                                    {doc.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs flex-1"
                                            onClick={() => onLinkDocument?.(doc.id)}
                                        >
                                            <Link2 className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />
                                            {t('knowledgeBase.link')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs flex-1 bg-hotel-navy hover:bg-hotel-navy-light"
                                            onClick={() => handleGenerateFromDoc(doc)}
                                            disabled={aiGenerating && generatingFor === doc.id}
                                        >
                                            {aiGenerating && generatingFor === doc.id ? (
                                                <Loader2 className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1", "animate-spin")} />
                                            ) : (
                                                <Sparkles className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />
                                            )}
                                            {t('knowledgeBase.generate')}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="quizzes" className="mt-0 space-y-2">
                        {quizzesLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))
                        ) : quizzes?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t('knowledgeBase.noQuizzes')}</p>
                            </div>
                        ) : (
                            quizzes?.map((quiz) => (
                                <div
                                    key={quiz.id}
                                    className="p-3 rounded-lg border border-gray-100 hover:border-hotel-gold/50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    onClick={() => onLinkQuiz?.(quiz.id)}
                                >
                                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{quiz.title}</p>
                                            <p className="text-xs text-gray-500">
                                                {t('knowledgeBase.questionsCount', { count: quiz.question_count || 0 })}
                                            </p>
                                        </div>
                                        <ChevronRight className={cn("h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity", isRTL ? "rotate-180" : "")} />
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="questions" className="mt-0 space-y-2">
                        {questionsLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))
                        ) : questions?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t('knowledgeBase.noQuestions')}</p>
                            </div>
                        ) : (
                            questions?.map((q) => (
                                <div
                                    key={q.id}
                                    className="p-3 rounded-lg border border-gray-100 hover:border-hotel-gold/50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    onClick={() => onAddQuestions?.([q.id])}
                                >
                                    <p className="text-sm line-clamp-2">{q.question_text}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                            {q.question_type}
                                        </Badge>
                                        <Badge className={cn("text-xs", getDifficultyColor(q.difficulty_level))}>
                                            {q.difficulty_level}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}

                        {questions && questions.length > 0 && (
                            <Button
                                variant="outline"
                                className={`w-full mt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                                onClick={() => onAddQuestions?.(questions.map(q => q.id))}
                            >
                                <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('knowledgeBase.addAll', { count: questions.length })}
                            </Button>
                        )}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </Card>
    )
}
