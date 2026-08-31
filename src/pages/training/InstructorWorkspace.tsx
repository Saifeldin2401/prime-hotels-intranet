import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTrainingSessions, useSessionAttendees, useMarkAttendance } from '@/hooks/useILT'
import { usePracticalAssessments, usePracticalSubmissions } from '@/hooks/usePracticalAssessments'
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
  UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function InstructorWorkspace() {
  const { i18n } = useTranslation('common')
  const isAr = i18n.language === 'ar'
  const { currentOrganization, currentHotel } = useTenant()
  const activeOrgId = currentOrganization?.id
  const activeHotelId = currentHotel?.id

  const [activeTab, setActiveTab] = useState<'sessions' | 'practical'>('sessions')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data: sessions = [] } = useTrainingSessions({
    organizationId: activeOrgId,
    hotelId: activeHotelId
  })

  const { data: attendees = [] } = useSessionAttendees(selectedSessionId || undefined)
  const { data: practicalAssessments = [] } = usePracticalAssessments({
    organizationId: activeOrgId
  })
  usePracticalSubmissions({ hotelId: activeHotelId })

  const markAttendanceMutation = useMarkAttendance()

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
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
              ? 'جدولة الجلسات التدريبية المباشرة، تسجيل الحضور، وتقييم الملاحظات العملية الميدانية'
              : 'Manage live classroom sessions, take attendance rosters, and evaluate on-the-job practical checklists'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'sessions' | 'practical')}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{isAr ? 'الجلسات التدريبية (ILT)' : 'ILT Sessions'}</span>
          </TabsTrigger>
          <TabsTrigger value="practical" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span>{isAr ? 'التقييمات العملية الميدانية' : 'Practical Checklists'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Session List */}
            <div className="lg:col-span-2 space-y-4">
              {sessions.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="font-bold text-foreground">{isAr ? 'لا توجد جلسات مجدولة' : 'No Scheduled Sessions'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr ? 'سيتم سرد الجلسات التدريبية الحضورية والافتراضية هنا' : 'Classroom and virtual sessions will appear here'}
                  </p>
                </Card>
              ) : (
                sessions.map((s) => {
                  const isSelected = selectedSessionId === s.id
                  const isVirtual = s.delivery_mode === 'virtual'

                  return (
                    <Card
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={cn(
                        'cursor-pointer border transition-all duration-200 hover:shadow-md',
                        isSelected ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5' : 'border-border/60 bg-card/80'
                      )}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs uppercase font-mono">
                                {s.delivery_mode.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant={s.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                {s.status}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-base text-foreground">
                              {isAr && s.title_ar ? s.title_ar : s.title}
                            </h3>
                          </div>

                          <div className="text-right text-xs text-muted-foreground shrink-0">
                            <Users className="h-4 w-4 inline mr-1" />
                            <span>{s.attendees_count} / {s.max_capacity} {isAr ? 'مسجل' : 'seats'}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                            {new Date(s.start_time).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {isVirtual ? <Video className="h-3.5 w-3.5 text-blue-500" /> : <MapPin className="h-3.5 w-3.5 text-emerald-500" />}
                            {s.location_venue || s.virtual_meeting_url || (isVirtual ? 'Virtual Room' : 'Hotel Training Room')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Roster & Attendance Panel */}
            <div className="space-y-4">
              <Card className="border border-border/60 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>{isAr ? 'كشف الحضور والدرجات' : 'Roster & Attendance'}</span>
                    {selectedSessionId && <Badge variant="secondary">{attendees.length} {isAr ? 'متدرب' : 'learners'}</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {selectedSessionId
                      ? (isAr ? 'تسجيل حضور المتدربين للجلسة المحددة' : 'Mark attendance and scores for the selected session')
                      : (isAr ? 'اختر جلسة لعرض كشف الحضور' : 'Select a session on the left to view the roster')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {!selectedSessionId ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      {isAr ? 'يرجى النقر على جلسة لعرض المتدربين' : 'Please select a session to manage attendance'}
                    </div>
                  ) : attendees.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      {isAr ? 'لا يوجد متدربون مسجلون في هذه الجلسة بعد' : 'No learners registered for this session yet'}
                    </div>
                  ) : (
                    attendees.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20 gap-3"
                      >
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {att.user?.full_name || 'Staff Member'}
                          </div>
                          <div className="text-xs text-muted-foreground">{att.user?.email}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant={att.attendance_status === 'attended' ? 'default' : 'outline'}
                            className="h-7 px-2.5 text-xs"
                            disabled={markAttendanceMutation.isPending}
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                sessionId: selectedSessionId,
                                userId: att.user_id,
                                status: 'attended'
                              })
                            }
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            {isAr ? 'حاضر' : 'Attended'}
                          </Button>

                          <Button
                            size="sm"
                            variant={att.attendance_status === 'no_show' ? 'destructive' : 'ghost'}
                            className="h-7 px-2.5 text-xs"
                            disabled={markAttendanceMutation.isPending}
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                sessionId: selectedSessionId,
                                userId: att.user_id,
                                status: 'no_show'
                              })
                            }
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            {isAr ? 'غائب' : 'No Show'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Practical Checklists Tab */}
        <TabsContent value="practical" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {practicalAssessments.length === 0 ? (
              <Card className="col-span-full p-8 text-center border-dashed">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-bold text-foreground">{isAr ? 'لا توجد تقييمات عملية مسجلة' : 'No Practical Assessments'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAr ? 'قوائم الملاحظة الميدانية للمشرفين ستظهر هنا' : 'Supervisor practical rubrics and observation checklists will appear here'}
                </p>
              </Card>
            ) : (
              practicalAssessments.map((pa) => (
                <Card key={pa.id} className="border border-border/60 bg-card/80 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <Badge variant="outline" className="w-fit text-xs font-mono mb-1.5">
                      {pa.department?.name || (isAr ? 'عام' : 'General')}
                    </Badge>
                    <CardTitle className="text-base font-bold text-foreground">
                      {isAr && pa.title_ar ? pa.title_ar : pa.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {pa.description || (isAr ? 'تقييم كفاءة وملاحظة ميدانية للأداء' : 'Practical on-the-job observation rubric')}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/40 pt-3">
                      <span>{isAr ? 'درجة النجاح' : 'Passing Threshold'}: <strong>{pa.passing_score_percentage}%</strong></span>
                      <span>{pa.rubric_criteria?.length || 0} {isAr ? 'معايير' : 'criteria'}</span>
                    </div>

                    <Button size="sm" className="w-full text-xs font-medium">
                      <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                      {isAr ? 'بدء تقييم متدرب' : 'Evaluate Staff Member'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
