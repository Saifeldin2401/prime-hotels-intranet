import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import {
    User, Mail, Phone, Building2, Calendar, FileText, Link2,
    Clock, MessageSquare, CalendarPlus, ExternalLink, Loader2
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Referral {
    id: string
    applicant_name: string
    applicant_email: string
    applicant_phone: string | null
    cv_url: string | null
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
    rejected: 'bg-red-100 text-red-800'
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
    const queryClient = useQueryClient()
    const [hrNotes, setHrNotes] = useState('')
    const [interviewDate, setInterviewDate] = useState('')
    const [interviewTime, setInterviewTime] = useState('')
    const [saving, setSaving] = useState(false)
    const [showScheduleForm, setShowScheduleForm] = useState(false)

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
                            {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </Badge>
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
                    {referral.cv_url && (
                        <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {referral.cv_url.includes('linkedin') ? (
                                        <Link2 className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    )}
                                    <span className="text-sm font-medium">
                                        {referral.cv_url.includes('linkedin') ? 'LinkedIn Profile' : 'Resume/CV'}
                                    </span>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                    <a href={referral.cv_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        View
                                    </a>
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

                    {/* Interview Scheduling Form */}
                    {showScheduleForm && (
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
