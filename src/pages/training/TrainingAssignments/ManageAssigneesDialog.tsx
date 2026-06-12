import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PaginationControls } from '@/hooks/usePagination'
import type { ModuleAssigneeRosterEntry } from '@/types/learning'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ManageAssigneesDialogProps {
  manageModuleId: string | null
  manageModuleTitle: string
  onClose: () => void
  moduleRoster: { active: ModuleAssigneeRosterEntry[]; exempted: ModuleAssigneeRosterEntry[] } | undefined
  isLoadingModuleRoster: boolean
  paginatedActiveRoster: ModuleAssigneeRosterEntry[]
  paginatedExemptedRoster: ModuleAssigneeRosterEntry[]
  activeRosterPagination: PaginationControls
  exemptedRosterPagination: PaginationControls
  removeReason: string
  onRemoveReasonChange: (value: string) => void
  reassignEntry: ModuleAssigneeRosterEntry | null
  reassignUserId: string
  reassignReason: string
  onReassignUserIdChange: (value: string) => void
  onReassignReasonChange: (value: string) => void
  onResetReassignDialog: () => void
  onSubmitReassign: () => void
  reassignUserMutationPending: boolean
  restoreUserMutationPending: boolean
  overrideEntry: ModuleAssigneeRosterEntry | null
  overrideDueDate: string
  overridePriority: 'inherit' | 'normal' | 'high' | 'compliance'
  overrideInstructions: string
  onOverrideDueDateChange: (value: string) => void
  onOverridePriorityChange: (value: 'inherit' | 'normal' | 'high' | 'compliance') => void
  onOverrideInstructionsChange: (value: string) => void
  onCloseOverrideDialog: () => void
  onSaveOverride: () => void
  onClearOverride: () => void
  saveOverrideMutationPending: boolean
  clearOverrideMutationPending: boolean
  resetProgressMutationPending: boolean
  exemptUserMutationPending: boolean
  resendNotificationMutationPending: boolean
  users: Array<{ id: string; full_name: string; email: string }> | undefined
  onOpenReassignDialog: (entry: ModuleAssigneeRosterEntry) => void
  onOpenOverrideDialog: (entry: ModuleAssigneeRosterEntry) => void
  onResetProgress: (moduleId: string, userId: string) => void
  onResendNotification: (userId: string, moduleId: string, moduleTitle: string, deadline: string | null) => void
  onExemptUser: (moduleId: string, userId: string, reason: string) => void
  onRestoreUser: (moduleId: string, userId: string) => void
  formatDate: (dateStr: string) => string
}

