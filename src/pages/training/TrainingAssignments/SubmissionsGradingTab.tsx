import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  assignmentSubmissionService,
  type SubmissionStatus,
  type TrainingAssignmentSubmission
} from '@/services/assignmentSubmissionService'
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  Paperclip,
  RotateCcw,
  Search,
  UserCheck,
  Users
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function SubmissionsGradingTab() {
  const { t } = useTranslation('training')
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<TrainingAssignmentSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<TrainingAssignmentSubmission | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  // Grading form state
  const [score, setScore] = useState<number>(100)
  const [feedback, setFeedback] = useState<string>('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [statusFilter])

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      const { submissions: data } = await assignmentSubmissionService.getSubmissionsForGrading({
        status: statusFilter
      })
      setSubmissions(data)
    } catch (err) {
      console.error('Failed to load submissions for grading:', err)
      toast({
        title: t('loadFailed', 'Failed to load submissions'),
        description: 'Could not retrieve practical assignments for review.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openReviewModal = (sub: TrainingAssignmentSubmission) => {
    setSelectedSubmission(sub)
    setScore(sub.score !== null && sub.score !== undefined ? sub.score : 100)
    setFeedback(sub.instructor_feedback || '')
    setReviewDialogOpen(true)
  }

  const handleSaveReview = async (action: 'approved' | 'revision_required') => {
    if (!selectedSubmission) return

    setIsSubmittingReview(true)
    try {
      await assignmentSubmissionService.reviewSubmission({
        submissionId: selectedSubmission.id,
        status: action,
        score: action === 'approved' ? score : (score < 100 ? score : 0),
        passed: action === 'approved',
        feedback
      })

      toast({
        title: action === 'approved' ? t('submissionApproved', 'Submission Approved!') : t('revisionRequested', 'Revision Requested'),
        description: action === 'approved'
          ? t('learnerProgressUnlocked', 'Grade recorded and learner module progress unlocked.')
          : t('learnerNotifiedRevision', 'Feedback sent to learner to submit a revised assignment.')
      })

      setReviewDialogOpen(false)
      loadSubmissions()
    } catch (err: any) {
      console.error('Failed to save review:', err)
      toast({
        title: t('reviewFailed', 'Failed to save review'),
        description: err.message || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const learnerName = s.learner?.full_name?.toLowerCase() || ''
    const learnerEmail = s.learner?.email?.toLowerCase() || ''
    const moduleTitle = s.module?.title?.toLowerCase() || ''
    return learnerName.includes(q) || learnerEmail.includes(q) || moduleTitle.includes(q)
  })

  const pendingCount = submissions.filter(s => s.status === 'submitted' || s.status === 'under_review').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const revisionCount = submissions.filter(s => s.status === 'revision_required' || s.status === 'rejected').length

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">{t('totalSubmissions', 'Total Submissions')}</p>
              <p className="text-2xl font-bold text-hotel-navy mt-1">{submissions.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase">{t('pendingReview', 'Pending Review')}</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase">{t('approved', 'Approved')}</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{approvedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase">{t('revisionRequired', 'Revision Required')}</p>
              <p className="text-2xl font-bold text-rose-900 mt-1">{revisionCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-700">
              <RotateCcw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchLearnerOrModule', 'Search by associate or module...')}
            className="ps-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as SubmissionStatus | 'all')}
          >
            <SelectTrigger className="h-9 w-full sm:w-48 text-xs">
              <SelectValue placeholder={t('filterByStatus', 'Filter by status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses', 'All Submissions')}</SelectItem>
              <SelectItem value="submitted">{t('underReview', 'Pending Review')}</SelectItem>
              <SelectItem value="approved">{t('approved', 'Approved')}</SelectItem>
              <SelectItem value="revision_required">{t('revisionRequired', 'Revision Required')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submissions Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">{t('learner', 'Learner')}</th>
                <th className="px-4 py-3">{t('trainingModule', 'Module & Item')}</th>
                <th className="px-4 py-3">{t('submittedDate', 'Submitted')}</th>
                <th className="px-4 py-3">{t('status', 'Status')}</th>
                <th className="px-4 py-3">{t('score', 'Score')}</th>
                <th className="px-4 py-3 text-right">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-hotel-gold" />
                    <p className="text-xs">{t('loadingSubmissions', 'Loading assignment submissions...')}</p>
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <FileCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">{t('noSubmissionsFound', 'No assignment submissions found.')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('submissionsAppearHint', 'Learner practical submissions will appear here for grading.')}</p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-hotel-navy">{sub.learner?.full_name || sub.learner?.email || 'Unknown Learner'}</div>
                      <div className="text-xs text-muted-foreground">{sub.learner?.job_title || sub.learner?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{sub.module?.title || 'Training Module'}</div>
                      <div className="text-xs text-muted-foreground">
                        {sub.attempt_number > 1 ? `Attempt #${sub.attempt_number}` : 'First Attempt'}
                        {sub.attachment_urls?.length > 0 && ` • ${sub.attachment_urls.length} file(s)`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'approved' && (
                        <Badge className="bg-emerald-600 text-white text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('approved', 'Approved')}
                        </Badge>
                      )}
                      {(sub.status === 'submitted' || sub.status === 'under_review') && (
                        <Badge className="bg-amber-500 text-white text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {t('underReview', 'Under Review')}
                        </Badge>
                      )}
                      {(sub.status === 'revision_required' || sub.status === 'rejected') && (
                        <Badge className="bg-rose-600 text-white text-xs gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {t('revisionRequired', 'Revision Required')}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-xs text-slate-700">
                      {sub.score !== null && sub.score !== undefined ? `${sub.score}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => openReviewModal(sub)}
                        className="h-8 text-xs bg-hotel-navy hover:bg-hotel-navy-light text-white gap-1.5 shadow-sm"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        {sub.status === 'approved' ? t('editGrade', 'Review / Edit') : t('gradeSubmission', 'Review & Grade')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review & Grading Modal */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-hotel-navy flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-hotel-gold" />
              {t('gradePracticalAssignment', 'Evaluate Practical Assignment')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedSubmission?.learner?.full_name || 'Learner'} — {selectedSubmission?.module?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-5 py-2">
              {/* Learner's Submitted Text */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase">
                  {t('learnerWrittenWork', "Learner's Response")}
                </Label>
                <div className="mt-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedSubmission.submission_content || <span className="italic text-muted-foreground">{t('noWrittenResponse', 'No written text provided.')}</span>}
                </div>
              </div>

              {/* Attachments */}
              {selectedSubmission.attachment_urls?.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 uppercase">
                    {t('submittedFiles', 'Submitted Documents & Media')} ({selectedSubmission.attachment_urls.length})
                  </Label>
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSubmission.attachment_urls.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-hotel-navy hover:bg-slate-50 transition-colors text-xs text-slate-700 font-medium"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Paperclip className="h-4 w-4 text-hotel-gold shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </span>
                        <Download className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-semibold">{t('scorePercentage', 'Score Percentage (0 - 100%)')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {score >= 80 ? '✓ Meets 5-Star Hotel Passing Benchmark (≥80%)' : '⚠ Below standard passing threshold (<80%)'}
                  </p>
                </div>
              </div>

              {/* Instructor Feedback */}
              <div>
                <Label className="text-xs font-semibold">{t('instructorFeedbackForLearner', 'Instructor Feedback & Notes for Associate')}</Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t('feedbackPlaceholder', 'Explain what was done well, or specific corrections needed if requesting revision...')}
                  className="mt-1.5 min-h-[90px] text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewDialogOpen(false)}
              className="text-xs"
            >
              {t('cancel', 'Cancel')}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveReview('revision_required')}
                disabled={isSubmittingReview}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('requestRevision', 'Request Revision')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveReview('approved')}
                disabled={isSubmittingReview}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
              >
                {isSubmittingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t('approveAndPass', 'Approve & Pass')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
