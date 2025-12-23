import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyLeaveRequests, useSubmitLeaveRequest, useCancelLeaveRequest } from '@/hooks/useLeaveRequests'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeaveRequest } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const leaveTypeKeys = [
  'annual',
  'sick',
  'unpaid',
  'maternity',
  'paternity',
  'personal',
  'other'
] as const

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
} as const

export default function MyLeaveRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('hr')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isRTL = i18n.dir() === 'rtl'
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [formData, setFormData] = useState({
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    type: '' as 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity' | 'personal' | 'other' | undefined,
    reason: ''
  })

  const { data: leaveRequests, isLoading } = useMyLeaveRequests()
  const submitMutation = useSubmitLeaveRequest()
  const cancelMutation = useCancelLeaveRequest()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.start_date || !formData.end_date || !formData.type) {
      return
    }

    submitMutation.mutate({
      start_date: formData.start_date.toISOString().split('T')[0],
      end_date: formData.end_date.toISOString().split('T')[0],
      type: formData.type!,
      reason: formData.reason || undefined
    }, {
      onSuccess: (data) => {
        setIsDialogOpen(false)
        setFormData({ start_date: undefined, end_date: undefined, type: undefined, reason: '' })
      },
      onError: (error) => {
        console.error('Error submitting leave request:', error)
      }
    })
  }

  const handleCancel = (requestId: string) => {
    if (confirm(t('leave_requests.list.confirm_cancel'))) {
      cancelMutation.mutate({ requestId })
    }
  }

  const handleView = async (leaveRequestId: string) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('workflow_request_id')
      .eq('id', leaveRequestId)
      .single()

    if (!error && data?.workflow_request_id) {
      navigate(`/hr/request/${data.workflow_request_id}`)
      return
    }

    const { data: reqData, error: reqError } = await supabase
      .from('requests')
      .select('id')
      .eq('entity_type', 'leave_request')
      .eq('entity_id', leaveRequestId)
      .single()

    if (!reqError && reqData?.id) {
      navigate(`/hr/request/${reqData.id}`)
      return
    }

    alert('Unable to open request details. Please try again.')
  }

  const calculateDays = (startDate: Date, endDate: Date) => {
    if (!startDate || !endDate) return 0
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  if (!user) return null

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('leave_requests.title')}
        description={t('leave_requests.description')}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-sm text-gray-600">
          {t('leave_requests.total_requests', { count: leaveRequests?.length || 0 })}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hotel-navy hover:bg-hotel-navy-light w-full sm:w-auto h-11">
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('leave_requests.new_request')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('leave_requests.form.title')}</DialogTitle>
              <DialogDescription className="text-slate-500">
                {t('leave_requests.form.description', { default: 'Submit a new leave request for approval' })}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="px-5 sm:px-6 py-5 space-y-5">
                {/* Date Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('leave_requests.form.start_date')}
                    </Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-start font-normal h-11 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                            !formData.start_date && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 me-2 text-slate-400" />
                          {formData.start_date ? format(formData.start_date, "PPP") : t('leave_requests.form.pick_date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, start_date: date }))
                            setStartDateOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('leave_requests.form.end_date')}
                    </Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-start font-normal h-11 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                            !formData.end_date && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 me-2 text-slate-400" />
                          {formData.end_date ? format(formData.end_date, "PPP") : t('leave_requests.form.pick_date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, end_date: date }))
                            setEndDateOpen(false)
                          }}
                          initialFocus
                          disabled={(date) => formData.start_date ? date < formData.start_date : false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Duration Display */}
                {formData.start_date && formData.end_date && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t('leave_requests.form.total_days', { count: calculateDays(formData.start_date, formData.end_date) })}
                    </span>
                  </div>
                )}

                {/* Leave Type */}
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('leave_requests.form.type')}
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as LeaveRequest['type'] }))}
                  >
                    <SelectTrigger className="h-11 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t('leave_requests.form.select_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypeKeys.map(key => (
                        <SelectItem key={key} value={key} className="cursor-pointer">
                          {t(`leave_requests.types.${key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('leave_requests.form.reason')}
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder={t('leave_requests.form.reason_placeholder')}
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="resize-none border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t('leave_requests.form.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending || !formData.start_date || !formData.end_date || !formData.type}
                  className="bg-hotel-navy hover:bg-hotel-navy-light text-white shadow-sm"
                >
                  {submitMutation.isPending ? t('leave_requests.form.submitting') : t('leave_requests.form.submit')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('leave_requests.list.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">{t('leave_requests.list.loading')}</p>
            </div>
          ) : !leaveRequests || leaveRequests.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('leave_requests.list.empty_title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('leave_requests.list.empty_desc')}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-hotel-navy hover:bg-hotel-navy-light">
                <Plus className="w-4 h-4 me-2" />
                {t('leave_requests.list.submit_first')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {request.workflow?.request_no && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono bg-slate-50 border-slate-300">
                          #{request.workflow.request_no}
                        </Badge>
                      )}
                      <h4 className="font-medium capitalize text-sm sm:text-base">
                        {t(`leave_requests.types.${request.type}`)} - {calculateDays(new Date(request.start_date), new Date(request.end_date))} {t('leave_requests.list.days')}
                      </h4>
                      <Badge className={`text-xs ${statusColors[request.status]}`}>
                        {t(`status.${request.status}`)}
                      </Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                      <div>
                        {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                      </div>
                      {request.reason && (
                        <div className="truncate">{t('leave_requests.list.reason')}: {request.reason}</div>
                      )}
                      <div>{t('leave_requests.list.submitted')}: {format(new Date(request.created_at), 'MMM dd, yyyy')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(request.id)}
                      className="h-9 text-xs sm:text-sm"
                    >
                      View
                    </Button>
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                        disabled={cancelMutation.isPending}
                        className="text-red-600 hover:text-red-700 h-9 text-xs sm:text-sm"
                      >
                        <X className="w-3.5 h-3.5 me-1" />
                        {t('leave_requests.list.cancel_action')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
