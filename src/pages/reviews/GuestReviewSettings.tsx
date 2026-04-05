import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { OTASourceManager } from "@/components/reviews/OTASourceManager"
import { GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID, isGuestReviewEligiblePropertyId } from "@/lib/reviewsScope"
import { Plus, Pencil, Trash2, Mail, Bell, User, Loader2 } from "lucide-react"
import { useState, useMemo } from "react"

type PropertyLite = { id: string; name: string }

type MappingRow = {
  id: string
  property_id: string
  responsibility_code: string
  primary_profile_id: string | null
  backup_profile_id: string | null
  is_active: boolean
}

type ProfileLite = {
  id: string
  full_name: string | null
  email: string | null
}

// TypeScript enum types
type GuestReviewEndpointScope = 'global' | 'property' | 'department' | 'executive'
type GuestReviewEndpointChannel = 'email' | 'slack' | 'whatsapp' | 'sms'
type GuestReviewResponsibilityCode = 
  | 'general_manager' 
  | 'area_general_manager' 
  | 'corporate_reputation_owner'
  | 'rooms_manager'
  | 'housekeeping_manager'
  | 'fnb_manager'
  | 'maintenance_manager'
  | 'it_manager'

type EndpointRow = {
  id: string
  property_id: string | null
  responsibility_code: GuestReviewResponsibilityCode | null
  scope: GuestReviewEndpointScope
  channel: GuestReviewEndpointChannel
  label: string
  recipients: string[] | null
  secret_name: string | null
  is_active: boolean
}

type ToneRow = {
  id: string
  property_id: string
  default_tone: "luxury" | "business" | "casual_hospitality"
}

type RecipientRow = {
  id: string
  property_id: string | null
  scope_level: string
  recipient_type: string
  profile_id: string | null
  email: string | null
  include_attachment: boolean
  is_active: boolean
}

// Dialog state types
type OwnershipDialogState = { open: boolean; mode: 'add' | 'edit'; data?: MappingRow }
type NotificationDialogState = { open: boolean; mode: 'add' | 'edit'; data?: EndpointRow }
type ReportDialogState = { open: boolean; mode: 'add' | 'edit'; data?: RecipientRow }

