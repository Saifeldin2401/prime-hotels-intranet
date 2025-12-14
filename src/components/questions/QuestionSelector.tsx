import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, Loader2 } from 'lucide-react'
import { useQuestions } from '@/hooks/useQuestions'
import type { QuestionType, QuestionDifficulty } from '@/types/questions'
import { Badge } from '@/components/ui/badge'

interface QuestionSelectorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (questionIds: string[]) => void
    excludeIds?: string[]
}

export function QuestionSelector({
    open,
    onOpenChange,
    onSelect,
    excludeIds = []
}: QuestionSelectorProps) {
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const { data, isLoading } = useQuestions({
        search: search || undefined
        // Removed status: 'published' to allow selecting drafts
    })

    const questions = data?.questions?.filter(q => !excludeIds.includes(q.id)) || []

    const handleToggle = (id: string, checked: boolean) => {
        const next = new Set(selectedIds)
        if (checked) {
            next.add(id)
        } else {
            next.delete(id)
        }
        setSelectedIds(next)
    }

    const handleConfirm = () => {
        onSelect(Array.from(selectedIds))
        setSelectedIds(new Set())
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Questions</DialogTitle>
                    <DialogDescription>
                        Choose questions from the library to add to this quiz.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 py-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search questions..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : questions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No matching questions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                questions.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(q.id)}
                                                onCheckedChange={(checked) => handleToggle(q.id, checked as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <p className="line-clamp-2">{q.question_text}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                q.status === 'published' ? 'text-green-600 border-green-200' :
                                                    q.status === 'draft' ? 'text-gray-600 border-gray-200' :
                                                        'text-yellow-600 border-yellow-200'
                                            }>
                                                {q.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">
                                                {q.question_type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize ${q.difficulty_level === 'easy' ? 'text-green-600 border-green-200' :
                                                    q.difficulty_level === 'medium' ? 'text-yellow-600 border-yellow-200' :
                                                        'text-red-600 border-red-200'
                                                }`}>
                                                {q.difficulty_level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{q.points}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="mt-4">
                    <div className="flex-1 flex items-center text-sm text-muted-foreground">
                        {selectedIds.size} question{selectedIds.size !== 1 && 's'} selected
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                        Add Selected
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
