import { zodResolver } from '@hookform/resolvers/zod'
import { Flag, Loader2, Megaphone, Pin, Type, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { useQuickCreateAnnouncement } from '@/hooks/useQuickCreate'
import type { AppRole } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().trim().min(1, 'Content is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  target_type: z.enum(['all', 'role', 'department', 'property', 'individual']),
  target_value: z.string().trim().optional(),
  pinned: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.target_type !== 'all' && !values.target_value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['target_value'],
      message: 'Please select a target value'
    })
  }
})

type AnnouncementFormValues = z.infer<typeof announcementSchema>

interface QuickAnnouncementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAnnouncementModal({ open, onOpenChange }: QuickAnnouncementModalProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { roles, properties } = useAuth()
  const createAnnouncement = useQuickCreateAnnouncement()
  const { departments: allDepartments = [] } = useDepartments()

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
      priority: 'medium',
      target_type: 'all',
      target_value: '',
      pinned: false,
    },
  })

  const targetType = form.watch('target_type')

  const onSubmit = async (values: AnnouncementFormValues) => {
    const targetAudience = { type: values.target_type, values: [] as string[] }

    if (values.target_type === 'department' && values.target_value) {
      targetAudience.values = [values.target_value]
    } else if (values.target_type === 'property' && values.target_value) {
      targetAudience.values = [values.target_value]
    } else if (values.target_type === 'role' && values.target_value) {
      targetAudience.values = [values.target_value]
    }

    try {
      await createAnnouncement.mutateAsync({
        title: values.title,
        content: values.content,
        priority: values.priority,
        target_audience: targetAudience,
        pinned: values.pinned,
      })
      form.reset()
      onOpenChange(false)
    } catch (_error) {
      toast.error(t('quick_create.post_failed', 'Failed to post announcement'))
    }
  }

  const priorityOptions = [
    { value: 'low', label: t('quick_create.priority_low') || 'Low', color: 'text-blue-500' },
    { value: 'medium', label: t('quick_create.priority_medium') || 'Medium', color: 'text-yellow-500' },
    { value: 'high', label: t('quick_create.priority_high') || 'High', color: 'text-orange-500' },
    { value: 'urgent', label: t('quick_create.priority_urgent') || 'Urgent', color: 'text-red-500' },
  ]

  const targetTypes = [
    { value: 'all', label: t('quick_create.target_all') || 'All Staff' },
    { value: 'department', label: t('quick_create.target_department') || 'Department' },
    { value: 'property', label: t('quick_create.target_property') || 'Property' },
    { value: 'role', label: t('quick_create.target_role') || 'Role' },
  ]

  // Get available roles for current user
  const availableRoles = roles.map((r) => r.role as AppRole)
  const roleOptions = [
    { value: 'staff', label: t('roles.staff') || 'Staff' },
    { value: 'department_head', label: t('roles.department_head') || 'Department Head' },
    { value: 'property_manager', label: t('roles.property_manager') || 'Property Manager' },
    { value: 'property_hr', label: t('roles.property_hr') || 'Property HR' },
    { value: 'regional_hr', label: t('roles.regional_hr') || 'Regional HR' },
    { value: 'regional_admin', label: t('roles.regional_admin') || 'Regional Admin' },
  ].filter((roleOption) =>
    availableRoles.includes(roleOption.value as AppRole)
    || (['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'] as AppRole[])
      .some((role) => availableRoles.includes(role))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-purple-500" />
            {t('quick_create.announcement_title') || 'Post Announcement'}
          </DialogTitle>
          <DialogDescription>
            {t('quick_create.announcement_description') || 'Create a new announcement for your team'}
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.announcement_title_label') || 'Announcement Title'} *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Type className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('quick_create.announcement_placeholder') || 'Enter announcement title...'}
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
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quick_create.announcement_content') || 'Content'} *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('quick_create.announcement_content_placeholder') || 'Write your announcement...'}
                    className="min-h-[100px]"
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

            <FormField
              control={form.control}
              name="target_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.target_audience') || 'Target Audience'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <Users className="w-4 h-4 me-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {targetTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {targetType === 'department' && (
            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.select_department') || 'Select Department'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {targetType === 'property' && (
            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.select_property') || 'Select Property'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>
                          {prop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {targetType === 'role' && (
            <FormField
              control={form.control}
              name="target_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quick_create.select_role') || 'Select Role'}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="pinned"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    {t('quick_create.pin_announcement') || 'Pin Announcement'}
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAnnouncement.isPending}
            >
              {t('actions.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={createAnnouncement.isPending} aria-busy={createAnnouncement.isPending} aria-live="polite">
              {createAnnouncement.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden="true" />
                  {t('quick_create.posting') || 'Posting...'}
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4 me-2" aria-hidden="true" />
                  {t('quick_create.post_announcement') || 'Post Announcement'}
                </>
              )}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
