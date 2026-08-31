import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { TrainingModule } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { UseMutationResult } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AssignmentTargetSelector } from './AssignmentTargetSelector'
import type { CreateAssignmentParams } from './useTrainingAssignmentsMutations'

const isPriorityPropertyName = (name: string) => /head office|prime group/i.test(name)

const sortPropertyNames = (a: string, b: string) => {
  if (isPriorityPropertyName(a) && !isPriorityPropertyName(b)) return -1
  if (!isPriorityPropertyName(a) && isPriorityPropertyName(b)) return 1
  return a.localeCompare(b)
}

interface Department {
  id: string
  name: string
  propertyName?: string | null
  rawName?: string
}

interface Property {
  id: string
  name: string
}

interface User {
  id: string
  full_name: string
  email?: string
}

export interface AssignmentFormState {
  formModuleId: string
  formTargetType: 'all' | 'users' | 'departments' | 'properties'
  formTargetIds: string[]
  formDeadline: string
  formValidFrom: string
  formExpiresAt: string
  formPriority: 'normal' | 'high' | 'compliance'
  formInstructions: string
  requiresAcknowledgement: boolean
  sendNotifications: boolean
  notifyOnDue: boolean
  reminderDaysBefore: number[]
  propertyFilters: string[]
  targetSearch: string
}

interface AssignmentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formState: AssignmentFormState
  onFormChange: (patch: Partial<AssignmentFormState>) => void
  modules: TrainingModule[] | undefined
  departments: Department[] | undefined
  properties: Property[] | undefined
  users: User[] | undefined
  isRTL: boolean
  createAssignmentMutation: UseMutationResult<any, unknown, CreateAssignmentParams>
}

