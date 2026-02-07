import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
    User, Mail, Phone, Building2, FileText, Link2,
    Clock, MessageSquare, CalendarPlus, ExternalLink, Loader2, History
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Referral {
    id: string
    applicant_name: string
    applicant_email: string
    applicant_phone: string | null
    cv_url: string | null
    cv_bucket?: string | null
    cv_path?: string | null
    cv_filename?: string | null
    cv_mime?: string | null
    cv_size?: number | null
    notes: string | null
    status: string
    created_at: string
    updated_at: string
    job_posting_id: string
    referred_by: string
}

interface CandidateProfileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    referral: Referral | null
    referrerName: string
    jobTitle: string
    propertyName: string
    departmentName: string
}

const statusColors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    interview: 'bg-purple-100 text-purple-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    shortlisted: 'bg-indigo-100 text-indigo-800',
    offer: 'bg-emerald-100 text-emerald-800'
}

const statusLabels: Record<string, string> = {
    received: 'Submitted',
    review: 'Under Review',
    interview: 'Interview',
    hired: 'Hired',
    rejected: 'Rejected',
    shortlisted: 'Shortlisted',
    offer: 'Offer'
}

export function CandidateProfileDialog({
    open,
    onOpenChange,
    referral,
    referrerName,
    jobTitle,
    propertyName,
    departmentName
}: CandidateProfileDialogProps) {
    const { roles } = useAuth()
    const queryClient = useQueryClient()
    const [hrNotes, setHrNotes] = useState('')
    const [interviewDate, setInterviewDate] = useState('')
    const [interviewTime, setInterviewTime] = useState('')
    const [saving, setSaving] = useState(false)
    const [showScheduleForm, setShowScheduleForm] = useState(false)
    const [cvLoading, setCvLoading] = useState(false)

    const referralId = referral?.id || null
    const isHR = roles?.some(r => ['regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'corporate_admin'].includes(r.role))

    const { data: history = [] } = useQuery({
        queryKey: ['referral-history', referralId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('referral_history')
                .select('id, old_status, new_status, change_note, created_at, changed_by, changer:profiles(id, full_name)')
                .eq('referral_id', referralId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data || []
        },
        enabled: !!referralId
    })

    if (!referral) return null

    const handleSaveNotes = async () => {
        setSaving(true)
        try {
            const existingNotes = referral.notes || ''
            const newNotes = existingNotes
                ? `${existingNotes}\n\n--- HR Note (${new Date().toLocaleDateString()}) ---\n${hrNotes}`
                : `--- HR Note (${new Date().toLocaleDateString()}) ---\n${hrNotes}`

            const { error } = await supabase
                .from('job_applications')
                .update({ notes: newNotes, updated_at: new Date().toISOString() })
                .eq('id', referral.id)

            if (error) throw error

            queryClient.invalidateQueries({ queryKey: ['employee-referrals'] })
            setHrNotes('')
        } catch (err) {
            console.error('Failed to save notes:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleScheduleInterview = async () => {
        if (!interviewDate || !interviewTime) return

        setSaving(true)
        try {
            const interviewDateTime = `${interviewDate} ${interviewTime}`
            const existingNotes = referral.notes || ''
            const newNotes = `${existingNotes}\n\n--- Interview Scheduled ---\nDate: ${interviewDateTime}`

            const { error } = await supabase
                .from('job_applications')
                .update({
                    notes: newNotes,
                    status: 'interview',
                    updated_at: new Date().toISOString()
                })
                .eq('id', referral.id)

            if (error) throw error

            queryClient.invalidateQueries({ queryKey: ['employee-referrals'] })
            setShowScheduleForm(false)
            setInterviewDate('')
            setInterviewTime('')
        } catch (err) {
            console.error('Failed to schedule interview:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('job_applications')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', referral.id)

            if (error) throw error
            queryClient.invalidateQueries({ queryKey: ['employee-referrals'] })
        } catch (err) {
            console.error('Failed to update status:', err)
        } finally {
            setSaving(false)
        }
    }

    const formatFileSize = (size?: number | null) => {
        if (!size) return ''
        const mb = size / 1024 / 1024
        return `${mb.toFixed(2)} MB`
    }

    const handleViewCv = async () => {
        if (!referral) return
        if (referral.cv_url) {
            window.open(referral.cv_url, '_blank', 'noopener,noreferrer')
            return
        }
        if (!referral.cv_bucket || !referral.cv_path) return

        setCvLoading(true)
        try {
            const { data, error } = await supabase.storage
                .from(referral.cv_bucket)
                .createSignedUrl(referral.cv_path, 60 * 10)
            if (error || !data?.signedUrl) {
                throw error || new Error('Failed to generate secure link')
            }
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
        } catch (err) {
            console.error('Failed to open CV:', err)
        } finally {
            setCvLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {referral.applicant_name}
                    </DialogTitle>
                    <DialogDescription>
                        Referred for {jobTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Status & Quick Actions */}
                    <div className="flex items-center justify-between">
                        <Badge className={statusColors[referral.status] || 'bg-gray-100'}>
                            {statusLabels[referral.status] || referral.status}
                        </Badge>
                        {isHR && (
                            <div className="flex gap-2">
                                {referral.status === 'received' && (
                                    <Button size="sm" onClick={() => handleStatusChange('review')} disabled={saving}>
                                        Start Review
                                    </Button>
                                )}
                                {referral.status === 'review' && (
                                    <Button size="sm" onClick={() => setShowScheduleForm(true)} disabled={saving}>
                                        <CalendarPlus className="h-4 w-4 mr-1" />
                                        Schedule Interview
                                    </Button>
                                )}
                                {referral.status === 'interview' && (
                                    <Button size="sm" onClick={() => handleStatusChange('hired')} disabled={saving}>
                                        Mark Hired
                                    </Button>
                                )}
                                {['received', 'review', 'interview'].includes(referral.status) && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('rejected')} disabled={saving}>
                                        Reject
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <a href={`mailto:${referral.applicant_email}`} className="text-blue-600 hover:underline">
                                {referral.applicant_email}
                            </a>
                        </div>
                        {referral.applicant_phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-500" />
                                <a href={`tel:${referral.applicant_phone}`} className="text-blue-600 hover:underline">
                                    {referral.applicant_phone}
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Position & Property */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Position:</span> {jobTitle}
                        </div>
                        {propertyName && (
                            <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Property:</span> {propertyName}
                            </div>
                        )}
                        {departmentName && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium ml-6">Department:</span> {departmentName}
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Referred by:</span> {referrerName}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Submitted:</span> {formatRelativeTime(referral.created_at)}
                        </div>
                    </div>

                    {/* CV/Resume Link */}
                    {(referral.cv_url || referral.cv_path) && (
                        <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {referral.cv_url?.includes('linkedin') ? (
                                        <Link2 className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    )}
                                    <div>
                                        <span className="text-sm font-medium block">
                                            {referral.cv_url?.includes('linkedin') ? 'LinkedIn Profile' : 'Resume/CV'}
                                        </span>
                                        {referral.cv_filename && (
                                            <span className="text-xs text-muted-foreground">
                                                {referral.cv_filename} {formatFileSize(referral.cv_size) && `• ${formatFileSize(referral.cv_size)}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={handleViewCv} disabled={cvLoading}>
                                    {cvLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                                    View
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Notes/History */}
                    {referral.notes && (
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Notes & History
                            </h4>
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 p-3 rounded">
                                {referral.notes}
                            </pre>
                        </div>
                    )}

                    {/* Status Timeline */}
                    {history.length > 0 && (
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Status Timeline
                            </h4>
                            <div className="space-y-3">
                                {history.map((item: any) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                {statusLabels[item.new_status] || item.new_status}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatRelativeTime(item.created_at)}
                                                {item.changer?.full_name ? ` • ${item.changer.full_name}` : ''}
                                            </p>
                                            {item.change_note && (
                                                <p className="text-xs text-gray-600 mt-1">{item.change_note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interview Scheduling Form */}
                    {isHR && showScheduleForm && (
                        <div className="border rounded-lg p-4 bg-purple-50">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <CalendarPlus className="h-4 w-4" />
                                Schedule Interview
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={interviewDate}
                                        onChange={(e) => setInterviewDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input
                                        type="time"
                                        value={interviewTime}
                                        onChange={(e) => setInterviewTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button size="sm" onClick={handleScheduleInterview} disabled={saving || !interviewDate || !interviewTime}>
                                    {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                    Confirm
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setShowScheduleForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Add HR Note */}
                    {isHR && (
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Add HR Note
                            </h4>
                            <Textarea
                                value={hrNotes}
                                onChange={(e) => setHrNotes(e.target.value)}
                                placeholder="Add a note about this candidate..."
                                rows={2}
                            />
                            <Button
                                size="sm"
                                className="mt-2"
                                onClick={handleSaveNotes}
                                disabled={!hrNotes.trim() || saving}
                            >
                                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                                Save Note
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
