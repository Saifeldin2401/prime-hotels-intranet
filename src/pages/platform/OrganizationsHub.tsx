import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Organization } from '@/lib/types/tenant'

export default function OrganizationsHub() {
  const { user } = useAuth()
  const { enterOrganization } = useTenant()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { t } = useTranslation(['admin', 'common'])

  const [organizations, setOrganizations] = useState<(Organization & { hotelCount: number; userCount: number })[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Enter / Impersonate Modal State
  const [selectedOrgForEnter, setSelectedOrgForEnter] = useState<Organization | null>(null)
  const [enterReason, setEnterReason] = useState('')
  const [actingRole, setActingRole] = useState('organization_admin')
  const [isEntering, setIsEntering] = useState(false)

  // Create Org Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgNameAr, setNewOrgNameAr] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [newOrgIndustry, setNewOrgIndustry] = useState('hospitality')
  const [isCreating, setIsCreating] = useState(false)

  const loadOrganizations = async () => {
    setIsLoading(true)
    try {
      const data = await platformService.getOrganizations()
      setOrganizations(data)
    } catch (err) {
      console.error('Failed to load organizations:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) return
    setIsCreating(true)
    try {
      await platformService.createOrganization({
        name: newOrgName,
        nameAr: newOrgNameAr,
        slug: newOrgSlug,
        industry: newOrgIndustry,
        actorId: user?.id
      })

      toast({
        title: t('common:success', 'Success'),
        description: t('admin:org_created_success', 'New customer organization provisioned successfully.')
      })

      setIsCreateOpen(false)
      setNewOrgName('')
      setNewOrgNameAr('')
      setNewOrgSlug('')
      await loadOrganizations()
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
      await loadOrganizations()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.name_ar && org.name_ar.includes(searchTerm))

    if (statusFilter === 'active') return matchesSearch && org.is_active && !org.is_deleted
    if (statusFilter === 'suspended') return matchesSearch && !org.is_active && !org.is_deleted
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin:organizations_hub', 'Platform Organizations Hub')}
        description={t('admin:organizations_hub_desc', 'Manage customer organizations, subscriptions, tenant provisioning, and authorized cross-tenant access.')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadOrganizations} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common:refresh', 'Refresh')}
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm">
                  <Plus className="h-4 w-4" />
                  {t('admin:new_organization', 'New Organization')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t('admin:provision_org', 'Provision Customer Organization')}</DialogTitle>
                  <DialogDescription>
                    {t('admin:provision_org_desc', 'Set up an isolated enterprise tenant for a hotel group or client.')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name-en">{t('admin:org_name_en', 'Organization Name (English)')}</Label>
                    <Input
                      id="org-name-en"
                      value={newOrgName}
                      onChange={(e) => {
                        setNewOrgName(e.target.value)
                        if (!newOrgSlug) {
                          setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
                        }
                      }}
                      placeholder="e.g. Royal Palace Hospitality"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-name-ar">{t('admin:org_name_ar', 'Organization Name (Arabic)')}</Label>
                    <Input
                      id="org-name-ar"
                      value={newOrgNameAr}
                      onChange={(e) => setNewOrgNameAr(e.target.value)}
                      placeholder="مثال: فنادق القصر الملكي"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">{t('admin:org_slug', 'Tenant Slug / Domain Identifier')}</Label>
                    <Input
                      id="org-slug"
                      value={newOrgSlug}
                      onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="e.g. royal-palace"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-industry">{t('admin:industry', 'Industry')}</Label>
                    <Select value={newOrgIndustry} onValueChange={setNewOrgIndustry}>
                      <SelectTrigger id="org-industry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospitality">Hospitality & Hotels</SelectItem>
                        <SelectItem value="resorts">Luxury Resorts & Leisure</SelectItem>
                        <SelectItem value="tourism">Tourism & Heritage</SelectItem>
                        <SelectItem value="facilities">Facility Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <Button onClick={handleCreateOrg} disabled={isCreating || !newOrgName.trim() || !newOrgSlug.trim()}>
                    {isCreating ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                    {t('admin:create_org', 'Provision Tenant')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin:search_orgs', 'Search organizations by name or slug...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all', 'All Statuses')}</SelectItem>
                <SelectItem value="active">{t('common:active', 'Active')}</SelectItem>
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
                <TableHead>{t('admin:slug', 'Slug')}</TableHead>
                <TableHead>{t('admin:hotels', 'Hotels')}</TableHead>
                <TableHead>{t('admin:learners', 'Learners')}</TableHead>
                <TableHead>{t('admin:status', 'Status')}</TableHead>
                <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>{t('admin:no_orgs_found', 'No customer organizations found.')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shrink-0">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{org.name}</div>
                          {org.name_ar && <div className="text-xs text-muted-foreground font-arabic">{org.name_ar}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                        {org.slug}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{org.hotelCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{org.userCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? 'default' : 'destructive'} className="text-xs">
                        {org.is_active ? t('common:active', 'Active') : t('common:suspended', 'Suspended')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-2">
                        {/* Enter Organization Action */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrgForEnter(org)}
                          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold text-xs"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {t('admin:enter_tenant', 'Enter Tenant')}
                        </Button>

                        {/* Suspend / Activate Toggle */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleStatus(org)}
                          title={org.is_active ? 'Suspend Organization' : 'Activate Organization'}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          {org.is_active ? <PowerOff className="h-4 w-4 text-amber-600" /> : <Power className="h-4 w-4 text-green-600" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enter / Impersonate Organization Modal */}
      {selectedOrgForEnter && (
        <Dialog open={!!selectedOrgForEnter} onOpenChange={() => setSelectedOrgForEnter(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <DialogTitle>{t('admin:enter_org_env', 'Enter Organization Environment')}</DialogTitle>
              </div>
              <DialogDescription>
                {t('admin:enter_org_desc', 'You are establishing an authorized Platform Operator session into')} <strong>{selectedOrgForEnter.name}</strong>. {t('admin:action_audited', 'This action will be permanently recorded in the security audit log.')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="acting-role">{t('admin:acting_role', 'Operating Role')}</Label>
                <Select value={actingRole} onValueChange={setActingRole}>
                  <SelectTrigger id="acting-role">
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
              <div className="space-y-2">
                <Label htmlFor="access-reason">
                  {t('admin:access_reason', 'Access Reason / Operational Justification')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="access-reason"
                  value={enterReason}
                  onChange={(e) => setEnterReason(e.target.value)}
                  placeholder="e.g. Master SOP deployment, Onboarding review, Support ticket #1042"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrgForEnter(null)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleEnterOrg}
                disabled={isEntering || !enterReason.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-semibold"
              >
                {isEntering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {t('admin:confirm_enter', 'Authorize & Enter Tenant')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
