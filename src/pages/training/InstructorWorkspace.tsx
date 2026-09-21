import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useTrainingSessions,
  useSessionAttendees,
  useMarkAttendance,
  useRemoveAttendee
} from '@/hooks/useILT'
import {
  usePracticalAssessments,
  usePracticalSubmissions
} from '@/hooks/usePracticalAssessments'
import { useTenant } from '@/contexts/TenantContext'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  UserCheck,
  Plus,
  UserPlus,
  Award,
  History,
  Trash2,
  Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PracticalAssessment, TrainingSessionAttendee } from '@/types/enterpriseOperatingModel'
import { ScheduleSessionModal } from './components/instructor/ScheduleSessionModal'
import { RegisterLearnerModal } from './components/instructor/RegisterLearnerModal'
import { PracticalEvaluationModal } from './components/instructor/PracticalEvaluationModal'
import { CreateAssessmentModal } from './components/instructor/CreateAssessmentModal'
import { AttendanceScoreModal } from './components/instructor/AttendanceScoreModal'

export default function InstructorWorkspace() {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { currentOrganization, currentHotel } = useTenant()
  const activeOrgId = currentOrganization?.id
  const activeHotelId = currentHotel?.id

  const [activeTab, setActiveTab] = useState<'sessions' | 'practical'>('sessions')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [practicalSubTab, setPracticalSubTab] = useState<'rubrics' | 'history'>('rubrics')

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isCreateAssessmentModalOpen, setIsCreateAssessmentModalOpen] = useState(false)
  const [evaluatingAssessment, setEvaluatingAssessment] = useState<PracticalAssessment | null>(null)
  const [scoringAttendee, setScoringAttendee] = useState<TrainingSessionAttendee | null>(null)

  const { data: sessions = [], isLoading: isLoadingSessions } = useTrainingSessions({
    organizationId: activeOrgId,
    hotelId: activeHotelId
  })

  // Auto-select first session if none selected
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id)
    }
  }, [sessions, selectedSessionId])

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  const { data: attendees = [], isLoading: isLoadingAttendees } = useSessionAttendees(
    selectedSessionId || undefined
  )

  const { data: practicalAssessments = [], isLoading: isLoadingAssessments } = usePracticalAssessments({
    organizationId: activeOrgId
  })

  const { data: submissions = [], isLoading: isLoadingSubmissions } = usePracticalSubmissions({
    hotelId: activeHotelId
  })

  const markAttendanceMutation = useMarkAttendance()
  const removeAttendeeMutation = useRemoveAttendee()

  if (isLoadingSessions || isLoadingAssessments || isLoadingSubmissions) {
    return (
      <div className="space-y-6 pb-12 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64 col-span-1" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            <UserCheck className="h-4 w-4" />
            <span>{isAr ? 'مساحة المدرب والتقييم العملي' : 'Instructor & Practical Evaluation Hub'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            {isAr ? 'مركز إدارة التدريب الحضوري والملاحظة الميدانية' : 'Instructor-Led Training & Practical Assessments'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? 'جدولة الجلسات التدريبية المباشرة، تسجيل الحضور والدرجات، وتقييم الملاحظات الميدانية لمعايير فوربس'
              : 'Schedule live classroom sessions, take attendance rosters, grade participation, and audit field checklists'}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'sessions' ? (
            <Button
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-md flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'جدولة جلسة جديدة' : 'Schedule New Session'}</span>
            </Button>
          ) : (
            <Button
              onClick={() => setIsCreateAssessmentModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-md flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إنشاء قائمة تقييم' : 'Create Checklist'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'sessions' | 'practical')}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{isAr ? 'الجلسات التدريبية (ILT)' : 'ILT Sessions'}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ms-1">
              {sessions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="practical" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span>{isAr ? 'التقييمات العملية الميدانية' : 'Practical Checklists'}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ms-1">
              {practicalAssessments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Session List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  {isAr ? 'الجلسات التدريبية المجدولة' : 'Scheduled Training Sessions'}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {sessions.length} {isAr ? 'جلسة' : 'sessions'}
                </span>
              </div>

              {sessions.length === 0 ? (
                <Card className="p-10 text-center border-dashed border-border/80 bg-muted/10">
                  <Calendar className="h-12 w-12 mx-auto text-amber-500/60 mb-3" />
                  <h3 className="font-bold text-base text-foreground">
                    {isAr ? 'لا توجد جلسات تدريبية مجدولة حالياً' : 'No Scheduled Sessions Found'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {isAr
                      ? 'يمكنك جدولة ورش العمل الحضورية في قاعات الفندق أو الجلسات الافتراضية عبر تيمز لتسجيل المتدربين ومتابعة حضورهم.'
                      : 'Schedule your first classroom or virtual ILT workshop to enroll employees, take attendance, and award completion grades.'}
                  </p>
                  <Button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>{isAr ? 'جدولة الجلسة الأولى الآن' : 'Schedule First Session Now'}</span>
                  </Button>
                </Card>
              ) : (
                sessions.map((s) => {
                  const isSelected = selectedSessionId === s.id
                  const isVirtual = s.delivery_mode === 'virtual'
                  const isHybrid = s.delivery_mode === 'hybrid'

                  return (
                    <Card
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={cn(
                        'cursor-pointer border transition-all duration-200 hover:shadow-md relative overflow-hidden',
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                          : 'border-border/60 bg-card/80 hover:border-border'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />
                      )}

                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] uppercase font-mono tracking-wide px-2 py-0.5',
                                  isVirtual
                                    ? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                                    : isHybrid
                                    ? 'border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/5'
                                    : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                                )}
                              >
                                {isVirtual
                                  ? (isAr ? 'افتراضي' : 'Virtual')
                                  : isHybrid
                                  ? (isAr ? 'هجين' : 'Hybrid')
                                  : (isAr ? 'حضوري' : 'In-Person')}
                              </Badge>

                              <Badge
                                variant={s.status === 'completed' ? 'default' : 'secondary'}
                                className="text-[10px] capitalize"
                              >
                                {s.status}
                              </Badge>

                              {s.hotel?.name && (
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  • {s.hotel.name}
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-base text-foreground leading-snug">
                              {isAr && s.title_ar ? s.title_ar : s.title}
                            </h3>

                            {s.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {s.description}
                              </p>
                            )}
                          </div>

                          <div className="text-right text-xs text-muted-foreground shrink-0 bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/40">
                            <Users className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                            <span className="font-semibold text-foreground">{s.attendees_count}</span>
                            <span className="text-muted-foreground"> / {s.max_capacity} {isAr ? 'مقعد' : 'seats'}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2.5 border-t border-border/40">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                            {new Date(s.start_time).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1.5 max-w-[240px] truncate">
                            {isVirtual ? (
                              <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            ) : (
                              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">
                              {s.location_venue || s.virtual_meeting_url || (isVirtual ? 'Virtual Room' : 'Hotel Training Room')}
                            </span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Right 1 Col: Roster & Attendance Panel */}
            <div className="space-y-4">
              <Card className="border border-border/60 bg-card/80 shadow-sm sticky top-4">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-500" />
                      <span>{isAr ? 'كشف الحضور والدرجات' : 'Roster & Attendance'}</span>
                    </CardTitle>
                    {selectedSessionId && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {attendees.length} {isAr ? 'متدرب' : 'enrolled'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {selectedSession
                      ? (isAr
                          ? `الجلسة: ${selectedSession.title_ar || selectedSession.title}`
                          : `Session: ${selectedSession.title}`)
                      : (isAr ? 'اختر جلسة من القائمة لعرض المتدربين' : 'Select a session on the left to manage attendance')}
                  </CardDescription>

                  {selectedSession && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        <span>{isAr ? 'تسجيل متدرب في هذه الجلسة' : 'Enroll Staff Member'}</span>
                      </Button>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {!selectedSessionId ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <span>{isAr ? 'يرجى النقر على إحدى الجلسات لإدارة الحضور' : 'Please select a session on the left'}</span>
                    </div>
                  ) : isLoadingAttendees ? (
                    <div className="py-8 space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : attendees.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <p className="font-medium text-foreground">
                        {isAr ? 'لا يوجد متدربون مسجلون بعد' : 'No staff enrolled yet'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isAr ? 'انقر فوق "تسجيل متدرب" لإضافة موظفين من الفندق.' : 'Click "Enroll Staff Member" above to add learners.'}
                      </p>
                    </div>
                  ) : (
                    attendees.map((att) => {
                      const isAttended = att.attendance_status === 'attended'
                      const isNoShow = att.attendance_status === 'no_show'
                      const isExcused = att.attendance_status === 'excused'

                      return (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-8 w-8 border border-border/40">
                                <AvatarImage src={att.user?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-amber-500/10 text-amber-600 font-bold">
                                  {att.user?.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">
                                  {att.user?.full_name || 'Staff Member'}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {att.user?.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {att.score_percentage != null && (
                                <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400 border-amber-500/30">
                                  {att.score_percentage}%
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(isAr ? 'هل أنت متأكد من إلغاء تسجيل هذا المتدرب؟' : 'Remove learner from this session?')) {
                                    removeAttendeeMutation.mutate({
                                      sessionId: selectedSessionId,
                                      userId: att.user_id
                                    })
                                  }
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 pt-1 border-t border-border/40">
                            <Button
                              size="sm"
                              variant={isAttended ? 'default' : 'outline'}
                              className={cn(
                                'h-7 px-2 text-[11px] flex-1',
                                isAttended && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              )}
                              disabled={markAttendanceMutation.isPending}
                              onClick={() =>
                                markAttendanceMutation.mutate({
                                  sessionId: selectedSessionId,
                                  userId: att.user_id,
                                  status: 'attended',
                                  scorePercentage: att.score_percentage ?? 100
                                })
                              }
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {isAr ? 'حاضر' : 'Attended'}
                            </Button>

                            <Button
                              size="sm"
                              variant={isNoShow ? 'destructive' : 'outline'}
                              className="h-7 px-2 text-[11px] flex-1"
                              disabled={markAttendanceMutation.isPending}
                              onClick={() =>
                                markAttendanceMutation.mutate({
                                  sessionId: selectedSessionId,
                                  userId: att.user_id,
                                  status: 'no_show',
                                  scorePercentage: 0
                                })
                              }
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              {isAr ? 'غائب' : 'No Show'}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => setScoringAttendee(att)}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              {isAr ? 'رصد' : 'Grade'}
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Practical Checklists Tab */}
        <TabsContent value="practical" className="space-y-6 mt-6">
          {/* Subtabs for Practical: Rubrics vs Completed History */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Button
                variant={practicalSubTab === 'rubrics' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPracticalSubTab('rubrics')}
                className="text-xs h-8"
              >
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                <span>{isAr ? 'قوائم التحقق الميدانية' : 'Active Checklists'}</span>
                <Badge variant="outline" className="ms-1.5 text-[10px] px-1 h-4">
                  {practicalAssessments.length}
                </Badge>
              </Button>

              <Button
                variant={practicalSubTab === 'history' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPracticalSubTab('history')}
                className="text-xs h-8"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                <span>{isAr ? 'سجل التقييمات المنجزة' : 'Evaluation Submissions'}</span>
                <Badge variant="outline" className="ms-1.5 text-[10px] px-1 h-4">
                  {submissions.length}
                </Badge>
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateAssessmentModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span>{isAr ? 'قائمة جديدة' : 'New Checklist'}</span>
            </Button>
          </div>

          {practicalSubTab === 'rubrics' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {practicalAssessments.length === 0 ? (
                <Card className="col-span-full p-10 text-center border-dashed border-border/80 bg-muted/10">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-amber-500/60 mb-3" />
                  <h3 className="font-bold text-base text-foreground">
                    {isAr ? 'لا توجد قوائم تقييم عملية حالياً' : 'No Practical Observation Checklists Found'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {isAr
                      ? 'قم بإنشاء قوائم التحقق الميدانية لتمكين المشرفين من تقييم أداء الموظفين في الاستقبال، وخدمة الغرف، والأغذية والمشروبات وفق معايير فوربس.'
                      : 'Create practical observation rubrics for supervisors to evaluate frontline staff on Forbes 5-star service delivery.'}
                  </p>
                  <Button
                    onClick={() => setIsCreateAssessmentModalOpen(true)}
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>{isAr ? 'إنشاء أول قائمة تقييم' : 'Create First Checklist'}</span>
                  </Button>
                </Card>
              ) : (
                practicalAssessments.map((pa) => (
                  <Card
                    key={pa.id}
                    className="border border-border/60 bg-card/80 flex flex-col justify-between hover:shadow-md hover:border-amber-500/40 transition-all duration-200"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="outline" className="text-xs font-mono">
                          {pa.department?.name || (isAr ? 'عام لكافة الأقسام' : 'Cross-Department')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono text-amber-600 dark:text-amber-400">
                          {pa.rubric_criteria?.length || 0} {isAr ? 'معايير' : 'criteria'}
                        </Badge>
                      </div>

                      <CardTitle className="text-base font-bold text-foreground">
                        {isAr && pa.title_ar ? pa.title_ar : pa.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-xs mt-1">
                        {pa.description || (isAr ? 'تقييم كفاءة وملاحظة ميدانية للأداء التشغيلي' : 'Practical on-the-job observation rubric')}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/40 pt-3">
                        <span>{isAr ? 'درجة النجاح المطلوبة' : 'Passing Threshold'}:</span>
                        <strong className="text-foreground font-mono">{pa.passing_score_percentage}%</strong>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setEvaluatingAssessment(pa)}
                        className="w-full text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                        <span>{isAr ? 'بدء تقييم متدرب الآن' : 'Evaluate Staff Member'}</span>
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Submissions History Log */
            <div className="space-y-3">
              {submissions.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <h4 className="font-bold text-foreground text-sm">
                    {isAr ? 'لا توجد تقييمات ميدانية مسجلة حتى الآن' : 'No Evaluation Submissions Yet'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAr ? 'ستظهر هنا نتائج تقييم المشرفين للموظفين فور اعتمادها.' : 'Completed on-the-job observation rubrics will appear here.'}
                  </p>
                </Card>
              ) : (
                submissions.map((sub) => (
                  <Card key={sub.id} className="p-4 border border-border/60 bg-card/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border border-border/40">
                        <AvatarImage src={sub.learner?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-amber-500/10 text-amber-600">
                          {sub.learner?.full_name?.substring(0, 2).toUpperCase() || 'ST'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {sub.learner?.full_name || 'Staff Member'}
                          </span>
                          {sub.is_passed ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0">
                              {isAr ? 'اجتاز' : 'Passed'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] px-2 py-0">
                              {isAr ? 'لم يجتز' : 'Needs Retest'}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span>{sub.assessment?.title || 'Practical Checklist'}</span>
                          {sub.evaluator?.full_name && (
                            <span> • {isAr ? 'المقيِّم:' : 'Evaluator:'} {sub.evaluator.full_name}</span>
                          )}
                        </div>

                        {sub.evaluator_feedback && (
                          <div className="text-[11px] text-muted-foreground italic mt-1 bg-muted/30 px-2 py-0.5 rounded border border-border/30">
                            "{sub.evaluator_feedback}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold font-mono text-foreground">
                        {sub.score_achieved}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(sub.evaluated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ScheduleSessionModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        organizationId={activeOrgId}
        hotelId={activeHotelId}
        onSessionCreated={(id) => setSelectedSessionId(id)}
      />

      {selectedSessionId && (
        <RegisterLearnerModal
          open={isRegisterModalOpen}
          onOpenChange={setIsRegisterModalOpen}
          sessionId={selectedSessionId}
          organizationId={activeOrgId}
          existingAttendeeUserIds={attendees.map((a) => a.user_id)}
        />
      )}

      <PracticalEvaluationModal
        open={Boolean(evaluatingAssessment)}
        onOpenChange={(open) => !open && setEvaluatingAssessment(null)}
        assessment={evaluatingAssessment}
        hotelId={activeHotelId}
        organizationId={activeOrgId}
      />

      <CreateAssessmentModal
        open={isCreateAssessmentModalOpen}
        onOpenChange={setIsCreateAssessmentModalOpen}
        organizationId={activeOrgId}
      />

      <AttendanceScoreModal
        open={Boolean(scoringAttendee)}
        onOpenChange={(open) => !open && setScoringAttendee(null)}
        attendee={scoringAttendee}
        sessionId={selectedSessionId || ''}
      />
    </div>
  )
}
