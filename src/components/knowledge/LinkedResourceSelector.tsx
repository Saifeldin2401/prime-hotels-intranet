/**
 * Linked Resource Selector
 * 
 * Component for linking quizzes and training modules to knowledge articles.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    GraduationCap,
    ClipboardCheck,
    Link2,
    X,
    ExternalLink,
    Loader2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'

interface LinkedResourceSelectorProps {
    linkedQuizId: string | null
    linkedTrainingId: string | null
    onQuizChange: (quizId: string | null) => void
    onTrainingChange: (trainingId: string | null) => void
}

export function LinkedResourceSelector({
    linkedQuizId,
    linkedTrainingId,
    onQuizChange,
    onTrainingChange
}: LinkedResourceSelectorProps) {
    // Fetch published quizzes
    const { data: quizzes, isLoading: quizzesLoading } = useQuery({
        queryKey: ['learning-quizzes-select'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('learning_quizzes')
                    .select('id, title')
                    .eq('status', 'published')
                    .order('title')
                if (error) {
                    console.warn('Quizzes fetch error:', error)
                    return []
                }
                return data || []
            } catch {
                return []
            }
        }
    })

    // Fetch active training modules
    const { data: trainingModules, isLoading: trainingLoading } = useQuery({
        queryKey: ['training-modules-select'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('training_modules')
                    .select('id, title')
                    .order('title')
                if (error) {
                    console.warn('Training modules fetch error:', error)
                    return []
                }
                return data || []
            } catch {
                return []
            }
        }
    })

    // Get selected quiz details
    const selectedQuiz = quizzes?.find(q => q.id === linkedQuizId)
    const selectedTraining = trainingModules?.find(t => t.id === linkedTrainingId)

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-blue-500" />
                    Linked Resources
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Quiz Linking */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-purple-500" />
                        <span className="font-medium text-sm">Assessment Quiz</span>
                    </div>

                    {linkedQuizId && selectedQuiz ? (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex-1">
                                <p className="font-medium text-purple-900">{selectedQuiz.title}</p>
                            </div>
                            <Link to={`/learning/quiz/${linkedQuizId}`} target="_blank">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                onClick={() => onQuizChange(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Select
                                value={linkedQuizId || ''}
                                onValueChange={(value) => onQuizChange(value || null)}
                            >
                                <SelectTrigger className="flex-1">
                                    {quizzesLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading quizzes...
                                        </div>
                                    ) : (
                                        <SelectValue placeholder="Select a quiz to link" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {quizzes?.map(quiz => (
                                        <SelectItem key={quiz.id} value={quiz.id}>
                                            {quiz.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Link to="/learning/quizzes/create" target="_blank">
                                <Button variant="outline" className="whitespace-nowrap">
                                    Create New
                                </Button>
                            </Link>
                        </div>

                    )}
                    <p className="text-xs text-gray-500">
                        Link a quiz to test knowledge after reading this article
                    </p>
                </div>

                {/* Training Module Linking */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-sm">Training Module</span>
                    </div>

                    {linkedTrainingId && selectedTraining ? (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex-1">
                                <p className="font-medium text-green-900">{selectedTraining.title}</p>
                            </div>
                            <Link to={`/learning/training/${linkedTrainingId}`} target="_blank">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                onClick={() => onTrainingChange(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Select
                            value={linkedTrainingId || ''}
                            onValueChange={(value) => onTrainingChange(value || null)}
                        >
                            <SelectTrigger className="w-full">
                                {trainingLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading modules...
                                    </div>
                                ) : (
                                    <SelectValue placeholder="Select a training module" />
                                )}
                            </SelectTrigger>
                            <SelectContent>
                                {trainingModules?.map(module => (
                                    <SelectItem key={module.id} value={module.id}>
                                        {module.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <p className="text-xs text-gray-500">
                        Link to a detailed training program for in-depth learning
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
