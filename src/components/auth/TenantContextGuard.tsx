import React from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { AppLayout, InsideAppLayoutContext } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { Building2, Crown, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react'

interface TenantContextGuardProps {
  children?: React.ReactNode
  resourceName?: string
}

/**
 * TenantContextGuard
 *
 * Enforces the critical multi-tenant rule:
 * Every tenant-scoped operation (Training, Knowledge Base, Users, Reports, Settings)
 * requires an active Tenant Context.
 *
 * - When inside an active tenant: passes through to children or Outlet.
 * - When unauthenticated: passes through so ProtectedRoute can redirect to login.
 * - When in Platform Context (platform operator without break-glass session):
 *   displays an authoritative explanation and redirects to Organizations Hub.
 *   Exception: Global Master Content authoring/previewing (`?master=true` or `?isMaster=true`).
 * - When a multi-tenant user has not selected an active tenant:
 *   displays an organization selector card to establish the context.
 */
export function TenantContextGuard({ children, resourceName }: TenantContextGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const account = useAccountContext()
  const { 
    currentOrganization, 
    organizations, 
    isPlatformScope, 
    isPlatformAdmin, 
    isLoading, 
    switchOrganization 
  } = useTenant()
  const isInsideLayout = React.useContext(InsideAppLayoutContext)
  const { t, i18n } = useTranslation(['admin', 'common'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const location = useLocation()
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  // Honour an explicit `?org=<id>` deep link: a shared tenant URL should restore
  // the right tenant for a user who is a member of it. This is the URL carrying
  // context — never a hardcoded default. Operators are excluded (they enter a
  // tenant only through an audited break-glass session).
  const orgParam = new URLSearchParams(location.search).get('org')
  React.useEffect(() => {
    if (!orgParam || account.isPlatformOperator) return
    if (currentOrganization?.id === orgParam) return
    const isMember = (account.tenantMemberships || []).some((m) => m.organization_id === orgParam)
    if (isMember) void switchOrganization(orgParam)
  }, [orgParam, account.isPlatformOperator, account.tenantMemberships, currentOrganization?.id, switchOrganization])

  if (authLoading || isLoading) {
    return <PageSkeleton />
  }

  // Unauthenticated users pass through to let ProtectedRoute handle login redirection
  if (!user) {
    return <>{children ?? <Outlet />}</>
  }

  // Global Master Content mode: Platform operators authoring or previewing global templates
  const searchParams = new URLSearchParams(location.search)
  const isMasterMode = searchParams.get('master') === 'true' || 
                       searchParams.get('isMaster') === 'true' ||
                       (location.pathname.startsWith('/training/player/') && (isPlatformScope || isPlatformAdmin))

  if ((isPlatformScope || isPlatformAdmin) && isMasterMode) {
    return <>{children ?? <Outlet />}</>
  }

  const renderContainer = (content: React.ReactNode) => {
    if (isInsideLayout) {
      return <>{content}</>
    }
    return <AppLayout>{content}</AppLayout>
  }

  // Account resolution is the authority for both platform-operator status and
  // tenant membership. Do not offer a tenant selector while it is unavailable:
  // its options cannot be safely authorized until the server response succeeds.
  if (account.resolveFailed) {
    return renderContainer(
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-3">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {t('admin:account_context_unavailable', 'Unable to Verify Account Access')}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {t('admin:account_context_unavailable_message', 'We could not verify your platform and organization access. Please try again before continuing.')}
        </p>
        <Button className="mt-5" onClick={() => void account.refresh()}>
          {t('common:retry', 'Try Again')}
        </Button>
      </div>
    )
  }

  // Active tenant context exists -> allow access. This must remain below the
  // resolver-failure gate so a stale context cannot render while access is
  // being re-verified.
  if (currentOrganization) {
    return <>{children ?? <Outlet />}</>
  }

  // Case 1: Platform Operator in Platform Scope
  if (isPlatformScope || isPlatformAdmin) {
    return renderContainer(
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="border-amber-500/30 bg-card/95 shadow-xl backdrop-blur-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
              <Crown className="h-7 w-7 text-amber-500" />
            </div>
            <Badge variant="outline" className="mx-auto border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 mb-2">
              {t('admin:global_saas_scope', 'Platform Control Plane')}
            </Badge>
            <CardTitle className="text-xl font-bold font-serif">
              {t('admin:tenant_context_required', 'Tenant Context Required')}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {resourceName
                ? t('admin:resource_requires_tenant', {
                    resource: resourceName,
                    defaultValue: `${resourceName} is scoped to customer organizations. You are currently operating at the global Platform level.`
                  })
                : t('admin:action_requires_tenant', 'This functionality belongs to individual customer organizations. You are currently operating in Platform Context with no tenant established.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('admin:enter_tenant_prompt', 'To view, create, or manage tenant-specific courses, knowledge articles, users, or reports, enter a customer organization via the Organizations Hub or the Scope Switcher.')}
            </p>

            {/* Quick Switch to User's Organizations if available */}
            {organizations.length > 0 && (
              <div className="pt-2 text-start border-t border-border/50">
                <p className="text-xs font-semibold text-foreground mb-2">
                  {t('admin:select_organization_prompt', 'Or switch into an active organization directly:')}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => switchOrganization(org.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-hotel-gold/60 bg-muted/20 hover:bg-muted/50 transition-all text-start group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-hotel-gold/15 border border-hotel-gold/30 flex items-center justify-center text-hotel-gold font-bold text-xs">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground group-hover:text-hotel-gold transition-colors">
                            {org.name}
                          </p>
                          {org.industry && (
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {org.industry}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowIcon className="h-4 w-4 text-muted-foreground group-hover:text-hotel-gold transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/platform/organizations')}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2"
            >
              <Building2 className="h-4 w-4" />
              <span>{t('admin:view_organizations', 'Go to Organizations Hub')}</span>
              <ArrowIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/platform')}
              className="w-full sm:w-auto text-xs"
            >
              {t('admin:platform_control_plane', 'Platform Control Center')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Case 2: Multi-tenant user with no active tenant selected
  if (organizations.length > 0) {
    return renderContainer(
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card className="border-border/70 bg-card/95 shadow-xl backdrop-blur-xl">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-hotel-gold/15 border border-hotel-gold/30 flex items-center justify-center mb-2">
              <Building2 className="h-6 w-6 text-hotel-gold" />
            </div>
            <CardTitle className="text-lg font-bold font-serif">
              {t('admin:select_organization', 'Select an Organization')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin:select_organization_prompt', 'Please select which organization you want to operate in to continue.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => switchOrganization(org.id)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/70 hover:border-hotel-gold/50 bg-background/60 hover:bg-muted/50 transition-all text-start group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-hotel-gold/10 border border-hotel-gold/20 flex items-center justify-center text-hotel-gold font-bold text-sm">
                    {org.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-hotel-gold transition-colors">
                      {org.name}
                    </p>
                    {org.industry && (
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {org.industry}
                      </p>
                    )}
                  </div>
                </div>
                <ArrowIcon className="h-4 w-4 text-muted-foreground group-hover:text-hotel-gold transition-colors" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Case 3: User belongs to zero active organizations
  return renderContainer(
    <div className="max-w-md mx-auto py-16 px-4 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-3">
        <ShieldAlert className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        {t('admin:no_organization_assigned', 'No Active Organization Assigned')}
      </h2>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        {t('admin:no_organization_message', 'Your account is currently not assigned to any active organization. Please contact your organization administrator or support.')}
      </p>
    </div>
  )
}
