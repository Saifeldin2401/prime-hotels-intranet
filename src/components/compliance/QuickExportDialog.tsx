/**
 * FORGE X: Enterprise Audit & Compliance Export System
 * Quick Export Dialog Component
 */

import { Calendar, Download, FileText } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAuditExport, useExportTemplates } from '@/hooks/useAuditExports'
import { EXPORT_FORMATS } from '@/lib/auditConstants'
import { cn } from '@/lib/utils'
import type { AuditExportFormat, ExportScope } from '@/types/audit'

interface QuickExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickExportDialog({ open, onOpenChange }: QuickExportDialogProps) {
  const [exportName, setExportName] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<AuditExportFormat>('pdf')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => ({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }))
  const [selectedEntities, setSelectedEntities] = useState<string[]>(['profiles', 'documents'])
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const createExport = useCreateAuditExport()
  const { data: _templates } = useExportTemplates(format)

  const handleSubmit = async () => {
    const scope: ExportScope = {
      type: 'date_range',
      date_from: dateRange.from?.toISOString(),
      date_to: dateRange.to?.toISOString(),
      entity_types: selectedEntities,
    }

    await createExport.mutateAsync({
      exportName: exportName || `Audit Export ${format(new Date(), 'yyyy-MM-dd')}`,
      description,
      scope,
      format,
    })

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setExportName('')
    setDescription('')
    setFormat('pdf')
    setDateRange({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    })
    setSelectedEntities(['profiles', 'documents'])
  }

  const entityOptions = [
    { value: 'profiles', label: 'User Profiles' },
    { value: 'documents', label: 'Documents' },
    { value: 'training', label: 'Training' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'approvals', label: 'Approvals' },
  ]

  const canSubmit = exportName.trim() && dateRange.from && dateRange.to && selectedEntities.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            New Audit Export
          </DialogTitle>
          <DialogDescription>
            Create a tamper-evident audit export for compliance or investigation purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Export Name *</Label>
            <Input
              id="name"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder="e.g., Q1 2026 Compliance Report"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Purpose of this audit export..."
              rows={2}
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as AuditExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPORT_FORMATS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {config.label}
                      <span className="text-xs text-muted-foreground">
                        (max {config.maxRecords.toLocaleString()} records)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {EXPORT_FORMATS[format].description}
            </p>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range *</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange.from && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    'Select date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to })
                    if (range?.to) setIsDatePickerOpen(false)
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Entity Types */}
          <div className="space-y-2">
            <Label>Entity Types *</Label>
            <div className="grid grid-cols-2 gap-2">
              {entityOptions.map((entity) => (
                <div key={entity.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={entity.value}
                    checked={selectedEntities.includes(entity.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEntities([...selectedEntities, entity.value])
                      } else {
                        setSelectedEntities(selectedEntities.filter((e) => e !== entity.value))
                      }
                    }}
                  />
                  <Label htmlFor={entity.value} className="text-sm font-normal">
                    {entity.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Exports include SHA-256 hashes for integrity verification and are retained for 90 days.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createExport.isPending}>
            {createExport.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Create Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
