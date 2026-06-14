import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { logAuditEvent } from '@/lib/auditLog'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, FileText, Link2, Loader2, Upload, User, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from "react-i18next"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx'])
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

interface CreateReferralDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    jobId: string
    jobTitle: string
}

export function CreateReferralDialog({
    open,
    onOpenChange,
    jobId,
    jobTitle
}: CreateReferralDialogProps) {
    const { user, profile } = useAuth()
    const queryClient = useQueryClient()
    const { t } = useTranslation(['common', 'jobs'])

    // Form state
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [linkedIn, setLinkedIn] = useState('')
    const [notes, setNotes] = useState('')

    // File upload state
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Status state
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const resetForm = () => {
        setName('')
        setEmail('')
        setPhone('')
        setLinkedIn('')
        setNotes('')
        setFile(null)
        setError(null)
        setSuccess(false)
    }

    const validateFile = (candidateFile: File) => {
        const ext = candidateFile.name.split('.').pop()?.toLowerCase()
        if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
            return 'Invalid file type. Please upload a PDF or Word document.'
        }
        if (candidateFile.size > MAX_FILE_SIZE) {
            return 'File size must be less than 10MB'
        }
        if (candidateFile.type && !ALLOWED_MIME_TYPES.has(candidateFile.type)) {
            return 'Unsupported file type. Please upload a PDF or Word document.'
        }
        return null
    }

    const sanitizeFileName = (fileName: string) => {
        return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    }

    // File handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            const validationError = validateFile(selectedFile)
            if (validationError) {
                setError(validationError)
                return
            }
            setFile(selectedFile)
            setError(null)
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
            const droppedFile = e.dataTransfer.files[0]
            const validationError = validateFile(droppedFile)
            if (validationError) {
                setError(validationError)
                return
            }
            setFile(droppedFile)
            setError(null)
        }
    }

    const removeFile = () => {
        setFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        // Validation
        if (!name.trim()) {
            setError('Candidate name is required')
            return
        }
        if (!email.trim() || !email.includes('@')) {
            setError('Valid email is required')
            return
        }
        if (!phone.trim()) {
            setError('Valid phone number is required')
            return
        }
        if (!jobId) {
            setError('Job selection is required')
            return
        }
        if (!file && !linkedIn.trim()) {
            setError('Please attach a CV or provide a LinkedIn/portfolio link')
            return
        }
        if (linkedIn.trim()) {
            try {
                new URL(linkedIn.trim())
            } catch {
                setError('LinkedIn/portfolio link must be a valid URL')
                return
            }
        }
        if (!user?.id) {
            setError('You must be logged in to submit a referral')
            return
        }

        try {
            setUploading(true)
            let cvUrl = linkedIn.trim() || null
            let cvBucket: string | null = null
            let cvPath: string | null = null
            let cvFilename: string | null = null
            let cvMime: string | null = null
            let cvSize: number | null = null

            // Upload file if provided
            if (file) {
                const fileExt = file.name.split('.').pop()?.toLowerCase()
                const fallbackMimeMap: Record<string, string> = {
                    pdf: 'application/pdf',
                    doc: 'application/msword',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
                const safeFileName = sanitizeFileName(file.name)
                const fileName = `referrals/${user.id}/${jobId}/${Date.now()}_${crypto.randomUUID()}_${safeFileName}`

                const { error: uploadError } = await supabase.storage
                    .from('referral-cvs')
                    .upload(fileName, file, { contentType: file.type })

                if (uploadError) {
                    throw new Error('Failed to upload CV. Please try again.')
                }

                cvBucket = 'referral-cvs'
                cvPath = fileName
                cvFilename = safeFileName
                cvMime = file.type || (fileExt ? fallbackMimeMap[fileExt] : null) || null
                cvSize = file.size
                cvUrl = linkedIn.trim() || null
            }

            // Insert referral
            const { error: insertError } = await supabase
                .from('job_applications')
                .insert({
                    job_posting_id: jobId,
                    applicant_name: name.trim(),
                    applicant_email: email.trim(),
                    applicant_phone: phone.trim(),
                    cv_url: cvUrl,
                    cv_bucket: cvBucket,
                    cv_path: cvPath,
                    cv_filename: cvFilename,
                    cv_mime: cvMime,
                    cv_size: cvSize,
                    notes: notes.trim() || null,
                    referred_by: user.id,
                    status: 'received',
                    routed_to: [],
                    referral_source: 'employee'
                })

            if (insertError) {
                throw insertError
            }

            // Success
            setSuccess(true)
            queryClient.invalidateQueries({ queryKey: ['employee-referrals'] })
            queryClient.invalidateQueries({ queryKey: ['job-applications', jobId] })

            logAuditEvent({
                event_type: 'job.referral_submitted',
                entity_type: 'job_application',
                description: `Referral submitted for ${name.trim()}`,
                metadata: { job_posting_id: jobId }
            }).catch(() => undefined)

            // Close after delay
            setTimeout(() => {
                resetForm()
                onOpenChange(false)
            }, 1500)

        } catch (err: unknown) {
            console.error('Referral error:', err)
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit referral'
            setError(errorMessage)
        } finally {
            setUploading(false)
        }
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Refer a Candidate</DialogTitle>
                    <DialogDescription>
                        Submit a referral for: <strong>{jobTitle}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Referrer Info */}
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="font-medium text-foreground">Referrer</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                                <span className="block text-[11px] uppercase tracking-wide">{t('common:name')}</span>
                                <span className="text-foreground">{profile?.full_name || user?.email || 'Unknown'}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] uppercase tracking-wide">{t('common:email')}</span>
                                <span className="text-foreground">{profile?.email || user?.email || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                    {/* Error Display */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Success Display */}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">Referral submitted successfully!</span>
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Candidate Name *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            disabled={success || uploading}
                        />
                    </div>

                    {/* Email & Phone Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                                disabled={success || uploading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 890"
                                disabled={success || uploading}
                            />
                        </div>
                    </div>

                    {/* CV Upload */}
                    <div className="space-y-2">
                        <Label>Resume / CV</Label>
                        {!file ? (
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                                    isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 hover:bg-muted/50",
                                    (success || uploading) && "opacity-50 cursor-not-allowed"
                                )}
                                role="button"
                                tabIndex={0}
                                aria-disabled={success || uploading}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !success && !uploading && fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !success && !uploading) {
                                        e.preventDefault()
                                        fileInputRef.current?.click()
                                    }
                                }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx"
                                    disabled={success || uploading}
                                />
                                <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                                <p className="text-sm font-medium">Drop CV here or click to upload</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (Max 10MB)</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg">
                                <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={removeFile}
                                    disabled={success || uploading}
                                    aria-label={t('common:removeFile', 'Remove file')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* LinkedIn URL */}
                    <div className="space-y-2">
                        <Label htmlFor="linkedin" className="flex items-center gap-2">
                            <Link2 className="h-4 w-4" />
                            LinkedIn / Portfolio URL (optional)
                        </Label>
                        <Input
                            id="linkedin"
                            value={linkedIn}
                            onChange={(e) => setLinkedIn(e.target.value)}
                            placeholder="https://linkedin.com/in/johndoe"
                            disabled={success || uploading}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes / Recommendation</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Why is this candidate a good fit?"
                            rows={2}
                            disabled={success || uploading}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={success || uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle className="me-2 h-4 w-4" />
                                    Submitted
                                </>
                            ) : (
                                'Submit Referral'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
