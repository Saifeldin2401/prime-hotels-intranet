import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useMarkAttendance } from '@/hooks/useILT'
import type { TrainingSessionAttendee, SessionAttendanceStatus } from '@/types/enterpriseOperatingModel'
import { UserCheck, CheckCircle, XCircle, Clock, Award } from 'lucide-react'

interface AttendanceScoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendee: TrainingSessionAttendee | null
  sessionId: string
}

export function AttendanceScoreModal({
  open,
  onOpenChange,
  attendee,
  sessionId
}: AttendanceScoreModalProps) {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { toast } = useToast()

  const [status, setStatus] = useState<SessionAttendanceStatus>('attended')
  const [scorePercentage, setScorePercentage] = useState<number | ''>('')
  const [feedback, setFeedback] = useState('')

  const markMutation = useMarkAttendance()

  useEffect(() => {
    if (attendee) {
      setStatus(attendee.attendance_status || 'attended')
      setScorePercentage(attendee.score_percentage ?? 100)
      setFeedback(attendee.feedback_comments || '')
    }
  }, [attendee, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attendee) return

    try {
      await markMutation.mutateAsync({
        sessionId,
        userId: attendee.user_id,
        status,
        scorePercentage: scorePercentage !== '' ? Number(scorePercentage) : undefined,
        feedback: feedback.trim() || undefined
      })

      toast({
        title: isAr ? 'تم تحديث الحضور والدرجة' : 'Attendance & Score Updated',
        description: isAr
          ? `تم تحديث سجل المتدرب ${attendee.user?.full_name || ''} بنجاح.`
          : `Learner record updated successfully for ${attendee.user?.full_name || 'Staff'}.`
      })

      onOpenChange(false)
    } catch (err: any) {
      console.error('Failed to update attendance:', err)
      toast({
        title: isAr ? 'فشل التحديث' : 'Update Failed',
        description: err.message || (isAr ? 'حدث خطأ غير متوقع' : 'An error occurred.'),
        variant: 'destructive'
      })
    }
  }

  if (!attendee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <UserCheck className="h-4 w-4" />
            <span>{isAr ? 'رصد الحضور والدرجة' : 'Mark Attendance & Grade'}</span>
          </div>
          <DialogTitle className="text-lg font-bold font-display text-foreground">
            {attendee.user?.full_name || 'Staff Member'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {attendee.user?.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Status Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isAr ? 'حالة الحضور' : 'Attendance Status'}
            </Label>
            <Select value={status} onValueChange={(val) => setStatus(val as SessionAttendanceStatus)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attended">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    {isAr ? 'حاضر (أكمل الجلسة)' : 'Attended (Completed)'}
                  </span>
                </SelectItem>
                <SelectItem value="no_show">
                  <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <XCircle className="h-4 w-4" />
                    {isAr ? 'غائب (لم يحضر)' : 'No Show (Absent)'}
                  </span>
                </SelectItem>
                <SelectItem value="excused">
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Clock className="h-4 w-4" />
                    {isAr ? 'معتذر بعذر مقبول' : 'Excused Absence'}
                  </span>
                </SelectItem>
                <SelectItem value="registered">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {isAr ? 'مسجل فقط (في الانتظار)' : 'Registered (Pending)'}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Score Percentage */}
          {status === 'attended' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? 'الدرجة المحققة في الجلسة (%)' : 'Session Mastery Score (%)'}
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="100"
                value={scorePercentage}
                onChange={(e) => setScorePercentage(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-sm font-semibold"
              />
            </div>
          )}

          {/* Feedback */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isAr ? 'ملاحظات المدرب وتوجيهاته للمتدرب' : 'Instructor Feedback & Notes'}
            </Label>
            <Textarea
              rows={3}
              placeholder={
                isAr
                  ? 'سجل ملاحظاتك حول مشاركة المتدرب وتفاعله خلال الجلسة...'
                  : 'Add notes regarding learner participation, strengths, or follow-ups...'
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={markMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md"
            >
              {markMutation.isPending
                ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                : (isAr ? 'حفظ الحضور والدرجة' : 'Save Attendance')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
