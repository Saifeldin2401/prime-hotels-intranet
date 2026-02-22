import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartments } from '@/hooks/useDepartments'
import { useProfiles } from '@/hooks/useUsers'
import { useCreateShift, useUpdateShift, useDeleteShift } from '@/hooks/useShifts'
import type { Shift } from '@/hooks/useShifts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

const defaultShiftForm: {
  user_id: string
  shift_type: string
  start_time: string
  end_time: string
  location: string
  notes: string
  break_duration_minutes: number
  status: Shift['status']
} = {
  user_id: '',
  shift_type: 'Shift',
  start_time: '',
  end_time: '',
  location: '',
  notes: '',
  break_duration_minutes: 0,
  status: 'scheduled'
}

const defaultAttendanceForm = {
  employee_id: '',
  check_in: '',
  check_out: '',
  status: 'present',
  notes: ''
}

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return ''
  try {
    return format(new Date(value), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ''
  }
}

export default function ShiftScheduling() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const { currentProperty } = useProperty()
  const propertyId = currentProperty?.id && currentProperty.id !== 'all' ? currentProperty.id : undefined

  const today = new Date()
  const defaultStart = new Date(today)
  const defaultEnd = new Date(today)
  defaultEnd.setDate(defaultEnd.getDate() + 7)

  const [departmentId, setDepartmentId] = useState<string>('all')
  const [dateStart, setDateStart] = useState(() => format(defaultStart, 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState(() => format(defaultEnd, 'yyyy-MM-dd'))
  const [attendanceDate, setAttendanceDate] = useState(() => format(today, 'yyyy-MM-dd'))

  const [shiftForm, setShiftForm] = useState(defaultShiftForm)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)

  const [attendanceForm, setAttendanceForm] = useState(defaultAttendanceForm)
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null)
  const shiftStatusOptions: Shift['status'][] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']

  const { departments } = useDepartments(propertyId)
  const { data: staff = [] } = useProfiles({
    property_id: propertyId,
    department_id: departmentId !== 'all' ? departmentId : undefined,
    limit: 500
  })

  const staffOptions = useMemo(() => staff, [staff])
  const staffIds = useMemo(() => new Set(staffOptions.map(member => member.id)), [staffOptions])

  const createShift = useCreateShift()
  const updateShift = useUpdateShift()
  const deleteShift = useDeleteShift()

  const shiftsQuery = useQuery({
    queryKey: ['shift-scheduling', propertyId, departmentId, dateStart, dateEnd],
    queryFn: async () => {
      const start = new Date(`${dateStart}T00:00:00`)
      const end = new Date(`${dateEnd}T23:59:59`)

      let query = supabase
        .from('shifts')
        .select('*, user:profiles(id, full_name, email, job_title)')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }
      if (departmentId !== 'all') {
        query = query.eq('department_id', departmentId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!dateStart && !!dateEnd
  })

  const attendanceQuery = useQuery({
    queryKey: ['attendance-corrections', propertyId, departmentId, attendanceDate, staffOptions.length],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('*, employee:profiles(id, full_name, email, job_title)')
        .eq('date', attendanceDate)
        .order('check_in', { ascending: true })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query
      if (error) throw error

      if (departmentId === 'all') return data || []
      return (data || []).filter((row: any) => staffIds.has(row.employee_id))
    },
    enabled: !!attendanceDate
  })

  const createAttendance = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: attendanceForm.employee_id,
        date: attendanceDate,
        check_in: attendanceForm.check_in ? new Date(attendanceForm.check_in).toISOString() : null,
        check_out: attendanceForm.check_out ? new Date(attendanceForm.check_out).toISOString() : null,
        status: attendanceForm.status,
        notes: attendanceForm.notes || null,
        property_id: propertyId || null
      }
      const { error } = await supabase.from('attendance').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('shift_management.actions.add_attendance', 'Attendance added'))
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] })
      setAttendanceForm(defaultAttendanceForm)
    },
    onError: () => toast.error('Failed to add attendance')
  })

  const updateAttendance = useMutation({
    mutationFn: async () => {
      if (!editingAttendanceId) return
      const payload = {
        check_in: attendanceForm.check_in ? new Date(attendanceForm.check_in).toISOString() : null,
        check_out: attendanceForm.check_out ? new Date(attendanceForm.check_out).toISOString() : null,
        status: attendanceForm.status,
        notes: attendanceForm.notes || null
      }
      const { error } = await supabase
        .from('attendance')
        .update(payload)
        .eq('id', editingAttendanceId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('shift_management.form.save', 'Saved'))
      queryClient.invalidateQueries({ queryKey: ['attendance-corrections'] })
      setEditingAttendanceId(null)
      setAttendanceForm(defaultAttendanceForm)
    },
    onError: () => toast.error('Failed to update attendance')
  })

  const handleSaveShift = async () => {
    if (!shiftForm.user_id) {
      toast.error('Select a staff member')
      return
    }
    if (!shiftForm.start_time || !shiftForm.end_time) {
      toast.error('Start and end times are required')
      return
    }
    try {
      if (editingShiftId) {
        await updateShift.mutateAsync({
          id: editingShiftId,
          updates: {
            shift_type: shiftForm.shift_type,
            start_time: shiftForm.start_time ? new Date(shiftForm.start_time).toISOString() : undefined,
            end_time: shiftForm.end_time ? new Date(shiftForm.end_time).toISOString() : undefined,
            location: shiftForm.location || null,
            notes: shiftForm.notes || null,
            break_duration_minutes: Number(shiftForm.break_duration_minutes) || 0,
            status: shiftForm.status as any
          }
        })
        toast.success(t('shift_management.form.save', 'Saved'))
      } else {
        await createShift.mutateAsync({
          user_id: shiftForm.user_id,
          shift_type: shiftForm.shift_type || 'Shift',
          start_time: new Date(shiftForm.start_time).toISOString(),
          end_time: new Date(shiftForm.end_time).toISOString(),
          location: shiftForm.location || null,
          department_id: departmentId !== 'all' ? departmentId : null,
          property_id: propertyId || null,
          notes: shiftForm.notes || null,
          break_duration_minutes: Number(shiftForm.break_duration_minutes) || 0,
          status: shiftForm.status
        })
        toast.success(t('shift_management.actions.create_shift', 'Shift created'))
      }
      setEditingShiftId(null)
      setShiftForm(defaultShiftForm)
    } catch (error) {
      toast.error('Failed to save shift')
    }
  }

  const handleEditShift = (shift: any) => {
    setEditingShiftId(shift.id)
    setShiftForm({
      user_id: shift.user_id,
      shift_type: shift.shift_type || 'Shift',
      start_time: toLocalDateTimeInput(shift.start_time),
      end_time: toLocalDateTimeInput(shift.end_time),
      location: shift.location || '',
      notes: shift.notes || '',
      break_duration_minutes: shift.break_duration_minutes || 0,
      status: shift.status || 'scheduled'
    })
  }

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteShift.mutateAsync(id)
      toast.success(t('shift_management.actions.delete', 'Shift deleted'))
    } catch (error) {
      toast.error('Failed to delete shift')
    }
  }

  const handleEditAttendance = (record: any) => {
    setEditingAttendanceId(record.id)
    setAttendanceForm({
      employee_id: record.employee_id,
      check_in: toLocalDateTimeInput(record.check_in),
      check_out: toLocalDateTimeInput(record.check_out),
      status: record.status || 'present',
      notes: record.notes || ''
    })
  }

  const handleSaveAttendance = () => {
    if (!editingAttendanceId && !attendanceForm.employee_id) {
      toast.error('Select a staff member')
      return
    }
    if (editingAttendanceId) {
      updateAttendance.mutate()
      return
    }
    createAttendance.mutate()
  }

  return (
    <MotionWrapper>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('shift_management.title', 'Shift Scheduling')}</h1>
          <p className="text-muted-foreground">{t('shift_management.description', 'Plan team shifts and correct attendance records.')}</p>
        </div>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>{t('shift_management.filters.department', 'Department')}</CardTitle>
            <CardDescription>{t('shift_management.filters.all_departments', 'All departments')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('shift_management.filters.department', 'Department')}</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('shift_management.filters.all_departments', 'All departments')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('shift_management.filters.all_departments', 'All departments')}</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('shift_management.filters.start_date', 'Start Date')}</Label>
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('shift_management.filters.end_date', 'End Date')}</Label>
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="shifts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="shifts">{t('shift_management.tabs.shifts', 'Shifts')}</TabsTrigger>
            <TabsTrigger value="attendance">{t('shift_management.tabs.attendance', 'Attendance Corrections')}</TabsTrigger>
          </TabsList>

          <TabsContent value="shifts">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>{t('shift_management.tabs.shifts', 'Shifts')}</CardTitle>
                <CardDescription>{t('shift_management.description', 'Plan team shifts and correct attendance records.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.staff_member', 'Staff Member')}</Label>
                    <Select value={shiftForm.user_id} onValueChange={(value) => setShiftForm(prev => ({ ...prev, user_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('shift_management.form.staff_member', 'Staff Member')} />
                      </SelectTrigger>
                      <SelectContent>
                        {staffOptions.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.shift_type', 'Shift Type')}</Label>
                    <Input value={shiftForm.shift_type} onChange={(e) => setShiftForm(prev => ({ ...prev, shift_type: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.start_time', 'Start Time')}</Label>
                    <Input type="datetime-local" value={shiftForm.start_time} onChange={(e) => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.end_time', 'End Time')}</Label>
                    <Input type="datetime-local" value={shiftForm.end_time} onChange={(e) => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.location', 'Location')}</Label>
                    <Input value={shiftForm.location} onChange={(e) => setShiftForm(prev => ({ ...prev, location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.status', 'Status')}</Label>
                    <Select value={shiftForm.status} onValueChange={(value) => setShiftForm(prev => ({ ...prev, status: value as Shift['status'] }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('shift_management.form.status', 'Status')} />
                      </SelectTrigger>
                      <SelectContent>
                        {shiftStatusOptions.map(status => (
                          <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <Label>{t('shift_management.form.notes', 'Notes')}</Label>
                    <Input value={shiftForm.notes} onChange={(e) => setShiftForm(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveShift}>
                    {editingShiftId ? t('shift_management.form.save', 'Save') : t('shift_management.actions.create_shift', 'Create Shift')}
                  </Button>
                  {editingShiftId && (
                    <Button variant="outline" onClick={() => {
                      setEditingShiftId(null)
                      setShiftForm(defaultShiftForm)
                    }}>
                      {t('shift_management.form.cancel', 'Cancel')}
                    </Button>
                  )}
                </div>

                {shiftsQuery.isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading shifts...</div>
                ) : shiftsQuery.data && shiftsQuery.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>{t('common:status')}</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftsQuery.data.map((shift: any) => (
                        <TableRow key={shift.id}>
                          <TableCell>{shift.user?.full_name || shift.user?.email || 'Staff'}</TableCell>
                          <TableCell>{shift.shift_type}</TableCell>
                          <TableCell>{format(new Date(shift.start_time), 'MMM d, HH:mm')}</TableCell>
                          <TableCell>{format(new Date(shift.end_time), 'MMM d, HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{shift.status?.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>{shift.location || '—'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditShift(shift)}>{t('shift_management.actions.edit', 'Edit')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteShift(shift.id)}>{t('shift_management.actions.delete', 'Delete')}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    {t('shift_management.empty.shifts', 'No shifts found for the selected period.')}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>{t('shift_management.tabs.attendance', 'Attendance Corrections')}</CardTitle>
                <CardDescription>{t('shift_management.description', 'Plan team shifts and correct attendance records.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('shift_management.filters.attendance_date', 'Attendance Date')}</Label>
                    <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.staff_member', 'Staff Member')}</Label>
                    <Select value={attendanceForm.employee_id} onValueChange={(value) => setAttendanceForm(prev => ({ ...prev, employee_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('shift_management.form.staff_member', 'Staff Member')} />
                      </SelectTrigger>
                      <SelectContent>
                        {staffOptions.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.full_name || member.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.check_in', 'Check In')}</Label>
                    <Input type="datetime-local" value={attendanceForm.check_in} onChange={(e) => setAttendanceForm(prev => ({ ...prev, check_in: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.check_out', 'Check Out')}</Label>
                    <Input type="datetime-local" value={attendanceForm.check_out} onChange={(e) => setAttendanceForm(prev => ({ ...prev, check_out: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.status', 'Status')}</Label>
                    <Select value={attendanceForm.status} onValueChange={(value) => setAttendanceForm(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('shift_management.form.status', 'Status')} />
                      </SelectTrigger>
                      <SelectContent>
                        {['present', 'absent', 'late', 'on_leave', 'sick', 'holiday'].map(status => (
                          <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shift_management.form.notes', 'Notes')}</Label>
                    <Input value={attendanceForm.notes} onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveAttendance}>
                    {editingAttendanceId ? t('shift_management.form.save', 'Save') : t('shift_management.actions.add_attendance', 'Add Attendance')}
                  </Button>
                  {editingAttendanceId && (
                    <Button variant="outline" onClick={() => {
                      setEditingAttendanceId(null)
                      setAttendanceForm(defaultAttendanceForm)
                    }}>
                      {t('shift_management.form.cancel', 'Cancel')}
                    </Button>
                  )}
                </div>

                {attendanceQuery.isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading attendance...</div>
                ) : attendanceQuery.data && attendanceQuery.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>{t('common:status')}</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceQuery.data.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.employee?.full_name || record.employee?.email || 'Staff'}</TableCell>
                          <TableCell>{record.check_in ? format(new Date(record.check_in), 'HH:mm') : '—'}</TableCell>
                          <TableCell>{record.check_out ? format(new Date(record.check_out), 'HH:mm') : '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{record.status?.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>{record.notes || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleEditAttendance(record)}>{t('shift_management.actions.edit', 'Edit')}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    {t('shift_management.empty.attendance', 'No attendance records found for this date.')}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MotionWrapper>
  )
}
