/**
 * AIQuestionGenerator
 * 
 * Component for generating questions from SOP content using AI.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Sparkles,
    Wand2,
    Loader2,
    CheckCircle,
    Edit3,
    Save,
    Trash2,
    AlertTriangle,
    FileText,
    Brain,
    Upload,
    Search,
    BookOpen,
    MessageSquare,
    CheckSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGenerateQuestions, useCreateQuestion } from '@/hooks/useQuestions'
import { useArticles, useKnowledgeArticle } from '@/hooks/useKnowledge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
    GeneratedQuestion,
    QuestionType,
    QuestionDifficulty,
    QuestionFormData
} from '@/types/questions'
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from '@/types/questions'
import { useTranslation } from 'react-i18next'

interface AIQuestionGeneratorProps {
    sopId: string
    sopTitle?: string
    sopContent: string
    onQuestionsCreated?: (count: number, ids?: string[]) => void
    className?: string
}

export function AIQuestionGenerator({
    sopId,
    sopTitle,
    sopContent,
    onQuestionsCreated,
    className
}: AIQuestionGeneratorProps) {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.language === 'ar'
    const generateQuestions = useGenerateQuestions()
    const createQuestion = useCreateQuestion()

    // Sources state
    const [sourceType, setSourceType] = useState<'text' | 'sop' | 'file'>('text')
    const [selectedSopId, setSelectedSopId] = useState<string | null>(null)
    const [extractedText, setExtractedText] = useState('')
    const [fileName, setFileName] = useState('')
    const [isExtracting, setIsExtracting] = useState(false)

    // Fetch available SOPs (list without content)
    const { data: sops, isLoading: isLoadingSOPs } = useArticles({
        type: 'sop',
        limit: 100
    })

    // Fetch full article content when an SOP is selected
    const { data: selectedArticle, isLoading: isLoadingContent } = useKnowledgeArticle(selectedSopId || undefined)

    // Generation settings
    const [count, setCount] = useState(5)
    const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['mcq', 'true_false'])
    const [difficulty, setDifficulty] = useState<QuestionDifficulty>('medium')
    const [includeHints, setIncludeHints] = useState(true)
    const [includeExplanations, setIncludeExplanations] = useState(true)
    const [language, setLanguage] = useState<'en' | 'ar'>('en')

    // Generated questions state
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
    const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)

    // Manual input state
    const [manualContent, setManualContent] = useState('')
    const [sopSearch, setSopSearch] = useState('')

    const filteredSops = sops?.filter(sop =>
        sop.title.toLowerCase().includes(sopSearch.toLowerCase())
    )

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setExtractedText('') // Reset while processing
        setIsExtracting(true)

        if (file.type === 'text/plain') {
            // Handle plain text files
            const reader = new FileReader()
            reader.onload = (event) => {
                const text = event.target?.result as string
                setExtractedText(text)
            }
            reader.readAsText(file)
            reader.onloadend = () => setIsExtracting(false)
        } else if (file.type === 'application/pdf') {
            // Extract text from PDF using pdfjs-dist
            try {
                const pdfjsLib = await import('pdfjs-dist')

                // Use local worker file from public folder (CSP-compliant)
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

                const arrayBuffer = await file.arrayBuffer()
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })

                const pdf = await loadingTask.promise

                let fullText = ''
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i)
                    const textContent = await page.getTextContent()
                    const pageText = textContent.items
                        .filter((item: any) => item.str)
                        .map((item: any) => item.str)
                        .join(' ')
                    fullText += pageText + '\n'
                }

                const trimmedText = fullText.trim()
                if (trimmedText.length > 0) {
                    setExtractedText(trimmedText)
                } else {
                    // PDF might be scanned/image-based with no selectable text
                    console.warn('PDF has no extractable text - may be scanned/image-based')
                    setExtractedText('')
                }
            } catch (error) {
                console.error('PDF extraction error:', error)
                setExtractedText('')
            } finally {
                setIsExtracting(false)
            }
        } else {
            // For other file types, try reading as text
            const reader = new FileReader()
            reader.onload = (event) => {
                const text = event.target?.result as string
                setExtractedText(text || '')
            }
            reader.onerror = () => {
                setExtractedText('')
            }
            reader.readAsText(file)
            reader.onloadend = () => setIsExtracting(false)
        }
    }

    const handleGenerate = async () => {
        let contentToUse = ''
        let currentSopTitle = sopTitle

        if (sourceType === 'text') {
            contentToUse = manualContent
        } else if (sourceType === 'sop') {
            // Use the fully fetched article content
            const cleanedContent = selectedArticle?.content?.replace(/<[^>]*>/g, '') || ''
            contentToUse = cleanedContent
            currentSopTitle = selectedArticle?.title
        } else if (sourceType === 'file') {
            contentToUse = extractedText
        }

        if (!contentToUse || contentToUse.trim().length < 20) {
            console.error("Content too short - check if SOP has content", { sourceType, length: contentToUse?.trim().length })
            return
        }

        const result = await generateQuestions.mutateAsync({
            sop_content: contentToUse,
            sop_id: selectedSopId || (sopId !== 'general' ? sopId : undefined),
            sop_title: currentSopTitle,
            count,
            types: selectedTypes,
            difficulty,
            include_hints: includeHints,
            include_explanations: includeExplanations,
            language
        })

        setGeneratedQuestions(result)
        setSelectedQuestions(new Set(result.map((_, i) => i)))
    }

    const handleToggleType = (type: QuestionType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        )
    }

    const handleToggleQuestion = (index: number) => {
        setSelectedQuestions(prev => {
            const newSet = new Set(prev)
            if (newSet.has(index)) {
                newSet.delete(index)
            } else {
                newSet.add(index)
            }
            return newSet
        })
    }

    const handleUpdateQuestion = (index: number, updates: Partial<GeneratedQuestion>) => {
        setGeneratedQuestions(prev =>
            prev.map((q, i) => i === index ? { ...q, ...updates } : q)
        )
        setEditingIndex(null)
    }

    const handleDeleteQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index))
        setSelectedQuestions(prev => {
            const newSet = new Set<number>()
            prev.forEach(i => {
                if (i < index) newSet.add(i)
                else if (i > index) newSet.add(i - 1)
            })
            return newSet
        })
    }

    const handleSaveSelected = async () => {
        setSaving(true)
        let savedCount = 0
        const createdIds: string[] = []

        for (const index of selectedQuestions) {
            const q = generatedQuestions[index]
            if (!q) continue

            const formData: QuestionFormData = {
                question_text: q.question_text,
                question_text_ar: q.question_text_ar,
                question_type: q.question_type,
                difficulty_level: q.difficulty_level,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                linked_sop_id: (sopId && sopId !== 'manual_input' && sopId !== 'general') ? sopId : undefined,
                linked_sop_section: q.linked_section,
                tags: q.tags || [],
                estimated_time_seconds: 30,
                points: DIFFICULTY_CONFIG[q.difficulty_level].points,
                options: q.options?.map(o => ({
                    option_text: o.text,
                    option_text_ar: o.text_ar,
                    is_correct: o.is_correct,
                    feedback: o.feedback
                })) || []
            }

            try {
                const created = await createQuestion.mutateAsync({ formData, aiGenerated: true })
                createdIds.push(created.id)
                savedCount++
            } catch (error) {
                console.error('Failed to save question:', error)
            }
        }

        setSaving(false)
        onQuestionsCreated?.(savedCount, createdIds)
        setGeneratedQuestions([])
        setSelectedQuestions(new Set())
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Generation Settings */}
            <Card>
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-hotel-navy">
                        <Wand2 className="h-5 w-5 text-hotel-gold" />
                        {t('builder.aiQuestionGenerator')}
                    </CardTitle>
                    <CardDescription>
                        {t('builder.aiDialogDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Source Selection Tabs */}
                    <div className="space-y-4">
                        <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Source Content</Label>
                        <Tabs value={sourceType} onValueChange={(val) => setSourceType(val as any)}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="text" className="gap-2">
                                    <Edit3 className="h-4 w-4" />
                                    {t('content')}
                                </TabsTrigger>
                                <TabsTrigger value="sop" className="gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Knowledge Base
                                </TabsTrigger>
                                <TabsTrigger value="file" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    Upload PDF/Doc
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="text" className="mt-4 space-y-4">
                                <Textarea
                                    placeholder="Paste the text you want to generate questions from..."
                                    value={manualContent}
                                    onChange={e => setManualContent(e.target.value)}
                                    className="min-h-[150px] border-slate-200 focus:ring-hotel-gold"
                                />
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-xs text-muted-foreground italic">
                                        Paste SOP text, policies, or training material here.
                                    </p>
                                    <p className={cn(
                                        "text-xs font-medium",
                                        manualContent.trim().length >= 20 ? "text-green-600" : "text-amber-600"
                                    )}>
                                        {manualContent.trim().length}/20 characters minimum
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="sop" className="mt-4 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search Knowledge Base..."
                                        className="pl-10"
                                        value={sopSearch}
                                        onChange={e => setSopSearch(e.target.value)}
                                    />
                                </div>
                                <ScrollArea className="h-[150px] border rounded-md p-2">
                                    {isLoadingSOPs ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-10 w-full" />
                                            <Skeleton className="h-10 w-full" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredSops?.map(sop => (
                                                <div
                                                    key={sop.id}
                                                    onClick={() => setSelectedSopId(sop.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                                                        selectedSopId === sop.id
                                                            ? "bg-hotel-gold/10 border-hotel-gold text-hotel-gold"
                                                            : "hover:bg-slate-50 text-slate-700"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FileText className="h-4 w-4 flex-shrink-0" />
                                                        <span className="text-sm font-medium truncate">{sop.title}</span>
                                                    </div>
                                                    {selectedSopId === sop.id && <CheckCircle className="h-4 w-4" />}
                                                </div>
                                            ))}
                                            {filteredSops?.length === 0 && (
                                                <div className="text-center py-8 text-slate-400 text-sm italic">
                                                    No articles found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="file" className="mt-4 space-y-4">
                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center space-y-4 hover:border-hotel-gold transition-colors">
                                    <div className="w-12 h-12 bg-hotel-gold/10 rounded-full flex items-center justify-center mx-auto">
                                        <Upload className="h-6 w-6 text-hotel-gold" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Click to upload or drag & drop</p>
                                        <p className="text-xs text-slate-400 uppercase mt-1">PDF, DOCX, or TXT (Max 5MB)</p>
                                    </div>
                                    <Input
                                        type="file"
                                        className="hidden"
                                        id="ai-file-upload"
                                        onChange={handleFileChange}
                                        accept=".pdf,.docx,.txt"
                                    />
                                    <Button variant="outline" onClick={() => document.getElementById('ai-file-upload')?.click()}>
                                        Select File
                                    </Button>
                                    {fileName && (
                                        <div className={cn(
                                            "px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 mx-auto w-fit",
                                            isExtracting
                                                ? "bg-amber-50 text-amber-700"
                                                : extractedText
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-red-50 text-red-700"
                                        )}>
                                            {isExtracting ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Extracting text...
                                                </>
                                            ) : extractedText ? (
                                                <>
                                                    <CheckCircle className="h-3 w-3" />
                                                    {fileName} - {extractedText.length} characters extracted
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Could not extract text from {fileName}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Number of questions */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-600">Number of Questions</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    value={count}
                                    onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                    min={1}
                                    max={10}
                                    className="w-20 border-slate-200"
                                />
                                <span className="text-xs text-slate-500 italic">1-10 questions</span>
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-600">Difficulty Level</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(DIFFICULTY_CONFIG).map(([diff, config]) => (
                                    <button
                                        key={diff}
                                        onClick={() => setDifficulty(diff as QuestionDifficulty)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                                            difficulty === diff
                                                ? `bg-hotel-navy border-hotel-navy text-white shadow-md scale-105`
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-hotel-gold'
                                        )}
                                    >
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Question types */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-600">Question Types</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                                <button
                                    key={type}
                                    onClick={() => handleToggleType(type as QuestionType)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2.5 rounded-md text-xs border transition-all text-left uppercase tracking-tight',
                                        selectedTypes.includes(type as QuestionType)
                                            ? `bg-${config.color}-50 border-${config.color}-300 text-${config.color}-700 shadow-sm ring-1 ring-${config.color}-200`
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        selectedTypes.includes(type as QuestionType) ? `bg-${config.color}-500` : "bg-slate-300"
                                    )} />
                                    <span className="font-semibold">{config.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <Switch
                                id="hints-toggle"
                                checked={includeHints}
                                onCheckedChange={setIncludeHints}
                            />
                            <Label htmlFor="hints-toggle" className="text-sm font-medium text-slate-700">Include hints</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                id="explanations-toggle"
                                checked={includeExplanations}
                                onCheckedChange={setIncludeExplanations}
                            />
                            <Label htmlFor="explanations-toggle" className="text-sm font-medium text-slate-700">Include explanations</Label>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <Label className="text-sm font-medium text-slate-700">Language:</Label>
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium transition-colors",
                                        language === 'en'
                                            ? "bg-hotel-navy text-white"
                                            : "bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => setLanguage('ar')}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium transition-colors",
                                        language === 'ar'
                                            ? "bg-hotel-navy text-white"
                                            : "bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    العربية
                                </button>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t py-6">
                    <Button
                        onClick={handleGenerate}
                        disabled={
                            generateQuestions.isPending ||
                            isLoadingContent ||
                            selectedTypes.length === 0 ||
                            (sourceType === 'text' && manualContent.trim().length < 20) ||
                            (sourceType === 'sop' && (!selectedSopId || !selectedArticle?.content)) ||
                            (sourceType === 'file' && !extractedText)
                        }
                        size="lg"
                        className="w-full md:w-auto min-w-[200px] bg-hotel-navy hover:bg-hotel-navy/90 text-white shadow-lg shadow-hotel-navy/20 h-12"
                    >
                        {generateQuestions.isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Generating Questions...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5 mr-2 text-hotel-gold fill-hotel-gold animate-pulse" />
                                Generate Questions
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {/* Loading Skeleton */}
            {generateQuestions.isPending && (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-6">
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <Skeleton className="h-4 w-1/2 mb-4" />
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Generated Questions */}
            {generatedQuestions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                            Generated Questions ({generatedQuestions.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)))}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedQuestions(new Set())}
                            >
                                Deselect All
                            </Button>
                        </div>
                    </div>

                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            AI-generated questions require review. Selected questions will be saved as <strong>drafts</strong> for human approval.
                        </AlertDescription>
                    </Alert>

                    {generatedQuestions.map((question, index) => (
                        <Card
                            key={index}
                            className={cn(
                                'transition-all',
                                selectedQuestions.has(index)
                                    ? 'border-blue-300 bg-blue-50/50'
                                    : 'opacity-60'
                            )}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedQuestions.has(index)}
                                            onCheckedChange={() => handleToggleQuestion(index)}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {QUESTION_TYPE_CONFIG[question.question_type]?.label || question.question_type}
                                            </Badge>
                                            <Badge variant="secondary">
                                                {DIFFICULTY_CONFIG[question.difficulty_level]?.label || question.difficulty_level}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteQuestion(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {editingIndex === index ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Question Text</Label>
                                            <Textarea
                                                value={question.question_text}
                                                onChange={(e) => setGeneratedQuestions(prev =>
                                                    prev.map((q, i) => i === index ? { ...q, question_text: e.target.value } : q)
                                                )}
                                                rows={2}
                                            />
                                        </div>
                                        {question.explanation && (
                                            <div>
                                                <Label>Explanation</Label>
                                                <Textarea
                                                    value={question.explanation}
                                                    onChange={(e) => setGeneratedQuestions(prev =>
                                                        prev.map((q, i) => i === index ? { ...q, explanation: e.target.value } : q)
                                                    )}
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                        <Button size="sm" onClick={() => setEditingIndex(null)}>
                                            Done Editing
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-medium mb-3">{question.question_text}</p>

                                        {question.options && (
                                            <div className="space-y-1 ml-4">
                                                {question.options.map((opt, optIdx) => (
                                                    <div
                                                        key={optIdx}
                                                        className={cn(
                                                            'flex items-center gap-2 text-sm py-1',
                                                            opt.is_correct && 'text-green-700 font-medium'
                                                        )}
                                                    >
                                                        <span className="text-gray-400">
                                                            {String.fromCharCode(65 + optIdx)}.
                                                        </span>
                                                        <span>{opt.text}</span>
                                                        {opt.is_correct && (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {question.correct_answer && !question.options && (
                                            <p className="text-sm text-green-700 mt-2">
                                                <strong>Answer:</strong> {question.correct_answer}
                                            </p>
                                        )}

                                        {question.explanation && (
                                            <p className="text-sm text-gray-600 mt-3 italic">
                                                {question.explanation}
                                            </p>
                                        )}

                                        {question.hint && (
                                            <p className="text-sm text-amber-700 mt-2">
                                                💡 Hint: {question.hint}
                                            </p>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {/* Save button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveSelected}
                            disabled={selectedQuestions.size === 0 || saving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''} as Drafts
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
