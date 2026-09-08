import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { platformService } from '@/services/platformService'
import { supabase } from '@/lib/supabase'
import { OrgStructureTree } from '@/components/org/OrgStructureTree'
import {
  ArrowLeft,
  Building2,
  Users,
  BookOpen,
  FileText,
  LayoutGrid,
  RefreshCw,
  Sliders,
  Sparkles,
  HardDrive,
  Check,
  Edit,
  Mail,
  Palette,
  Crown,
  Building,
  Globe,
  Image as ImageIcon,
  UserPlus,
  RotateCcw,
  ShieldCheck,
  Search,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import { TenantEmailPreviewModal } from '@/components/admin/TenantEmailPreviewModal'
import { AITenantEmailBrandCopilotModal } from '@/components/admin/AITenantEmailBrandCopilotModal'
import type { AIEmailBrandSuggestions } from '@/components/admin/AITenantEmailBrandCopilotModal'

const LIFECYCLE = ['prospect', 'trial', 'onboarding', 'active', 'renewal', 'suspended', 'archived']

export default function OrganizationProfile() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const account = useAccountContext()
  const qc = useQueryClient()

  // Status mutation state
  const [status, setStatus] = useState('')
  const [reason, setReason] = useState('')

  // Admin Designation Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedAdminRole, setSelectedAdminRole] = useState<'organization_admin' | 'organization_owner'>('organization_admin')

  // User candidate search query for admin designation
  const { data: candidateUsers = [], isLoading: isSearchingCandidates } = useQuery({
    queryKey: ['platform-admin-candidates', adminSearchQuery],
    queryFn: async () => {
      if (!adminSearchQuery.trim() || adminSearchQuery.trim().length < 2) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${adminSearchQuery}%,email.ilike.%${adminSearchQuery}%`)
        .limit(8)
      if (error) throw error
      return (data || []) as Array<{ id: string; full_name: string; email: string }>
    },
    enabled: isAdminModalOpen && adminSearchQuery.trim().length >= 2,
  })

  // Membership mutation (designate / change role / revoke)
  const membershipMutation = useMutation({
    mutationFn: (params: {
      userId: string
      role: string
      active?: boolean
    }) => platformService.setTenantMembership({
      orgId: id,
      userId: params.userId,
      role: params.role,
      active: params.active ?? true,
    }),
    onSuccess: (_, vars) => {
      toast({
        title: vars.active === false ? 'Administrator access revoked' : 'Tenant administrator updated',
        description: vars.active === false ? 'The user has been removed from organization administration.' : `Assigned role ${vars.role}.`
      })
      setIsAdminModalOpen(false)
      setSelectedUserId('')
      setAdminSearchQuery('')
      qc.invalidateQueries({ queryKey: ['org-profile', id] })
    },
    onError: (err: any) => {
      toast({
        title: 'Membership operation failed',
        description: err.message,
        variant: 'destructive',
      })
    }
  })

  // Feature Matrix Query
  const { data: featureMatrix, isLoading: isFeaturesLoading } = useQuery({
    queryKey: ['platform-feature-matrix'],
    queryFn: () => platformService.getFeatureMatrix(),
  })

  // Find this tenant's feature map
  const orgFeatureData = useMemo(() => {
    return featureMatrix?.organizations?.find(o => o.id === id)
  }, [featureMatrix, id])

  // Feature override mutation
  const setOverrideMutation = useMutation({
    mutationFn: (params: { key: string; enabled: boolean }) =>
      platformService.setOrgFeatureOverride(id, params.key, params.enabled, 'Configured via platform org profile'),
    onSuccess: (_, vars) => {
      toast({
        title: 'Tenant feature override saved',
        description: `Feature ${vars.key} is now ${vars.enabled ? 'explicitly enabled' : 'explicitly disabled'} for this tenant.`,
      })
      qc.invalidateQueries({ queryKey: ['platform-feature-matrix'] })
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to set feature override',
        description: err.message,
        variant: 'destructive',
      })
    }
  })

  // Clear override mutation
  const clearOverrideMutation = useMutation({
    mutationFn: (key: string) => platformService.clearOrgFeatureOverride(id, key),
    onSuccess: (_, key) => {
      toast({
        title: 'Feature override cleared',
        description: `Feature ${key} reverted to default subscription plan entitlement.`,
      })
      qc.invalidateQueries({ queryKey: ['platform-feature-matrix'] })
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to reset feature override',
        description: err.message,
        variant: 'destructive',
      })
    }
  })

  // Edit Entitlements Modal State
  const [isEntOpen, setIsEntOpen] = useState(false)
  const [editMaxHotels, setEditMaxHotels] = useState<number>(10)
  const [editMaxLearners, setEditMaxLearners] = useState<number>(100)
  const [editMaxStorage, setEditMaxStorage] = useState<number>(50)
  const [editMaxAiCredits, setEditMaxAiCredits] = useState<number>(1000)
  const [editPlanId, setEditPlanId] = useState<string>('')
  const [editBillingEmail, setEditBillingEmail] = useState<string>('')

  // Edit Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNameAr, setEditNameAr] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editIndustry, setEditIndustry] = useState('')
  const [editLogoUrl, setEditLogoUrl] = useState('')
  const [editFaviconUrl, setEditFaviconUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0f172a')
  const [secondaryColor, setSecondaryColor] = useState('#2563eb')
  const [accentColor, setAccentColor] = useState('#d97706')

  // Email branding states
  const [editSenderName, setEditSenderName] = useState('')
  const [editReplyTo, setEditReplyTo] = useState('')
  const [editSupportEmail, setEditSupportEmail] = useState('')
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('')
  const [editFooterText, setEditFooterText] = useState('')
  const [editFooterTextAr, setEditFooterTextAr] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['org-profile', id],
    queryFn: () => platformService.getOrganizationProfile(id),
    enabled: !!id,
  })

  const { data: structure } = useQuery({
    queryKey: ['org-structure', id],
    queryFn: () => platformService.getOrgStructure(id),
    enabled: !!id,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['platform-subscription-plans'],
    queryFn: () => platformService.getSubscriptionPlans(),
  })

  const statusMutation = useMutation({
    mutationFn: () => platformService.setOrganizationStatus(id, status, reason || undefined),
    onSuccess: () => {
      toast({ title: 'Organization status updated' })
      setReason('')
      qc.invalidateQueries({ queryKey: ['org-profile', id] })
      qc.invalidateQueries({ queryKey: ['platform-executive-stats'] })
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  })

  const entMutation = useMutation({
    mutationFn: (params: {
      maxHotels?: number
      maxLearners?: number
      maxStorageGb?: number
      maxAiCreditsMonthly?: number
      billingEmail?: string
      planId?: string
    }) => platformService.updateOrganizationEntitlements(id, { ...params, actorId: user?.id }),
    onSuccess: () => {
      toast({ title: 'Entitlements and quota limits updated' })
      setIsEntOpen(false)
      qc.invalidateQueries({ queryKey: ['org-profile', id] })
      qc.invalidateQueries({ queryKey: ['platform-executive-stats'] })
    },
    onError: (e: any) => toast({ title: 'Entitlements update failed', description: e.message, variant: 'destructive' }),
  })

  const detailsMutation = useMutation({
    mutationFn: (params: {
      name?: string
      nameAr?: string
      slug?: string
      industry?: string
      logoUrl?: string
      faviconUrl?: string
      brandColors?: { primary?: string; secondary?: string; accent?: string }
      emailSenderName?: string
      emailReplyTo?: string
      supportEmail?: string
      websiteUrl?: string
      emailFooterText?: string
      emailFooterTextAr?: string
    }) => platformService.updateOrganizationDetails(id, { ...params, actorId: user?.id }),
    onSuccess: () => {
      toast({ title: 'Organization details updated' })
      setIsDetailsOpen(false)
      qc.invalidateQueries({ queryKey: ['org-profile', id] })
      qc.invalidateQueries({ queryKey: ['platform-executive-stats'] })
    },
    onError: (e: any) => toast({ title: 'Details update failed', description: e.message, variant: 'destructive' }),
  })

  const org = profile?.organization
  const ent = profile?.entitlements
  const counts = profile?.counts
  const canManage = account.can('tenant.manage')
  const needsReason = status === 'suspended' || status === 'archived'

  const currentStatus = useMemo(() => org?.lifecycle_status ?? 'active', [org])

  const openEntitlementsModal = () => {
    if (!org) return
    setEditMaxHotels(org.max_hotels ?? ent?.max_hotels ?? 10)
    setEditMaxLearners(org.max_learners ?? ent?.max_learners ?? 100)
    setEditMaxStorage(org.max_storage_gb ?? 50)
    setEditMaxAiCredits(org.max_ai_credits_monthly ?? 1000)
    setEditBillingEmail(org.billing_email || '')
    // Find matching plan
    const curPlan = plans.find(p => p.code === ent?.plan || p.name.toLowerCase() === (ent?.plan || '').toLowerCase())
    setEditPlanId(curPlan?.id || '')
    setIsEntOpen(true)
  }

  const openDetailsModal = () => {
    if (!org) return
    setEditName(org.name || '')
    setEditNameAr(org.name_ar || '')
    setEditSlug(org.slug || '')
    setEditIndustry(org.industry || 'hospitality')
    setEditLogoUrl(org.logo_url || '')
    setEditFaviconUrl(org.favicon_url || '')
    setPrimaryColor(org.brand_colors?.primary || '#0f172a')
    setSecondaryColor(org.brand_colors?.secondary || '#2563eb')
    setAccentColor(org.brand_colors?.accent || '#d97706')
    setEditSenderName(org.email_sender_name || '')
    setEditReplyTo(org.email_reply_to || '')
    setEditSupportEmail(org.support_email || '')
    setEditWebsiteUrl(org.website_url || '')
    setEditFooterText(org.email_footer_text || '')
    setEditFooterTextAr(org.email_footer_text_ar || '')
    setIsDetailsOpen(true)
  }

  if (isLoading) return <div className="py-16 text-center"><RefreshCw className="h-5 w-5 animate-spin mx-auto" /></div>
  if (!org) return <div className="py-16 text-center text-sm text-muted-foreground">Organization not found.</div>

  const maxH = org.max_hotels ?? ent?.max_hotels ?? 10
  const maxL = org.max_learners ?? ent?.max_learners ?? 100
  const maxStorage = org.max_storage_gb ?? 50
  const maxAi = org.max_ai_credits_monthly ?? 1000
  const hotelPct = Math.min(100, Math.round(((counts?.hotels || 0) / maxH) * 100))
  const memberPct = Math.min(100, Math.round(((counts?.members || 0) / maxL) * 100))

  const handleApplyAISuggestions = (sug: AIEmailBrandSuggestions) => {
    setEditSenderName(sug.emailSenderName)
    setEditReplyTo(sug.emailReplyTo)
    setSupportEmail(sug.supportEmail)
    setWebsiteUrl(sug.websiteUrl)
    setEditFooterText(sug.emailFooterText)
    setEditFooterTextAr(sug.emailFooterTextAr)
    setPrimaryColor(sug.brandColors.primary)
    setSecondaryColor(sug.brandColors.secondary)
    setAccentColor(sug.brandColors.accent)

    detailsMutation.mutate({
      name: org?.name || '',
      nameAr: org?.name_ar || undefined,
      slug: org?.slug || '',
      industry: org?.industry || undefined,
      logoUrl: org?.logo_url || undefined,
      brandColors: sug.brandColors,
      emailSenderName: sug.emailSenderName,
      emailReplyTo: sug.emailReplyTo,
      supportEmail: sug.supportEmail,
      websiteUrl: sug.websiteUrl,
      emailFooterText: sug.emailFooterText,
      emailFooterTextAr: sug.emailFooterTextAr,
    })
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/platform/organizations')} className="text-xs">
          <ArrowLeft className="h-3.5 w-3.5 me-1.5" /> All organizations
        </Button>
        <div className="flex items-center gap-2">
          {canManage && (
            <AITenantEmailBrandCopilotModal
              orgName={org.name}
              orgNameAr={org.name_ar || undefined}
              slug={org.slug || undefined}
              industry={org.industry || undefined}
              currentPrimaryColor={org.brand_colors?.primary || '#0f172a'}
              currentSecondaryColor={org.brand_colors?.secondary || '#2563eb'}
              currentAccentColor={org.brand_colors?.accent || '#d97706'}
              onApply={handleApplyAISuggestions}
            />
          )}
          <TenantEmailPreviewModal
            orgName={org.name}
            orgNameAr={org.name_ar || undefined}
            logoUrl={org.logo_url || undefined}
            primaryColor={org.brand_colors?.primary || '#0f172a'}
            secondaryColor={org.brand_colors?.secondary || '#2563eb'}
            accentColor={org.brand_colors?.accent || '#d97706'}
            senderName={org.email_sender_name || undefined}
            replyTo={org.email_reply_to || undefined}
            supportEmail={org.support_email || undefined}
            websiteUrl={org.website_url || undefined}
            footerText={org.email_footer_text || undefined}
            footerTextAr={org.email_footer_text_ar || undefined}
          />
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={openDetailsModal} className="text-xs h-8">
                <Edit className="h-3.5 w-3.5 me-1.5" /> Edit Details
              </Button>
              <Button size="sm" onClick={openEntitlementsModal} className="text-xs h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold">
                <Sliders className="h-3.5 w-3.5 me-1.5" /> Edit Plan & Quotas
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl text-white font-bold text-lg shadow-sm border shrink-0"
            style={{ backgroundColor: org.brand_colors?.primary || '#0f172a' }}
          >
            {org.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {org.name}
              <Badge variant="outline" className="capitalize text-[10px] font-semibold">{currentStatus}</Badge>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase bg-primary/5 text-primary border-primary/20">
                {ent?.plan ?? 'Enterprise'}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {org.name_ar && <span className="font-arabic me-2 font-medium">{org.name_ar} · </span>}
              <span className="font-mono">{org.slug}</span> · Created {new Date(org.created_at).toLocaleDateString()}
              {org.billing_email && ` · ${org.billing_email}`}
            </p>
          </div>
        </div>
      </div>

      {/* Key Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Brands', value: counts?.brands ?? 0, icon: LayoutGrid, hint: 'Hotel brands' },
          { label: 'Hotels', value: `${counts?.hotels ?? 0} / ${maxH}`, icon: Building2, hint: `${hotelPct}% utilized` },
          { label: 'Departments', value: counts?.departments ?? 0, icon: LayoutGrid, hint: 'Across properties' },
          { label: 'Learners', value: `${counts?.members ?? 0} / ${maxL}`, icon: Users, hint: `${memberPct}% seats used` },
          { label: 'Courses', value: counts?.courses ?? 0, icon: BookOpen, hint: 'LMS curriculum' },
          { label: 'Documents', value: counts?.documents ?? 0, icon: FileText, hint: 'Knowledge SOPs' },
        ].map((c) => (
          <Card key={c.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide">{c.label}</span>
                <c.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-lg font-black tabular-nums">{c.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quota & Resource Entitlements Card */}
      <Card className="border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Subscription Plan & Resource Entitlements
              </CardTitle>
              <CardDescription className="text-xs">
                Allocated runtime capacities, database triggers, and quota enforcement limits.
              </CardDescription>
            </div>
            {canManage && (
              <Button size="sm" variant="outline" onClick={openEntitlementsModal} className="text-xs h-8">
                Modify Quotas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Hotels Quota */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Building className="h-3.5 w-3.5 text-blue-500" />
                  Hotels Quota
                </span>
                <span className="font-mono">{counts?.hotels ?? 0} / {maxH}</span>
              </div>
              <Progress
                value={hotelPct}
                className="h-2 bg-muted"
                indicatorClassName={hotelPct > 90 ? 'bg-rose-500' : hotelPct > 70 ? 'bg-amber-500' : 'bg-blue-600'}
              />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>{hotelPct}% consumed</span>
                <span>{Math.max(0, maxH - (counts?.hotels ?? 0))} remaining</span>
              </div>
            </div>

            {/* Learner Seats */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  Learner Seats
                </span>
                <span className="font-mono">{counts?.members ?? 0} / {maxL}</span>
              </div>
              <Progress
                value={memberPct}
                className="h-2 bg-muted"
                indicatorClassName={memberPct > 90 ? 'bg-rose-500' : memberPct > 70 ? 'bg-amber-500' : 'bg-indigo-600'}
              />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>{memberPct}% provisioned</span>
                <span>{Math.max(0, maxL - (counts?.members ?? 0))} seats free</span>
              </div>
            </div>

            {/* Storage Quota */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                  Document Storage
                </span>
                <span className="font-mono">{maxStorage} GB</span>
              </div>
              <Progress value={20} className="h-2 bg-muted" indicatorClassName="bg-emerald-600" />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Standard cloud tier</span>
                <span>Supabase S3</span>
              </div>
            </div>

            {/* AI Credits */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Monthly AI Credits
                </span>
                <span className="font-mono">{maxAi} / mo</span>
              </div>
              <Progress value={15} className="h-2 bg-muted" indicatorClassName="bg-purple-600" />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Auto-resets monthly</span>
                <span>AI Course & SOP Gen</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border shadow-sm lg:col-span-1">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold">Lifecycle Management</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lifecycle State</Label>
              <Select value={status || currentStatus} onValueChange={setStatus}>
                <SelectTrigger className="h-9" disabled={!canManage}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {needsReason && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-destructive">Suspension / Archive Reason</Label>
                <Input
                  placeholder="Reason (required, min 5 chars)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <Button
              size="sm"
              className="w-full text-xs font-semibold"
              disabled={!canManage || statusMutation.isPending || !status || status === currentStatus || (needsReason && reason.trim().length < 5)}
              onClick={() => statusMutation.mutate()}
            >
              {statusMutation.isPending ? 'Updating…' : 'Apply Status Change'}
            </Button>

            {currentStatus === 'suspended' && org.suspension_reason && (
              <div className="text-[11px] text-rose-600 p-2 rounded-lg bg-rose-50 border border-rose-200">
                <strong>Suspended:</strong> {org.suspension_reason}
              </div>
            )}

            {(profile?.lifecycle_history || []).length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lifecycle Audit Trail</div>
                {profile.lifecycle_history.slice(0, 5).map((h: any, i: number) => (
                  <div key={i} className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{h.metadata?.from || 'created'} → <strong>{h.metadata?.to}</strong></span>
                    <span>{new Date(h.at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <OrgStructureTree orgId={id} />

          {/* Tenant Administrators & Executives */}
          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Tenant Administrators & Key Personnel
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Designated personnel with owner or administrative authority over this organization.
                  </CardDescription>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUserId('')
                      setAdminSearchQuery('')
                      setIsAdminModalOpen(true)
                    }}
                    className="text-xs h-8 gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                    Designate Administrator
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-2.5">
              {(profile?.primary_contacts || []).length === 0 ? (
                <div className="p-4 text-center border rounded-xl bg-muted/20 text-xs text-muted-foreground">
                  No tenant administrators designated yet. Use "Designate Administrator" to assign an organization owner or administrator.
                </div>
              ) : (
                profile.primary_contacts.map((c: any) => {
                  const isOwner = c.role === 'organization_owner'
                  return (
                    <div key={c.user_id} className="text-xs flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-muted/30 border gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isOwner ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                          {isOwner ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {c.name || 'Unnamed User'}
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold capitalize ${
                                isOwner
                                  ? 'border-amber-400/40 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                  : 'border-blue-400/40 text-blue-700 dark:text-blue-300 bg-blue-500/10'
                              }`}
                            >
                              {isOwner ? 'Tenant Owner' : 'Tenant Administrator'}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-[11px] font-mono mt-0.5">{c.email}</div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={c.role}
                            onValueChange={(newRole) => {
                              membershipMutation.mutate({
                                userId: c.user_id,
                                role: newRole,
                                active: true,
                              })
                            }}
                            disabled={membershipMutation.isPending}
                          >
                            <SelectTrigger className="h-7 text-xs w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="organization_admin">Tenant Admin</SelectItem>
                              <SelectItem value="organization_owner">Tenant Owner</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                            title="Revoke Administrator Access"
                            disabled={membershipMutation.isPending}
                            onClick={() => {
                              if (confirm(`Revoke administrative access for ${c.name || c.email}?`)) {
                                membershipMutation.mutate({
                                  userId: c.user_id,
                                  role: 'learner',
                                  active: false,
                                })
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Flags & Module Entitlements Card */}
      <Card className="border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Feature Flags & Module Entitlements
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Manage feature availability for <strong>{org.name}</strong>. Toggle per-tenant overrides to enable or disable modules beyond standard subscription plans.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => qc.invalidateQueries({ queryKey: ['platform-feature-matrix'] })}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFeaturesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {isFeaturesLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
              Loading feature configuration…
            </div>
          ) : !featureMatrix?.flags?.length ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No feature flags catalogued in the platform.
            </div>
          ) : (
            <div className="divide-y rounded-xl border overflow-hidden">
              {featureMatrix.flags.map((flag) => {
                const orgFeature = orgFeatureData?.features?.[flag.key]
                const isEffective = orgFeature?.effective ?? flag.default_enabled
                const overrideVal = orgFeature?.override ?? null
                const hasOverride = overrideVal !== null
                const isMutating = setOverrideMutation.isPending || clearOverrideMutation.isPending

                return (
                  <div key={flag.key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{flag.label}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider py-0 px-1.5 bg-muted/30">
                          {flag.category}
                        </Badge>
                        {hasOverride ? (
                          <Badge
                            className={`text-[10px] font-semibold py-0 px-1.5 ${
                              overrideVal
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            }`}
                            variant="outline"
                          >
                            Override: {overrideVal ? 'Forced On' : 'Forced Off'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                            Plan Default: {flag.default_enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {flag.description || `Key: ${flag.key}`}
                        {flag.min_plan_code && (
                          <span className="ms-1.5 font-mono text-[10px]">· Requires plan: {flag.min_plan_code}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isEffective}
                          disabled={!canManage || isMutating}
                          onCheckedChange={(checked) => {
                            setOverrideMutation.mutate({ key: flag.key, enabled: checked })
                          }}
                        />
                        <span className="text-xs font-medium w-14 text-end">
                          {isEffective ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Enabled</span>
                          ) : (
                            <span className="text-muted-foreground">Disabled</span>
                          )}
                        </span>
                      </div>

                      {hasOverride && canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground gap-1"
                          title="Clear tenant override and revert to plan default"
                          disabled={isMutating}
                          onClick={() => clearOverrideMutation.mutate(flag.key)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span className="hidden sm:inline">Reset</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDIT ENTITLEMENTS DIALOG */}
      <Dialog open={isEntOpen} onOpenChange={setIsEntOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sliders className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Edit Entitlements & Plan</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Adjust resource limits and subscription tiers for <strong>{org.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subscription Plan</Label>
              <Select value={editPlanId} onValueChange={setEditPlanId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Subscription Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.max_hotels} hotels, {p.max_users} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max Hotels Quota</Label>
                <Input
                  type="number"
                  min={1}
                  value={editMaxHotels}
                  onChange={(e) => setEditMaxHotels(parseInt(e.target.value) || 1)}
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max Learner Seats</Label>
                <Input
                  type="number"
                  min={5}
                  value={editMaxLearners}
                  onChange={(e) => setEditMaxLearners(parseInt(e.target.value) || 5)}
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Storage Quota (GB)</Label>
                <Input
                  type="number"
                  min={5}
                  value={editMaxStorage}
                  onChange={(e) => setEditMaxStorage(parseInt(e.target.value) || 5)}
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Monthly AI Credits</Label>
                <Input
                  type="number"
                  min={0}
                  step={250}
                  value={editMaxAiCredits}
                  onChange={(e) => setEditMaxAiCredits(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Billing & Finance Email</Label>
              <Input
                type="email"
                value={editBillingEmail}
                onChange={(e) => setEditBillingEmail(e.target.value)}
                placeholder="billing@hotelgroup.com"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsEntOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={entMutation.isPending}
              onClick={() => entMutation.mutate({
                maxHotels: Number(editMaxHotels),
                maxLearners: Number(editMaxLearners),
                maxStorageGb: Number(editMaxStorage),
                maxAiCreditsMonthly: Number(editMaxAiCredits),
                billingEmail: editBillingEmail || undefined,
                planId: editPlanId || undefined,
              })}
              className="text-xs font-semibold"
            >
              {entMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin me-1.5" /> : <Check className="h-4 w-4 me-1.5" />}
              Save Quotas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DETAILS DIALOG */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Edit className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Edit Organization Details</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Update branding, bilingual names, and industry category for this tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Name (English)</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Name (Arabic)</Label>
                <Input
                  value={editNameAr}
                  onChange={(e) => setEditNameAr(e.target.value)}
                  dir="rtl"
                  className="h-9 text-xs font-arabic"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tenant Slug</Label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Industry Sector</Label>
                <Select value={editIndustry} onValueChange={setEditIndustry}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospitality">Hospitality & Hotels</SelectItem>
                    <SelectItem value="resorts">Luxury Resorts & Leisure</SelectItem>
                    <SelectItem value="tourism">Tourism & Heritage</SelectItem>
                    <SelectItem value="facilities">Facility & Property Operations</SelectItem>
                    <SelectItem value="dining">Food & Beverage / Catering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Logo URL (PNG/SVG)
                </Label>
                <Input
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Favicon URL
                </Label>
                <Input
                  value={editFaviconUrl}
                  onChange={(e) => setEditFaviconUrl(e.target.value)}
                  placeholder="https://.../favicon.ico"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold">Brand Theme Colors</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 w-8 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-8 w-8 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-8 w-8 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Email & Outbound Communication Branding */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-xs">
                <Mail className="h-4 w-4" />
                <span>Outbound Email Sender & Footers</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Sender Display Name</Label>
                  <Input
                    value={editSenderName}
                    onChange={(e) => setEditSenderName(e.target.value)}
                    placeholder="e.g. Royal Palace Hospitality"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Reply-To Email</Label>
                  <Input
                    value={editReplyTo}
                    onChange={(e) => setEditReplyTo(e.target.value)}
                    placeholder="e.g. guestcare@royalpalace.com"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Support & Help Email</Label>
                  <Input
                    value={editSupportEmail}
                    onChange={(e) => setEditSupportEmail(e.target.value)}
                    placeholder="e.g. support@royalpalace.com"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Website URL</Label>
                  <Input
                    value={editWebsiteUrl}
                    onChange={(e) => setEditWebsiteUrl(e.target.value)}
                    placeholder="https://www.royalpalace.com"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Email Footer (English)</Label>
                  <Input
                    value={editFooterText}
                    onChange={(e) => setEditFooterText(e.target.value)}
                    placeholder="e.g. All rights reserved."
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Email Footer (Arabic)</Label>
                  <Input
                    value={editFooterTextAr}
                    onChange={(e) => setEditFooterTextAr(e.target.value)}
                    dir="rtl"
                    placeholder="مثال: جميع الحقوق محفوظة."
                    className="h-8 text-xs font-arabic"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={detailsMutation.isPending || !editName.trim() || !editSlug.trim()}
              onClick={() => detailsMutation.mutate({
                name: editName,
                nameAr: editNameAr || undefined,
                slug: editSlug,
                industry: editIndustry || undefined,
                logoUrl: editLogoUrl || undefined,
                faviconUrl: editFaviconUrl || undefined,
                brandColors: {
                  primary: primaryColor,
                  secondary: secondaryColor,
                  accent: accentColor,
                },
                emailSenderName: editSenderName || undefined,
                emailReplyTo: editReplyTo || undefined,
                supportEmail: editSupportEmail || undefined,
                websiteUrl: editWebsiteUrl || undefined,
                emailFooterText: editFooterText || undefined,
                emailFooterTextAr: editFooterTextAr || undefined,
              })}
              className="text-xs font-semibold"
            >
              {detailsMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin me-1.5" /> : <Check className="h-4 w-4 me-1.5" />}
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DESIGNATE TENANT ADMINISTRATOR DIALOG */}
      <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <UserPlus className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Designate Tenant Administrator</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Assign an executive or administrator to manage <strong>{org.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Find User Profile</Label>
              <div className="relative">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Search by name or email (min 2 chars)..."
                  className="ps-8 h-9 text-xs"
                />
              </div>
            </div>

            {isSearchingCandidates && (
              <div className="py-3 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin mx-auto mb-1" />
                Searching users…
              </div>
            )}

            {!isSearchingCandidates && candidateUsers.length > 0 && (
              <div className="space-y-1 max-h-[180px] overflow-y-auto border rounded-lg p-1.5">
                <div className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 uppercase tracking-wider">
                  Select User
                </div>
                {candidateUsers.map((u) => {
                  const isSelected = selectedUserId === u.id
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`p-2 rounded-md text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted/60 text-foreground'
                      }`}
                    >
                      <div>
                        <div>{u.full_name || 'Unnamed Profile'}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {u.email}
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                  )
                })}
              </div>
            )}

            {!isSearchingCandidates && adminSearchQuery.trim().length >= 2 && candidateUsers.length === 0 && (
              <div className="p-3 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                No user profiles found matching "{adminSearchQuery}".
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs font-semibold">Administrative Role</Label>
              <Select
                value={selectedAdminRole}
                onValueChange={(val: any) => setSelectedAdminRole(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization_admin">
                    Tenant Administrator (Operational management)
                  </SelectItem>
                  <SelectItem value="organization_owner">
                    Tenant Owner (Full corporate executive control)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsAdminModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedUserId || membershipMutation.isPending}
              onClick={() => {
                membershipMutation.mutate({
                  userId: selectedUserId,
                  role: selectedAdminRole,
                  active: true,
                })
              }}
              className="text-xs font-semibold"
            >
              {membershipMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin me-1.5" />
              ) : (
                <ShieldCheck className="h-4 w-4 me-1.5" />
              )}
              Assign Administrator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

