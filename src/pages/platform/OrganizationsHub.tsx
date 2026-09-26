import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { platformService } from '@/services/platformService'
import { useToast } from '@/components/ui/use-toast'
import {
  Building2,
  Plus,
  Search,
  LogIn,
  ShieldCheck,
  Building,
  Users,
  Check,
  RefreshCw,
  PowerOff,
  Power,
  Sparkles,
  Sliders,
  Palette,
  Crown,
  HardDrive
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/ui'
import type { Organization, SubscriptionPlan } from '@/lib/types/tenant'
import { ensureReadableOnWhiteText } from '@/lib/colorContrast'

// Must match the minimum enforced in TenantContext.enterOrganization() — that check is
// the real authority, but the button here should reflect it instead of only checking
// for non-empty, which let a 1-2 character reason pass the button gate and then fail
// after the click with no upfront indication of the actual requirement.
const MIN_ACCESS_REASON_LENGTH = 10

const COLOR_PRESETS = [
  { name: 'Altus Copper & Charcoal', primary: '#0B1528', secondary: '#C45B2F', accent: '#D9C6A3' },
  { name: 'Emerald Luxury', primary: '#064e3b', secondary: '#059669', accent: '#fbbf24' },
  { name: 'Royal Indigo', primary: '#1e1b4b', secondary: '#4f46e5', accent: '#f59e0b' },
  { name: 'Burgundy Grand', primary: '#4c0519', secondary: '#be123c', accent: '#e11d48' },
  { name: 'Midnight Onyx', primary: '#09090b', secondary: '#3f3f46', accent: '#38bdf8' }
]

export default function OrganizationsHub() {
  const { user } = useAuth()
  const { enterOrganization } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { t } = useTranslation(['admin', 'common'])

  const [organizations, setOrganizations] = useState<(Organization & { userCount: number; subscription?: any })[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Enter / Impersonate Modal State
  const [selectedOrgForEnter, setSelectedOrgForEnter] = useState<Organization | null>(null)
  const [statusChange, setStatusChange] = useState<(Organization & { userCount?: number }) | null>(null)
  const [enterReason, setEnterReason] = useState('')
  const [actingRole, setActingRole] = useState('organization_admin')
  const [isEntering, setIsEntering] = useState(false)

  // Quick Entitlements Edit State
  const [editEntOrg, setEditEntOrg] = useState<any | null>(null)
  const [editMaxLearners, setEditMaxLearners] = useState<number>(100)
  const [editMaxStorage, setEditMaxStorage] = useState<number>(50)
  const [editMaxAiCredits, setEditMaxAiCredits] = useState<number>(1000)
  const [editPlanId, setEditPlanId] = useState<string>('')
  const [editBillingEmail, setEditBillingEmail] = useState<string>('')
  const [isSavingEnt, setIsSavingEnt] = useState(false)

  // Create Org Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'identity' | 'quotas' | 'bootstrap'>('identity')
  const [isCreating, setIsCreating] = useState(false)

  // Form Fields
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgNameAr, setNewOrgNameAr] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [newOrgIndustry, setNewOrgIndustry] = useState('hospitality')
  const [newOrgStatus, setNewOrgStatus] = useState<'active' | 'trial' | 'onboarding' | 'prospect'>('active')
  const [newTrialEndsAt, setNewTrialEndsAt] = useState('')
  const [newBillingEmail, setNewBillingEmail] = useState('')
  
  // Plan & Quota Fields
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [maxLearners, setMaxLearners] = useState<number>(100)
  const [maxStorageGb, setMaxStorageGb] = useState<number>(50)
  const [maxAiCreditsMonthly, setMaxAiCreditsMonthly] = useState<number>(1000)

  // Bootstrap & Branding Fields
  const [primaryColor, setPrimaryColor] = useState('#0f172a')
  const [secondaryColor, setSecondaryColor] = useState('#2563eb')
  const [accentColor, setAccentColor] = useState('#d97706')
  const [initialBrandName, setInitialBrandName] = useState('')

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [orgData, planData] = await Promise.all([
        platformService.getOrganizations(),
        platformService.getSubscriptionPlans()
      ])
      setOrganizations(orgData)
      setPlans(planData)

      // Set default selected plan if available
      if (planData.length > 0 && !selectedPlanId) {
        const growth = planData.find(p => p.code === 'growth') || planData[0]
        setSelectedPlanId(growth.id)
        setMaxLearners(growth.max_users || 500)
        setMaxStorageGb(growth.max_storage_gb || 50)
        setMaxAiCreditsMonthly(1000)
      }
    } catch (err) {
      console.error('Failed to load platform data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id)
    setMaxLearners(plan.max_users || 100)
    setMaxStorageGb(plan.max_storage_gb || 50)
    if (plan.code === 'enterprise') setMaxAiCreditsMonthly(5000)
    else if (plan.code === 'growth') setMaxAiCreditsMonthly(1000)
    else setMaxAiCreditsMonthly(250)
  }

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) {
      toast({
        title: t('common:error', 'Error'),
        description: 'Organization name and slug are required.',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)
    try {
      await platformService.createOrganization({
        name: newOrgName,
        nameAr: newOrgNameAr,
        slug: newOrgSlug,
        industry: newOrgIndustry,
        planId: selectedPlanId || undefined,
        maxLearners: Number(maxLearners) || 100,
        maxStorageGb: Number(maxStorageGb) || 50,
        maxAiCreditsMonthly: Number(maxAiCreditsMonthly) || 1000,
        billingEmail: newBillingEmail || undefined,
        lifecycleStatus: newOrgStatus,
        trialEndsAt: newOrgStatus === 'trial' && newTrialEndsAt ? new Date(newTrialEndsAt).toISOString() : undefined,
        brandColors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor
        },
        initialBrandName: initialBrandName || undefined,
        actorId: user?.id
      })

      toast({
        title: t('common:success', 'Success'),
        description: t('admin:org_created_success', 'New customer organization provisioned with custom quotas.')
      })

      setIsCreateOpen(false)
      // Reset form
      setNewOrgName('')
      setNewOrgNameAr('')
      setNewOrgSlug('')
      setNewBillingEmail('')
      setInitialBrandName('')
      setCreateTab('identity')
      await loadData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to create organization',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const openEntitlementsEditor = (org: any) => {
    setEditEntOrg(org)
    setEditMaxLearners(org.max_learners || 100)
    setEditMaxStorage(org.max_storage_gb || 50)
    setEditMaxAiCredits(org.max_ai_credits_monthly || 1000)
    setEditBillingEmail(org.billing_email || '')
    setEditPlanId(org.subscription?.plan_id || '')
  }

  const handleSaveEntitlements = async () => {
    if (!editEntOrg) return
    setIsSavingEnt(true)
    try {
      await platformService.updateOrganizationEntitlements(editEntOrg.id, {
        maxLearners: Number(editMaxLearners),
        maxStorageGb: Number(editMaxStorage),
        maxAiCreditsMonthly: Number(editMaxAiCredits),
        billingEmail: editBillingEmail || undefined,
        planId: editPlanId || undefined,
        actorId: user?.id
      })

      toast({
        title: t('common:success', 'Success'),
        description: 'Organization entitlements and quota limits updated successfully.'
      })
      setEditEntOrg(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: t('common:error', 'Error'),
        description: err?.message || 'Failed to update entitlements',
        variant: 'destructive'
      })
    } finally {
      setIsSavingEnt(false)
    }
  }

  const handleEnterOrg = async () => {
    if (!selectedOrgForEnter || !enterReason.trim()) return
    setIsEntering(true)
    try {
      await enterOrganization(selectedOrgForEnter.id, enterReason.trim(), actingRole)
      toast({
        title: t('admin:entered_tenant', 'Entered Customer Environment'),
        description: `Now operating inside ${selectedOrgForEnter.name}`
      })
      setSelectedOrgForEnter(null)
      setEnterReason('')
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to enter organization',
        variant: 'destructive'
      })
    } finally {
      setIsEntering(false)
    }
  }

  const handleToggleStatus = async (org: Organization) => {
    const newStatus = !org.is_active
    try {
      await platformService.toggleOrganizationStatus(org.id, newStatus, user?.id)
      toast({
        title: t('common:success', 'Success'),
        description: newStatus ? 'Organization activated.' : 'Organization suspended.'
      })
      await loadData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  // Summary Metrics

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.name_ar && org.name_ar.includes(searchTerm))

    if (statusFilter === 'active') return matchesSearch && org.is_active && org.lifecycle_status !== 'trial'
    if (statusFilter === 'trial') return matchesSearch && org.lifecycle_status === 'trial'
    if (statusFilter === 'suspended') return matchesSearch && !org.is_active
    return matchesSearch
  })

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('admin:organizations_hub', 'Platform Organizations Hub')}
        description={t('admin:organizations_hub_desc', 'Manage customer organizations, subscription quotas, tenant provisioning, and authorized cross-tenant access.')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={isLoading} className="text-xs h-9">
              <RefreshCw className={`h-3.5 w-3.5 me-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common:refresh', 'Refresh')}
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-tour="orgs-create-btn"
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm text-xs h-9 font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  {t('admin:new_organization', 'New Organization')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="h-5 w-5" />
                    <DialogTitle className="text-lg font-bold">{t('admin:provision_org', 'Provision Enterprise Organization')}</DialogTitle>
                  </div>
                  <DialogDescription className="text-xs">
                    {t('admin:provision_org_desc', 'Set up the organization’s identity, plan, seat limit, AI budget and branding.')}
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={createTab} onValueChange={(v: any) => setCreateTab(v)} className="py-2">
                  <TabsList className="grid grid-cols-3 w-full mb-4">
                    <TabsTrigger value="identity" className="text-xs font-semibold gap-1.5">
                      <Building className="h-3.5 w-3.5" />
                      1. Identity & Lifecycle
                    </TabsTrigger>
                    <TabsTrigger value="quotas" className="text-xs font-semibold gap-1.5">
                      <Sliders className="h-3.5 w-3.5" />
                      2. Plan & Quotas
                    </TabsTrigger>
                    <TabsTrigger value="bootstrap" className="text-xs font-semibold gap-1.5">
                      <Palette className="h-3.5 w-3.5" />
                      3. Setup & Branding
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: IDENTITY & LIFECYCLE */}
                  <TabsContent value="identity" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="org-name-en" className="text-xs font-semibold">
                          {t('admin:org_name_en', 'Organization Name (English)')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="org-name-en"
                          value={newOrgName}
                          onChange={(e) => {
                            setNewOrgName(e.target.value)
                            if (!newOrgSlug) {
                              setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
                            }
                          }}
                          placeholder="e.g. Royal Palace Hospitality Group"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="org-name-ar" className="text-xs font-semibold">
                          {t('admin:org_name_ar', 'Organization Name (Arabic)')}
                        </Label>
                        <Input
                          id="org-name-ar"
                          value={newOrgNameAr}
                          onChange={(e) => setNewOrgNameAr(e.target.value)}
                          placeholder="مثال: مجموعة فنادق القصر الملكي"
                          dir="rtl"
                          className="h-9 text-xs font-arabic"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="org-slug" className="text-xs font-semibold">
                          {t('admin:org_slug', 'Tenant Slug / Domain Key')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="org-slug"
                          value={newOrgSlug}
                          onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="e.g. royal-palace"
                          className="font-mono text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="org-industry" className="text-xs font-semibold">
                          {t('admin:industry', 'Industry Sector')}
                        </Label>
                        <Select value={newOrgIndustry} onValueChange={setNewOrgIndustry}>
                          <SelectTrigger id="org-industry" className="h-9 text-xs">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label htmlFor="org-lifecycle" className="text-xs font-semibold">
                          Initial Lifecycle Status
                        </Label>
                        <Select value={newOrgStatus} onValueChange={(val: any) => setNewOrgStatus(val)}>
                          <SelectTrigger id="org-lifecycle" className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active (Production Tenant)</SelectItem>
                            <SelectItem value="trial">Trial (Time-limited sandbox)</SelectItem>
                            <SelectItem value="onboarding">Onboarding (Initial config)</SelectItem>
                            <SelectItem value="prospect">Prospect (Sales demo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="billing-email" className="text-xs font-semibold">
                          Billing & Finance Email
                        </Label>
                        <Input
                          id="billing-email"
                          type="email"
                          value={newBillingEmail}
                          onChange={(e) => setNewBillingEmail(e.target.value)}
                          placeholder="finance@hotelgroup.com"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {newOrgStatus === 'trial' && (
                      <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Label htmlFor="trial-date" className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Trial Expiration Date
                        </Label>
                        <Input
                          id="trial-date"
                          type="date"
                          value={newTrialEndsAt}
                          onChange={(e) => setNewTrialEndsAt(e.target.value)}
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: PLAN & QUOTAS */}
                  <TabsContent value="quotas" className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Subscription Tier & Preset</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {plans.map((p) => {
                          const isSelected = selectedPlanId === p.id
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handlePlanSelect(p)}
                              className={`p-3 rounded-xl border text-start transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                                  : 'border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs capitalize">{p.name}</span>
                                {p.code === 'enterprise' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                              </div>
                              <div className="text-[11px] text-muted-foreground space-y-0.5">
                                <div><strong>{p.max_users}</strong> seats</div>
                                <div><strong>{p.max_storage_gb} GB</strong> storage</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-foreground">Custom Tenant Quotas & Entitlements</span>
                        <Badge variant="outline" className="text-[10px]">Override Defaults</Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Users className="h-3.5 w-3.5 text-indigo-500" />
                            Learner Seats
                          </div>
                          <Input
                            type="number"
                            min={5}
                            value={maxLearners}
                            onChange={(e) => setMaxLearners(parseInt(e.target.value) || 5)}
                            className="h-8 text-sm font-bold"
                          />
                        </div>

                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                            Storage (GB)
                          </div>
                          <Input
                            type="number"
                            min={5}
                            value={maxStorageGb}
                            onChange={(e) => setMaxStorageGb(parseInt(e.target.value) || 5)}
                            className="h-8 text-sm font-bold"
                          />
                        </div>

                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                            AI Credits / Mo
                          </div>
                          <Input
                            type="number"
                            min={0}
                            step={250}
                            value={maxAiCreditsMonthly}
                            onChange={(e) => setMaxAiCreditsMonthly(parseInt(e.target.value) || 0)}
                            className="h-8 text-sm font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 3: SETUP & BRANDING */}
                  <TabsContent value="bootstrap" className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Brand Theme Presets</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setPrimaryColor(preset.primary)
                              setSecondaryColor(preset.secondary)
                              setAccentColor(preset.accent)
                            }}
                            className="flex items-center gap-2 p-2 rounded-lg border text-xs text-start hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-0.5">
                              <span className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: preset.primary }} />
                              <span className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: preset.secondary }} />
                              <span className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: preset.accent }} />
                            </div>
                            <span className="truncate text-[11px]">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Primary Color</Label>
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
                        <Label className="text-[11px] text-muted-foreground">Secondary Color</Label>
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
                        <Label className="text-[11px] text-muted-foreground">Accent Color</Label>
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

                    <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="init-brand" className="text-xs font-semibold">
                          Initial Brand (Optional)
                        </Label>
                        <Input
                          id="init-brand"
                          value={initialBrandName}
                          onChange={(e) => setInitialBrandName(e.target.value)}
                          placeholder="e.g. Altus Luxury Collection"
                          className="h-9 text-xs"
                        />
                      </div>

                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateOrg}
                    disabled={isCreating || !newOrgName.trim() || !newOrgSlug.trim()}
                    className="bg-primary hover:bg-primary/90 text-xs font-semibold"
                  >
                    {isCreating ? <RefreshCw className="h-4 w-4 animate-spin me-1.5" /> : <Check className="h-4 w-4 me-1.5" />}
                    {t('admin:create_org', 'Provision Tenant')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Fleet status: lifecycle counts double as filters */}
      <div role="group" aria-label={t('admin:fleet.filterLabel', 'Filter organizations by status')} className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border sm:grid-cols-4">
        {([
          { id: 'all', label: t('admin:fleet.all', 'All organizations'), count: organizations.length, tone: 'bg-ds-ink' },
          { id: 'active', label: t('admin:fleet.active', 'Active'), count: organizations.filter((o) => o.is_active && o.lifecycle_status !== 'trial').length, tone: 'bg-ds-success' },
          { id: 'trial', label: t('admin:fleet.trial', 'On trial'), count: organizations.filter((o) => o.lifecycle_status === 'trial').length, tone: 'bg-ds-info' },
          { id: 'suspended', label: t('admin:fleet.suspended', 'Suspended'), count: organizations.filter((o) => !o.is_active).length, tone: 'bg-ds-danger' },
        ] as const).map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={statusFilter === f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`relative flex min-h-[68px] flex-col items-start justify-center gap-0.5 bg-ds-surface px-4 py-3 text-start hover:bg-ds-surface-subtle focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent ${statusFilter === f.id ? 'bg-ds-surface-subtle' : ''}`}
          >
            {statusFilter === f.id && <span className={`absolute inset-x-0 top-0 h-[3px] ${f.tone}`} aria-hidden="true" />}
            <span className="font-mono text-xl font-medium tabular-nums text-ds-ink">{f.count}</span>
            <span className="text-xs text-ds-muted">{f.label}</span>
          </button>
        ))}
      </div>

      <div role="search" className="relative">
        <label htmlFor="org-search" className="sr-only">{t('admin:search_orgs', 'Search organizations by name or slug')}</label>
        <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
        <Input
          id="org-search"
          placeholder={t('admin:search_orgs', 'Search organizations by name or slug')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 ps-9 text-sm"
        />
      </div>

      {/* Organizations: one dense, scannable row each */}
      <div data-tour="orgs-grid" className="overflow-x-auto rounded-[6px] border border-ds-border bg-ds-surface">
        {filteredOrgs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-ds-ink">{searchTerm ? t('admin:fleet.noMatch', 'No organizations match “{{q}}”', { q: searchTerm }) : t('admin:no_orgs_found', 'No customer organizations yet.')}</p>
            <p className="mt-1 text-sm text-ds-muted">{t('admin:fleet.noMatchHint', 'Clear the search or choose another status.')}</p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ds-border bg-ds-background text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-muted">
                <th scope="col" className="px-4 py-2.5 text-start">{t('admin:org_column', 'Organization')}</th>
                <th scope="col" className="px-4 py-2.5 text-start">{t('admin:status', 'Status')}</th>
                <th scope="col" className="px-4 py-2.5 text-start">{t('admin:fleet.plan', 'Plan')}</th>
                <th scope="col" className="px-4 py-2.5 text-end">{t('admin:fleet.members', 'Members')}</th>
                <th scope="col" className="px-4 py-2.5 text-end">{t('admin:actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org) => {
                const plan = org.subscription?.plan?.name as string | undefined
                const maxL = org.max_learners ?? org.subscription?.plan?.max_users ?? null
                const near = (n: number, max: number | null) => max !== null && max > 0 && n / max >= 0.9
                const status = !org.is_active ? 'suspended' : (org.lifecycle_status || 'active')
                const dot = status === 'suspended' ? 'bg-ds-danger' : status === 'trial' ? 'bg-ds-info' : status === 'active' ? 'bg-ds-success' : 'bg-ds-warning'
                return (
                  <tr key={org.id} className="border-b border-ds-border/70 last:border-0 hover:bg-ds-surface-subtle">
                    <th scope="row" className="px-4 py-3 text-start font-normal">
                      <button type="button" onClick={() => navigate(`/platform/organizations/${org.id}`)} className="text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent">
                        <span className="block font-semibold text-ds-ink">{org.name}</span>
                        <span className="block font-mono text-xs text-ds-muted">{org.slug}</span>
                      </button>
                    </th>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 capitalize text-ds-ink">
                        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                        {t(`admin:fleet.status.${status}`, status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ds-ink">{plan ?? <span className="text-ds-muted">{t('admin:fleet.noPlan', 'No plan')}</span>}</td>
                    <td className={`px-4 py-3 text-end font-mono tabular-nums ${near(org.userCount || 0, maxL) ? 'text-ds-warning' : 'text-ds-ink'}`}>
                      {org.userCount || 0}{maxL !== null && <span className="text-ds-muted"> / {maxL}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEntitlementsEditor(org)} className="h-9 px-2 text-xs">
                          <Sliders className="me-1 h-3.5 w-3.5" />{t('admin:quotas', 'Limits')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSelectedOrgForEnter(org)} className="h-9 gap-1 px-2 text-xs font-semibold">
                          <LogIn className="h-3.5 w-3.5" />{t('admin:enter_tenant', 'Enter')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatusChange(org)}
                          className={`h-9 px-2 text-xs ${org.is_active ? 'text-ds-danger' : 'text-ds-success'}`}
                        >
                          {org.is_active ? <PowerOff className="me-1 h-3.5 w-3.5" /> : <Power className="me-1 h-3.5 w-3.5" />}
                          {org.is_active ? t('admin:fleet.suspend', 'Suspend') : t('admin:fleet.reactivate', 'Reactivate')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!statusChange}
        onClose={() => setStatusChange(null)}
        onConfirm={async () => {
          if (statusChange) await handleToggleStatus(statusChange)
          setStatusChange(null)
        }}
        isDestructive={!!statusChange?.is_active}
        title={statusChange?.is_active
          ? t('admin:fleet.suspendTitle', 'Suspend {{name}}?', { name: statusChange?.name ?? '' })
          : t('admin:fleet.reactivateTitle', 'Reactivate {{name}}?', { name: statusChange?.name ?? '' })}
        description={statusChange?.is_active
          ? t('admin:fleet.suspendBody', 'All {{count}} members lose access immediately. Their data is kept and access returns when you reactivate.', { count: statusChange?.userCount ?? 0 })
          : t('admin:fleet.reactivateBody', 'Members regain access immediately.')}
        confirmButtonText={statusChange?.is_active ? t('admin:fleet.suspend', 'Suspend') : t('admin:fleet.reactivate', 'Reactivate')}
      />

      {/* QUICK ENTITLEMENtS & LIMITS MODAL */}
      {editEntOrg && (
        <Dialog open={!!editEntOrg} onOpenChange={() => setEditEntOrg(null)}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary">
                <Sliders className="h-5 w-5" />
                <DialogTitle className="text-base font-bold">Edit Entitlements & Quotas</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Adjust resource quotas and subscription limits for <strong>{editEntOrg.name}</strong>.
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
                  <Label className="text-xs font-semibold">Learner Seats Limit</Label>
                  <Input
                    type="number"
                    min={5}
                    value={editMaxLearners}
                    onChange={(e) => setEditMaxLearners(parseInt(e.target.value) || 5)}
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Storage Quota (GB)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={editMaxStorage}
                    onChange={(e) => setEditMaxStorage(parseInt(e.target.value) || 5)}
                    className="h-9 text-xs font-semibold"
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
                    className="h-9 text-xs font-semibold"
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
              <Button variant="outline" size="sm" onClick={() => setEditEntOrg(null)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button size="sm" onClick={handleSaveEntitlements} disabled={isSavingEnt} className="text-xs font-semibold">
                {isSavingEnt ? <RefreshCw className="h-4 w-4 animate-spin me-1.5" /> : <Check className="h-4 w-4 me-1.5" />}
                Save Quotas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Enter / Impersonate Organization Modal */}
      {selectedOrgForEnter && (
        <Dialog open={!!selectedOrgForEnter} onOpenChange={() => setSelectedOrgForEnter(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <DialogTitle className="text-base font-bold">{t('admin:enter_org_env', 'Enter Organization Environment')}</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                {t('admin:enter_org_desc', 'You are establishing an authorized Platform Operator session into')} <strong>{selectedOrgForEnter.name}</strong>. {t('admin:action_audited', 'This action will be permanently recorded in the security audit log.')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="acting-role" className="text-xs font-semibold">{t('admin:acting_role', 'Operating Role')}</Label>
                <Select value={actingRole} onValueChange={setActingRole}>
                  <SelectTrigger id="acting-role" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization_admin">Organization Administrator (Full Tenant Admin)</SelectItem>
                    <SelectItem value="training_manager">Training Manager (Curriculum & Courses)</SelectItem>
                    <SelectItem value="knowledge_manager">Knowledge Manager (SOPs & Docs)</SelectItem>
                    <SelectItem value="instructor">Platform Instructor (Assessments & Cohorts)</SelectItem>
                    <SelectItem value="support_specialist">Support & Troubleshooting Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="access-reason" className="text-xs font-semibold">
                  {t('admin:access_reason', 'Access Reason / Operational Justification')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="access-reason"
                  value={enterReason}
                  onChange={(e) => setEnterReason(e.target.value)}
                  placeholder="e.g. Master SOP deployment, Onboarding review, Support ticket #1042"
                  className="h-9 text-xs"
                />
                <div className={`text-[10px] ${enterReason.trim().length >= MIN_ACCESS_REASON_LENGTH ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                  {enterReason.trim().length}/{MIN_ACCESS_REASON_LENGTH} characters minimum
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrgForEnter(null)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleEnterOrg}
                disabled={isEntering || enterReason.trim().length < MIN_ACCESS_REASON_LENGTH}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold text-xs"
              >
                {isEntering ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                {t('admin:confirm_enter', 'Authorize & Enter Tenant')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
