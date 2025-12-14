import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { QuestionSelector } from '@/components/questions/QuestionSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { learningService } from '@/services/learningService'
import { useAuth } from '@/contexts/AuthContext'
import type { LearningQuiz, LearningQuizQuestion } from '@/types/learning'

export default function QuizBuilder() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const { user } = useAuth()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('settings')

    const [quiz, setQuiz] = useState<Partial<LearningQuiz>>({
        title: '',
        description: '',
        status: 'draft',
        passing_score_percentage: 70,
        time_limit_minutes: 30,
        randomize_questions: false,
        show_feedback_during: true,
    })

    // We keep questions separate to manage mutations easier before save? 
    // actually for questions we probably want to save the quiz first then manage questions links.
    const [questions, setQuestions] = useState<any[]>([])
    const [showAIModal, setShowAIModal] = useState(false)
    const [showSelector, setShowSelector] = useState(false)

    const handleSelectQuestions = async (selectedIds: string[]) => {
        if (!id) return

        try {
            setLoading(true)
            const currentCount = questions.length

            // Link questions sequentially
            for (let i = 0; i < selectedIds.length; i++) {
                await learningService.addQuestionToQuiz(id, selectedIds[i], currentCount + i)
            }

            toast({ title: 'Success', description: `Added ${selectedIds.length} questions` })
            setShowSelector(false)
            loadQuiz(id)
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to add questions', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleAIGenerated = async (count: number, ids?: string[]) => {
        if (!ids || !id) {
            setShowAIModal(false)
            if (id) loadQuiz(id)
            return
        }

        try {
            setLoading(true)
            const currentCount = questions.length

            // Link each question to the quiz
            // We do this sequentially to maintain order, or parallel with calculated indices
            for (let i = 0; i < ids.length; i++) {
                await learningService.addQuestionToQuiz(id, ids[i], currentCount + i)
            }

            toast({ title: 'Success', description: `Added ${count} AI generated questions` })
            setShowAIModal(false)
            loadQuiz(id)
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to link generated questions', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) {
            loadQuiz(id)
        }
    }, [id])

    const loadQuiz = async (quizId: string) => {
        try {
            setLoading(true)
            const data = await learningService.getQuiz(quizId)
            setQuiz(data)
            setQuestions(data.questions || [])
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load quiz',
                variant: 'destructive',
            })
            navigate('/learning/quizzes')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            if (!quiz.title) {
                toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' })
                return
            }

            if (!user?.id) {
                toast({ title: 'Error', description: 'You must be logged in to save', variant: 'destructive' })
                return
            }

            // Clean the quiz object for saving: remove joined fields and ensure correct types
            const quizData: any = { ...quiz }
            delete quizData.questions
            delete quizData.question_count
            delete quizData.created_at
            delete quizData.updated_at
            delete quizData.id

            let savedQuiz
            if (id) {
                savedQuiz = await learningService.updateQuiz(id, quizData)
                toast({ title: 'Success', description: 'Quiz updated successfully' })
            } else {
                quizData.created_by = user.id
                savedQuiz = await learningService.createQuiz(quizData)
                toast({ title: 'Success', description: 'Quiz created successfully' })
                navigate(`/learning/quizzes/${savedQuiz.id}`, { replace: true })
            }
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to save quiz', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleRemoveQuestion = async (qId: string) => {
        if (!id) return
        try {
            await learningService.removeQuestionFromQuiz(id, qId)
            setQuestions(prev => prev.filter(q => q.question_id !== qId))
            toast({ title: 'Removed', description: 'Question removed from quiz' })
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to remove question', variant: 'destructive' })
        }
    }

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">{id ? 'Edit Quiz' : 'Create New Quiz'}</h1>
                    <p className="text-muted-foreground">Configure settings and add questions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/learning/quizzes')}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Quiz</>}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6 mt-6">
                    <div className="grid gap-6 p-6 border rounded-lg bg-white">
                        <div className="space-y-2">
                            <Label>Quiz Title</Label>
                            <Input
                                value={quiz.title}
                                onChange={e => setQuiz({ ...quiz, title: e.target.value })}
                                placeholder="e.g., Fire Safety Annual Assessment"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={quiz.description || ''}
                                onChange={e => setQuiz({ ...quiz, description: e.target.value })}
                                placeholder="Describe what this quiz covers..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Passing Score (%)</Label>
                                <Input
                                    type="number"
                                    min="0" max="100"
                                    value={quiz.passing_score_percentage}
                                    onChange={e => setQuiz({ ...quiz, passing_score_percentage: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Time Limit (Minutes)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={quiz.time_limit_minutes || ''}
                                    onChange={e => setQuiz({ ...quiz, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="Leave empty for unlimited"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={quiz.status}
                                    onValueChange={(val: any) => setQuiz({ ...quiz, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border p-4 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Randomize Questions</Label>
                                <p className="text-sm text-muted-foreground">Shuffle question order for each attempt</p>
                            </div>
                            <Switch
                                checked={quiz.randomize_questions}
                                onCheckedChange={checked => setQuiz({ ...quiz, randomize_questions: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between border p-4 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Show Feedback</Label>
                                <p className="text-sm text-muted-foreground">Show correct/incorrect feedback immediately after answering</p>
                            </div>
                            <Switch
                                checked={quiz.show_feedback_during}
                                onCheckedChange={checked => setQuiz({ ...quiz, show_feedback_during: checked })}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="questions" className="space-y-6 mt-6">
                    {!id ? (
                        <div className="text-center py-16 border border-dashed rounded-lg bg-amber-50 border-amber-200">
                            <div className="mb-4 text-4xl">💾</div>
                            <h3 className="text-lg font-semibold text-amber-900 mb-2">Save Quiz First</h3>
                            <p className="text-amber-700 mb-6 max-w-md mx-auto">
                                You need to save your quiz settings before you can add questions.
                                Click "Save Quiz" above, then come back to add questions.
                            </p>
                            <Button onClick={handleSave} disabled={saving || !quiz.title}>
                                {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Quiz Now</>}
                            </Button>
                            {!quiz.title && (
                                <p className="text-xs text-amber-600 mt-2">Please enter a title in Settings first</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Quiz Questions</h3>
                                <div className="flex gap-2">
                                    <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="gap-2">
                                                <Sparkles className="h-4 w-4 text-purple-500" />
                                                Generate with AI
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <AIQuestionGenerator
                                                sopId="manual_input"
                                                sopTitle="Manual Input"
                                                sopContent=""
                                                onQuestionsCreated={handleAIGenerated}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                    <Button variant="outline" onClick={() => setShowSelector(true)}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Questions
                                    </Button>
                                </div>
                            </div>

                            <QuestionSelector
                                open={showSelector}
                                onOpenChange={setShowSelector}
                                onSelect={handleSelectQuestions}
                                excludeIds={questions.map(q => q.question_id)}
                            />

                            {questions.length === 0 ? (
                                <div className="text-center py-12 border border-dashed rounded-lg">
                                    <p className="text-muted-foreground mb-4">No questions added yet</p>
                                    <Button size="sm" onClick={() => setShowSelector(true)}>Add Questions</Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {questions.map((q, index) => (
                                        <div key={q.id} className="flex items-center gap-4 p-4 bg-white border rounded-lg group">
                                            <div className="cursor-move text-muted-foreground">
                                                <GripVertical className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{q.question?.question_text}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                        {q.question?.question_type}
                                                    </span>
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                        {q.points_override || q.question?.points} pts
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" title="Move Up"><ArrowUp className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" title="Move Down"><ArrowDown className="h-4 w-4" /></Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleRemoveQuestion(q.question_id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
