import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { OTASourceManager } from "@/components/reviews/OTASourceManager"
import { GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID, isGuestReviewEligiblePropertyId } from "@/lib/reviewsScope"

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

type EndpointRow = {
  id: string
  property_id: string | null
  responsibility_code: string | null
  scope: string
  channel: string
  label: string
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
  email: string | null
  is_active: boolean
}

export default function GuestReviewSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

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
        .select("id, property_id, responsibility_code, scope, channel, label, is_active")
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

  const propertyNameById = new Map((propertiesQuery.data ?? []).map((row) => [row.id, row.name]))
  const profileById = new Map((profilesQuery.data ?? []).map((row) => [row.id, row]))

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
            <CardHeader>
              <CardTitle>Owner Mapping</CardTitle>
              <CardDescription>Property-to-responsibility owner resolution used by assignment routing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(mappingsQuery.data ?? []).map((row) => {
                const primary = row.primary_profile_id ? profileById.get(row.primary_profile_id) : null
                const backup = row.backup_profile_id ? profileById.get(row.backup_profile_id) : null
                return (
                  <div key={row.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{propertyNameById.get(row.property_id) ?? row.property_id}</div>
                      <Badge variant={row.is_active ? "default" : "outline"}>{row.is_active ? "active" : "inactive"}</Badge>
                    </div>
                    <div className="text-muted-foreground">{row.responsibility_code.replace(/_/g, " ")}</div>
                    <div>Primary: {primary?.full_name ?? primary?.email ?? row.primary_profile_id ?? "Unassigned"}</div>
                    <div>Backup: {backup?.full_name ?? backup?.email ?? row.backup_profile_id ?? "Unassigned"}</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Endpoints</CardTitle>
              <CardDescription>Configured delivery endpoints used by the queue worker.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(endpointsQuery.data ?? [])
                .filter((row) => row.property_id === null || isGuestReviewEligiblePropertyId(row.property_id))
                .map((row) => (
                <div key={row.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{row.label}</div>
                    <Badge variant={row.is_active ? "default" : "outline"}>{row.channel}</Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {row.scope} | {row.responsibility_code ?? "all responsibilities"}
                  </div>
                  <div>{row.property_id ? (propertyNameById.get(row.property_id) ?? row.property_id) : "Global endpoint"}</div>
                </div>
              ))}
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
            <CardHeader>
              <CardTitle>Report Recipients</CardTitle>
              <CardDescription>Daily executive digest recipient mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recipientsQuery.data ?? [])
                .filter((row) => row.property_id === null || isGuestReviewEligiblePropertyId(row.property_id))
                .map((row) => (
                <div key={row.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{row.email ?? "Mapped profile recipient"}</div>
                    <Badge variant={row.is_active ? "default" : "outline"}>{row.scope_level}</Badge>
                  </div>
                  <div className="text-muted-foreground">{row.recipient_type}</div>
                  <div>{row.property_id ? (propertyNameById.get(row.property_id) ?? row.property_id) : "Group-level recipient"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