export function AssignmentCreateDialog({
  open,
  onOpenChange,
  formState,
  onFormChange,
  modules,
  departments,
  properties,
  users,
  isRTL,
  createAssignmentMutation,
}: AssignmentCreateDialogProps) {
  const { t } = useTranslation('training')

  const {
    formModuleId, formTargetType, formTargetIds, formDeadline, formValidFrom,
    formExpiresAt, formPriority, formInstructions, requiresAcknowledgement,
    sendNotifications, notifyOnDue, reminderDaysBefore, propertyFilters, targetSearch,
  } = formState

  const assignableModules = modules || []
  const selectedAssignableModule = assignableModules.find((module) => module.id === formModuleId)
  const moduleSelectValue = selectedAssignableModule ? formModuleId : ''

  const normalizedTargetSearch = targetSearch.trim().toLowerCase()
  const matchesTargetSearch = useCallback((value: string, secondary?: string) => {
    if (!normalizedTargetSearch) return true
    return (value?.toLowerCase() ?? '').includes(normalizedTargetSearch) || (secondary?.toLowerCase() ?? '').includes(normalizedTargetSearch)
  }, [normalizedTargetSearch])

  const departmentProperties = useMemo(() => {
    if (!departments) return []
    const props = new Set<string>()
    departments.forEach(d => props.add(d.propertyName || t('other', 'Other')))
    return Array.from(props).sort(sortPropertyNames)
  }, [departments, t])

  const departmentGroups = useMemo(() => {
    if (!departments) return []
    const filters = new Set(propertyFilters)
    const groups = new Map<string, { name: string; items: Array<{ id: string; name: string }> }>()
    departments.forEach((dept) => {
      const propertyName = dept.propertyName || t('other', 'Other')
      if (propertyFilters.length > 0 && !filters.has(propertyName)) return
      const displayName = dept.rawName || dept.name.replace(/\s*\(.+\)$/, '')
      if (!matchesTargetSearch(displayName, propertyName)) return
      if (!groups.has(propertyName)) groups.set(propertyName, { name: propertyName, items: [] })
      groups.get(propertyName)!.items.push({ id: dept.id, name: displayName })
    })
    return Array.from(groups.values())
      .map(group => ({ ...group, items: group.items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => sortPropertyNames(a.name, b.name))
  }, [departments, propertyFilters, matchesTargetSearch, t])

  const currentListItems = useMemo(() => {
    switch (formTargetType) {
      case 'users': return (users || []).map(u => ({ id: u.id, name: u.full_name || u.email || '', details: u.email })).filter(u => matchesTargetSearch(u.name, u.details))
      case 'departments': return departmentGroups.flatMap(group => group.items)
      case 'properties': return (properties || []).map(p => ({ id: p.id, name: p.name })).filter(p => matchesTargetSearch(p.name))
      default: return []
    }
  }, [formTargetType, users, properties, departmentGroups, matchesTargetSearch])

  const togglePropertyFilter = useCallback((propertyName: string, enabled: boolean) => {
    const next = new Set(propertyFilters)
    if (enabled) { next.add(propertyName) } else { next.delete(propertyName) }
    onFormChange({ propertyFilters: Array.from(next) })
  }, [propertyFilters, onFormChange])

  const toggleGroupSelection = useCallback((items: Array<{ id: string }>, shouldSelect: boolean) => {
    const itemIds = items.map(item => item.id)
    if (shouldSelect) {
      onFormChange({ formTargetIds: Array.from(new Set([...formTargetIds, ...itemIds])) })
    } else {
      onFormChange({ formTargetIds: formTargetIds.filter(id => !itemIds.includes(id)) })
    }
  }, [formTargetIds, onFormChange])

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (!moduleSelectValue) errors.push(t('moduleRequired'))
    if (formTargetType !== 'all' && formTargetIds.length === 0) errors.push(t('selectTargetsRequired', 'Select at least one target.'))
    return errors
  }, [formTargetIds.length, formTargetType, moduleSelectValue, t])

  const dueDatePresets = [
    { label: t('in_1_week', 'In 1 week'), days: 7 },
    { label: t('in_2_weeks', 'In 2 weeks'), days: 14 },
    { label: t('in_1_month', 'In 1 month'), days: 30 },
  ]

  const reminderOptions = [
    { label: t('reminder_1_day', '1 day before'), value: 1 },
    { label: t('reminder_3_days', '3 days before'), value: 3 },
    { label: t('reminder_7_days', '7 days before'), value: 7 }
  ]

  const selectedModuleName = selectedAssignableModule?.title || t('unknownModule')
  const selectedTargetsLabel = formTargetType === 'all' ? t('allUsers') : `${formTargetIds.length} ${t('selected')}`

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{t('createAssignment')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {t('createAssignmentDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {validationErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {validationErrors.map((message) => <p key={message}>{message}</p>)}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('selectModule')}</Label>
            <select
              value={moduleSelectValue}
              onChange={(e) => onFormChange({ formModuleId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
            >
              <option value="">{t('selectModule')}</option>
              {assignableModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t('assignTo')}</Label>
            <select
              value={formTargetType}
              onChange={(e) => onFormChange({ formTargetType: e.target.value as AssignmentFormState['formTargetType'], formTargetIds: [], propertyFilters: [], targetSearch: '' })}
              className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
            >
              <option value="all">{t('allUsers')}</option>
              <option value="users">{t('specificEmployees')}</option>
              <option value="departments">{t('entireDepartments')}</option>
              <option value="properties">{t('entireProperties')}</option>
            </select>
          </div>

          {formTargetType !== 'all' && (
            <AssignmentTargetSelector
              formTargetType={formTargetType}
              formTargetIds={formTargetIds}
              targetSearch={targetSearch}
              propertyFilters={propertyFilters}
              departmentProperties={departmentProperties}
              departmentGroups={departmentGroups}
              currentListItems={currentListItems}
              isRTL={isRTL}
              onFormChange={onFormChange}
              togglePropertyFilter={togglePropertyFilter}
              toggleGroupSelection={toggleGroupSelection}
            />
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('validFrom', 'Valid from')}</Label>
              <input type="date" value={formValidFrom} onChange={(e) => onFormChange({ formValidFrom: e.target.value })} className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold" />
            </div>
            <div className="space-y-2">
              <Label>{t('deadline')} ({t('optional')})</Label>
              <input type="date" value={formDeadline} onChange={(e) => onFormChange({ formDeadline: e.target.value })} className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold" />
              <div className="flex flex-wrap gap-2">
                {dueDatePresets.map((preset) => (
                  <Button key={preset.label} type="button" variant="outline" size="sm" onClick={() => onFormChange({ formDeadline: format(addDays(new Date(), preset.days), 'yyyy-MM-dd') })}>
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('expiresAt', 'Expires at')}</Label>
              <input type="date" value={formExpiresAt} onChange={(e) => onFormChange({ formExpiresAt: e.target.value })} className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold" />
            </div>
            <div className="space-y-2">
              <Label>{t('priority_label', 'Priority')}</Label>
              <select value={formPriority} onChange={(e) => onFormChange({ formPriority: e.target.value as AssignmentFormState['formPriority'] })} className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold">
                <option value="normal">{t('normal', 'Normal')}</option>
                <option value="high">{t('high', 'High')}</option>
                <option value="compliance">{t('complianceMandatory')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t('sendNotifications', 'Send notifications')}</p>
              <p className="text-xs text-muted-foreground">{t('trainingNotifications.toggle_desc', 'Notify recipients when assignments are created.')}</p>
            </div>
            <Switch checked={sendNotifications} onCheckedChange={(v) => onFormChange({ sendNotifications: v })} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{t('assignmentControls', 'Assignment controls')}</p>
              <p className="text-xs text-muted-foreground">{t('assignmentControlsDesc', 'Add safeguards, reminders, and instructions.')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('instructions', 'Instructions')}</Label>
                <textarea
                  value={formInstructions}
                  onChange={(e) => onFormChange({ formInstructions: e.target.value })}
                  placeholder={t('instructionsPlaceholder', 'Optional notes for assignees...')}
                  className="w-full min-h-[90px] px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold text-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{t('requiresAcknowledgement', 'Requires acknowledgement')}</span>
                  <Switch checked={requiresAcknowledgement} onCheckedChange={(v) => onFormChange({ requiresAcknowledgement: v })} />
                </label>
                <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{t('notifyOnDue', 'Notify when due')}</span>
                  <Switch checked={notifyOnDue} onCheckedChange={(v) => onFormChange({ notifyOnDue: v })} />
                </label>
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('reminders', 'Reminders')}</p>
                  <div className="flex flex-wrap gap-2">
                    {reminderOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={reminderDaysBefore.includes(option.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (reminderDaysBefore.includes(option.value)) {
                            onFormChange({ reminderDaysBefore: reminderDaysBefore.filter((v) => v !== option.value) })
                          } else {
                            onFormChange({ reminderDaysBefore: [...reminderDaysBefore, option.value].sort((a, b) => a - b) })
                          }
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {reminderDaysBefore.length > 0
                      ? t('reminderSummary', '{{count}} reminders selected', { count: reminderDaysBefore.length })
                      : t('reminderNone', 'No reminders selected')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('summary', 'Summary')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><p className="text-muted-foreground">{t('module')}</p><p className="font-medium">{selectedModuleName}</p></div>
              <div><p className="text-muted-foreground">{t('assignTo')}</p><p className="font-medium">{selectedTargetsLabel}</p></div>
              <div><p className="text-muted-foreground">{t('deadline')}</p><p className="font-medium">{formDeadline ? format(new Date(formDeadline), 'PPP') : t('none', 'None')}</p></div>
              <div><p className="text-muted-foreground">{t('priority_label', 'Priority')}</p><p className="font-medium capitalize">{formPriority}</p></div>
              <div><p className="text-muted-foreground">{t('acknowledgement', 'Acknowledgement')}</p><p className="font-medium">{requiresAcknowledgement ? t('required', 'Required') : t('notRequired', 'Not required')}</p></div>
            </div>
            {formValidFrom && <p className="text-[11px] text-muted-foreground">{t('validFrom', 'Valid from')}: {format(new Date(formValidFrom), 'PPP')}</p>}
            {formExpiresAt && <p className="text-[11px] text-muted-foreground">{t('expiresAt', 'Expires at')}: {format(new Date(formExpiresAt), 'PPP')}</p>}
            {formInstructions && <p className="text-[11px] text-muted-foreground">{t('instructions', 'Instructions')}: {formInstructions}</p>}
          </div>

          <div className={cn("flex justify-end gap-3 pt-4 border-t", isRTL ? "flex-row-reverse" : "")}>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
            <Button
              onClick={() => createAssignmentMutation.mutate({ formModuleId, formTargetType, formTargetIds, formDeadline, formValidFrom, formExpiresAt, formPriority, formInstructions, requiresAcknowledgement, sendNotifications, notifyOnDue, reminderDaysBefore, modules, selectedAssignableModule })}
              disabled={validationErrors.length > 0 || createAssignmentMutation.isPending}
              className={cn("bg-hotel-navy text-white hover:bg-hotel-navy-light", isRTL ? "flex-row-reverse" : "")}
            >
              {createAssignmentMutation.isPending ? <Loader2 className={cn("w-4 h-4 animate-spin", isRTL ? "ml-2" : "mr-2")} /> : null}
              {t('create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
