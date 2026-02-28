import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarDays, MapPin, Clock, Loader2, Type } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useQuickCreateEvent } from '@/hooks/useQuickCreate'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date().optional(),
  location: z.string().optional(),
  type: z.enum(['meeting', 'training', 'holiday', 'deadline', 'birthday', 'general']).default('meeting'),
  description: z.string().optional(),
  all_day: z.boolean().default(false),
})

type EventFormValues = z.infer<typeof eventSchema>

interface QuickEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickEventModal({ open, onOpenChange }: QuickEventModalProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const createEvent = useQuickCreateEvent()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      type: 'meeting',
      location: '',
      description: '',
      all_day: false,
    },
  })

  const onSubmit = async (values: EventFormValues) => {
    await createEvent.mutateAsync({
      title: values.title,
      start_date: values.start_date.toISOString(),
      end_date: values.end_date?.toISOString(),
      location: values.location,
      type: values.type,
      description: values.description,
      all_day: values.all_day,
    })
    form.reset()
    onOpenChange(false)
  }

  const eventTypes = [
    { value: 'meeting', label: t('quick_create.event_meeting') || 'Meeting', icon: '🤝' },
    { value: 'training', label: t('quick_create.event_training') || 'Training', icon: '📚' },
    { value: 'holiday', label: t('quick_create.event_holiday') || 'Holiday', icon: '🏖️' },
    { value: 'deadline', label: t('quick_create.event_deadline') || 'Deadline', icon: '⏰' },
    { value: 'birthday', label: t('quick_create.event_birthday') || 'Birthday', icon: '🎂' },
    { value: 'general', label: t('quick_create.event_general') || 'General', icon: '📅' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            {t('quick_create.event_title') || 'Quick Create Event'}
          </DialogTitle>
          <DialogDescription>
            {t('quick_create.event_description') || 'Add a new event to the calendar'}
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.event_name') || 'Event Title'} *</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('quick_create.event_placeholder') || 'Enter event title...'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.event_type') || 'Event Type'}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <Type className="w-4 h-4 me-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('quick_create.start_date') || 'Start Date'} *</FormLabel>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <Clock className="w-4 h-4 me-2" />
                          {field.value ? (
                            format(field.value, 'PP', { locale: isRTL ? ar : undefined })
                          ) : (
                            <span>{t('quick_create.pick_date') || 'Pick date'}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date)
                          setStartDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('quick_create.end_date') || 'End Date'}</FormLabel>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <Clock className="w-4 h-4 me-2" />
                          {field.value ? (
                            format(field.value, 'PP', { locale: isRTL ? ar : undefined })
                          ) : (
                            <span>{t('quick_create.optional') || 'Optional'}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date)
                          setEndDateOpen(false)
                        }}
                        disabled={(date) => {
                          const startDate = form.getValues('start_date')
                          return startDate ? date < startDate : false
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.location') || 'Location'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('quick_create.location_placeholder') || 'Room, building, or area...'}
                      className="ps-9"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.description') || 'Description'}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('quick_create.event_desc_placeholder') || 'Add event details...'}
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createEvent.isPending}
            >
              {t('actions.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('quick_create.creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <CalendarDays className="w-4 h-4 me-2" />
                  {t('quick_create.create_event') || 'Create Event'}
                </>
              )}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