export default function GuestReviewSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Dialog states
  const [ownershipDialog, setOwnershipDialog] = useState<OwnershipDialogState>({ open: false, mode: 'add' })
  const [notificationDialog, setNotificationDialog] = useState<NotificationDialogState>({ open: false, mode: 'add' })
  const [reportDialog, setReportDialog] = useState<ReportDialogState>({ open: false, mode: 'add' })
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; type: 'ownership' | 'notification' | 'report'; id: string }>({ open: false, type: 'ownership', id: '' })

  // Form states
  const [ownershipForm, setOwnershipForm] = useState({
    property_id: '',
    responsibility_code: '',
    primary_profile_id: '',
    backup_profile_id: '',
    is_active: true
  })

  const [notificationForm, setNotificationForm] = useState({
    property_id: '',
    responsibility_code: '',
    scope: 'property',
    channel: 'email',
    label: '',
    recipients: '',
    secret_name: '',
    is_active: true
  })

  const [reportForm, setReportForm] = useState({
    property_id: '',
    scope_level: 'property',
    recipient_type: 'custom',
    profile_id: '',
    email: '',
    include_attachment: true,
    is_active: true
  })

  const propertiesQuery = useQuery({
    queryKey: ["guest-review-settings-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true })
      if (error) throw error
      return ((data ?? []) as PropertyLite[]).filter((row) => isGuestReviewEligiblePropertyId(row.id))
    },
  })

  const profilesQuery = useQuery({
    queryKey: ["guest-review-settings-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").limit(2000)
      if (error) throw error
      return (data ?? []) as ProfileLite[]
    },
  })

  const mappingsQuery = useQuery({
    queryKey: ["guest-review-owner-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_review_owner_mappings")
        .select("id, property_id, responsibility_code, primary_profile_id, backup_profile_id, is_active")
        .neq("property_id", GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID)
        .order("property_id", { ascending: true })
      if (error) throw error
      return (data ?? []) as MappingRow[]
    },
  })

  const endpointsQuery = useQuery({
    queryKey: ["guest-review-notification-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_review_notification_endpoints")
        .select("id, property_id, responsibility_code, scope, channel, label, recipients, secret_name, is_active")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as EndpointRow[]
    },
  })

  const tonesQuery = useQuery({
    queryKey: ["guest-review-property-tones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_review_property_settings")
        .select("id, property_id, default_tone")
        .neq("property_id", GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID)
        .order("property_id", { ascending: true })
      if (error) throw error
      return (data ?? []) as ToneRow[]
    },
  })

  const recipientsQuery = useQuery({
    queryKey: ["guest-review-report-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_review_report_recipients")
        .select("id, property_id, scope_level, recipient_type, email, is_active")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as RecipientRow[]
    },
  })

  const updateToneMutation = useMutation({
    mutationFn: async (payload: { id: string; tone: ToneRow["default_tone"] }) => {
      const { error } = await supabase
        .from("guest_review_property_settings")
        .update({ default_tone: payload.tone, updated_at: new Date().toISOString() })
        .eq("id", payload.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-property-tones"] })
      toast({ title: "Saved", description: "Default tone updated." })
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : String(error), variant: "destructive" })
    },
  })

  // Form validation functions
  const validateOwnershipForm = (data: typeof ownershipForm): string | null => {
    if (!data.property_id) return "Property is required"
    if (!data.responsibility_code) return "Responsibility code is required"
    return null
  }

  const validateNotificationForm = (data: typeof notificationForm): string | null => {
    if (!data.label.trim()) return "Label is required"
    if (!data.recipients.trim()) return "Recipients are required"
    if (data.channel === 'email') {
      const emails = data.recipients.split(',').map(r => r.trim()).filter(Boolean)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = emails.filter(e => !emailRegex.test(e))
      if (invalidEmails.length > 0) {
        return `Invalid email addresses: ${invalidEmails.join(', ')}`
      }
    }
    return null
  }

  // Shared error handler
  const handleMutationError = (error: unknown) => {
    toast({ title: "Error", description: error instanceof Error ? error.message : String(error), variant: "destructive" })
  }

  // Ownership CRUD mutations
  const addOwnershipMutation = useMutation({
    mutationFn: async (data: typeof ownershipForm) => {
      const validationError = validateOwnershipForm(data)
      if (validationError) throw new Error(validationError)
      const { error } = await supabase.from("property_review_owner_mappings").insert({
        property_id: data.property_id,
        responsibility_code: data.responsibility_code,
        primary_profile_id: data.primary_profile_id || null,
        backup_profile_id: data.backup_profile_id || null,
        is_active: data.is_active
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-owner-mappings"] })
      toast({ title: "Added", description: "Owner mapping created successfully." })
      setOwnershipDialog({ open: false, mode: 'add' })
      resetOwnershipForm()
    },
    onError: handleMutationError,
  })

  const updateOwnershipMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof ownershipForm }) => {
      const validationError = validateOwnershipForm(data)
      if (validationError) throw new Error(validationError)
      const { error } = await supabase.from("property_review_owner_mappings").update({
        property_id: data.property_id,
        responsibility_code: data.responsibility_code,
        primary_profile_id: data.primary_profile_id || null,
        backup_profile_id: data.backup_profile_id || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      }).eq("id", id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-owner-mappings"] })
      toast({ title: "Updated", description: "Owner mapping updated successfully." })
      setOwnershipDialog({ open: false, mode: 'add' })
      resetOwnershipForm()
    },
    onError: handleMutationError,
  })

  const deleteOwnershipMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_review_owner_mappings").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-owner-mappings"] })
      toast({ title: "Deleted", description: "Owner mapping removed." })
      setDeleteConfirmDialog({ open: false, type: 'ownership', id: '' })
    },
    onError: handleMutationError,
  })

  // Notification CRUD mutations
  const addNotificationMutation = useMutation({
    mutationFn: async (data: typeof notificationForm) => {
      const validationError = validateNotificationForm(data)
      if (validationError) throw new Error(validationError)
      const { error } = await supabase.from("guest_review_notification_endpoints").insert({
        property_id: data.property_id || null,
        responsibility_code: data.responsibility_code || null,
        scope: data.scope,
        channel: data.channel,
        label: data.label,
        recipients: data.recipients ? data.recipients.split(',').map(r => r.trim()).filter(Boolean) : [],
        secret_name: data.secret_name || null,
        is_active: data.is_active
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-notification-endpoints"] })
      toast({ title: "Added", description: "Notification endpoint created successfully." })
      setNotificationDialog({ open: false, mode: 'add' })
      resetNotificationForm()
    },
    onError: handleMutationError,
  })

  const updateNotificationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof notificationForm }) => {
      const validationError = validateNotificationForm(data)
      if (validationError) throw new Error(validationError)
      const { error } = await supabase.from("guest_review_notification_endpoints").update({
        property_id: data.property_id || null,
        responsibility_code: data.responsibility_code || null,
        scope: data.scope,
        channel: data.channel,
        label: data.label,
        recipients: data.recipients ? data.recipients.split(',').map(r => r.trim()).filter(Boolean) : [],
        secret_name: data.secret_name || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      }).eq("id", id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-notification-endpoints"] })
      toast({ title: "Updated", description: "Notification endpoint updated successfully." })
      setNotificationDialog({ open: false, mode: 'add' })
      resetNotificationForm()
    },
    onError: handleMutationError,
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guest_review_notification_endpoints").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-notification-endpoints"] })
      toast({ title: "Deleted", description: "Notification endpoint removed." })
      setDeleteConfirmDialog({ open: false, type: 'notification', id: '' })
    },
    onError: handleMutationError,
  })

  // Report recipient CRUD mutations
  const addReportMutation = useMutation({
    mutationFn: async (data: typeof reportForm) => {
      const { error } = await supabase.from("guest_review_report_recipients").insert({
        property_id: data.property_id || null,
        scope_level: data.scope_level,
        recipient_type: data.recipient_type,
        profile_id: data.profile_id || null,
        email: data.email || null,
        include_attachment: data.include_attachment,
        is_active: data.is_active
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-report-recipients"] })
      toast({ title: "Added", description: "Report recipient created successfully." })
      setReportDialog({ open: false, mode: 'add' })
      resetReportForm()
    },
    onError: handleMutationError,
  })

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof reportForm }) => {
      const { error } = await supabase.from("guest_review_report_recipients").update({
        property_id: data.property_id || null,
        scope_level: data.scope_level,
        recipient_type: data.recipient_type,
        profile_id: data.profile_id || null,
        email: data.email || null,
        include_attachment: data.include_attachment,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      }).eq("id", id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-report-recipients"] })
      toast({ title: "Updated", description: "Report recipient updated successfully." })
      setReportDialog({ open: false, mode: 'add' })
      resetReportForm()
    },
    onError: handleMutationError,
  })

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guest_review_report_recipients").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guest-review-report-recipients"] })
      toast({ title: "Deleted", description: "Report recipient removed." })
      setDeleteConfirmDialog({ open: false, type: 'report', id: '' })
    },
    onError: handleMutationError,
  })

  // Helper functions
  const resetOwnershipForm = () => {
    setOwnershipForm({
      property_id: '',
      responsibility_code: '',
      primary_profile_id: '',
      backup_profile_id: '',
      is_active: true
    })
  }

  const resetNotificationForm = () => {
    setNotificationForm({
      property_id: '',
      responsibility_code: '',
      scope: 'property',
      channel: 'email',
      label: '',
      recipients: '',
      secret_name: '',
      is_active: true
    })
  }

  const resetReportForm = () => {
    setReportForm({
      property_id: '',
      scope_level: 'property',
      recipient_type: 'custom',
      profile_id: '',
      email: '',
      include_attachment: true,
      is_active: true
    })
  }

  const openEditOwnership = (row: MappingRow) => {
    setOwnershipForm({
      property_id: row.property_id,
      responsibility_code: row.responsibility_code,
      primary_profile_id: row.primary_profile_id || '',
      backup_profile_id: row.backup_profile_id || '',
      is_active: row.is_active
    })
    setOwnershipDialog({ open: true, mode: 'edit', data: row })
  }

  const openEditNotification = (row: EndpointRow) => {
    setNotificationForm({
      property_id: row.property_id ?? '',
      responsibility_code: row.responsibility_code ?? '',
      scope: row.scope,
      channel: row.channel,
      label: row.label,
      recipients: (row.recipients ?? []).join(', '),
      secret_name: row.secret_name ?? '',
      is_active: row.is_active
    })
    setNotificationDialog({ open: true, mode: 'edit', data: row })
  }

  const openEditReport = (row: RecipientRow) => {
    setReportForm({
      property_id: row.property_id ?? '',
      scope_level: row.scope_level,
      recipient_type: row.recipient_type,
      profile_id: row.profile_id ?? '',
      email: row.email ?? '',
      include_attachment: row.include_attachment,
      is_active: row.is_active
    })
    setReportDialog({ open: true, mode: 'edit', data: row })
  }

  const propertyNameById = useMemo(() => 
    new Map((propertiesQuery.data ?? []).map((row) => [row.id, row.name])), 
    [propertiesQuery.data]
  )
  const profileById = useMemo(() => 
    new Map((profilesQuery.data ?? []).map((row) => [row.id, row])), 
    [profilesQuery.data]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Guest Review Settings</h1>
        <p className="text-sm text-muted-foreground">Configure sources, ownership, notifications, tones, and report recipients.</p>
      </div>

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="tones">Tones</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <OTASourceManager />
        </TabsContent>

        <TabsContent value="ownership">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Owner Mapping</CardTitle>
                <CardDescription>Property-to-responsibility owner resolution used by assignment routing.</CardDescription>
              </div>
              <Button onClick={() => { resetOwnershipForm(); setOwnershipDialog({ open: true, mode: 'add' }) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(mappingsQuery.data ?? []).map((row) => {
                const primary = row.primary_profile_id ? profileById.get(row.primary_profile_id) : null
                const backup = row.backup_profile_id ? profileById.get(row.backup_profile_id) : null
                return (
                  <div key={row.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{propertyNameById.get(row.property_id) ?? row.property_id}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.is_active ? "default" : "outline"}>{row.is_active ? "active" : "inactive"}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOwnership(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmDialog({ open: true, type: 'ownership', id: row.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-muted-foreground">{row.responsibility_code.replace(/_/g, " ")}</div>
                    <div>Primary: {primary?.full_name ?? primary?.email ?? row.primary_profile_id ?? "Unassigned"}</div>
                    <div>Backup: {backup?.full_name ?? backup?.email ?? row.backup_profile_id ?? "Unassigned"}</div>
                  </div>
                )
              })}
              {(mappingsQuery.data ?? []).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No owner mappings configured. Click "Add Mapping" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notification Endpoints</CardTitle>
                <CardDescription>Configured delivery endpoints used by the queue worker.</CardDescription>
              </div>
              <Button onClick={() => { resetNotificationForm(); setNotificationDialog({ open: true, mode: 'add' }) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Endpoint
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(endpointsQuery.data ?? [])
                .filter((row) => row.property_id === null || isGuestReviewEligiblePropertyId(row.property_id))
                .map((row) => (
                <div key={row.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{row.label}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.is_active ? "default" : "outline"}>{row.channel}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditNotification(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmDialog({ open: true, type: 'notification', id: row.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {row.scope} | {row.responsibility_code ?? "all responsibilities"}
                  </div>
                  <div>{row.property_id ? (propertyNameById.get(row.property_id) ?? row.property_id) : "Global endpoint"}</div>
                </div>
              ))}
              {(endpointsQuery.data ?? []).filter((row) => row.property_id === null || isGuestReviewEligiblePropertyId(row.property_id)).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No notification endpoints configured. Click "Add Endpoint" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tones">
          <Card>
            <CardHeader>
              <CardTitle>Tone Defaults</CardTitle>
              <CardDescription>Default public reply style per property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(tonesQuery.data ?? []).map((row) => (
                <div key={row.id} className="rounded-lg border p-3 text-sm">
                  <div className="mb-2 font-semibold">{propertyNameById.get(row.property_id) ?? row.property_id}</div>
                  <Select
                    value={row.default_tone}
                    onValueChange={(value: ToneRow["default_tone"]) => updateToneMutation.mutate({ id: row.id, tone: value })}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="luxury">luxury</SelectItem>
                      <SelectItem value="business">business</SelectItem>
                      <SelectItem value="casual_hospitality">casual_hospitality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Report Recipients</CardTitle>
                <CardDescription>Daily executive digest recipient mapping.</CardDescription>
              </div>
              <Button onClick={() => { resetReportForm(); setReportDialog({ open: true, mode: 'add' }) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recipient
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recipientsQuery.data ?? [])
                .filter((row) => row.property_id === null || isGuestReviewEligiblePropertyId(row.property_id))
                .map((row) => (
                <div key={row.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{row.email ?? "Mapped profile recipient"}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.is_active ? "default" : "outline"}>{row.scope_level}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditReport(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmDialog({ open: true, type: 'report', id: row.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-muted-foreground">{row.recipient_type}</div>
                  <div>{row.property_id ? (propertyNameById.get(row.property_id) ?? row.property_id) : "Group-level recipient"}</div>
                </div>
              ))}
              {(recipientsQuery.data ?? []).filter((row) => row.property_id === null || isGuestReviewEligiblePropertyId(row.property_id)).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No report recipients configured. Click "Add Recipient" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ownership Dialog */}
      <Dialog open={ownershipDialog.open} onOpenChange={(open) => { if (!open) setOwnershipDialog({ open: false, mode: 'add' }) }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{ownershipDialog.mode === 'add' ? 'Add Owner Mapping' : 'Edit Owner Mapping'}</DialogTitle>
            <DialogDescription>Assign responsibility owners for review routing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={ownershipForm.property_id || ''} onValueChange={(val) => setOwnershipForm(prev => ({ ...prev, property_id: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {propertiesQuery.data?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsibility Code</Label>
              <Select value={ownershipForm.responsibility_code} onValueChange={(val) => setOwnershipForm(prev => ({ ...prev, responsibility_code: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select responsibility code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_manager">General Manager</SelectItem>
                  <SelectItem value="area_general_manager">Area General Manager</SelectItem>
                  <SelectItem value="corporate_reputation_owner">Corporate Reputation Owner</SelectItem>
                  <SelectItem value="rooms_manager">Rooms Manager</SelectItem>
                  <SelectItem value="housekeeping_manager">Housekeeping Manager</SelectItem>
                  <SelectItem value="fnb_manager">F&B Manager</SelectItem>
                  <SelectItem value="maintenance_manager">Maintenance Manager</SelectItem>
                  <SelectItem value="it_manager">IT Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary Owner</Label>
              <Select value={ownershipForm.primary_profile_id || 'unassigned'} onValueChange={(val) => setOwnershipForm(prev => ({ ...prev, primary_profile_id: val === 'unassigned' ? '' : val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profilesQuery.data?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Backup Owner</Label>
              <Select value={ownershipForm.backup_profile_id || 'unassigned'} onValueChange={(val) => setOwnershipForm(prev => ({ ...prev, backup_profile_id: val === 'unassigned' ? '' : val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select backup owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profilesQuery.data?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ownershipForm.is_active} onCheckedChange={(checked) => setOwnershipForm(prev => ({ ...prev, is_active: checked }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnershipDialog({ open: false, mode: 'add' })}>Cancel</Button>
            <Button 
              onClick={() => {
                if (ownershipDialog.mode === 'add') {
                  addOwnershipMutation.mutate(ownershipForm)
                } else if (ownershipDialog.data) {
                  updateOwnershipMutation.mutate({ id: ownershipDialog.data.id, data: ownershipForm })
                }
              }} 
              disabled={!ownershipForm.property_id || !ownershipForm.responsibility_code || addOwnershipMutation.isPending || updateOwnershipMutation.isPending}
            >
              {(addOwnershipMutation.isPending || updateOwnershipMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ownershipDialog.mode === 'add' ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialog.open} onOpenChange={(open) => { if (!open) setNotificationDialog({ open: false, mode: 'add' }) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{notificationDialog.mode === 'add' ? 'Add Notification Endpoint' : 'Edit Notification Endpoint'}</DialogTitle>
            <DialogDescription>Configure delivery endpoint for review notifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input value={notificationForm.label} onChange={(e) => setNotificationForm(prev => ({ ...prev, label: e.target.value }))} placeholder="e.g., GM Slack Alerts" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel *</Label>
                <Select value={notificationForm.channel} onValueChange={(val) => setNotificationForm(prev => ({ ...prev, channel: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope *</Label>
                <Select value={notificationForm.scope} onValueChange={(val) => setNotificationForm(prev => ({ ...prev, scope: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {notificationForm.scope !== 'global' && (
              <div className="space-y-2">
                <Label>Property (optional)</Label>
                <Select value={notificationForm.property_id || 'all'} onValueChange={(val) => setNotificationForm(prev => ({ ...prev, property_id: val === 'all' ? '' : val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All properties</SelectItem>
                    {propertiesQuery.data?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Responsibility (optional)</Label>
              <Select value={notificationForm.responsibility_code || 'unassigned'} onValueChange={(val) => setNotificationForm(prev => ({ ...prev, responsibility_code: val === 'unassigned' ? '' : val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select responsibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">All responsibilities</SelectItem>
                  <SelectItem value="general_manager">General Manager</SelectItem>
                  <SelectItem value="area_general_manager">Area General Manager</SelectItem>
                  <SelectItem value="corporate_reputation_owner">Corporate Reputation Owner</SelectItem>
                  <SelectItem value="rooms_manager">Rooms Manager</SelectItem>
                  <SelectItem value="housekeeping_manager">Housekeeping Manager</SelectItem>
                  <SelectItem value="fnb_manager">F&B Manager</SelectItem>
                  <SelectItem value="maintenance_manager">Maintenance Manager</SelectItem>
                  <SelectItem value="it_manager">IT Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipients *</Label>
              <Input 
                value={notificationForm.recipients} 
                onChange={(e) => setNotificationForm(prev => ({ ...prev, recipients: e.target.value }))} 
                placeholder={notificationForm.channel === 'email' ? 'email1@example.com, email2@example.com' : notificationForm.channel === 'slack' ? '#channel-name' : '+1234567890'}
              />
              <p className="text-xs text-muted-foreground">
                {notificationForm.channel === 'email' && 'Comma-separated email addresses'}
                {notificationForm.channel === 'slack' && 'Slack channel name (e.g., #reviews) or user ID'}
                {notificationForm.channel === 'whatsapp' && 'WhatsApp numbers with country code'}
                {notificationForm.channel === 'sms' && 'Phone numbers with country code'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Secret Name (for webhooks/auth)</Label>
              <Input 
                value={notificationForm.secret_name} 
                onChange={(e) => setNotificationForm(prev => ({ ...prev, secret_name: e.target.value }))} 
                placeholder="e.g., slack_webhook_secret"
              />
              <p className="text-xs text-muted-foreground">Name of the secret stored in Supabase Vault (for webhook URLs, API keys, etc.)</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={notificationForm.is_active} onCheckedChange={(checked) => setNotificationForm(prev => ({ ...prev, is_active: checked }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialog({ open: false, mode: 'add' })}>Cancel</Button>
            <Button 
              onClick={() => {
                if (notificationDialog.mode === 'add') {
                  addNotificationMutation.mutate(notificationForm)
                } else if (notificationDialog.data) {
                  updateNotificationMutation.mutate({ id: notificationDialog.data.id, data: notificationForm })
                }
              }} 
              disabled={!notificationForm.label || !notificationForm.recipients || addNotificationMutation.isPending || updateNotificationMutation.isPending}
            >
              {(addNotificationMutation.isPending || updateNotificationMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {notificationDialog.mode === 'add' ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Recipient Dialog */}
      <Dialog open={reportDialog.open} onOpenChange={(open) => { if (!open) setReportDialog({ open: false, mode: 'add' }) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{reportDialog.mode === 'add' ? 'Add Report Recipient' : 'Edit Report Recipient'}</DialogTitle>
            <DialogDescription>Configure recipient for daily executive digest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scope Level *</Label>
                <Select value={reportForm.scope_level} onValueChange={(val) => setReportForm(prev => ({ ...prev, scope_level: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipient Type *</Label>
                <Select value={reportForm.recipient_type} onValueChange={(val) => setReportForm(prev => ({ ...prev, recipient_type: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="area_gm">Area GM</SelectItem>
                    <SelectItem value="property_gm">Property GM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {reportForm.scope_level !== 'group' && (
              <div className="space-y-2">
                <Label>Property (optional)</Label>
                <Select value={reportForm.property_id || 'all'} onValueChange={(val) => setReportForm(prev => ({ ...prev, property_id: val === 'all' ? '' : val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All properties</SelectItem>
                    {propertiesQuery.data?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Linked Profile (optional)</Label>
              <Select value={reportForm.profile_id || 'unassigned'} onValueChange={(val) => setReportForm(prev => ({ ...prev, profile_id: val === 'unassigned' ? '' : val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">None (custom email)</SelectItem>
                  {profilesQuery.data?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email ?? p.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Link to a user profile or use custom email below</p>
            </div>
            <div className="space-y-2">
              <Label>Email Address {reportForm.profile_id ? '(optional if profile selected)' : '*'}</Label>
              <Input type="email" value={reportForm.email} onChange={(e) => setReportForm(prev => ({ ...prev, email: e.target.value }))} placeholder="recipient@example.com" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={reportForm.include_attachment} onCheckedChange={(checked) => setReportForm(prev => ({ ...prev, include_attachment: checked }))} />
                <Label>Include Attachment</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={reportForm.is_active} onCheckedChange={(checked) => setReportForm(prev => ({ ...prev, is_active: checked }))} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog({ open: false, mode: 'add' })}>Cancel</Button>
            <Button 
              onClick={() => {
                if (reportDialog.mode === 'add') {
                  addReportMutation.mutate(reportForm)
                } else if (reportDialog.data) {
                  updateReportMutation.mutate({ id: reportDialog.data.id, data: reportForm })
                }
              }} 
              disabled={(!reportForm.email && !reportForm.profile_id) || addReportMutation.isPending || updateReportMutation.isPending}
            >
              {(addReportMutation.isPending || updateReportMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reportDialog.mode === 'add' ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => { if (!open) setDeleteConfirmDialog({ open: false, type: 'ownership', id: '' }) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to delete this {deleteConfirmDialog.type === 'ownership' ? 'owner mapping' : deleteConfirmDialog.type === 'notification' ? 'notification endpoint' : 'report recipient'}? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialog({ open: false, type: 'ownership', id: '' })}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirmDialog.type === 'ownership') {
                  deleteOwnershipMutation.mutate(deleteConfirmDialog.id)
                } else if (deleteConfirmDialog.type === 'notification') {
                  deleteNotificationMutation.mutate(deleteConfirmDialog.id)
                } else {
                  deleteReportMutation.mutate(deleteConfirmDialog.id)
                }
              }}
              disabled={deleteOwnershipMutation.isPending || deleteNotificationMutation.isPending || deleteReportMutation.isPending}
            >
              {(deleteOwnershipMutation.isPending || deleteNotificationMutation.isPending || deleteReportMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
