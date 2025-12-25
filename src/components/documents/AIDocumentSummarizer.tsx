
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Sparkles, Copy, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

export function AIDocumentSummarizer() {
    const { t } = useTranslation(['ai_tools', 'common'])
    const [inputText, setInputText] = useState('')
    const [summary, setSummary] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState<string>('')
    const [error, setError] = useState<string | null>(null)

    const handleSummarize = async () => {
        if (!inputText || inputText.length < 50) return

        setLoading(true)
        setError(null)
        setSummary(null)
        // Set initial progress
        setProgress('Connecting to Prime Hotels AI Server...')

        try {
            // Server-side approach: No user downloads needed
            const { data, error } = await supabase.functions.invoke('process-ai-request', {
                body: {
                    prompt: `Summarize the following text into key bullet points:\n\n${inputText}`,
                    model: 'facebook/bart-large-cnn', // Using a powerful server-side model
                    task: 'summarization'
                }
            })

            if (error) {
                console.error('Supabase Function Error:', error)
                throw new Error(error.message || 'Server connection failed')
            }

            setProgress('Processing response...')

            if (data && data.response) {
                setSummary(data.response)
            } else if (data && data.error) {
                throw new Error(data.error)
            } else {
                throw new Error('No summary generated from server')
            }

        } catch (err: any) {
            console.error('Summarization error:', err)
            setError(err.message || 'Failed to generate summary')
        } finally {
            setLoading(false)
            setProgress('')
        }
    }

    const copyToClipboard = () => {
        if (summary) {
            navigator.clipboard.writeText(summary)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                AI Document Summarizer
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Paste any long text, policy, or announcement to get an instant AI-generated summary.
                                <br />
                                <span className="text-xs text-muted-foreground">Powered by Prime AI Server • Zero downloads required</span>
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                            <Badge variant="secondary" className="text-xs font-normal">
                                Server-Side AI
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Paste text here to summarize (min 50 characters)..."
                        className="min-h-[200px] font-mono text-sm"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />

                    <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            {inputText.length} chars
                        </div>
                        <Button
                            onClick={handleSummarize}
                            disabled={loading || inputText.length < 50}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {progress || 'Processing...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Summarize Text
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AnimatePresence>
                {summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-blue-600" />
                                        AI Summary
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 text-blue-700 hover:text-blue-900 hover:bg-blue-100">
                                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                                        Copy
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-blue-950 leading-relaxed text-sm whitespace-pre-wrap">
                                    {summary}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
