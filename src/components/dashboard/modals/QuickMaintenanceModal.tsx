import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Wrench, MapPin, Flag, Loader2, FileText } from 'lucide-react'

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
import { useQuickCreateMaintenanceTicket } from '@/hooks/useQuickCreate'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const maintenanceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  location: z.string().optional(),
  room_number: z.string().optional(),
})

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>

interface QuickMaintenanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickMaintenanceModal({ open, onOpenChange }: QuickMaintenanceModalProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const createTicket = useQuickCreateMaintenanceTicket()

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'other',
      priority: 'medium',
      location: '',
      room_number: '',
    },
  })

  const onSubmit = async (values: MaintenanceFormValues) => {
    try {
      await createTicket.mutateAsync({
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        location: values.location,
        room_number: values.room_number,
      })
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(t('quick_create.maintenance_failed', 'Failed to create maintenance ticket'))
    }
  }

  const categories = [
    { value: 'plumbing', label: t('maintenance.category_plumbing') || 'Plumbing', icon: '🔧' },
    { value: 'electrical', label: t('maintenance.category_electrical') || 'Electrical', icon: '⚡' },
    { value: 'hvac', label: t('maintenance.category_hvac') || 'HVAC', icon: '❄️' },
    { value: 'appliance', label: t('maintenance.category_appliance') || 'Appliance', icon: '📺' },
    { value: 'structural', label: t('maintenance.category_structural') || 'Structural', icon: '🏗️' },
    { value: 'cosmetic', label: t('maintenance.category_cosmetic') || 'Cosmetic', icon: '🎨' },
    { value: 'safety', label: t('maintenance.category_safety') || 'Safety', icon: '🛡️' },
    { value: 'other', label: t('maintenance.category_other') || 'Other', icon: '📋' },
  ]

  const priorityOptions = [
    { value: 'low', label: t('quick_create.priority_low') || 'Low', color: 'text-blue-500' },
    { value: 'medium', label: t('quick_create.priority_medium') || 'Medium', color: 'text-yellow-500' },
    { value: 'high', label: t('quick_create.priority_high') || 'High', color: 'text-orange-500' },
    { value: 'urgent', label: t('quick_create.priority_urgent') || 'Urgent', color: 'text-red-500' },
    { value: 'critical', label: t('quick_create.priority_critical') || 'Critical', color: 'text-red-700' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            {t('quick_create.maintenance_title') || 'Report Maintenance'}
          </DialogTitle>
          <DialogDescription>
            {t('quick_create.maintenance_description') || 'Report a maintenance issue quickly'}
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.issue_title') || 'Issue Title'} *</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('quick_create.maintenance_placeholder') || 'Brief description of the issue...'}
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.category') || 'Category'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <FileText className="w-4 h-4 me-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="room_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.room_number') || 'Room/Unit'}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('quick_create.room_placeholder') || 'e.g., 205A'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.location') || 'Location'}</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('quick_create.area_placeholder') || 'Area/Building...'}
                      className="ps-9"
                      {...field}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.issue_details') || 'Issue Details'} *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('quick_create.maintenance_desc_placeholder') || 'Describe the issue in detail...'}
                    className="min-h-[100px]"
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
              disabled={createTicket.isPending}
            >
              {t('actions.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('quick_create.submitting') || 'Submitting...'}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 me-2" />
                  {t('quick_create.report_issue') || 'Report Issue'}
                </>
              )}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
