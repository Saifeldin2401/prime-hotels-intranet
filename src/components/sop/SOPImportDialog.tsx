import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Icons } from '@/components/icons'
import { aiService } from '@/lib/gemini'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { useToast } from '@/components/ui/use-toast'

// Use local worker file from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface SOPImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (data: any) => void
}

export function SOPImportDialog({ open, onOpenChange, onImport }: SOPImportDialogProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [progress, setProgress] = useState(0)
    const { toast } = useToast()

    const extractText = async (file: File): Promise<string> => {
        if (file.type === 'text/plain') {
            return await file.text()
        }

        if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            let text = ''
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const content = await page.getTextContent()
                text += content.items.map((item: any) => item.str).join(' ') + '\n'
            }
            return text
        }

        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            return result.value
        }

        throw new Error('Unsupported file type')
    }

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        setIsAnalyzing(true)
        setProgress(10)

        try {
            // 1. Extract Text
            setProgress(30)
            const text = await extractText(file)

            if (!text || text.length < 50) {
                throw new Error('Could not extract enough text from this document.')
            }

            // 2. Analyze with AI
            setProgress(60)
            const analysis = await aiService.analyzeSOP(text)

            setProgress(100)

            toast({
                title: 'Analysis Complete',
                description: 'SOP has been structured and rewritten.'
            })

            // 3. Return data
            onImport(analysis)
            onOpenChange(false)

        } catch (error: any) {
            console.error('Import failed', error)
            toast({
                title: 'Import Failed',
                description: error.message || 'Something went wrong processing the file.',
                variant: 'destructive'
            })
        } finally {
            setIsAnalyzing(false)
            setProgress(0)
        }
    }, [onImport, onOpenChange, toast])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        },
        maxFiles: 1,
        multiple: false
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import SOP Document</DialogTitle>
                    <DialogDescription>
                        Upload a PDF, DOCX, or Text file. Our AI will analyze, format, and structure it into a standard SOP.
                    </DialogDescription>
                </DialogHeader>

                {isAnalyzing ? (
                    <div className="py-8 space-y-4 text-center">
                        <div className="flex justify-center">
                            <Icons.Loader className="h-10 w-10 animate-spin text-hotel-gold" />
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium">Analyzing Document...</p>
                            <p className="text-sm text-gray-500">Extracting text and rewriting content</p>
                        </div>
                        <Progress value={progress} className="w-full" />
                    </div>
                ) : (
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-hotel-gold bg-hotel-gold/5' : 'border-gray-200 hover:border-hotel-gold/50'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-2">
                            <Icons.Upload className="h-10 w-10 text-gray-400" />
                            <p className="font-medium text-gray-900">
                                {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
                            </p>
                            <p className="text-xs text-gray-500">
                                Supports PDF, DOCX, TXT (Max 10MB)
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isAnalyzing}>Cancel</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
