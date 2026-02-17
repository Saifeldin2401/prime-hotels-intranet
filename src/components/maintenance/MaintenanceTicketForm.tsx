import { useState, useEffect } from 'react'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useAITicketTriage } from '@/hooks/useAITicketTriage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AITriageSuggestions } from '@/components/maintenance/AITriageSuggestions'
import {
  Wrench,
  ArrowLeft,
  Upload,
  Camera
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MaintenanceTicket } from '@/lib/types'

interface MaintenanceTicketFormProps {
  onClose: () => void
  initialData?: Partial<MaintenanceTicket>
}

export function MaintenanceTicketForm({ onClose, initialData }: MaintenanceTicketFormProps) {
  const { profile, properties, departments } = useAuth()
  const { t } = useTranslation('maintenance')
  const queryClient = useQueryClient()

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
    if (allowed.includes(normalized)) return normalized
    return legacyMap[normalized] || 'other'
  }

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    category: normalizeCategory(initialData?.category),
    property_id: initialData?.property_id || '',
    department_id: initialData?.department_id || '',
    room_number: initialData?.room_number || '',
    estimated_cost: initialData?.estimated_cost != null ? String(initialData.estimated_cost) : ''
  })

  // AI Triage Hook
  const { suggestion, loading: triageLoading, analyzeTicketDebounced, clearSuggestion } = useAITicketTriage()

  // Trigger AI analysis when description changes
  useEffect(() => {
    if (formData.description.length > 15) {
      analyzeTicketDebounced(formData.description, formData.room_number)
    }
  }, [formData.description, formData.room_number, analyzeTicketDebounced])

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
    const mappedCategory = categoryMap[s.category.toLowerCase()] || 'other'
    setFormData(prev => ({
      ...prev,
      category: mappedCategory,
      priority: s.priority
    }))
    clearSuggestion()
  }

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim()) {
      return
    }

    createTicketMutation.mutate(formData)
  }

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back_to_dashboard', { defaultValue: 'Back' })}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ticket_details', { defaultValue: 'Ticket Information' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('submit_ticket.form_title', { defaultValue: 'Title' })} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder={t('submit_ticket.title_placeholder', { defaultValue: 'Brief description of the issue' })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">{t('priority', { defaultValue: 'Priority' })}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => updateFormData('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('low', { defaultValue: 'Low' })}</SelectItem>
                      <SelectItem value="medium">{t('medium', { defaultValue: 'Medium' })}</SelectItem>
                      <SelectItem value="high">{t('high', { defaultValue: 'High' })}</SelectItem>
                      <SelectItem value="urgent">{t('urgent', { defaultValue: 'Urgent' })}</SelectItem>
                      <SelectItem value="critical">{t('critical', { defaultValue: 'Critical' })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('submit_ticket.category', { defaultValue: 'Category' })}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => updateFormData('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room_number">{t('room_number', { defaultValue: 'Room Number' })}</Label>
                  <Input
                    id="room_number"
                    value={formData.room_number}
                    onChange={(e) => updateFormData('room_number', e.target.value)}
                    placeholder={t('submit_ticket.room_placeholder', { defaultValue: 'Room number or specific location' })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('submit_ticket.description', { defaultValue: 'Description' })} *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder={t('submit_ticket.desc_placeholder', { defaultValue: 'Detailed description of the maintenance issue' })}
                  rows={4}
                  required
                />
              </div>

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
                <div className="space-y-2">
                  <Label htmlFor="property">{t('property', { defaultValue: 'Property' })}</Label>
                  <Select
                    value={formData.property_id}
                    onValueChange={(value) => updateFormData('property_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_property', { defaultValue: 'Select property' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {properties?.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">{t('department', { defaultValue: 'Department' })}</Label>
                  <GroupedDepartmentSelector
                    departments={departments}
                    properties={properties}
                    value={formData.department_id}
                    onValueChange={(value) => updateFormData('department_id', value)}
                    placeholder={t('select_department', { defaultValue: 'Select department' })}
                  />
                </div>
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('cost_estimate', { defaultValue: 'Cost Estimate' })}</h3>
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">{t('estimated_cost', { defaultValue: 'Estimated Cost (Optional)' })}</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => updateFormData('estimated_cost', e.target.value)}
                  placeholder={t('cost_placeholder', { defaultValue: '0.00' })}
                />
              </div>
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
                    <Upload className="w-4 h-4 mr-2" />
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
        </CardContent>
      </Card>
    </div>
  )
}
