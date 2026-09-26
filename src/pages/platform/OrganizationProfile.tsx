import { WorkspaceHeader, headerActionClass } from '@/ui'
import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ensureReadableOnWhiteText } from '@/lib/colorContrast'
import { OrgStructureTree } from '@/components/org/OrgStructureTree'
import {
  ArrowLeft,
  RefreshCw,
  Sliders,
  Check,
  Edit,
  Mail,
  Crown,
  Globe,
  UserPlus,
  RotateCcw,
  ShieldCheck,
  Search,
  Trash2,
  SlidersHorizontal,
  Upload,
  Loader2,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { TenantEmailPreviewModal } from '@/components/admin/TenantEmailPreviewModal'
import { AITenantEmailBrandCopilotModal } from '@/components/admin/AITenantEmailBrandCopilotModal'
import type { AIEmailBrandSuggestions } from '@/components/admin/AITenantEmailBrandCopilotModal'

const LIFECYCLE = ['prospect', 'trial', 'onboarding', 'active', 'renewal', 'suspended', 'archived']

export default function OrganizationProfile() {
  const { id = '' } = useParams()
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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const faviconFileInputRef = useRef<HTMLInputElement>(null)

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
      brandColors?: { primary: string; secondary: string; accent?: string }
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

  // Real file uploads for the tenant's logo/favicon, following the same pattern as
  // avatar uploads elsewhere (MyProfile.tsx): upload to a public storage bucket,
  // then store the resulting public URL. Previously these were plain text inputs —
  // an admin had to already have the image hosted somewhere else and paste a link.
  const uploadOrgImage = async (file: File, kind: 'logo' | 'favicon') => {
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingFavicon
    const setUrl = kind === 'logo' ? setEditLogoUrl : setEditFaviconUrl
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop() || (kind === 'favicon' ? 'ico' : 'png')
      // Org UUID must be the first path segment — the "media" bucket's storage RLS
      // grants org-scoped upload access by matching (storage.foldername(name))[1]
      // against the uploader's organization id (platform operators bypass this via
      // is_platform_operator(), but tenant-side admins rely on this exact shape).
      const filePath = `${id}/org-branding/${kind}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      // eslint-disable-next-line no-restricted-properties -- 'media' is a public bucket (verified live); a durable public URL is intended here.
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath)
      setUrl(urlData.publicUrl)
      toast({ title: kind === 'logo' ? 'Logo uploaded' : 'Favicon uploaded' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const org = profile?.organization
  const ent = profile?.entitlements
  const counts = profile?.counts
  const canManage = account.can('tenant.manage')
  const needsReason = status === 'suspended' || status === 'archived'

  const currentStatus = useMemo(() => org?.lifecycle_status ?? 'active', [org])
  // Same guard the real header applies — see Header.tsx / lib/colorContrast.ts.
  const readablePrimaryColor = useMemo(() => ensureReadableOnWhiteText(primaryColor), [primaryColor])

  const openEntitlementsModal = () => {
    if (!org) return
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

  // Limits are only what the organization or its plan actually sets - no
  // invented defaults. A missing limit means "unlimited".
  const maxL = org.max_learners ?? ent?.max_learners ?? null
  const maxStorage = org.max_storage_gb ?? null
  const maxAi = org.max_ai_credits_monthly ?? null
  // org.ai_credits_used_this_month is a real column; there is no per-org storage
  // usage figure in the schema, so storage shows its limit only.
  const aiCreditsUsed = org.ai_credits_used_this_month ?? 0
  const usageRows: { label: string; used: number; limit: number | null; unit?: string; note?: string; untracked?: boolean }[] = [
    { label: 'Learners', used: counts?.members ?? 0, limit: maxL },
    { label: 'AI credits this month', used: aiCreditsUsed, limit: maxAi },
    { label: 'Document storage', used: 0, limit: null, untracked: true,
      note: maxStorage ? `${maxStorage} GB limit · usage is not tracked yet` : 'No limit set · usage is not tracked yet' },
    { label: 'Brands', used: counts?.brands ?? 0, limit: null, note: '' },
    { label: 'Departments', used: counts?.departments ?? 0, limit: null, note: '' },
    { label: 'Courses', used: counts?.courses ?? 0, limit: null, note: '' },
    { label: 'Knowledge articles', used: counts?.documents ?? 0, limit: null, note: '' },
  ]

  const handleApplyAISuggestions = (sug: AIEmailBrandSuggestions) => {
    setEditSenderName(sug.emailSenderName)
    setEditReplyTo(sug.emailReplyTo)
    setEditSupportEmail(sug.supportEmail)
    setEditWebsiteUrl(sug.websiteUrl)
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
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <Link to="/platform/organizations" className="inline-flex min-h-[40px] items-center gap-1.5 text-sm text-ds-muted hover:text-ds-ink">
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" /> All organizations
      </Link>

      <WorkspaceHeader
        eyebrow="Organization"
        title={org.name}
        context={[
          currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1),
          ent?.plan ? `${ent.plan} plan` : 'No plan',
          org.slug,
          `created ${new Date(org.created_at).toLocaleDateString()}`,
          org.billing_email,
        ].filter(Boolean).join(' · ')}
        actions={
          <>
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
                <button type="button" onClick={openDetailsModal} className={headerActionClass.secondary}>
                  <Edit aria-hidden="true" className="h-4 w-4" /> Edit details
                </button>
                <button type="button" onClick={openEntitlementsModal} className={headerActionClass.primary}>
                  <Sliders aria-hidden="true" className="h-4 w-4" /> Plan & limits
                </button>
              </>
            )}
          </>
        }
      />

      {org.name_ar && <p className="-mt-4 font-arabic text-sm text-ds-muted" dir="rtl">{org.name_ar}</p>}

      <section aria-labelledby="org-usage" className="space-y-3">
        <div>
          <h2 id="org-usage" className="text-lg font-semibold text-ds-ink">Usage against plan</h2>
          <p className="text-sm text-ds-muted">Limits come from the organization or its plan. Where none is set, usage is unlimited.</p>
        </div>
        <ul className="divide-y divide-ds-border rounded-[6px] border border-ds-border bg-ds-surface">
          {usageRows.map((r) => {
            const pct = r.limit ? Math.min(100, Math.round((r.used / r.limit) * 100)) : null
            return (
              <li key={r.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="text-sm font-medium text-ds-ink">{r.label}</span>
                <span className="min-w-0">
                  {r.limit ? (
                    <span className="block h-1.5 overflow-hidden rounded-full bg-ds-surface-subtle" aria-hidden="true">
                      <span
                        className={`block h-full rounded-full ${pct! >= 90 ? 'bg-ds-danger' : pct! >= 70 ? 'bg-ds-warning' : 'bg-ds-ink'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  ) : (
                    <span className="block text-xs text-ds-muted">{r.note ?? 'No limit set'}</span>
                  )}
                </span>
                <span className="font-mono text-sm tabular-nums text-ds-ink-secondary sm:text-end">
                  {r.untracked ? '—' : r.used}{r.limit ? ` / ${r.limit}${r.unit ?? ''}` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

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
              <div className="text-[11px] text-ds-danger p-2 rounded-lg bg-ds-danger-soft border border-ds-danger/30">
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
                        <div className={`p-2 rounded-lg ${isOwner ? 'bg-ds-warning-soft text-ds-warning ' : 'bg-ds-accent-soft text-ds-accent '}`}>
                          {isOwner ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {c.name || 'Unnamed User'}
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold capitalize ${
 isOwner
 ? 'border-ds-warning/30 text-ds-warning bg-ds-warning-soft'
 : 'border-ds-accent/30 text-ds-accent bg-ds-accent-soft'
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
 ? 'bg-ds-success-soft text-ds-success border-ds-success/30'
 : 'bg-ds-danger-soft text-ds-danger border-ds-danger/30'
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
                            <span className="text-ds-success font-semibold">Enabled</span>
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
                      {p.name} ({p.max_users} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">

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
                  <ImageIcon className="h-3 w-3" /> Logo (PNG/SVG)
                </Label>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 shrink-0 rounded border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {editLogoUrl ? (
                      <img src={editLogoUrl} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadOrgImage(file, 'logo')
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => logoFileInputRef.current?.click()}
                    className="h-9 text-xs flex-1"
                  >
                    {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {editLogoUrl ? 'Replace' : 'Upload'}
                  </Button>
                  {editLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditLogoUrl('')}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Favicon
                </Label>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 shrink-0 rounded border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {editFaviconUrl ? (
                      <img src={editFaviconUrl} alt="Favicon preview" className="h-full w-full object-contain" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={faviconFileInputRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadOrgImage(file, 'favicon')
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingFavicon}
                    onClick={() => faviconFileInputRef.current?.click()}
                    className="h-9 text-xs flex-1"
                  >
                    {uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {editFaviconUrl ? 'Replace' : 'Upload'}
                  </Button>
                  {editFaviconUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditFaviconUrl('')}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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

              {/* Live preview so picking a color has an immediate, visible effect inside
                  this dialog too. Saving writes brand_colors to the organization row;
                  Header.tsx reads currentOrganization.brand_colors directly to override
                  the default ALTUS navy header bar for that tenant's own session (see
                  Header.tsx). Full design-system-wide theming (sidebar, buttons, every
                  screen) is still out of scope — see docs/remaining-architecture-work.md §67.
                  Uses the same ensureReadableOnWhiteText() guard as the real header, so a
                  too-light primary color previews exactly what tenants will actually see. */}
              <div className="rounded-lg border p-3 space-y-2" style={{ backgroundColor: `${primaryColor}0d` }}>
                <div className="text-[10px] font-semibold text-muted-foreground">Preview</div>
                <div className="flex items-center justify-between rounded-md px-3 py-2" style={{ backgroundColor: readablePrimaryColor }}>
                  <span className="text-xs font-bold text-white">{editName || 'Tenant'} Portal</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                </div>
                {readablePrimaryColor !== primaryColor && (
                  <div className="text-[10px] text-ds-warning">
                    Header background darkened to {readablePrimaryColor} for legible white text — {primaryColor} is too light on its own.
                  </div>
                )}
                <button
                  type="button"
                  className="text-xs font-semibold rounded-md px-3 py-1.5 text-white"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Sample Button
                </button>
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

