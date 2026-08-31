import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { complianceEngineService, type EmployeeTransferResult } from '@/services/complianceEngineService'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRightLeft,
  Building2,
  Briefcase,
  BookOpen,
  MinusCircle,
  PlusCircle,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'

export interface TransferTargetUser {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
  hotel_id?: string | null
  department_id?: string | null
  role?: string | null
  job_title?: string | null
}

interface EmployeeTransferModalProps {
  isOpen: boolean
  onClose: () => void
  user: TransferTargetUser | null
  onSuccess?: (result: EmployeeTransferResult) => void
}

const TRANSFER_ROLES = [
  { value: 'learner', labelKey: 'learner', defaultLabel: 'Learner / Staff' },
  { value: 'department_manager', labelKey: 'department_manager', defaultLabel: 'Department Manager' },
  { value: 'hotel_admin', labelKey: 'hotel_admin', defaultLabel: 'Hotel Admin / Property Manager' },
  { value: 'training_manager', labelKey: 'training_manager', defaultLabel: 'Training Manager' },
  { value: 'knowledge_manager', labelKey: 'knowledge_manager', defaultLabel: 'Knowledge Manager' },
  { value: 'instructor', labelKey: 'instructor', defaultLabel: 'Instructor' },
  { value: 'author', labelKey: 'author', defaultLabel: 'Content Author' },
] as const

