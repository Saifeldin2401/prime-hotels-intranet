import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyLeaveRequests, useSubmitLeaveRequest, useCancelLeaveRequest } from '@/hooks/useLeaveRequests'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeaveRequest } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

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
  const { t, i18n } = useTranslation('hr')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isRTL = i18n.dir() === 'rtl'
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: '' as 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity' | 'personal' | 'other' | undefined,
    reason: ''
  })

  const { data: leaveRequests, isLoading } = useMyLeaveRequests()
  const submitMutation = useSubmitLeaveRequest()
  const cancelMutation = useCancelLeaveRequest()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.start_date || !formData.end_date || !formData.type) return

    submitMutation.mutate({
      ...formData,
      type: formData.type!,
      reason: formData.reason || undefined
    }, {
      onSuccess: () => {
        setIsDialogOpen(false)
        setFormData({ start_date: '', end_date: '', type: undefined, reason: '' })
      }
    })
  }

  const handleCancel = (requestId: string) => {
    if (confirm(t('leave_requests.list.confirm_cancel'))) {
      cancelMutation.mutate({ requestId })
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
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
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {t('leave_requests.total_requests', { count: leaveRequests?.length || 0 })}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hotel-navy hover:bg-hotel-navy-light">
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('leave_requests.new_request')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('leave_requests.form.title')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">{t('leave_requests.form.start_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-start font-normal mt-1",
                          !formData.start_date && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 me-2" />
                        {formData.start_date ? format(new Date(formData.start_date), "PPP") : t('leave_requests.form.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_date ? new Date(formData.start_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, start_date: date.toISOString().split('T')[0] }))
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="end_date">{t('leave_requests.form.end_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-start font-normal mt-1",
                          !formData.end_date && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 me-2" />
                        {formData.end_date ? format(new Date(formData.end_date), "PPP") : t('leave_requests.form.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.end_date ? new Date(formData.end_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, end_date: date.toISOString().split('T')[0] }))
                          }
                        }}
                        initialFocus
                        disabled={(date) => formData.start_date ? date < new Date(formData.start_date) : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="type">{t('leave_requests.form.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as LeaveRequest['type'] }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('leave_requests.form.select_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypeKeys.map(key => (
                      <SelectItem key={key} value={key}>
                        {t(`leave_requests.types.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">{t('leave_requests.form.reason')}</Label>
                <Textarea
                  id="reason"
                  placeholder={t('leave_requests.form.reason_placeholder')}
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              </div>
              {formData.start_date && formData.end_date && (
                <div className="text-sm text-gray-600">
                  {t('leave_requests.form.total_days', { count: calculateDays(formData.start_date, formData.end_date) })}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t('leave_requests.form.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="bg-hotel-navy hover:bg-hotel-navy-light"
                >
                  {submitMutation.isPending ? t('leave_requests.form.submitting') : t('leave_requests.form.submit')}
                </Button>
              </div>
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
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium capitalize">
                        {t(`leave_requests.types.${request.type}`)} - {calculateDays(request.start_date, request.end_date)} {t('leave_requests.list.days')}
                      </h4>
                      <Badge className={statusColors[request.status]}>
                        {t(`status.${request.status}`)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                      </div>
                      {request.reason && (
                        <div>{t('leave_requests.list.reason')}: {request.reason}</div>
                      )}
                      <div>{t('leave_requests.list.submitted')}: {format(new Date(request.created_at), 'MMM dd, yyyy')}</div>
                      {request.approved_by && (
                        <div>{t('leave_requests.list.approved_by')}: {request.approved_by.full_name}</div>
                      )}
                      {request.rejected_by && (
                        <div>
                          {t('leave_requests.list.rejected_by')}: {request.rejected_by.full_name}
                          {request.rejection_reason && ` - ${request.rejection_reason}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                        disabled={cancelMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 me-1" />
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
