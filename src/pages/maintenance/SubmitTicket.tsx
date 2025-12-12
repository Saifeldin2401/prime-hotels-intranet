import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { useAuth } from '@/hooks/useAuth'
import { useCreateMaintenanceTicket } from '@/hooks/useMaintenanceTickets'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Wrench, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'
import type { MaintenanceTicket } from '@/lib/types'
import { useTranslation } from 'react-i18next'

const categories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' }
] as const

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  { value: 'critical', label: 'Critical', color: 'bg-purple-100 text-purple-800' }
] as const

const ticketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title matches max length of 100'),
  description: z.string().min(20, 'Please provide more detail (at least 20 characters)'),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  room_number: z.string().optional(),
  property_id: z.string().optional(),
})

type TicketFormValues = z.infer<typeof ticketSchema>

export default function SubmitTicket() {
  const { user, properties } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('maintenance')

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      // category is undefined by default to force selection
      priority: 'medium',
      room_number: '',
      property_id: properties.length === 1 ? properties[0].id : '',
    },
  })

  const createMutation = useCreateMaintenanceTicket()

  const onSubmit = (data: TicketFormValues) => {
    createMutation.mutate({
      title: data.title,
      description: data.description,
      category: data.category as MaintenanceTicket['category'],
      priority: data.priority as MaintenanceTicket['priority'],
      room_number: data.room_number || undefined,
      property_id: data.property_id || undefined
    })
  }

  if (!user) return null

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('submit_ticket.title')}
        description={t('submit_ticket.description')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 gap-2">
                <Wrench className="h-5 w-5" />
                <span>{t('submit_ticket.details')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('submit_ticket.form_title')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={t('submit_ticket.title_placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('submit_ticket.category')} *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('submit_ticket.select_category')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('submit_ticket.description')} *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('submit_ticket.desc_placeholder')}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('priority')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('priority')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {priorities.map(priority => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  <div className="flex items-center space-x-2 gap-2">
                                    <Badge className={priority.color}>
                                      {priority.label}
                                    </Badge>
                                  </div>
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
                      name="room_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('room_number')}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 101" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {properties.length > 1 && (
                      <FormField
                        control={form.control}
                        name="property_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('property')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('select_property')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {properties.map(property => (
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
                    )}
                  </div>

                  {form.watch('priority') === 'critical' || form.watch('priority') === 'urgent' ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {form.watch('priority') === 'critical'
                          ? t('submit_ticket.critical_warning')
                          : t('submit_ticket.urgent_warning')
                        }
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex justify-end space-x-4 gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/maintenance')}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? t('submitting') : t('submit')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>


        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('submit_ticket.priority_guidelines')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {priorities.map(priority => (
                <div key={priority.value} className="flex items-start space-x-3 gap-3">
                  <Badge className={priority.color} variant="secondary">
                    {priority.label}
                  </Badge>
                  <div className="text-sm text-gray-600">
                    {priority.value === 'critical' && t('submit_ticket.guideline_critical')}
                    {priority.value === 'urgent' && t('submit_ticket.guideline_urgent')}
                    {priority.value === 'high' && t('submit_ticket.guideline_high')}
                    {priority.value === 'medium' && t('submit_ticket.guideline_medium')}
                    {priority.value === 'low' && t('submit_ticket.guideline_low')}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('submit_ticket.what_next')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3 gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">1</div>
                <div className="text-sm">
                  <strong>{t('submit_ticket.next_created')}</strong>
                  <p className="text-gray-600">{t('submit_ticket.next_created_desc')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">2</div>
                <div className="text-sm">
                  <strong>{t('submit_ticket.next_review')}</strong>
                  <p className="text-gray-600">{t('submit_ticket.next_review_desc')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">3</div>
                <div className="text-sm">
                  <strong>{t('submit_ticket.next_work')}</strong>
                  <p className="text-gray-600">{t('submit_ticket.next_work_desc')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">4</div>
                <div className="text-sm">
                  <strong>{t('submit_ticket.next_completion')}</strong>
                  <p className="text-gray-600">{t('submit_ticket.next_completion_desc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
