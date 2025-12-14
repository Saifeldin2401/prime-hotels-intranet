import { useState } from 'react'
import { Plus, Search, Filter, MoreVertical, FileText, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { learningService } from '@/services/learningService'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { QuestionStatus } from '@/types/questions'
import { useAIQuizGenerator } from '@/hooks/learning/useAIQuizGenerator'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

export default function QuizList() {
    const navigate = useNavigate()
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const { generateQuizFromSOP, generating } = useAIQuizGenerator()

    // Quiz Generation State
    const [showGenerateDialog, setShowGenerateDialog] = useState(false)
    const [selectedSOP, setSelectedSOP] = useState<string>('')
    const [sops, setSops] = useState<{ id: string, title: string }[]>([])

    const { data: quizzes, isLoading, refetch } = useQuery({
        queryKey: ['quizzes', statusFilter],
        queryFn: () => learningService.getQuizzes(statusFilter === 'all' ? undefined : statusFilter as QuestionStatus)
    })

    const filteredQuizzes = quizzes?.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This cannot be undone.')) return
        try {
            await learningService.deleteQuiz(id)
            toast({ title: 'Quiz deleted' })
            refetch()
        } catch (error) {
            toast({ title: 'Error deleting quiz', variant: 'destructive' })
        }
    }

    const handleOpenGenerate = async () => {
        // Fetch available SOPs for selection
        const { data } = await supabase
            .from('sop_documents')
            .select('id, title')
            .eq('status', 'published') // Only published SOPs
            .order('title')

        if (data) setSops(data)
        setShowGenerateDialog(true)
    }

    const handleGenerate = async () => {
        if (!selectedSOP) return

        const sop = sops.find(s => s.id === selectedSOP)
        await generateQuizFromSOP(selectedSOP, sop ? `Assessment: ${sop.title}` : undefined)
        setShowGenerateDialog(false)
        refetch() // Refresh list (though we navigate away usually, refreshing is good practice)
    }


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
                    <p className="text-muted-foreground">
                        Create and manage assessment quizzes for staff learning.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleOpenGenerate}
                        disabled={generating}
                        className="gap-2"
                    >
                        <Sparkles className={`h-4 w-4 ${generating ? 'animate-pulse text-purple-600' : 'text-purple-600'}`} />
                        {generating ? 'Generating...' : 'Generate from SOP'}
                    </Button>
                    <Button onClick={() => navigate('/learning/quizzes/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Quiz
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search quizzes..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredQuizzes?.map((quiz) => (
                        <div
                            key={quiz.id}
                            className="group relative flex flex-col justify-between space-y-4 rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <Badge variant={
                                        quiz.status === 'published' ? 'default' :
                                            quiz.status === 'draft' ? 'secondary' : 'outline'
                                    }>
                                        {quiz.status}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => navigate(`/learning/quizzes/${quiz.id}`)}>
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(quiz.id)}>
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div>
                                    <h3 className="font-semibold leading-none tracking-tight">{quiz.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {quiz.description || 'No description provided.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        {quiz.question_count || 0} Questions
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : 'No limit'}
                                    </div>
                                    <div className="flex items-center">
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        Pass: {quiz.passing_score_percentage}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="w-full" onClick={() => navigate(`/learning/quizzes/${quiz.id}`)}>
                                        Edit
                                    </Button>
                                    <Button className="w-full" onClick={() => navigate(`/learning/assignments?quiz=${quiz.id}`)}>
                                        Assign
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Quiz from SOP</DialogTitle>
                        <DialogDescription>
                            Select an existing SOP. AI will analyze it and generate 5 multiple choice questions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedSOP} onValueChange={setSelectedSOP}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a Standard Operating Procedure" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {sops.map(sop => (
                                    <SelectItem key={sop.id} value={sop.id}>
                                        {sop.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={!selectedSOP || generating}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {generating ? (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Quiz
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
