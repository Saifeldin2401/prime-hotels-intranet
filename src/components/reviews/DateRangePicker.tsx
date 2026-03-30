import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, X } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePreset = (days: number) => {
    onChange({
      from: subDays(new Date(), days),
      to: new Date(),
    })
    setIsOpen(false)
  }

  const handleSelect = (date: Date | undefined, type: 'from' | 'to') => {
    if (type === 'from') {
      onChange({ ...value, from: date })
    } else {
      onChange({ ...value, to: date })
    }
  }

  const clearRange = () => {
    onChange({ from: undefined, to: undefined })
    setIsOpen(false)
  }

  const hasValue = value.from || value.to

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 text-xs font-medium",
            hasValue && "border-primary text-primary"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
          {value.from && value.to ? (
            <span>
              {format(value.from, 'MMM d')} - {format(value.to, 'MMM d')}
            </span>
          ) : value.from ? (
            <span>From {format(value.from, 'MMM d')}</span>
          ) : (
            <span>Date Range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePreset(preset.days)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Calendar
                mode="single"
                selected={value.from}
                onSelect={(date) => handleSelect(date, 'from')}
                disabled={(date) => value.to ? date > value.to : false}
                initialFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Calendar
                mode="single"
                selected={value.to}
                onSelect={(date) => handleSelect(date, 'to')}
                disabled={(date) => value.from ? date < value.from : false}
                initialFocus
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRange}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
