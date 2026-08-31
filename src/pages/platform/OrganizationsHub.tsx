import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Database,
  Mail,
  Palette,
  Layers,
  Crown,
  Zap,
  TrendingUp,
  Settings,
  HardDrive,
  Calendar
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Organization, SubscriptionPlan } from '@/lib/types/tenant'

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

  const [organizations, setOrganizations] = useState<(Organization & { hotelCount: number; userCount: number; subscription?: any })[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Enter / Impersonate Modal State
  const [selectedOrgForEnter, setSelectedOrgForEnter] = useState<Organization | null>(null)
  const [enterReason, setEnterReason] = useState('')
  const [actingRole, setActingRole] = useState('organization_admin')
  const [isEntering, setIsEntering] = useState(false)

  // Quick Entitlements Edit State
  const [editEntOrg, setEditEntOrg] = useState<any | null>(null)
  const [editMaxHotels, setEditMaxHotels] = useState<number>(10)
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
  const [maxHotels, setMaxHotels] = useState<number>(10)
  const [maxLearners, setMaxLearners] = useState<number>(100)
  const [maxStorageGb, setMaxStorageGb] = useState<number>(50)
  const [maxAiCreditsMonthly, setMaxAiCreditsMonthly] = useState<number>(1000)

  // Bootstrap & Branding Fields
  const [primaryColor, setPrimaryColor] = useState('#0f172a')
  const [secondaryColor, setSecondaryColor] = useState('#2563eb')
  const [accentColor, setAccentColor] = useState('#d97706')
  const [initialBrandName, setInitialBrandName] = useState('')
  const [initialHotelName, setInitialHotelName] = useState('')

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
        setMaxHotels(growth.max_hotels || 25)
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
    setMaxHotels(plan.max_hotels || 10)
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
        maxHotels: Number(maxHotels) || 10,
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
        initialHotelName: initialHotelName || undefined,
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
      setInitialHotelName('')
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
    setEditMaxHotels(org.max_hotels || 10)
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
        maxHotels: Number(editMaxHotels),
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
  const totalHotels = organizations.reduce((acc, o) => acc + (o.hotelCount || 0), 0)
  const totalUsers = organizations.reduce((acc, o) => acc + (o.userCount || 0), 0)
  const activeOrgs = organizations.filter(o => o.is_active && !o.is_deleted).length

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
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm text-xs h-9 font-semibold">
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
                    {t('admin:provision_org_desc', 'Configure tenant identity, subscription plan, hotel/seat limits, AI budget, and branding.')}
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
                                <div><strong>{p.max_hotels}</strong> hotels</div>
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

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Building className="h-3.5 w-3.5 text-blue-500" />
                            Max Hotels
                          </div>
                          <Input
                            type="number"
                            min={1}
                            value={maxHotels}
                            onChange={(e) => setMaxHotels(parseInt(e.target.value) || 1)}
                            className="h-8 text-sm font-bold"
                          />
                        </div>

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

                      <div className="space-y-1.5">
                        <Label htmlFor="init-hotel" className="text-xs font-semibold">
                          Flagship Hotel Property (Optional)
                        </Label>
                        <Input
                          id="init-hotel"
                          value={initialHotelName}
                          onChange={(e) => setInitialHotelName(e.target.value)}
                          placeholder="e.g. Grand Riyadh Hotel"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Organizations</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black mt-2">{organizations.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{activeOrgs} actively operational</div>
        </Card>

        <Card className="p-4 border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Managed Properties</span>
            <Building className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black mt-2">{totalHotels}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Across all customer tenants</div>
        </Card>

        <Card className="p-4 border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Provisioned Seats</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2">{totalUsers}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active learners & managers</div>
        </Card>

        <Card className="p-4 border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Subscription Tiers</span>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2">{plans.length} Available</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Enterprise, Growth, Starter</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin:search_orgs', 'Search organizations by name or slug...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all', 'All Statuses')}</SelectItem>
                <SelectItem value="active">{t('common:active', 'Active (Prod)')}</SelectItem>
                <SelectItem value="trial">Trial Sandbox</SelectItem>
                <SelectItem value="suspended">{t('common:suspended', 'Suspended')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>{t('admin:organization', 'Organization')}</TableHead>
                <TableHead>Plan & Domain</TableHead>
                <TableHead>Hotel Quota</TableHead>
                <TableHead>Learner Seats</TableHead>
                <TableHead>Storage & AI</TableHead>
                <TableHead>{t('admin:status', 'Status')}</TableHead>
                <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>{t('admin:no_orgs_found', 'No customer organizations found.')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => {
                  const planName = org.subscription?.plan?.name || 'Enterprise'
                  const maxH = org.max_hotels || org.subscription?.plan?.max_hotels || 10
                  const maxL = org.max_learners || org.subscription?.plan?.max_users || 100
                  const hotelPct = Math.min(100, Math.round(((org.hotelCount || 0) / maxH) * 100))
                  const userPct = Math.min(100, Math.round(((org.userCount || 0) / maxL) * 100))

                  return (
                    <TableRow key={org.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs text-white border shrink-0"
                            style={{ backgroundColor: org.brand_colors?.primary || '#0f172a' }}
                          >
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs">{org.name}</div>
                            {org.name_ar && <div className="text-[11px] text-muted-foreground font-arabic">{org.name_ar}</div>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px] font-semibold capitalize bg-primary/5 text-primary border-primary/20">
                            {planName}
                          </Badge>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {org.slug}
                          </div>
                        </div>
                      </TableCell>

                      {/* Hotel Quota */}
                      <TableCell>
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{org.hotelCount}</span>
                            <span className="text-muted-foreground">/ {maxH}</span>
                          </div>
                          <Progress
                            value={hotelPct}
                            className="h-1.5 bg-muted"
                            indicatorClassName={hotelPct > 90 ? 'bg-rose-500' : hotelPct > 70 ? 'bg-amber-500' : 'bg-primary'}
                          />
                        </div>
                      </TableCell>

                      {/* Seat Quota */}
                      <TableCell>
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{org.userCount}</span>
                            <span className="text-muted-foreground">/ {maxL}</span>
                          </div>
                          <Progress
                            value={userPct}
                            className="h-1.5 bg-muted"
                            indicatorClassName={userPct > 90 ? 'bg-rose-500' : userPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}
                          />
                        </div>
                      </TableCell>

                      {/* Storage & AI */}
                      <TableCell>
                        <div className="text-[11px] space-y-0.5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3 text-emerald-500" />
                            <span>{org.max_storage_gb ?? 50} GB</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-purple-500" />
                            <span>{org.max_ai_credits_monthly ?? 1000} / mo</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={org.is_active ? 'default' : 'destructive'}
                          className={`text-[10px] capitalize ${
                            org.lifecycle_status === 'trial'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : org.is_active
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {org.lifecycle_status || (org.is_active ? 'active' : 'suspended')}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Quota Edit */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEntitlementsEditor(org)}
                            title="Edit Plan & Quotas"
                            className="h-8 text-xs px-2"
                          >
                            <Sliders className="h-3.5 w-3.5 me-1 text-muted-foreground" />
                            Quotas
                          </Button>

                          {/* Manage Profile */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/platform/organizations/${org.id}`)}
                            className="h-8 text-xs px-2 font-semibold"
                          >
                            {t('admin:manage', 'Profile')}
                          </Button>

                          {/* Enter Organization Action */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrgForEnter(org)}
                            className="gap-1 border-primary/30 text-primary hover:bg-primary/5 font-semibold text-xs h-8 px-2"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            {t('admin:enter_tenant', 'Enter')}
                          </Button>

                          {/* Suspend / Activate Toggle */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(org)}
                            title={org.is_active ? 'Suspend Organization' : 'Activate Organization'}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            {org.is_active ? <PowerOff className="h-3.5 w-3.5 text-amber-600" /> : <Power className="h-3.5 w-3.5 text-green-600" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                        {p.name} ({p.max_hotels} hotels, {p.max_users} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hotel Quota Limit</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editMaxHotels}
                    onChange={(e) => setEditMaxHotels(parseInt(e.target.value) || 1)}
                    className="h-9 text-xs font-semibold"
                  />
                </div>

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
              </div>
            </div>
            <DialogFooter className="pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrgForEnter(null)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleEnterOrg}
                disabled={isEntering || !enterReason.trim()}
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
