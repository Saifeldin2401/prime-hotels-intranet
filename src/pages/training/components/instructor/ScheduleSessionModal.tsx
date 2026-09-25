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
import { useCreateTrainingSession } from '@/hooks/useILT'
import { supabase } from '@/lib/supabase'
import type { SessionDeliveryMode } from '@/types/enterpriseOperatingModel'
import { Calendar, Clock, MapPin, Video, Users, BookOpen } from 'lucide-react'

interface ScheduleSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: string
  hotelId?: string
  onSessionCreated?: (sessionId: string) => void
}

export function ScheduleSessionModal({
  open,
  onOpenChange,
  organizationId,
  hotelId,
  onSessionCreated
}: ScheduleSessionModalProps) {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [description, setDescription] = useState('')
  const [deliveryMode, setDeliveryMode] = useState<SessionDeliveryMode>('in_person')
  const [locationVenue, setLocationVenue] = useState('')
  const [virtualUrl, setVirtualUrl] = useState('')
  const [maxCapacity, setMaxCapacity] = useState<number>(20)
  const [courseId, setCourseId] = useState<string>('none')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // Available courses
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)

  const createSessionMutation = useCreateTrainingSession()

  // Initialize default date/time (tomorrow at 09:00 - 11:00)
  useEffect(() => {
    if (open) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const year = tomorrow.getFullYear()
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
      const day = String(tomorrow.getDate()).padStart(2, '0')

      setStartTime(`${year}-${month}-${day}T09:00`)
      setEndTime(`${year}-${month}-${day}T11:30`)
    }
  }, [open])

  // Fetch courses for dropdown
  useEffect(() => {
    if (!open) return
    async function loadCourses() {
      setIsLoadingCourses(true)
      try {
        let q = supabase.from('courses').select('id, title').eq('is_deleted', false).order('title')
        if (organizationId) {
          q = q.eq('organization_id', organizationId)
        }
        const { data } = await q
        if (data) setCourses(data)
      } catch (err) {
        console.error('Failed to load courses', err)
      } finally {
        setIsLoadingCourses(false)
      }
    }
    loadCourses()
  }, [open, organizationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: isAr ? 'خطأ في الإدخال' : 'Validation Error',
        description: isAr ? 'يرجى إدخال عنوان الجلسة التدريبية' : 'Please provide a session title',
        variant: 'destructive'
      })
      return
    }

    if (!startTime || !endTime) {
      toast({
        title: isAr ? 'خطأ في التاريخ' : 'Missing Schedule',
        description: isAr ? 'يرجى تحديد وقت البدء والانتهاء للجلسة' : 'Please specify start and end times',
        variant: 'destructive'
      })
      return
    }

    const effectiveOrgId = organizationId || 'e0000000-0000-0000-0000-000000000001'

    try {
      const { data: user } = await supabase.auth.getUser()

      const newSession = await createSessionMutation.mutateAsync({
        organization_id: effectiveOrgId,
        hotel_id: hotelId || null,
        course_id: courseId === 'none' ? null : courseId,
        title: title.trim(),
        title_ar: titleAr.trim() || null,
        description: description.trim() || null,
        delivery_mode: deliveryMode,
        location_venue: deliveryMode !== 'virtual' ? locationVenue.trim() || 'Executive Training Hall' : null,
        virtual_meeting_url: deliveryMode !== 'in_person' ? virtualUrl.trim() || null : null,
        max_capacity: Number(maxCapacity) || 20,
        instructor_id: user?.user?.id || null,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        status: 'scheduled'
      })

      toast({
        title: isAr ? 'تمت جدولة الجلسة بنجاح' : 'Session Scheduled Successfully',
        description: isAr
          ? `تم إنشاء الجلسة: ${titleAr || title}`
          : `Session "${title}" is ready for enrollment`
      })

      // Reset form
      setTitle('')
      setTitleAr('')
      setDescription('')
      setLocationVenue('')
      setVirtualUrl('')
      setCourseId('none')

      onOpenChange(false)
      if (newSession?.id && onSessionCreated) {
        onSessionCreated(newSession.id)
      }
    } catch (err: any) {
      console.error('Failed to create session:', err)
      toast({
        title: isAr ? 'فشل إنشاء الجلسة' : 'Failed to schedule session',
        description: err.message || (isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'),
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Calendar className="h-4 w-4" />
            <span>{isAr ? 'جدولة جلسة تدريبية مباشرة' : 'Schedule ILT Training Session'}</span>
          </div>
          <DialogTitle className="text-xl font-bold font-display text-foreground">
            {isAr ? 'إنشاء جلسة تدريبية حضورية أو افتراضية' : 'Create Live Training Session'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isAr
              ? 'قم بتحديد بيانات الجلسة، موقعها أو رابط الاجتماع، وسعة المقاعد لتمكين المدربين والمتدربين من الحضور.'
              : 'Set up classroom or virtual session details, venue/meeting link, and seat capacity.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Titles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {isAr ? 'عنوان الجلسة (بالإنجليزية) *' : 'Session Title (English) *'}
              </Label>
              <Input
                placeholder="e.g. Forbes 5-Star VIP Arrival Standards"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5" dir="rtl">
              <Label className="text-xs font-medium">
                {isAr ? 'عنوان الجلسة (بالعربية)' : 'Session Title (Arabic)'}
              </Label>
              <Input
                placeholder="مثال: معايير فوربس الخمس نجوم لاستقبال كبار الشخصيات"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="text-sm text-end"
              />
            </div>
          </div>

          {/* Delivery Mode & Course */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {isAr ? 'طريقة تقديم التدريب' : 'Delivery Mode'}
              </Label>
              <Select
                value={deliveryMode}
                onValueChange={(val) => setDeliveryMode(val as SessionDeliveryMode)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {isAr ? 'حضوري (قاعة تدريب الفندق)' : 'In-Person (Hotel Training Room)'}
                    </span>
                  </SelectItem>
                  <SelectItem value="virtual">
                    <span className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5 text-blue-500" />
                      {isAr ? 'افتراضي (عبر الإنترنت / Teams)' : 'Virtual (Online / Teams)'}
                    </span>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      {isAr ? 'هجين (حضوري وافتراضي معاً)' : 'Hybrid (Both In-Person & Online)'}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {isAr ? 'الدورة التدريبية المرتبطة (اختياري)' : 'Associated Course (Optional)'}
              </Label>
              <Select value={courseId} onValueChange={setCourseId} disabled={isLoadingCourses}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={isAr ? 'اختر دورة...' : 'Select course...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{isAr ? 'جلسة مستقلة بدون دورة' : 'Standalone ILT Workshop'}</span>
                  </SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                        {c.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timing: Start & End */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? 'تاريخ ووقت البدء *' : 'Start Date & Time *'}
              </Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? 'تاريخ ووقت الانتهاء *' : 'End Date & Time *'}
              </Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="text-sm"
              />
            </div>
          </div>

          {/* Location or Meeting URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveryMode !== 'virtual' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  {isAr ? 'موقع القاعة / القاعة التدريبية' : 'Venue / Room Location'}
                </Label>
                <Input
                  placeholder="e.g. Al Hamra Academy Room 101"
                  value={locationVenue}
                  onChange={(e) => setLocationVenue(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {deliveryMode !== 'in_person' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-blue-500" />
                  {isAr ? 'رابط الاجتماع الافتراضي' : 'Virtual Meeting URL'}
                </Label>
                <Input
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  value={virtualUrl}
                  onChange={(e) => setVirtualUrl(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {isAr ? 'سعة المقاعد القصوى' : 'Maximum Capacity (Seats)'}
              </Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {isAr ? 'الوصف والأهداف التدريبية' : 'Session Description & Objectives'}
            </Label>
            <Textarea
              rows={2}
              placeholder={
                isAr
                  ? 'أدخل نبذة عن محتوى الورشة التدريبية والمهارات المستهدفة...'
                  : 'Key learning outcomes, prerequisite reading, and materials needed...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={createSessionMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md"
            >
              {createSessionMutation.isPending
                ? (isAr ? 'جاري الجدولة...' : 'Scheduling...')
                : (isAr ? 'جدولة الجلسة الآن' : 'Schedule Session Now')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
