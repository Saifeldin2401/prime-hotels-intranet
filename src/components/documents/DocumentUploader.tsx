import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useUploadEmployeeDocument } from '@/hooks/useEmployeeDocuments'
import { cn } from '@/lib/utils'
import { SecurityMiddleware, rateLimitConfig } from '@/lib/security-middleware'
import { File, Loader2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DocumentUploaderProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DocumentUploader({ open, onOpenChange }: DocumentUploaderProps) {
    // Component initialization
    const [file, setFile] = useState<File | null>(null)
    const [_uploadProgress, _setUploadProgress] = useState<number | null>(null)
    const { t } = useTranslation()
    const [category, setCategory] = useState<string>('other')
    const [title, setTitle] = useState('')
    const [expiryDate, setExpiryDate] = useState('')
    const [documentNumber, setDocumentNumber] = useState('')
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

        // Rate limiting check for file uploads
        const rateLimitKey = `upload:document:${file.name}`
        if (!SecurityMiddleware.rateLimit(rateLimitKey, rateLimitConfig.upload.maxRequests, rateLimitConfig.upload.windowMs)) {
            toast({
                title: 'Upload rate limited',
                description: 'Too many upload attempts. Please try again later.',
                variant: 'destructive'
            })
            return
        }

        try {
            await uploadDocument.mutateAsync({
                file,
                category,
                title: title || file.name,
                expiry_date: expiryDate,
                document_number: documentNumber
            })

            toast({
                title: 'Document uploaded',
                description: 'Your document has been successfully uploaded.'
            })

            // Reset form and close
            setFile(null)
            setTitle('')
            setCategory('other')
            setExpiryDate('')
            setDocumentNumber('')
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
                        <Label htmlFor="category">{t('common:category')}</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("common:select_type")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="documentNumber">{t('profile.employee_documents.document_number')}</Label>
                            <Input
                                id="documentNumber"
                                placeholder="e.g. A1234567"
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expiryDate">{t('profile.employee_documents.expiry_date')}</Label>
                            <Input
                                id="expiryDate"
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                            />
                        </div>
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
                                <File className="h-8 w-8 text-blue-500 me-3" />
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
                                    aria-label={t('accessibility.remove_file', 'Remove file')}
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
                        {uploadDocument.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        {t('common.upload')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
