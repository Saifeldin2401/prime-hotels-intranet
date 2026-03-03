import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { useLeaveRequests, useSubmitLeaveRequest, useCancelLeaveRequest, useVacationBalance } from '@/hooks/useLeaveRequests'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, differenceInDays } from 'date-fns'
import { CalendarIcon, Plus, X, Loader2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { leaveRequestSchema, type LeaveRequestFormData } from '@/lib/validationSchemas'
import { LoadingButton } from '@/components/loading'

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
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  draft: 'bg-slate-100 text-slate-800',
  pending_supervisor_approval: 'bg-yellow-100 text-yellow-800',
  pending_hr_review: 'bg-orange-100 text-orange-800',
  closed: 'bg-gray-100 text-gray-800',
  returned_for_correction: 'bg-purple-100 text-purple-800'
} as const

export default function MyLeaveRequests() {
  const { user: _user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('hr')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const { data: leaveRequests, isLoading } = useLeaveRequests()
  const { data: balance, isLoading: isBalanceLoading } = useVacationBalance()
  const submitMutation = useSubmitLeaveRequest()
  const cancelMutation = useCancelLeaveRequest()

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: 'annual',
      reason: ''
    }
  })

  const calculateDays = (start: Date, end: Date) => {
    return Math.max(0, differenceInDays(end, start) + 1)
  }

  const onSubmit = async (data: LeaveRequestFormData) => {
    try {
      await submitMutation.mutateAsync({
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.end_date, 'yyyy-MM-dd'),
        type: data.type,
        reason: data.reason
      })
      setIsDialogOpen(false)
      form.reset()
    } catch (err) {
      console.error('Submit leave request failed:', err)
    }
  }

  const handleCancel = async (id: string) => {
    if (window.confirm(t('leave_requests.list.cancel_confirm'))) {
      try {
        await cancelMutation.mutateAsync({ requestId: id })
      } catch (err) {
        console.error('Cancel leave request failed:', err)
      }
    }
  }

  const handleView = (id: string) => {
    navigate(`/hr/request/${id}`)
  }

  const selectedStartDate = form.watch('start_date')
  const selectedEndDate = form.watch('end_date')
  const requestedDays = selectedStartDate && selectedEndDate ? calculateDays(selectedStartDate, selectedEndDate) : 0
  const isOverBalance = form.watch('type') === 'annual' && balance && requestedDays > (balance.remaining_days || 0)

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <PageHeader
        title={t('leave_requests.title')}
        description={t('leave_requests.description')}
      />

      {/* Vacation Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-hotel-navy text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">{t('leave_requests.balance.total')}</p>
                <h3 className="text-3xl font-bold mt-1">
                  {isBalanceLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : balance?.total_days || 25}
                </h3>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-300 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{t('leave_requests.balance.used')}</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">
                  {isBalanceLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : balance?.used_days || 0}
                </h3>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]">
                {t('status.approved')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{t('leave_requests.balance.pending')}</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">
                  {isBalanceLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : balance?.pending_days || 0}
                </h3>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 uppercase text-[10px]">
                {t('status.pending')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-hotel-gold bg-hotel-gold/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-hotel-gold-dark text-sm font-medium">{t('leave_requests.balance.remaining')}</p>
                <h3 className="text-3xl font-bold mt-1 text-hotel-navy">
                  {isBalanceLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : balance?.remaining_days ?? 25}
                </h3>
              </div>
              <div className="p-2 bg-hotel-gold/20 rounded-full">
                <Info className="w-5 h-5 text-hotel-gold-dark" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">{t('leave_requests.list.title')}</h2>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) form.reset()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-hotel-navy hover:bg-hotel-navy-light text-white shadow-md">
              <Plus className="w-4 h-4 me-2" />
              {t('leave_requests.form.submit_btn')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl">{t('leave_requests.form.submit_btn')}</DialogTitle>
              <DialogDescription>
                {t('leave_requests.form.description', 'Fill in the details for your leave request.')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 gap-6">
                {/* Date Range Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('leave_requests.form.start_date')} *
                    </Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-start font-normal h-11 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                            !form.watch('start_date') && "text-slate-400",
                            form.formState.errors.start_date && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 me-2 text-slate-400" />
                          {form.watch('start_date')
                            ? format(form.watch('start_date'), "PPP")
                            : t('leave_requests.form.pick_date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('start_date')}
                          onSelect={(date) => {
                            form.setValue('start_date', date as Date, { shouldValidate: true })
                            setStartDateOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('leave_requests.form.end_date')} *
                    </Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-start font-normal h-11 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                            !form.watch('end_date') && "text-slate-400",
                            form.formState.errors.end_date && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 me-2 text-slate-400" />
                          {form.watch('end_date')
                            ? format(form.watch('end_date'), "PPP")
                            : t('leave_requests.form.pick_date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('end_date')}
                          onSelect={(date) => {
                            form.setValue('end_date', date as Date, { shouldValidate: true })
                            setEndDateOpen(false)
                          }}
                          initialFocus
                          disabled={(date) => {
                            const startDate = form.watch('start_date')
                            return startDate ? date < startDate : false
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Balance & Duration Display */}
                {(selectedStartDate && selectedEndDate || isOverBalance) && (
                  <div className={cn(
                    "flex flex-col gap-2 px-4 py-3 rounded-lg border",
                    isOverBalance
                      ? "bg-red-50 border-red-100 text-red-700"
                      : "bg-blue-50 border-blue-100 text-blue-700"
                  )}>
                    <div className="flex items-center gap-2">
                      {isOverBalance ? <AlertTriangle className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
                      <span className="text-sm font-semibold">
                        {t('leave_requests.form.total_days', { count: requestedDays })}
                      </span>
                    </div>
                    {isOverBalance && (
                      <p className="text-xs font-medium">
                        {t('leave_requests.form.insufficient_balance', 'Insufficient balance. You only have {{remaining}} days remaining.', { remaining: balance?.remaining_days })}
                      </p>
                    )}
                  </div>
                )}

                {/* Leave Type */}
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('leave_requests.form.type')} *
                  </Label>
                  <Select
                    value={form.watch('type') || ''}
                    onValueChange={(value) => form.setValue('type', value as LeaveRequestFormData['type'], { shouldValidate: true })}
                  >
                    <SelectTrigger className={cn(
                      "h-11 border-slate-200 dark:border-slate-700",
                      form.formState.errors.type && "border-red-500"
                    )}>
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
                    {...form.register('reason')}
                    placeholder={t('leave_requests.form.reason_placeholder')}
                    rows={3}
                    className={cn(
                      "resize-none border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                      form.formState.errors.reason && "border-red-500"
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    form.reset()
                  }}
                  className="border-slate-200"
                  disabled={submitMutation.isPending}
                >
                  {t('leave_requests.form.cancel')}
                </Button>
                <LoadingButton
                  type="submit"
                  disabled={!form.formState.isValid || isOverBalance}
                  loading={submitMutation.isPending}
                  loadingText={t('leave_requests.form.submitting')}
                  className="bg-hotel-navy hover:bg-hotel-navy-light text-white shadow-sm"
                >
                  {t('leave_requests.form.submit')}
                </LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Requests List */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold">{t('leave_requests.list.title')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-hotel-gold mx-auto" />
              <p className="mt-4 text-slate-500 font-medium">{t('leave_requests.list.loading')}</p>
            </div>
          ) : !leaveRequests || leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('leave_requests.list.empty_title')}</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                {t('leave_requests.list.empty_desc')}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-hotel-navy text-hotel-navy hover:bg-hotel-navy hover:text-white">
                <Plus className="w-4 h-4 me-2" />
                {t('leave_requests.list.submit_first')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-xl gap-4 hover:border-slate-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {request.workflow?.request_no && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono bg-slate-50 border-slate-300 text-slate-600">
                          #{request.workflow.request_no}
                        </Badge>
                      )}
                      <h4 className="font-bold text-slate-900">
                        {t(`leave_requests.types.${request.type}`)} - {calculateDays(new Date(request.start_date), new Date(request.end_date))} {t('leave_requests.list.days')}
                      </h4>
                      <Badge className={cn("text-[10px] uppercase font-bold px-2 py-0.5", statusColors[request.status as keyof typeof statusColors])}>
                        {t(`status.${request.status}`)}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}</span>
                      </div>
                      {request.reason && (
                        <div className="truncate italic text-slate-500">"{request.reason}"</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(request.id)}
                      className="text-hotel-navy hover:bg-slate-100 font-medium"
                    >
                      {t('leave_requests.list.view_details', 'View')}
                    </Button>
                    {['pending', 'draft', 'pending_supervisor_approval'].includes(request.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                        disabled={cancelMutation.isPending}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 font-medium"
                      >
                        <X className="w-4 h-4 me-1.5" />
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
