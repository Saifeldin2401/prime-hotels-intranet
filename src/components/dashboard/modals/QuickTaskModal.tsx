import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CheckCircle2, Calendar, Flag, User, Loader2 } from 'lucide-react'

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
import { useQuickCreateTask } from '@/hooks/useQuickCreate'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to_id: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface QuickTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickTaskModal({ open, onOpenChange }: QuickTaskModalProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()
  const createTask = useQuickCreateTask()
  const { data: users = [] } = useUsers()
  const [dateOpen, setDateOpen] = useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assigned_to_id: user?.id || '',
    },
  })

  const onSubmit = async (values: TaskFormValues) => {
    await createTask.mutateAsync({
      title: values.title,
      description: values.description,
      due_date: values.due_date?.toISOString(),
      priority: values.priority,
      assigned_to_id: values.assigned_to_id || user?.id,
    })
    form.reset()
    onOpenChange(false)
  }

  const priorityOptions = [
    { value: 'low', label: t('quick_create.priority_low') || 'Low', color: 'text-blue-500' },
    { value: 'medium', label: t('quick_create.priority_medium') || 'Medium', color: 'text-yellow-500' },
    { value: 'high', label: t('quick_create.priority_high') || 'High', color: 'text-orange-500' },
    { value: 'urgent', label: t('quick_create.priority_urgent') || 'Urgent', color: 'text-red-500' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            {t('quick_create.task_title') || 'Quick Add Task'}
          </DialogTitle>
          <DialogDescription>
            {t('quick_create.task_description') || 'Create a new task quickly'}
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.task_name') || 'Task Title'} *</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('quick_create.task_placeholder') || 'Enter task title...'}
                    {...field}
                  />
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
                    placeholder={t('quick_create.description_placeholder') || 'Add details...'}
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('quick_create.due_date') || 'Due Date'}</FormLabel>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="w-4 h-4 me-2" />
                          {field.value ? (
                            format(field.value, 'PPP', { locale: isRTL ? ar : undefined })
                          ) : (
                            <span>{t('quick_create.pick_date') || 'Pick a date'}</span>
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
                          setDateOpen(false)
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.priority') || 'Priority'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <Flag className="w-4 h-4 me-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={cn('flex items-center gap-2', option.color)}>
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="assigned_to_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.assign_to') || 'Assign To'}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <User className="w-4 h-4 me-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={user?.id || ''}>
                      {t('quick_create.assign_self') || 'Assign to myself'}
                    </SelectItem>
                    {users
                      .filter((u) => u.id !== user?.id)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTask.isPending}
            >
              {t('actions.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('quick_create.creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {t('quick_create.create_task') || 'Create Task'}
                </>
              )}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
