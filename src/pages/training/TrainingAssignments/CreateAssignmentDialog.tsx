import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { addDays, format } from 'date-fns'
import { Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTrainingAssignmentsContext } from '../contexts/TrainingAssignmentsContext'

export function CreateAssignmentDialog() {
  const {
    showAssignmentDialog,
    setShowAssignmentDialog,
    isRTL,
    validationErrors,
    formModuleId,
    setFormModuleId,
    assignableModules,
    moduleSelectValue,
    formTargetType,
    setFormTargetType,
    formTargetIds,
    setFormTargetIds,
    targetSearch,
    setTargetSearch,
    currentListItems,
    departmentGroups,
    departmentProperties,
    propertyFilters,
    togglePropertyFilter,
    setPropertyFilters,
    toggleGroupSelection,
    formValidFrom,
    setFormValidFrom,
    formDeadline,
    setFormDeadline,
    formExpiresAt,
    setFormExpiresAt,
    formPriority,
    setFormPriority,
    sendNotifications,
    setSendNotifications,
    formInstructions,
    setFormInstructions,
    requiresAcknowledgement,
    setRequiresAcknowledgement,
    notifyOnDue,
    setNotifyOnDue,
    reminderDaysBefore,
    setReminderDaysBefore,
    selectedModuleName,
    selectedTargetsLabel,
    submitCreateAssignment,
    resetForm,
    createAssignmentMutationPending,
  } = useTrainingAssignmentsContext()

  const { t } = useTranslation('training')

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

  return (
    <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {t('createAssignment')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {t('createAssignmentDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {validationErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {validationErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('selectModule')}</Label>
            <select
              value={moduleSelectValue}
              onChange={(e) => setFormModuleId(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
            >
              <option value="">{t('selectModule')}</option>
              {assignableModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t('assignTo')}</Label>
            <select
              value={formTargetType}
              onChange={(e) => {
                setFormTargetType(e.target.value as 'all' | 'users' | 'departments' | 'properties')
                setFormTargetIds([])
                setTargetSearch('')
              }}
              className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
            >
              <option value="all">{t('allUsers')}</option>
              <option value="users">{t('specificEmployees')}</option>
              <option value="departments">{t('entireDepartments')}</option>
              <option value="properties">{t('entireProperties')}</option>
            </select>
          </div>

          {formTargetType !== 'all' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label>
                  {formTargetType === 'users' ? t('selectUsers') :
                    formTargetType === 'departments' ? t('selectDepartments') :
                      t('selectProperties')}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormTargetIds(currentListItems.map(item => item.id))}
                    disabled={currentListItems.length === 0}
                  >
                    {t('selectAll', 'Select all')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormTargetIds([])}
                  >
                    {t('clear', 'Clear')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400", isRTL ? "right-3" : "left-3")} />
                    <Input
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      placeholder={
                        formTargetType === 'users'
                          ? t('searchUsers', 'Search users...')
                          : formTargetType === 'departments'
                            ? t('searchDepartments', 'Search departments or properties...')
                            : t('searchProperties', 'Search properties...')
                      }
                      className={cn(isRTL ? "pr-9 text-right" : "pl-9", "bg-white")}
                    />
                  </div>

                  {formTargetType === 'departments' && departmentProperties.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10">
                          {t('filterByProperty')}
                          {propertyFilters.length > 0 && (
                            <span className="ms-2 text-xs text-muted-foreground">({propertyFilters.length})</span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>{t('filterByProperty')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={propertyFilters.length === 0}
                          onCheckedChange={() => setPropertyFilters(() => [])}
                        >
                          {t('allProperties')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {departmentProperties.map(propertyName => (
                          <DropdownMenuCheckboxItem
                            key={propertyName}
                            checked={propertyFilters.includes(propertyName)}
                            onCheckedChange={(checked) => togglePropertyFilter(propertyName, Boolean(checked))}
                          >
                            {propertyName}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-md p-2 bg-gray-50">
                {formTargetType === 'departments' ? (
                  departmentGroups.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {departmentGroups.map((group) => {
                        const groupIds = group.items.map(item => item.id)
                        const selectedCount = groupIds.filter(id => formTargetIds.includes(id)).length
                        const allSelected = selectedCount === group.items.length && group.items.length > 0

                        return (
                          <div key={group.name} className="rounded-md border bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700">{group.name}</span>
                                <span className="text-xs text-gray-500">
                                  {selectedCount}/{group.items.length}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleGroupSelection(group.items, !allSelected)}
                                >
                                  {allSelected ? t('clear', 'Clear') : t('selectAll', 'Select all')}
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 p-2">
                              {group.items.map((item) => (
                                <label key={item.id} className="flex items-center gap-2 rounded p-2 hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formTargetIds.includes(item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormTargetIds([...formTargetIds, item.id])
                                      } else {
                                        setFormTargetIds(formTargetIds.filter(id => id !== item.id))
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">{item.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-gray-500 text-sm">
                      {t('noItemsFound')}
                    </p>
                  )
                ) : currentListItems.length > 0 ? (
                  currentListItems.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTargetIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormTargetIds([...formTargetIds, item.id])
                          } else {
                            setFormTargetIds(formTargetIds.filter(id => id !== item.id))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{item.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-center py-4 text-gray-500 text-sm">
                    {t('noItemsFound')}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {formTargetIds.length} {t('selected')}
              </p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('validFrom', 'Valid from')}</Label>
              <input
                type="date"
                value={formValidFrom}
                onChange={(e) => setFormValidFrom(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('deadline')} ({t('optional')})</Label>
              <input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
              />
              <div className="flex flex-wrap gap-2">
                {dueDatePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormDeadline(format(addDays(new Date(), preset.days), 'yyyy-MM-dd'))}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('expiresAt', 'Expires at')}</Label>
              <input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('priority_label', 'Priority')}</Label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as 'normal' | 'high' | 'compliance')}
                className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold"
              >
                <option value="normal">{t('normal', 'Normal')}</option>
                <option value="high">{t('high', 'High')}</option>
                <option value="compliance">{t('complianceMandatory')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t('sendNotifications', 'Send notifications')}</p>
              <p className="text-xs text-muted-foreground">
                {t('trainingNotifications.toggle_desc', 'Notify recipients when assignments are created.')}
              </p>
            </div>
            <Switch checked={sendNotifications} onCheckedChange={setSendNotifications} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{t('assignmentControls', 'Assignment controls')}</p>
              <p className="text-xs text-muted-foreground">
                {t('assignmentControlsDesc', 'Add safeguards, reminders, and instructions.')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('instructions', 'Instructions')}</Label>
                <textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder={t('instructionsPlaceholder', 'Optional notes for assignees...')}
                  className="w-full min-h-[90px] px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-hotel-gold text-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{t('requiresAcknowledgement', 'Requires acknowledgement')}</span>
                  <Switch checked={requiresAcknowledgement} onCheckedChange={setRequiresAcknowledgement} />
                </label>
                <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{t('notifyOnDue', 'Notify when due')}</span>
                  <Switch checked={notifyOnDue} onCheckedChange={setNotifyOnDue} />
                </label>
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('reminders', 'Reminders')}</p>
                  <div className="flex flex-wrap gap-2">
                    {reminderOptions.map((option) => {
                      const isSelected = reminderDaysBefore.includes(option.value)
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setReminderDaysBefore((prev) => {
                              if (prev.includes(option.value)) {
                                return prev.filter((v) => v !== option.value)
                              }
                              return [...prev, option.value].sort((a, b) => a - b)
                            })
                          }}
                        >
                          {option.label}
                        </Button>
                      )
                    })}
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('summary', 'Summary')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">{t('module')}</p>
                <p className="font-medium">{selectedModuleName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('assignTo')}</p>
                <p className="font-medium">{selectedTargetsLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('deadline')}</p>
                <p className="font-medium">{formDeadline ? format(new Date(formDeadline), 'PPP') : t('none', 'None')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('priority_label', 'Priority')}</p>
                <p className="font-medium capitalize">{formPriority}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('acknowledgement', 'Acknowledgement')}</p>
                <p className="font-medium">{requiresAcknowledgement ? t('required', 'Required') : t('notRequired', 'Not required')}</p>
              </div>
            </div>
            {formValidFrom && (
              <p className="text-[11px] text-muted-foreground">
                {t('validFrom', 'Valid from')}: {format(new Date(formValidFrom), 'PPP')}
              </p>
            )}
            {formExpiresAt && (
              <p className="text-[11px] text-muted-foreground">
                {t('expiresAt', 'Expires at')}: {format(new Date(formExpiresAt), 'PPP')}
              </p>
            )}
            {formInstructions && (
              <p className="text-[11px] text-muted-foreground">
                {t('instructions', 'Instructions')}: {formInstructions}
              </p>
            )}
          </div>

          <div className={cn("flex justify-end gap-3 pt-4 border-t", isRTL ? "flex-row-reverse" : "")}>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignmentDialog(false)
                resetForm()
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={submitCreateAssignment}
              disabled={validationErrors.length > 0 || createAssignmentMutationPending}
              className={cn("bg-hotel-navy text-white hover:bg-hotel-navy-light", isRTL ? "flex-row-reverse" : "")}
            >
              {createAssignmentMutationPending ? (
                <Loader2 className={cn("w-4 h-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />
              ) : null}
              {t('create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
