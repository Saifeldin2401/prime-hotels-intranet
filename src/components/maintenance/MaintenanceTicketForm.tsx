import { AITriageSuggestions } from '@/components/maintenance/AITriageSuggestions'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAITicketTriage } from '@/hooks/useAITicketTriage'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { MaintenanceTicket } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Camera,
  Upload,
  Wrench
} from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

interface MaintenanceTicketFormProps {
  onClose: () => void
  initialData?: Partial<MaintenanceTicket>
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other']),
  property_id: z.string().optional(),
  department_id: z.string().optional(),
  room_number: z.string().optional(),
  estimated_cost: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

const normalizeCategory = (value?: string) => {
  if (!value) return 'other'
  const normalized = value.toLowerCase()
  const legacyMap: Record<string, string> = {
    internet: 'appliance',
    tv: 'appliance',
    furniture: 'cosmetic',
    general: 'other'
  }
  const allowed = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other']
  if (allowed.includes(normalized)) return normalized as any
  return (legacyMap[normalized] || 'other') as any
}

export function MaintenanceTicketForm({ onClose, initialData }: MaintenanceTicketFormProps) {
  const { profile, properties, departments } = useAuth()
  const { t } = useTranslation('maintenance')
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: (initialData?.priority as any) || 'medium',
      category: normalizeCategory(initialData?.category),
      property_id: initialData?.property_id || '',
      department_id: initialData?.department_id || '',
      room_number: initialData?.room_number || '',
      estimated_cost: initialData?.estimated_cost != null ? String(initialData.estimated_cost) : ''
    }
  })

  // AI Triage Hook
  const { suggestion, loading: triageLoading, analyzeTicketDebounced, clearSuggestion } = useAITicketTriage()

  const descriptionValue = form.watch('description')
  const roomNumberValue = form.watch('room_number')

  // Trigger AI analysis when description changes
  useEffect(() => {
    if (descriptionValue.length > 15) {
      analyzeTicketDebounced(descriptionValue, roomNumberValue || '')
    }
  }, [descriptionValue, roomNumberValue, analyzeTicketDebounced])

  // Apply AI suggestions to form
  const handleApplySuggestion = (s: typeof suggestion) => {
    if (!s) return
    const categoryMap: Record<string, string> = {
      'hvac': 'hvac',
      'plumbing': 'plumbing',
      'electrical': 'electrical',
      'it/technology': 'appliance',
      'housekeeping': 'cosmetic',
      'carpentry': 'structural',
      'safety': 'safety',
      'general maintenance': 'other',
      'exterior/grounds': 'structural'
    }
    const mappedCategory = (categoryMap[s.category.toLowerCase()] || 'other') as any
    form.setValue('category', mappedCategory)
    form.setValue('priority', s.priority as any)
    clearSuggestion()
  }

  const createTicketMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!profile) throw new Error('User not authenticated')

      const ticketData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        property_id: data.property_id || null,
        department_id: data.department_id || null,
        room_number: data.room_number || null,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
        reported_by_id: profile.id,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await supabase
        .from('maintenance_tickets')
        .insert(ticketData)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
      onClose()
    }
  })

  const onSubmit = (data: FormData) => {
    createTicketMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {initialData ? t('edit_ticket', { defaultValue: 'Edit Maintenance Ticket' }) : t('new_ticket_title', { defaultValue: 'Create Maintenance Ticket' })}
          </h1>
        </div>
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 me-2" />
          {t('back_to_dashboard', { defaultValue: 'Back' })}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ticket_details', { defaultValue: 'Ticket Information' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('submit_ticket.form_title', { defaultValue: 'Title' })} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('submit_ticket.title_placeholder', { defaultValue: 'Brief description of the issue' })}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('priority', { defaultValue: 'Priority' })}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t('low', { defaultValue: 'Low' })}</SelectItem>
                            <SelectItem value="medium">{t('medium', { defaultValue: 'Medium' })}</SelectItem>
                            <SelectItem value="high">{t('high', { defaultValue: 'High' })}</SelectItem>
                            <SelectItem value="urgent">{t('urgent', { defaultValue: 'Urgent' })}</SelectItem>
                            <SelectItem value="critical">{t('critical', { defaultValue: 'Critical' })}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('submit_ticket.category', { defaultValue: 'Category' })}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="plumbing">{t('categories.plumbing', { defaultValue: 'Plumbing' })}</SelectItem>
                            <SelectItem value="electrical">{t('categories.electrical', { defaultValue: 'Electrical' })}</SelectItem>
                            <SelectItem value="hvac">{t('categories.hvac', { defaultValue: 'HVAC' })}</SelectItem>
                            <SelectItem value="appliance">{t('categories.appliance', { defaultValue: 'Appliance' })}</SelectItem>
                            <SelectItem value="structural">{t('categories.structural', { defaultValue: 'Structural' })}</SelectItem>
                            <SelectItem value="cosmetic">{t('categories.cosmetic', { defaultValue: 'Cosmetic' })}</SelectItem>
                            <SelectItem value="safety">{t('categories.safety', { defaultValue: 'Safety' })}</SelectItem>
                            <SelectItem value="other">{t('categories.other', { defaultValue: 'Other' })}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="room_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('room_number', { defaultValue: 'Room Number' })}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('submit_ticket.room_placeholder', { defaultValue: 'Room number or specific location' })}
                          />
                        </FormControl>
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
                      <FormLabel>{t('submit_ticket.description', { defaultValue: 'Description' })} *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('submit_ticket.desc_placeholder', { defaultValue: 'Detailed description of the maintenance issue' })}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* AI Triage Suggestions */}
                <AITriageSuggestions
                  suggestion={suggestion}
                  loading={triageLoading}
                  onApply={handleApplySuggestion}
                  onDismiss={clearSuggestion}
                />
              </div>

              {/* Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('assigned_to', { defaultValue: 'Assignment' })}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="property_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('property', { defaultValue: 'Property' })}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_property', { defaultValue: 'Select property' })} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties?.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.name}
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
                    name="department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('department', { defaultValue: 'Department' })}</FormLabel>
                        <FormControl>
                          <GroupedDepartmentSelector
                            departments={departments}
                            properties={properties}
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            placeholder={t('select_department', { defaultValue: 'Select department' })}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('cost_estimate', { defaultValue: 'Cost Estimate' })}</h3>
                <FormField
                  control={form.control}
                  name="estimated_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('estimated_cost', { defaultValue: 'Estimated Cost (Optional)' })}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder={t('cost_placeholder', { defaultValue: '0.00' })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('attachments', { defaultValue: 'Attachments' })}</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {t('submit_ticket.attachments_note', { defaultValue: 'Add photos of the issue (optional)' })}
                    </p>
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="w-4 h-4 me-2" />
                      {t('submit_ticket.upload_files', { defaultValue: 'Upload Photos' })}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                >
                  {createTicketMutation.isPending
                    ? t('processing', { defaultValue: 'Creating...' })
                    : t('submit_ticket.submit', { defaultValue: 'Create Ticket' })}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

