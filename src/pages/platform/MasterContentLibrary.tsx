import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { platformService, type MasterDeploymentProgress } from '@/services/platformService'
import { useToast } from '@/components/ui/use-toast'
import {
  BookOpen,
  GraduationCap,
  Send,
  Sparkles,
  Building,
  Check,
  RefreshCw,
  Eye,
  Layers,
  Award,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  FileText,
  Crown,
  BellRing
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Organization } from '@/lib/types/tenant'

export default function MasterContentLibrary() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t, i18n } = useTranslation(['admin', 'training', 'knowledge', 'common'])
  const isRTL = i18n.dir() === 'rtl'

  const [activeTab, setActiveTab] = useState<'sops' | 'courses' | 'deployments'>('sops')
  const [masterSops, setMasterSops] = useState<any[]>([])
  const [masterCourses, setMasterCourses] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [allDeployments, setAllDeployments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search filters
  const [searchQuery, setSearchQuery] = useState('')

  // Deploy Dialog State
  const [selectedItemToDeploy, setSelectedItemToDeploy] = useState<{ type: 'sop' | 'course'; item: any } | null>(null)
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])
  const [orgSearchQuery, setOrgSearchQuery] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentProgress, setDeploymentProgress] = useState<number>(0)
  const [currentDeployStep, setCurrentDeployStep] = useState<{ current: number; total: number; orgName?: string } | null>(null)
  const [deploymentLogs, setDeploymentLogs] = useState<Array<{ orgId: string; status: 'in_progress' | 'success' | 'error'; message: string; timestamp: string }>>([])
  const [deploymentFinished, setDeploymentFinished] = useState(false)

  // Create SOP Modal State
  const [isCreateSopOpen, setIsCreateSopOpen] = useState(false)
  const [newSop, setNewSop] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    content: '',
    content_ar: '',
    document_number: ''
  })
  const [isCreatingSop, setIsCreatingSop] = useState(false)

  // Create Course Modal State
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: 'Hospitality & Standards',
    difficulty_level: 'intermediate',
    estimated_duration_minutes: 45
  })
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)

  // Preview Modal State
  const [previewItem, setPreviewItem] = useState<{ type: 'sop' | 'course'; item: any } | null>(null)

  // Version bump modal state
  const [versionBumpItem, setVersionBumpItem] = useState<{ type: 'sop' | 'course'; item: any } | null>(null)
  const [isBumpingVersion, setIsBumpingVersion] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [sops, courses, orgs, deployments] = await Promise.all([
        platformService.getMasterSops(),
        platformService.getMasterCourses(),
        platformService.getOrganizations(),
        platformService.getAllDeployments()
      ])
      setMasterSops(sops)
      setMasterCourses(courses)
      setOrganizations(orgs)
      setAllDeployments(deployments)
    } catch (err) {
      console.error('Failed to load master library:', err)
      toast({
        title: t('common:error', 'Error'),
        description: 'Failed to load master content library data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDeploy = (type: 'sop' | 'course', item: any) => {
    setSelectedItemToDeploy({ type, item })
    setSelectedOrgIds([])
    setOrgSearchQuery('')
    setDeploymentProgress(0)
    setCurrentDeployStep(null)
    setDeploymentLogs([])
    setDeploymentFinished(false)
  }

  const toggleOrgSelection = (orgId: string) => {
    if (isDeploying) return
    setSelectedOrgIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    )
  }

  const selectAllOrgs = () => {
    if (isDeploying) return
    const filteredOrgs = filteredOrganizations
    const filteredIds = filteredOrgs.map((o) => o.id)
    const allSelected = filteredIds.every((id) => selectedOrgIds.includes(id))
    if (allSelected) {
      setSelectedOrgIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      setSelectedOrgIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
    }
  }

  const filteredOrganizations = organizations.filter((org) => {
    if (!orgSearchQuery.trim()) return true
    const q = orgSearchQuery.toLowerCase()
    return (
      org.name.toLowerCase().includes(q) ||
      org.slug?.toLowerCase().includes(q) ||
      (org.name_ar && org.name_ar.includes(q))
    )
  })

  const handleConfirmDeploy = async () => {
    if (!selectedItemToDeploy || selectedOrgIds.length === 0 || !user) return
    setIsDeploying(true)
    setDeploymentFinished(false)
    setDeploymentProgress(0)
    setDeploymentLogs([])

    const orgMap = new Map(organizations.map((o) => [o.id, o.name]))

    const progressCallback = (progress: MasterDeploymentProgress) => {
      const percentage = Math.round((progress.current / progress.total) * 100)
      setDeploymentProgress(percentage)
      const orgName = orgMap.get(progress.orgId) || progress.orgId
      setCurrentDeployStep({ current: progress.current, total: progress.total, orgName })

      setDeploymentLogs((prev) => [
        ...prev,
        {
          orgId: progress.orgId,
          status: progress.status === 'in_progress' ? 'in_progress' : progress.status,
          message:
            progress.status === 'in_progress'
              ? `Deploying to ${orgName}...`
              : progress.status === 'success'
              ? `Successfully deployed to ${orgName}`
              : `Failed for ${orgName}: ${progress.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ])
    }

    try {
      if (selectedItemToDeploy.type === 'sop') {
        const res = await platformService.deployMasterSop({
          masterDocId: selectedItemToDeploy.item.id,
          targetOrgIds: selectedOrgIds,
          deployedBy: user.id,
          onProgress: progressCallback
        })

        toast({
          title: t('common:success', 'Deployment Complete'),
          description: `Master SOP deployed to ${res.deployedCount} client organization(s).`
        })
      } else {
        const res = await platformService.deployMasterCourse({
          masterCourseId: selectedItemToDeploy.item.id,
          targetOrgIds: selectedOrgIds,
          deployedBy: user.id,
          onProgress: progressCallback
        })

        toast({
          title: t('common:success', 'Deployment Complete'),
          description: `Master Course deployed to ${res.deployedCount} client organization(s).`
        })
      }

      setDeploymentFinished(true)
      await loadData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Deployment Incomplete'),
        description: error?.message || 'Failed to finish master content deployment',
        variant: 'destructive'
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const handleCreateSop = async () => {
    if (!newSop.title.trim() || !user) return
    setIsCreatingSop(true)
    try {
      await platformService.createMasterSop({
        title: newSop.title,
        titleAr: newSop.title_ar,
        description: newSop.description,
        descriptionAr: newSop.description_ar,
        content: newSop.content,
        contentAr: newSop.content_ar,
        documentNumber: newSop.document_number,
        actorId: user.id
      })
      toast({
        title: t('common:success', 'Success'),
        description: 'New Master SOP created in platform library.'
      })
      setIsCreateSopOpen(false)
      setNewSop({
        title: '',
        title_ar: '',
        description: '',
        description_ar: '',
        content: '',
        content_ar: '',
        document_number: ''
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: t('common:error', 'Error'),
        description: err?.message || 'Failed to create master SOP',
        variant: 'destructive'
      })
    } finally {
      setIsCreatingSop(false)
    }
  }

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim() || !user) return
    setIsCreatingCourse(true)
    try {
      await platformService.createMasterCourse({
        title: newCourse.title,
        description: newCourse.description,
        category: newCourse.category,
        difficultyLevel: newCourse.difficulty_level,
        estimatedDurationMinutes: Number(newCourse.estimated_duration_minutes) || 45,
        actorId: user.id
      })
      toast({
        title: t('common:success', 'Success'),
        description: 'New Master Course created in platform library.'
      })
      setIsCreateCourseOpen(false)
      setNewCourse({
        title: '',
        description: '',
        category: 'Hospitality & Standards',
        difficulty_level: 'intermediate',
        estimated_duration_minutes: 45
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: t('common:error', 'Error'),
        description: err?.message || 'Failed to create master course',
        variant: 'destructive'
      })
    } finally {
      setIsCreatingCourse(false)
    }
  }

  const handleConfirmVersionBump = async () => {
    if (!versionBumpItem || !user) return
    setIsBumpingVersion(true)
    try {
      if (versionBumpItem.type === 'sop') {
        await platformService.updateMasterSop(versionBumpItem.item.id, {
          incrementVersion: true,
          actorId: user.id
        })
      } else {
        await platformService.updateMasterCourse(versionBumpItem.item.id, {
          incrementVersion: true,
          actorId: user.id
        })
      }
      toast({
        title: t('common:success', 'Version Published'),
        description: 'Master content updated. All tenant deployments have been marked with Update Available 🔔.'
      })
      setVersionBumpItem(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: t('common:error', 'Error'),
        description: err?.message || 'Failed to bump version',
        variant: 'destructive'
      })
    } finally {
      setIsBumpingVersion(false)
    }
  }

  const filteredSops = masterSops.filter((sop) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      sop.title?.toLowerCase().includes(q) ||
      sop.title_ar?.toLowerCase().includes(q) ||
      sop.document_number?.toLowerCase().includes(q) ||
      sop.description?.toLowerCase().includes(q)
    )
  })

  const filteredCourses = masterCourses.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.title?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin:global_master_library', 'Global Training & SOP Master Library')}
        description={t(
          'admin:global_master_library_desc',
          'Platform-controlled master repository of hotel standard operating procedures, luxury service courses, and compliance curricula deployable across customer tenants.'
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common:refresh', 'Refresh')}
            </Button>
            {activeTab === 'sops' ? (
              <Button
                onClick={() => setIsCreateSopOpen(true)}
                className="bg-hotel-navy hover:bg-hotel-navy/90 text-white gap-1.5 shadow-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                {t('admin:create_master_sop', 'New Master SOP')}
              </Button>
            ) : activeTab === 'courses' ? (
              <Button
                onClick={() => setIsCreateCourseOpen(true)}
                className="bg-hotel-navy hover:bg-hotel-navy/90 text-white gap-1.5 shadow-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                {t('admin:create_master_course', 'New Master Course')}
              </Button>
            ) : null}
          </div>
        }
      />

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('admin:master_sops', 'Master SOPs')}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{masterSops.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Platform Standard Operating Procedures</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('admin:master_courses', 'Master Courses')}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{masterCourses.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enterprise Curricula & Modules</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('admin:total_deployments', 'Total Deployments')}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{allDeployments.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cloned across client tenants</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Send className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('admin:connected_tenants', 'Client Tenants')}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{organizations.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Organizations receiving sync</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Building className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto min-w-[380px]">
            <TabsTrigger value="sops" className="gap-2 text-xs">
              <BookOpen className="h-4 w-4" />
              <span>{t('admin:master_sops', 'Master SOPs')}</span>
              <Badge variant="secondary" className="ms-1 text-[10px] py-0 px-1.5">
                {masterSops.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2 text-xs">
              <GraduationCap className="h-4 w-4" />
              <span>{t('admin:master_courses', 'Master Courses')}</span>
              <Badge variant="secondary" className="ms-1 text-[10px] py-0 px-1.5">
                {masterCourses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="deployments" className="gap-2 text-xs">
              <Layers className="h-4 w-4" />
              <span>{t('admin:deployments_tracker', 'Deployments Tracker')}</span>
              <Badge variant="secondary" className="ms-1 text-[10px] py-0 px-1.5">
                {allDeployments.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'deployments' && (
            <div className="relative w-full sm:w-72">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "end-3" : "start-3")} />
              <Input
                placeholder={t('admin:search_master_content', 'Search master library...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("h-9 text-xs", isRTL ? "pe-9" : "ps-9")}
              />
            </div>
          )}
        </div>

        {/* Master SOPs Content */}
        <TabsContent value="sops" className="mt-4 space-y-4">
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t('admin:sop_title', 'Master SOP')}</TableHead>
                    <TableHead>{t('admin:code', 'Code')}</TableHead>
                    <TableHead>{t('admin:version', 'Master Version')}</TableHead>
                    <TableHead>{t('admin:status', 'Status')}</TableHead>
                    <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSops.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No master SOPs found matching your search.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSops.map((sop) => {
                      const ver = sop.current_version || 1
                      return (
                        <TableRow key={sop.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <span>{sop.title}</span>
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 h-4">
                                  Global Master
                                </Badge>
                              </div>
                              {sop.title_ar && <div className="text-xs text-muted-foreground font-arabic mt-0.5">{sop.title_ar}</div>}
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sop.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {sop.document_number || 'SOP-MST'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs font-semibold">
                              v{ver}.0
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="text-xs capitalize bg-emerald-600">
                              {sop.status || 'Published'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewItem({ type: 'sop', item: sop })}
                                className="h-8 px-2.5 text-xs gap-1"
                                title="Preview Content"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">{t('common:preview', 'Preview')}</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setVersionBumpItem({ type: 'sop', item: sop })}
                                className="h-8 px-2.5 text-xs gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                title="Publish New Revision"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Bump v{ver + 1}</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenDeploy('sop', sop)}
                                className="h-8 px-3 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5" />
                                {t('admin:deploy_to_tenants', 'Deploy')}
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
        </TabsContent>

        {/* Master Courses Content */}
        <TabsContent value="courses" className="mt-4 space-y-4">
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t('admin:course_title', 'Master Course')}</TableHead>
                    <TableHead>{t('admin:category', 'Category')}</TableHead>
                    <TableHead>{t('admin:level', 'Difficulty')}</TableHead>
                    <TableHead>{t('admin:version', 'Version')}</TableHead>
                    <TableHead>{t('admin:duration', 'Duration')}</TableHead>
                    <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No master courses found matching your search.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCourses.map((course) => {
                      const ver = Number((course.blueprint as any)?.version || course.current_version || 1)
                      return (
                        <TableRow key={course.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <span>{course.title}</span>
                                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 h-4">
                                  Global Master
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {course.category || 'Hospitality'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {course.difficulty_level || 'Intermediate'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs font-semibold">
                              v{ver}.0
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {course.estimated_duration_minutes ? `${course.estimated_duration_minutes} min` : '45 min'}
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewItem({ type: 'course', item: course })}
                                className="h-8 px-2.5 text-xs gap-1"
                                title="Preview Course Structure"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">{t('common:preview', 'Preview')}</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setVersionBumpItem({ type: 'course', item: course })}
                                className="h-8 px-2.5 text-xs gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                title="Publish New Revision"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Bump v{ver + 1}</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenDeploy('course', course)}
                                className="h-8 px-3 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5" />
                                {t('admin:deploy_to_tenants', 'Deploy')}
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
        </TabsContent>

        {/* Deployments & Sync Tracker Tab */}
        <TabsContent value="deployments" className="mt-4 space-y-4">
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b py-3 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Active Master Deployments Across Customer Tenants</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time tracking of deployed master SOPs and courses, synchronized versions, and pending tenant updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Target Customer Tenant</TableHead>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Deployed Version</TableHead>
                    <TableHead>Master Version</TableHead>
                    <TableHead>Sync Status</TableHead>
                    <TableHead>Last Synced Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDeployments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No deployments recorded yet. Deploy master content above to begin tracking.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allDeployments.map((dep) => {
                      const hasUpdate = dep.has_update_available || dep.current_master_version > dep.deployed_version
                      return (
                        <TableRow key={dep.id} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground">
                            <div>
                              <span>{dep.target_organization?.name || 'Customer Organization'}</span>
                              {dep.target_organization?.slug && (
                                <span className="text-xs text-muted-foreground font-mono block">
                                  @{dep.target_organization.slug}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs flex items-center gap-1 w-fit">
                              {dep.content_type === 'document_sop' ? (
                                <>
                                  <BookOpen className="h-3 w-3 text-blue-600" />
                                  <span>SOP</span>
                                </>
                              ) : (
                                <>
                                  <GraduationCap className="h-3 w-3 text-indigo-600" />
                                  <span>Course</span>
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              v{dep.deployed_version || 1}.0
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs font-bold">
                              v{dep.current_master_version || dep.deployed_version || 1}.0
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {hasUpdate ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1">
                                <BellRing className="h-3 w-3 animate-bounce" />
                                Update Available
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                In Sync
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {dep.last_synced_at
                              ? new Date(dep.last_synced_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : 'Initial'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* 1. BATCH DEPLOYMENT DIALOG WITH LIVE PROGRESS & EXECUTION LOGS */}
      {/* ========================================================================= */}
      {selectedItemToDeploy && (
        <Dialog open={!!selectedItemToDeploy} onOpenChange={(open) => !isDeploying && setSelectedItemToDeploy(null)}>
          <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 pb-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Send className="h-4 w-4" />
                  <span>{t('admin:batch_deployment', 'Batch Master Deployment')}</span>
                </div>
                <DialogTitle className="text-lg font-bold text-white">
                  Deploying: {selectedItemToDeploy.item.title}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs mt-0.5">
                  Select customer tenant organizations to deploy dedicated local copies tracked by platform version sync.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {!isDeploying && !deploymentFinished ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground", isRTL ? "end-2.5" : "start-2.5")} />
                      <Input
                        placeholder={t('admin:filter_tenants', 'Search customer tenants...')}
                        value={orgSearchQuery}
                        onChange={(e) => setOrgSearchQuery(e.target.value)}
                        className={cn("h-8 text-xs", isRTL ? "pe-8" : "ps-8")}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={selectAllOrgs} className="h-8 text-xs text-primary shrink-0">
                      {selectedOrgIds.length === filteredOrganizations.length && filteredOrganizations.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pe-1 border rounded-lg p-2 bg-slate-50/50">
                    {filteredOrganizations.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No customer organizations match your filter.
                      </div>
                    ) : (
                      filteredOrganizations.map((org) => {
                        const isChecked = selectedOrgIds.includes(org.id)
                        return (
                          <div
                            key={org.id}
                            onClick={() => toggleOrgSelection(org.id)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-primary/10 border-primary/50 shadow-sm'
                                : 'bg-white hover:bg-muted/40 border-border/70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isChecked} onCheckedChange={() => toggleOrgSelection(org.id)} />
                              <div>
                                <div className="text-xs font-bold text-foreground">{org.name}</div>
                                {org.name_ar && <div className="text-[11px] text-muted-foreground font-arabic">{org.name_ar}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {org.slug}
                              </Badge>
                              {isChecked && <Check className="h-3.5 w-3.5 text-primary" />}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              ) : (
                /* LIVE PROGRESS & LOGS TERMINAL */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>
                        {deploymentFinished
                          ? 'Deployment Complete'
                          : currentDeployStep
                          ? `Deploying (${currentDeployStep.current}/${currentDeployStep.total}): ${currentDeployStep.orgName}`
                          : 'Initializing Deployment Engine...'}
                      </span>
                      <span className="font-mono text-primary">{deploymentProgress}%</span>
                    </div>
                    <Progress value={deploymentProgress} className="h-2" />
                  </div>

                  {/* Execution Log Terminal */}
                  <div className="bg-slate-950 text-slate-100 rounded-lg p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1 border border-slate-800">
                    <div className="text-slate-400 pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>DEPLOYMENT EXECUTION LOG</span>
                      <span>{deploymentLogs.length} events</span>
                    </div>
                    {deploymentLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-500">[{log.timestamp}]</span>
                        {log.status === 'in_progress' ? (
                          <span className="text-yellow-400">⏳</span>
                        ) : log.status === 'success' ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-rose-400">✗</span>
                        )}
                        <span
                          className={
                            log.status === 'success'
                              ? 'text-emerald-300'
                              : log.status === 'error'
                              ? 'text-rose-300'
                              : 'text-slate-300'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 bg-muted/20 border-t flex items-center justify-between sm:justify-between">
              {!isDeploying && !deploymentFinished ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setSelectedItemToDeploy(null)}>
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmDeploy}
                    disabled={isDeploying || selectedOrgIds.length === 0}
                    className="bg-primary hover:bg-primary/90 text-white gap-2 font-semibold text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Deploy to {selectedOrgIds.length} Organization(s)
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setSelectedItemToDeploy(null)}
                  disabled={isDeploying}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  {isDeploying ? 'Deploying...' : 'Done'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE MASTER SOP MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isCreateSopOpen} onOpenChange={setIsCreateSopOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" />
              <DialogTitle>{t('admin:create_master_sop', 'Author Master SOP Template')}</DialogTitle>
            </div>
            <DialogDescription>
              Create a globally governed standard operating procedure template ready for deployment across customer tenants.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">SOP Title (English)</Label>
                <Input
                  placeholder="e.g. VIP Butler Arrival & Luggage Protocol"
                  value={newSop.title}
                  onChange={(e) => setNewSop({ ...newSop, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold font-arabic">العنوان بالعربية</Label>
                <Input
                  placeholder="مثال: بروتوكول استقبال كبار الشخصيات"
                  value={newSop.title_ar}
                  onChange={(e) => setNewSop({ ...newSop, title_ar: e.target.value })}
                  className="h-8 text-xs font-arabic text-right"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Document Code</Label>
                <Input
                  placeholder="e.g. SOP-MST-042"
                  value={newSop.document_number}
                  onChange={(e) => setNewSop({ ...newSop, document_number: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Scope</Label>
                <Input value="Global Platform Master" disabled className="h-8 text-xs bg-muted" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Operational scope, mandatory requirements, and compliance guidelines..."
                value={newSop.description}
                onChange={(e) => setNewSop({ ...newSop, description: e.target.value })}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Procedure Content / Body</Label>
              <Textarea
                placeholder="Step 1: Greet guest by last name... Step 2: Escort to presidential suite..."
                value={newSop.content}
                onChange={(e) => setNewSop({ ...newSop, content: e.target.value })}
                className="text-xs min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateSopOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSop}
              disabled={isCreatingSop || !newSop.title.trim()}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
            >
              {isCreatingSop ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Publish Master SOP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 3. CREATE MASTER COURSE MODAL */}
      {/* ========================================================================= */}
      <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <GraduationCap className="h-5 w-5" />
              <DialogTitle>{t('admin:create_master_course', 'Author Master Course')}</DialogTitle>
            </div>
            <DialogDescription>
              Create a globally certified master training curriculum deployable across luxury properties.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course Title</Label>
              <Input
                placeholder="e.g. 5-Star Food Safety & HACCP Masterclass"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={newCourse.category}
                  onValueChange={(val) => setNewCourse({ ...newCourse, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hospitality & Standards">Hospitality & Standards</SelectItem>
                    <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                    <SelectItem value="Housekeeping & Butler">Housekeeping & Butler</SelectItem>
                    <SelectItem value="Front Desk & Concierge">Front Desk & Concierge</SelectItem>
                    <SelectItem value="Security & Safety">Security & Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Difficulty</Label>
                <Select
                  value={newCourse.difficulty_level}
                  onValueChange={(val) => setNewCourse({ ...newCourse, difficulty_level: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Duration (Minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  value={newCourse.estimated_duration_minutes}
                  onChange={(e) => setNewCourse({ ...newCourse, estimated_duration_minutes: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course Summary & Objectives</Label>
              <Textarea
                placeholder="Key competencies, learning outcomes, and assessment requirements..."
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                className="text-xs min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateCourseOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCourse}
              disabled={isCreatingCourse || !newCourse.title.trim()}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
            >
              {isCreatingCourse ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Publish Master Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 4. PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <div className="bg-muted/40 p-6 pb-4 border-b">
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase">
                  {previewItem.type === 'sop' ? <BookOpen className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                  <span>Global Platform Master Preview</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground mt-1">
                  {previewItem.item.title}
                </DialogTitle>
                {previewItem.item.title_ar && (
                  <div className="text-xs text-muted-foreground font-arabic mt-0.5">{previewItem.item.title_ar}</div>
                )}
              </DialogHeader>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {previewItem.item.document_number || 'SOP-MST'}
                </Badge>
                <Badge variant="secondary">
                  v{previewItem.item.current_version || (previewItem.item.blueprint as any)?.version || 1}.0
                </Badge>
                {previewItem.item.category && <Badge variant="outline">{previewItem.item.category}</Badge>}
              </div>

              {previewItem.item.description && (
                <div>
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] mb-1">Description</h4>
                  <p className="text-foreground leading-relaxed">{previewItem.item.description}</p>
                </div>
              )}

              {previewItem.item.content && (
                <div>
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] mb-1">Standard Content</h4>
                  <div className="p-3 bg-muted/30 rounded-lg border leading-relaxed font-sans whitespace-pre-wrap">
                    {previewItem.item.content}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 bg-muted/20 border-t">
              <Button size="sm" onClick={() => setPreviewItem(null)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. PUBLISH REVISION / VERSION BUMP MODAL */}
      {/* ========================================================================= */}
      {versionBumpItem && (
        <Dialog open={!!versionBumpItem} onOpenChange={() => setVersionBumpItem(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="h-5 w-5" />
                <DialogTitle>Publish Upstream Master Revision</DialogTitle>
              </div>
              <DialogDescription>
                Incrementing the version on <strong>{versionBumpItem.item.title}</strong> will mark an update available across all active customer tenant deployments.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs text-amber-900">
              <div className="flex items-center justify-between font-mono font-bold">
                <span>Current Version: v{versionBumpItem.item.current_version || (versionBumpItem.item.blueprint as any)?.version || 1}.0</span>
                <span className="text-amber-700">➔ New Version: v{(versionBumpItem.item.current_version || (versionBumpItem.item.blueprint as any)?.version || 1) + 1}.0</span>
              </div>
              <p className="text-[11px] opacity-90">
                Customer organizations with deployed copies will see an &quot;Update Available 🔔&quot; badge in their Training & SOP library, allowing local managers to review changes and sync.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setVersionBumpItem(null)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmVersionBump}
                disabled={isBumpingVersion}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
              >
                {isBumpingVersion ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Publish Revision & Flag Tenants
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
