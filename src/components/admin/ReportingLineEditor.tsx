import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { ManagerSelect } from './ManagerSelect'
import { useUpdateReportingLine, useReportingChain } from '@/hooks/useOrganization'
import { AlertTriangle, ArrowRight, User, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { OrgTreeNode } from '@/hooks/useOrganization'

interface ReportingLineEditorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employee: OrgTreeNode | null
    propertyId?: string
}

export function ReportingLineEditor({
    open,
    onOpenChange,
    employee,
    propertyId
}: ReportingLineEditorProps) {
    const { t } = useTranslation('admin')
    const [newManagerId, setNewManagerId] = useState<string | null>(null)
    const updateReportingLine = useUpdateReportingLine()
    const { data: reportingChain } = useReportingChain(employee?.id || '')

    // Sync newManagerId with employee when employee changes or dialog opens
    useEffect(() => {
        if (employee) {
            setNewManagerId(employee.reporting_to || null)
        }
    }, [employee])

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && employee) {
            setNewManagerId(employee.reporting_to || null)
        }
        onOpenChange(isOpen)
    }

    const handleSave = async () => {
        if (!employee) return

        await updateReportingLine.mutateAsync({
            employeeId: employee.id,
            newManagerId
        })

        onOpenChange(false)
    }

    const hasChanged = newManagerId !== (employee?.reporting_to || null)

    // Only render dialog if both open AND employee exist
    if (!open || !employee) return null

    return (
        <Dialog open={true} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {t('organization.edit_reporting_line', 'Edit Reporting Line')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('organization.edit_reporting_desc', 'Change who this employee reports to in the organizational hierarchy.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Employee Info */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                                {employee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{employee.full_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{employee.job_title || 'No title'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Current Reporting Chain */}
                    {reportingChain && reportingChain.length > 1 && (
                        <div>
                            <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                                {t('organization.current_chain', 'Current Reporting Chain')}
                            </Label>
                            <div className="flex flex-wrap items-center gap-1">
                                {reportingChain.map((node, index) => (
                                    <span key={node.id} className="flex items-center gap-1">
                                        <Badge
                                            variant={index === 0 ? 'default' : 'outline'}
                                            className="text-xs"
                                        >
                                            {node.full_name}
                                        </Badge>
                                        {index < reportingChain.length - 1 && (
                                            <ArrowRight className="h-3 w-3 text-gray-400" />
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manager Selection */}
                    <div>
                        <Label htmlFor="manager" className="mb-2 block">
                            {t('organization.new_manager', 'New Manager')}
                        </Label>
                        <ManagerSelect
                            value={newManagerId}
                            onChange={setNewManagerId}
                            propertyId={propertyId}
                            excludeUserId={employee.id}
                            allowClear
                        />
                    </div>

                    {/* Warning for significant changes */}
                    {hasChanged && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                    {t('organization.change_warning', 'This change will affect:')}
                                </p>
                                <ul className="mt-1 text-amber-700 dark:text-amber-300 list-disc list-inside">
                                    <li>{t('organization.impact_approvals', 'Approval workflows for this employee')}</li>
                                    <li>{t('organization.impact_visibility', 'Manager visibility in reports')}</li>
                                    <li>{t('organization.impact_notifications', 'Notification routing')}</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={updateReportingLine.isPending}
                    >
                        {t('common:cancel', 'Cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanged || updateReportingLine.isPending}
                    >
                        {updateReportingLine.isPending
                            ? t('common:saving', 'Saving...')
                            : t('common:save_changes', 'Save Changes')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
