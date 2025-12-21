import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Upload, X, File, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUploadEmployeeDocument } from '@/hooks/useEmployeeDocuments'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface DocumentUploaderProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DocumentUploader({ open, onOpenChange }: DocumentUploaderProps) {
    console.log('DocumentUploader rendered, open:', open)
    const [file, setFile] = useState<File | null>(null)
    const [uploadProgress, setUploadProgress] = useState<number | null>(null)
    const { t } = useTranslation()
    const [category, setCategory] = useState<string>('other')
    const [title, setTitle] = useState('')
    const [isDragging, setIsDragging] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadDocument = useUploadEmployeeDocument()
    const { toast } = useToast()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            // Auto-set title if empty
            if (!title) {
                setTitle(e.target.files[0].name)
            }
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
            if (!title) {
                setTitle(e.dataTransfer.files[0].name)
            }
        }
    }

    const handleUpload = async () => {
        if (!file) return

        try {
            await uploadDocument.mutateAsync({
                file,
                category,
                title: title || file.name
            })

            toast({
                title: 'Document uploaded',
                description: 'Your document has been successfully uploaded.'
            })

            // Reset form and close
            setFile(null)
            setTitle('')
            setCategory('other')
            onOpenChange(false)
        } catch (error) {
            console.error('Upload failed:', error)
            toast({
                title: 'Upload failed',
                description: 'There was an error uploading your document. Please try again.',
                variant: 'destructive'
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Add a new document to your employee profile.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Document Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Updated CV 2024"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cv">CV / Resume</SelectItem>
                                <SelectItem value="certificate">Certificate</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>File</Label>
                        {!file ? (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                                        isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:bg-gray-50"
                                    )}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-sm font-medium text-gray-900">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        PDF, DOC, Images up to 10MB
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center p-3 bg-gray-50 border rounded-lg">
                                <File className="h-8 w-8 text-blue-500 mr-3" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-500 hover:text-red-500"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setFile(null)
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploadDocument.isPending}
                    >
                        {uploadDocument.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.upload')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
