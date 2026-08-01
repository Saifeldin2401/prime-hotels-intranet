import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useCreateLogbookEntry, useLogbookEntries } from '@/hooks/useLogbook'
import type { LogbookEntry } from '@/lib/types/operations'
import { format } from 'date-fns'
import { BookText, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isRealPropertyId } from '@/lib/propertyScope'

const entryTypeColors: Record<string, string> = {
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    handover: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    incident_ref: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
}

export default function DailyLogbook() {
    const { t } = useTranslation(['operations', 'common'])
    const { toast } = useToast()
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const propertyId = currentProperty?.id
    const { data: entries, isLoading } = useLogbookEntries(propertyId)
    const createMutation = useCreateLogbookEntry()

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        shift: '' as LogbookEntry['shift'] | '',
        entry_type: 'general' as LogbookEntry['entry_type'],
        content: ''
    })

    const resetForm = () => setFormData({ shift: '', entry_type: 'general', content: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !isRealPropertyId(propertyId)) return
        try {
            await createMutation.mutateAsync({
                property_id: propertyId,
                shift: formData.shift || undefined,
                entry_type: formData.entry_type,
                content: formData.content,
                created_by: user.id
            })
            toast({ title: t('operations:logbook.success.created', { defaultValue: 'Logbook entry added' }) })
            setIsDialogOpen(false)
            resetForm()
        } catch (error: any) {
            toast({
                title: t('common:common.error', { defaultValue: 'Error' }),
                description: error?.message || String(error),
                variant: 'destructive'
            })
        }
    }

    if (!isRealPropertyId(propertyId)) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={BookText}
                    title={t('operations:logbook.no_property', { defaultValue: 'No property assigned' })}
                    description={t('operations:logbook.no_property_desc', { defaultValue: 'You need an assigned property to use the daily logbook.' })}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('operations:logbook.title', { defaultValue: 'Daily Logbook' })}
                description={t('operations:logbook.description', { defaultValue: 'Running shift log and handover notes for your property.' })}
                actions={
                    <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                        <Plus className="w-4 h-4 me-2" />
                        {t('operations:logbook.add_entry', { defaultValue: 'Add Entry' })}
                    </Button>
                }
            />

            <div className="altus-card">
                <div className="altus-card-body">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common:common.loading', { defaultValue: 'Loading…' })}</div>
                    ) : entries && entries.length > 0 ? (
                        <div className="space-y-2">
                            {entries.map((entry) => (
                                <div key={entry.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                            <BookText className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-gray-900">{entry.content}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                <span>{format(new Date(entry.created_at), 'PPp')}</span>
                                                {entry.shift && <span>· {entry.shift}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={entryTypeColors[entry.entry_type]}>
                                        {entry.entry_type.replace('_', ' ')}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookText}
                            title={t('operations:logbook.no_data', { defaultValue: 'No logbook entries yet' })}
                            description={t('operations:logbook.no_data_desc', { defaultValue: 'Shift notes and handover entries will appear here.' })}
                            action={{
                                label: t('operations:logbook.add_entry', { defaultValue: 'Add Entry' }),
                                onClick: () => { resetForm(); setIsDialogOpen(true) },
                                icon: Plus
                            }}
                        />
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('operations:logbook.add_entry', { defaultValue: 'Add Entry' })}</DialogTitle>
                        <DialogDescription>
                            {t('operations:logbook.add_new_desc', { defaultValue: 'Add a shift log or handover note.' })}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="shift">{t('operations:logbook.shift_label', { defaultValue: 'Shift' })}</Label>
                                <Select value={formData.shift} onValueChange={(v) => setFormData({ ...formData, shift: v as LogbookEntry['shift'] })}>
                                    <SelectTrigger id="shift">
                                        <SelectValue placeholder={t('operations:logbook.shift_placeholder', { defaultValue: 'Select shift' })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="morning">{t('operations:logbook.shift_morning', { defaultValue: 'Morning' })}</SelectItem>
                                        <SelectItem value="afternoon">{t('operations:logbook.shift_afternoon', { defaultValue: 'Afternoon' })}</SelectItem>
                                        <SelectItem value="evening">{t('operations:logbook.shift_evening', { defaultValue: 'Evening' })}</SelectItem>
                                        <SelectItem value="night">{t('operations:logbook.shift_night', { defaultValue: 'Night' })}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entry_type">{t('operations:logbook.entry_type_label', { defaultValue: 'Entry Type' })}</Label>
                                <Select value={formData.entry_type} onValueChange={(v) => setFormData({ ...formData, entry_type: v as LogbookEntry['entry_type'] })}>
                                    <SelectTrigger id="entry_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">{t('operations:logbook.type_general', { defaultValue: 'General' })}</SelectItem>
                                        <SelectItem value="handover">{t('operations:logbook.type_handover', { defaultValue: 'Handover' })}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">{t('operations:logbook.content_label', { defaultValue: 'Notes' })}</Label>
                            <Textarea id="content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4} required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common:action.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" className="bg-hotel-gold hover:bg-hotel-gold-dark text-white" disabled={createMutation.isPending || !formData.content}>
                                {createMutation.isPending ? t('common:common.saving', { defaultValue: 'Saving…' }) : t('common:action.create', { defaultValue: 'Create' })}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