export function EmployeeTransferModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: EmployeeTransferModalProps) {
  const { t } = useTranslation(['users', 'common', 'training'])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [targetHotelId, setTargetHotelId] = useState<string>('')
  const [targetDeptId, setTargetDeptId] = useState<string>('')
  const [targetRole, setTargetRole] = useState<string>('learner')
  const [reason, setReason] = useState<string>('')

  // Reset form when user changes or opens
  useEffect(() => {
    if (user && isOpen) {
      setTargetHotelId('')
      setTargetDeptId('')
      setTargetRole(user.role || 'learner')
      setReason('')
    }
  }, [user, isOpen])

  // 1. Fetch available hotels
  const { data: hotels = [] } = useQuery({
    queryKey: ['transfer-hotels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name, city')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: isOpen,
  })

  // 2. Fetch available departments for target hotel
  const { data: departments = [] } = useQuery({
    queryKey: ['transfer-departments', targetHotelId],
    queryFn: async () => {
      let query = supabase
        .from('departments')
        .select('id, name, hotel_id, property_id')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true })

      if (targetHotelId) {
        query = query.or(`hotel_id.eq.${targetHotelId},property_id.eq.${targetHotelId}`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: isOpen,
  })

  // 3. Fetch transfer preview delta
  const { data: deltaPreview, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['transfer-delta-preview', user?.id, targetHotelId, targetDeptId, targetRole],
    queryFn: async () => {
      if (!user?.id || !targetHotelId) return null
      return complianceEngineService.getTransferPreview({
        userId: user.id,
        targetHotelId,
        targetDeptId: targetDeptId || undefined,
        targetRole: targetRole || undefined,
      })
    },
    enabled: isOpen && !!user?.id && !!targetHotelId,
  })

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User ID is required.')
      if (!targetHotelId) throw new Error('Target hotel is required.')
      if (!targetDeptId) throw new Error('Target department is required.')
      if (!reason.trim()) throw new Error('Transfer reason is required.')

      return complianceEngineService.executeEmployeeTransfer({
        userId: user.id,
        targetHotelId,
        targetDeptId,
        targetRole,
        reason: reason.trim(),
      })
    },
    onSuccess: (result) => {
      const userName = user?.full_name || user?.email || 'Employee'
      toast({
        title: t('transfer.success_title', 'Transfer Successful'),
        description: t('transfer.success_desc', {
          name: userName,
          waived: result.waived_count,
          assigned: result.assigned_count,
          defaultValue: `Transferred ${userName} successfully. Waived ${result.waived_count} obsolete module(s) and assigned ${result.assigned_count} new module(s).`,
        }),
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['organization_memberships'] })
      queryClient.invalidateQueries({ queryKey: ['my-training'] })
      queryClient.invalidateQueries({ queryKey: ['training-progress'] })
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })

      if (onSuccess) {
        onSuccess(result)
      }
      onClose()
    },
    onError: (error: Error) => {
      toast({
        title: t('transfer.error_title', 'Transfer Failed'),
        description: t('transfer.error_desc', {
          error: error.message,
          defaultValue: `Failed to complete employee transfer: ${error.message}`,
        }),
        variant: 'destructive',
      })
    },
  })

  const isSameTarget = useMemo(() => {
    if (!user || !deltaPreview) return false
    return (
      Boolean(targetHotelId) &&
      Boolean(deltaPreview.currentHotelName) &&
      targetHotelId === user.hotel_id &&
      targetDeptId === user.department_id &&
      targetRole === user.role
    )
  }, [user, deltaPreview, targetHotelId, targetDeptId, targetRole])

  const canSubmit =
    Boolean(targetHotelId) &&
    Boolean(targetDeptId) &&
    Boolean(targetRole) &&
    reason.trim().length > 0 &&
    !isSameTarget &&
    !transferMutation.isPending

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/70 bg-card/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {t('transfer.dialog_title', 'Employee Transfer & Delta Handler')}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {t('transfer.dialog_desc', {
                  name: user.full_name || user.email,
                  defaultValue: `Transfer ${user.full_name || user.email} to a new property or department. Obsolete hotel modules will be waived and delta rules auto-assigned.`,
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Current Employee Info Card */}
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                <AvatarFallback className="bg-primary/10 font-bold text-primary text-xs">
                  {user.full_name
                    ? user.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : user.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user.full_name || t('user.no_name', 'No name')}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
              {user.job_title || t('transfer.current_assignment', 'Current Assignment')}
            </Badge>
          </div>

          {deltaPreview && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
              <div>
                <span className="text-muted-foreground block">{t('transfer.current_hotel', 'Current Hotel')}</span>
                <span className="font-medium text-foreground">{deltaPreview.currentHotelName || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{t('transfer.current_dept', 'Current Department')}</span>
                <span className="font-medium text-foreground">{deltaPreview.currentDepartmentName || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">{t('transfer.current_role', 'Current Role')}</span>
                <span className="font-medium text-foreground capitalize">{deltaPreview.currentRole || user.role || '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Target Form */}
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Hotel */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                {t('transfer.target_hotel', 'Target Hotel')} <span className="text-rose-500">*</span>
              </Label>
              <Select value={targetHotelId} onValueChange={(val) => { setTargetHotelId(val); setTargetDeptId(''); }}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder={t('transfer.select_hotel', 'Select Hotel')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id} className="text-xs">
                      {hotel.name} {hotel.city ? `(${hotel.city})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Target Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                {t('transfer.target_dept', 'Target Department')} <span className="text-rose-500">*</span>
              </Label>
              <Select value={targetDeptId} onValueChange={setTargetDeptId} disabled={!targetHotelId && departments.length === 0}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs">
                  <SelectValue placeholder={t('transfer.select_dept', 'Select Department')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id} className="text-xs">
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Role */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              {t('transfer.target_role', 'Target Role')} <span className="text-rose-500">*</span>
            </Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs">
                <SelectValue placeholder={t('transfer.select_role', 'Select Role')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60">
                {TRANSFER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    {t(`roles.${r.labelKey}`, r.defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              {t('transfer.transfer_reason', 'Transfer Reason')} <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(
                'transfer.transfer_reason_placeholder',
                'Explain the operational justification for this transfer...'
              )}
              className="min-h-[72px] rounded-xl border-border/60 text-xs resize-none"
            />
          </div>

          {/* Warning if same target */}
          {isSameTarget && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('transfer.same_target_warning', "Selected target hotel, department, and role are identical to the employee's current assignment.")}</span>
            </div>
          )}

          {/* Compliance & Training Delta Preview */}
          {targetHotelId && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {t('transfer.delta_preview', 'Compliance & Training Delta Preview')}
                  </h4>
                </div>
                {isLoadingPreview && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Modules to Waive */}
                <div className="rounded-xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <MinusCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {t('transfer.modules_to_waive', {
                        count: deltaPreview?.waivableAssignments.length ?? 0,
                        defaultValue: `Modules to be Waived (${deltaPreview?.waivableAssignments.length ?? 0})`,
                      })}
                    </span>
                  </div>
                  {deltaPreview?.waivableAssignments && deltaPreview.waivableAssignments.length > 0 ? (
                    <ul className="space-y-1 text-muted-foreground max-h-24 overflow-y-auto">
                      {deltaPreview.waivableAssignments.map((item) => (
                        <li key={item.id} className="flex items-center gap-1.5 text-[11px] truncate">
                          <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      {t('transfer.no_modules_waived', 'No hotel-specific assignments will be waived.')}
                    </p>
                  )}
                </div>

                {/* Modules to Assign */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {t('transfer.modules_to_assign', {
                        count: deltaPreview?.targetDeltaRules.length ?? 0,
                        defaultValue: `New Modules to be Enrolled (${deltaPreview?.targetDeltaRules.length ?? 0})`,
                      })}
                    </span>
                  </div>
                  {deltaPreview?.targetDeltaRules && deltaPreview.targetDeltaRules.length > 0 ? (
                    <ul className="space-y-1 text-muted-foreground max-h-24 overflow-y-auto">
                      {deltaPreview.targetDeltaRules.map((rule) => (
                        <li key={rule.id} className="flex items-center gap-1.5 text-[11px] truncate">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{rule.title}</span>
                          {rule.isMandatory && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-300 text-emerald-700 dark:text-emerald-300 shrink-0">
                              Mandatory
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      {t('transfer.no_modules_assigned', 'No new delta assignment rules match target selection.')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={transferMutation.isPending}
            className="rounded-xl text-xs"
          >
            {t('transfer.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => transferMutation.mutate()}
            disabled={!canSubmit}
            className="rounded-xl text-xs font-semibold gap-2 shadow-md shadow-primary/20"
          >
            {transferMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('transfer.transferring', 'Processing Transfer...')}
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {t('transfer.confirm_transfer', 'Confirm Transfer')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