export function ManageAssigneesDialog({
  manageModuleId,
  manageModuleTitle,
  onClose,
  moduleRoster,
  isLoadingModuleRoster,
  paginatedActiveRoster,
  paginatedExemptedRoster,
  activeRosterPagination,
  exemptedRosterPagination,
  removeReason,
  onRemoveReasonChange,
  reassignEntry,
  reassignUserId,
  reassignReason,
  onReassignUserIdChange,
  onReassignReasonChange,
  onResetReassignDialog,
  onSubmitReassign,
  reassignUserMutationPending,
  restoreUserMutationPending,
  overrideEntry,
  overrideDueDate,
  overridePriority,
  overrideInstructions,
  onOverrideDueDateChange,
  onOverridePriorityChange,
  onOverrideInstructionsChange,
  onCloseOverrideDialog,
  onSaveOverride,
  onClearOverride,
  saveOverrideMutationPending,
  clearOverrideMutationPending,
  resetProgressMutationPending,
  exemptUserMutationPending,
  resendNotificationMutationPending,
  users,
  onOpenReassignDialog,
  onOpenOverrideDialog,
  onResetProgress,
  onResendNotification,
  onExemptUser,
  onRestoreUser,
  formatDate,
}: ManageAssigneesDialogProps) {
  const { t } = useTranslation('training')

  return (
    <>
      <Dialog open={!!manageModuleId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('manageAssignees', 'Manage assignees')}</DialogTitle>
            <DialogDescription>
              {manageModuleTitle}
            </DialogDescription>
          </DialogHeader>

          {isLoadingModuleRoster ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('activeAssignees', 'Active assignees')}</p>
                    <p className="mt-2 text-3xl font-bold">{moduleRoster?.active.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('exempted', 'Exempted')}</p>
                    <p className="mt-2 text-3xl font-bold">{moduleRoster?.exempted.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('withOverrides', 'With overrides')}</p>
                    <p className="mt-2 text-3xl font-bold">{moduleRoster?.active.filter((entry) => entry.has_override).length || 0}</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="active">{t('active', 'Active')}</TabsTrigger>
                  <TabsTrigger value="exempted">{t('exempted', 'Exempted')}</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('employee')}</TableHead>
                          <TableHead>{t('source', 'Source')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead>{t('due')}</TableHead>
                          <TableHead>{t('score')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(moduleRoster?.active || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                              {t('noActiveAssignees', 'No active assignees found for this module.')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedActiveRoster.map((entry) => (
                            <TableRow key={entry.user_id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={entry.avatar_url || ''} />
                                    <AvatarFallback>{entry.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{entry.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{entry.email || entry.department_name || t('unknownUser')}</div>
                                    {(entry.department_name || entry.property_name) && (
                                      <div className="text-xs text-muted-foreground">
                                        {[entry.department_name, entry.property_name].filter(Boolean).join(' | ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {entry.sources.map((source) => (
                                    <Badge key={`${entry.user_id}-${source.assignment_id}`} variant="outline">
                                      {source.label}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                                    {t(entry.status)}
                                  </Badge>
                                  {entry.has_override && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                      {t('override', 'Override')}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {entry.effective_due_date ? formatDate(entry.effective_due_date) : '-'}
                              </TableCell>
                              <TableCell>
                                {entry.score_percentage !== null && entry.score_percentage !== undefined ? `${entry.score_percentage}%` : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenReassignDialog(entry)}
                                  >
                                    {t('reassign', 'Reassign')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenOverrideDialog(entry)}
                                  >
                                    {t('override', 'Override')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResetProgress(manageModuleId!, entry.user_id)}
                                    disabled={resetProgressMutationPending}
                                  >
                                    {t('resetProgress', 'Reset progress & quiz attempts')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onResendNotification(
                                      entry.user_id,
                                      manageModuleId!,
                                      manageModuleTitle,
                                      entry.effective_due_date || null
                                    )}
                                    disabled={resendNotificationMutationPending}
                                  >
                                    {t('resend', 'Resend')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => onExemptUser(
                                      manageModuleId!,
                                      entry.user_id,
                                      removeReason || 'Removed from module'
                                    )}
                                    disabled={exemptUserMutationPending}
                                  >
                                    {t('removeFromModule', 'Remove from module')}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationBar pagination={activeRosterPagination} showPageSizeSelector={false} />

                  <div className="space-y-2">
                    <Label htmlFor="remove-reason">{t('removeReason', 'Removal reason')}</Label>
                    <Input
                      id="remove-reason"
                      value={removeReason}
                      onChange={(event) => onRemoveReasonChange(event.target.value)}
                      placeholder={t('removeReasonPlaceholder', 'Optional note for exemption history')}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="exempted" className="space-y-4">
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('employee')}</TableHead>
                          <TableHead>{t('reason', 'Reason')}</TableHead>
                          <TableHead>{t('source', 'Source')}</TableHead>
                          <TableHead>{t('updated', 'Updated')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(moduleRoster?.exempted || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                              {t('noExemptedAssignees', 'No exempted users for this module.')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedExemptedRoster.map((entry) => (
                            <TableRow key={entry.user_id}>
                              <TableCell>
                                <div className="font-medium">{entry.full_name}</div>
                                <div className="text-xs text-muted-foreground">{entry.email || entry.department_name || t('unknownUser')}</div>
                              </TableCell>
                              <TableCell>{entry.exemption?.reason || '-'}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {entry.sources.length > 0 ? entry.sources.map((source) => (
                                    <Badge key={`${entry.user_id}-${source.assignment_id}`} variant="outline">
                                      {source.label}
                                    </Badge>
                                  )) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{entry.exemption?.updated_at ? formatDate(entry.exemption.updated_at) : '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onRestoreUser(manageModuleId!, entry.user_id)}
                                    disabled={restoreUserMutationPending}
                                  >
                                    {t('restore', 'Restore')}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenReassignDialog(entry)}
                                  >
                                    {t('reassign', 'Reassign')}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationBar pagination={exemptedRosterPagination} showPageSizeSelector={false} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reassignEntry} onOpenChange={(open) => !open && onResetReassignDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('reassign', 'Reassign')}</DialogTitle>
            <DialogDescription>
              {reassignEntry?.full_name} {'->'} {manageModuleTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('selectUser', 'Select user')}</Label>
              <Select value={reassignUserId} onValueChange={onReassignUserIdChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectUser', 'Select user')} />
                </SelectTrigger>
                <SelectContent>
                  {(users || [])
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {(user.full_name || user.email) + (user.id === reassignEntry?.user_id ? ` ${t('currentAssignee', '(current assignee)')}` : '')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('reason', 'Reason')}</Label>
              <Input
                value={reassignReason}
                onChange={(event) => onReassignReasonChange(event.target.value)}
                placeholder={t('reassignReasonPlaceholder', 'Optional reassignment note')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onResetReassignDialog}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                onClick={onSubmitReassign}
                disabled={
                  !reassignUserId ||
                  reassignUserMutationPending ||
                  restoreUserMutationPending ||
                  (reassignUserId === reassignEntry?.user_id && !reassignEntry?.exemption)
                }
              >
                {(reassignUserMutationPending || restoreUserMutationPending)
                  ? t('saving', 'Saving...')
                  : reassignUserId === reassignEntry?.user_id && !reassignEntry?.exemption
                    ? t('alreadyAssigned', 'Already assigned')
                  : reassignUserId === reassignEntry?.user_id && reassignEntry?.exemption
                    ? t('restore', 'Restore')
                    : t('confirmReassign', 'Confirm reassign')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideEntry} onOpenChange={(open) => !open && onCloseOverrideDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('overrideAssignment', 'Override assignment')}</DialogTitle>
            <DialogDescription>
              {overrideEntry?.full_name} {'|'} {manageModuleTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('due')}</Label>
              <Input type="date" value={overrideDueDate} onChange={(event) => onOverrideDueDateChange(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('priority')}</Label>
              <Select value={overridePriority} onValueChange={(value) => onOverridePriorityChange(value as typeof overridePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">{t('inherit', 'Inherit')}</SelectItem>
                  <SelectItem value="normal">{t('normal', 'Normal')}</SelectItem>
                  <SelectItem value="high">{t('high', 'High')}</SelectItem>
                  <SelectItem value="compliance">{t('compliance', 'Compliance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('instructions', 'Instructions')}</Label>
              <Input value={overrideInstructions} onChange={(event) => onOverrideInstructionsChange(event.target.value)} placeholder={t('overrideInstructionsPlaceholder', 'Optional user-specific instructions')} />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClearOverride}
                disabled={!overrideEntry?.has_override || clearOverrideMutationPending}
              >
                {t('clearOverride', 'Clear override')}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCloseOverrideDialog}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={onSaveOverride}
                  disabled={saveOverrideMutationPending}
                >
                  {saveOverrideMutationPending ? t('saving', 'Saving...') : t('save', 'Save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
