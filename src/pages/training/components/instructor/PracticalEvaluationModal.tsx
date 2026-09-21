import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useSubmitPracticalEvaluation } from '@/hooks/usePracticalAssessments'
import { supabase } from '@/lib/supabase'
import type { PracticalAssessment } from '@/types/enterpriseOperatingModel'
import { ClipboardCheck, CheckCircle, XCircle, User } from 'lucide-react'

interface PracticalEvaluationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment: PracticalAssessment | null
  hotelId?: string
  organizationId?: string
}

interface StaffProfile {
  id: string
  full_name: string
  email: string
  job_title?: string | null
}

export function PracticalEvaluationModal({
  open,
  onOpenChange,
  assessment,
  hotelId,
  organizationId
}: PracticalEvaluationModalProps) {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { toast } = useToast()

  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('')
  const [rubricScores, setRubricScores] = useState<Record<string, { points: number; comments: string }>>({})
  const [overallFeedback, setOverallFeedback] = useState('')

  const submitMutation = useSubmitPracticalEvaluation()

  // Load staff
  useEffect(() => {
    if (!open) return
    async function loadStaff() {
      try {
        let q = supabase
          .from('profiles')
          .select('id, full_name, email, job_title')
          .eq('is_active', true)
          .order('full_name')

        if (organizationId) {
          q = q.eq('organization_id', organizationId)
        }
        const { data } = await q
        if (data) setStaff(data)
      } catch (err) {
        console.error('Failed to load staff profiles:', err)
      }
    }
    loadStaff()
  }, [open, organizationId])

  // Initialize scores whenever assessment opens
  useEffect(() => {
    if (assessment?.rubric_criteria) {
      const initialScores: Record<string, { points: number; comments: string }> = {}
      assessment.rubric_criteria.forEach((c) => {
        initialScores[c.id] = { points: c.max_points, comments: '' }
      })
      setRubricScores(initialScores)
      setOverallFeedback('')
      setSelectedLearnerId('')
    }
  }, [assessment, open])

  // Calculate score percentage
  const { totalPointsEarned, totalMaxPoints, percentage, isPassed } = useMemo(() => {
    if (!assessment?.rubric_criteria || assessment.rubric_criteria.length === 0) {
      return { totalPointsEarned: 0, totalMaxPoints: 0, percentage: 0, isPassed: false }
    }

    const maxPts = assessment.rubric_criteria.reduce((sum, c) => sum + (c.max_points || 0), 0)
    const earnedPts = Object.values(rubricScores).reduce((sum, s) => sum + (Number(s.points) || 0), 0)
    const pct = maxPts > 0 ? Math.round((earnedPts / maxPts) * 100) : 0
    const passed = pct >= (assessment.passing_score_percentage || 80)

    return {
      totalPointsEarned: earnedPts,
      totalMaxPoints: maxPts,
      percentage: pct,
      isPassed: passed
    }
  }, [assessment, rubricScores])

  const handlePointChange = (criterionId: string, points: number, max: number) => {
    const safePoints = Math.max(0, Math.min(points, max))
    setRubricScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        points: safePoints
      }
    }))
  }

  const handleCommentChange = (criterionId: string, comments: string) => {
    setRubricScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        comments
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assessment) return

    if (!selectedLearnerId) {
      toast({
        title: isAr ? 'يرجى تحديد المتدرب' : 'Select Learner',
        description: isAr ? 'اختر الموظف المراد تقييم أدائه الميداني' : 'Please select the staff member being evaluated',
        variant: 'destructive'
      })
      return
    }

    try {
      await submitMutation.mutateAsync({
        assessment_id: assessment.id,
        learner_id: selectedLearnerId,
        hotel_id: hotelId || null,
        score_achieved: percentage,
        is_passed: isPassed,
        rubric_evaluations: rubricScores,
        evaluator_feedback: overallFeedback.trim() || undefined
      })

      const selectedStaffMember = staff.find((s) => s.id === selectedLearnerId)

      toast({
        title: isAr ? 'تم حفظ التقييم الميداني بنجاح' : 'Practical Evaluation Submitted',
        description: isAr
          ? `تم اعتماد التقييم لـ ${selectedStaffMember?.full_name || 'المتدرب'}: النتيجة ${percentage}% (${isPassed ? 'اجتاز بنجاح' : 'يحتاج إعادة'})`
          : `Evaluation recorded for ${selectedStaffMember?.full_name || 'Learner'}: Score ${percentage}% (${isPassed ? 'Passed' : 'Needs Retest'})`
      })

      onOpenChange(false)
    } catch (err: any) {
      console.error('Failed to submit evaluation:', err)
      toast({
        title: isAr ? 'فشل حفظ التقييم' : 'Submission Failed',
        description: err.message || (isAr ? 'حدث خطأ أثناء حفظ التقييم' : 'Failed to record evaluation.'),
        variant: 'destructive'
      })
    }
  }

  if (!assessment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <ClipboardCheck className="h-4 w-4" />
              <span>{isAr ? 'تقييم كفاءة ميدانية (المشرف)' : 'On-the-Job Practical Evaluation'}</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {isAr ? 'نسبة النجاح المطلوبة' : 'Pass Threshold'}: {assessment.passing_score_percentage}%
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-foreground mt-1">
            {isAr && assessment.title_ar ? assessment.title_ar : assessment.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {assessment.description || (isAr ? 'قم بتقييم كل معيار ملاحظة وسجل الملاحظات الميدانية.' : 'Rate each standard rubric criterion and log supervisor coaching feedback.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 py-3 pe-1">
          {/* Select Learner */}
          <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/50">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <User className="h-3.5 w-3.5 text-amber-500" />
              {isAr ? 'الموظف / المتدرب الخاضع للتقييم *' : 'Staff Member / Learner being evaluated *'}
            </Label>
            <Select value={selectedLearnerId} onValueChange={setSelectedLearnerId}>
              <SelectTrigger className="text-sm bg-background">
                <SelectValue placeholder={isAr ? 'اختر الموظف...' : 'Select staff member...'} />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.full_name}</span>
                    {s.job_title && <span className="text-xs text-muted-foreground ms-2">({s.job_title})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rubric Criteria List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isAr ? 'معايير التحقق الميدانية' : 'Observation Rubric Criteria'}
              </h4>
              <span className="text-xs text-muted-foreground">
                {assessment.rubric_criteria?.length || 0} {isAr ? 'معايير' : 'criteria'}
              </span>
            </div>

            {assessment.rubric_criteria?.map((c, index) => {
              const currentVal = rubricScores[c.id]?.points ?? c.max_points
              const currentComment = rubricScores[c.id]?.comments || ''

              return (
                <div
                  key={c.id || index}
                  className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-foreground">
                        {index + 1}. {isAr && c.label_ar ? c.label_ar : c.label}
                      </div>
                      {isAr && c.label && c.label_ar && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {c.label}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs font-mono">
                      {isAr ? 'الحد الأقصى' : 'Max'}: {c.max_points} {isAr ? 'نقطة' : 'pts'}
                    </Badge>
                  </div>

                  {/* Points Input & Quick Presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      {isAr ? 'الدرجة الممنوحة:' : 'Points Awarded:'}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={c.max_points}
                      value={currentVal}
                      onChange={(e) => handlePointChange(c.id, Number(e.target.value), c.max_points)}
                      className="w-20 h-8 text-sm font-bold text-center"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1 ms-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => handlePointChange(c.id, c.max_points, c.max_points)}
                      >
                        {isAr ? 'كاملة' : 'Full'} ({c.max_points})
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        onClick={() => handlePointChange(c.id, Math.round(c.max_points / 2), c.max_points)}
                      >
                        {isAr ? 'نصف' : 'Half'} ({Math.round(c.max_points / 2)})
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handlePointChange(c.id, 0, c.max_points)}
                      >
                        0
                      </Button>
                    </div>
                  </div>

                  {/* Observation Note */}
                  <Input
                    placeholder={isAr ? 'ملاحظة المشرف على هذا المعيار (اختياري)...' : 'Supervisor observation note for this item (optional)...'}
                    value={currentComment}
                    onChange={(e) => handleCommentChange(c.id, e.target.value)}
                    className="text-xs h-8 bg-muted/20 border-dashed"
                  />
                </div>
              )
            })}
          </div>

          {/* Real-time Summary Card */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">
                {isAr ? 'إجمالي النقاط المحققة' : 'Total Score Achieved'}
              </div>
              <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                {totalPointsEarned} / {totalMaxPoints} <span className="text-sm font-normal text-muted-foreground">({percentage}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPassed ? (
                <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>{isAr ? 'ناجح (اجتاز المعيار)' : 'PASSED (Exceeds Standard)'}</span>
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{isAr ? 'يحتاج تدريب إضافي' : 'NEEDS RETEST / COACHING'}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Supervisor Overall Feedback */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isAr ? 'تغذية راجعة وتوجيهات المشرف الشاملة' : 'Overall Supervisor Coaching & Commendations'}
            </Label>
            <Textarea
              rows={2}
              placeholder={
                isAr
                  ? 'أدخل تعليقات التوجيه المهني، نقاط القوة، والمجالات التي تحتاج إلى تعزيز...'
                  : 'Document employee strengths observed, constructive coaching notes, and next follow-up date...'
              }
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md"
            >
              {submitMutation.isPending
                ? (isAr ? 'جاري الحفظ...' : 'Submitting...')
                : (isAr ? 'اعتماد التقييم الميداني' : 'Submit Official Evaluation')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
