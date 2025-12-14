import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
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
import { Loader2, AlertCircle, CheckCircle, Upload, FileText, X, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    const { user } = useAuth()
    const queryClient = useQueryClient()

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

    // File handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB')
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
            if (droppedFile.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB')
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
        if (!user?.id) {
            setError('You must be logged in to submit a referral')
            return
        }

        try {
            setUploading(true)
            let cvUrl = linkedIn.trim() || null

            // Upload file if provided
            if (file) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${jobId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, file)

                if (uploadError) {
                    // Try fallback bucket
                    const { error: fallbackError } = await supabase.storage
                        .from('job-applications')
                        .upload(fileName, file)

                    if (fallbackError) {
                        throw new Error('Failed to upload CV. Please try again.')
                    }

                    const { data: urlData } = supabase.storage
                        .from('job-applications')
                        .getPublicUrl(fileName)
                    cvUrl = urlData.publicUrl
                } else {
                    const { data: urlData } = supabase.storage
                        .from('resumes')
                        .getPublicUrl(fileName)
                    cvUrl = urlData.publicUrl
                }
            }

            // Insert referral
            const { error: insertError } = await supabase
                .from('job_applications')
                .insert({
                    job_posting_id: jobId,
                    applicant_name: name.trim(),
                    applicant_email: email.trim(),
                    applicant_phone: phone.trim() || null,
                    cv_url: cvUrl,
                    notes: notes.trim() || null,
                    referred_by: user.id,
                    status: 'received',
                    routed_to: []
                })

            if (insertError) {
                throw insertError
            }

            // Success
            setSuccess(true)
            queryClient.invalidateQueries({ queryKey: ['employee-referrals'] })

            // Close after delay
            setTimeout(() => {
                resetForm()
                onOpenChange(false)
            }, 1500)

        } catch (err: any) {
            console.error('Referral error:', err)
            setError(err.message || 'Failed to submit referral')
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
                            <Label htmlFor="phone">Phone</Label>
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
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !success && !uploading && fileInputRef.current?.click()}
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
                            LinkedIn / Portfolio URL
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
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
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
