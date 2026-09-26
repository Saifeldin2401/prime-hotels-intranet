import { PageHeader } from '@/components/layout/PageHeader'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function QuestionGeneratorPage() {
    const navigate = useNavigate()
    const [content, setContent] = useState('')

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <PageHeader
                backTo="/studio/quizzes"
                title="Generate questions"
                description="Paste a procedure or training text. Review every generated question before it goes into a quiz."
            />

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Content Source</CardTitle>
                        <CardDescription>Paste the text you want to generate questions from.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Paste your SOP or training content here..."
                            className="min-h-[200px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </CardContent>
                </Card>

                <AIQuestionGenerator
                    sopId="manual_input"
                    sopTitle="Manual Input"
                    sopContent={content}
                    onQuestionsCreated={() => {
                        navigate('/studio/quizzes')
                    }}
                />
            </div>
        </div>
    )
}
