import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AIQuestionGenerator } from '@/components/questions/AIQuestionGenerator'

export default function QuestionGeneratorPage() {
    const navigate = useNavigate()
    const [content, setContent] = useState('')

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/questions')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Library
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">AI Question Generator</h1>
                    <p className="text-gray-500">Generate quiz questions from any SOP content</p>
                </div>
            </div>

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
                    onQuestionsCreated={(count) => {
                        navigate('/questions')
                    }}
                />
            </div>
        </div>
    )
}
