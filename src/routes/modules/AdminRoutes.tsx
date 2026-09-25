import { PlatformRoute } from '@/components/auth/PlatformRoute'
import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import type { Capability } from '@/hooks/useCapabilities'
import { page } from '@/routes/utils/page'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const UserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const BulkUserProvisioning = lazy(() => import('@/pages/admin/BulkUserProvisioning'))
const OrganizationalControlCenter = lazy(() => import('@/pages/admin/OrganizationalControlCenter'))
const PropertyManagement = lazy(() => import('@/pages/admin/PropertyManagement'))
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))
const PIIAuditViewer = lazy(() => import('@/pages/admin/PIIIAuditViewer').then(m => ({ default: m.PIIAuditViewer })))
const NotificationBatches = lazy(() => import('@/pages/admin/notifications/NotificationBatches'))
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'))
const AICourseGeneratorSettings = lazy(() => import('@/pages/admin/AICourseGeneratorSettings'))
const EmailAnalytics = lazy(() => import('@/pages/admin/EmailAnalytics'))
const InboundEmails = lazy(() => import('@/pages/admin/InboundEmails'))
const EmailTemplateEditor = lazy(() => import('@/pages/admin/EmailTemplateEditor'))
const AuditRetentionPolicies = lazy(() => import('@/pages/admin/AuditRetentionPolicies'))
const UserInvitations = lazy(() => import('@/pages/admin/UserInvitations'))
const TenantDataExport = lazy(() => import('@/pages/admin/TenantDataExport'))
const WizardManager = lazy(() => import('@/pages/admin/WizardManager'))

// Platform Owner Super Admin Pages
const PlatformControlCenter = lazy(() => import('@/pages/platform/PlatformControlCenter'))
const OrganizationsHub = lazy(() => import('@/pages/platform/OrganizationsHub'))
const OrganizationProfile = lazy(() => import('@/pages/platform/OrganizationProfile'))
const PlatformUserDirectory = lazy(() => import('@/pages/platform/PlatformUserDirectory'))
const MasterContentLibrary = lazy(() => import('@/pages/platform/MasterContentLibrary'))
const PlatformOperationsHub = lazy(() => import('@/pages/platform/PlatformOperationsHub'))
const PlatformSettings = lazy(() => import('@/pages/platform/PlatformSettings'))
const PlatformAnalytics = lazy(() => import('@/pages/platform/PlatformAnalytics'))
const PlatformAuditLogs = lazy(() => import('@/pages/platform/PlatformAuditLogs'))

const ORG_ADMIN: Capability = 'org.admin'
const PEOPLE: Capability[] = ['people.manage', 'org.admin']

/**
 * WORKSPACE: ORGANIZATION (/admin) - the tenant's own structure, people,
 * settings and audit. Gated by the database capability matrix; the platform
 * console below is gated by the platform-operator identity instead.
 */
export const AdminRoutes = () => (
    <>
        <Route element={<TenantContextGuard resourceName="Organization" />}>
            <Route path="/admin/organization" element={page(<OrganizationalControlCenter />, { capability: PEOPLE })} />
            <Route path="/admin/users" element={page(<UserManagement />, { capability: PEOPLE })} />
            <Route path="/admin/users/bulk" element={page(<BulkUserProvisioning />, { capability: 'people.manage' })} />
            <Route path="/admin/invitations" element={page(<UserInvitations />, { capability: PEOPLE })} />
            <Route path="/admin/properties" element={page(<PropertyManagement />, { capability: ORG_ADMIN })} />
            <Route path="/admin/settings" element={page(<SystemSettings />, { capability: 'org.settings' })} />
            <Route path="/admin/audit" element={page(<AuditLogs />, { capability: 'audit.view' })} />
            <Route path="/admin/pii-access" element={page(<PIIAuditViewer />, { capability: 'audit.view' })} />
            <Route path="/admin/notifications" element={page(<NotificationBatches />, { capability: ORG_ADMIN })} />
            <Route path="/admin/export" element={page(<TenantDataExport />, { capability: 'org.settings' })} />
            <Route path="/admin/wizards" element={page(<WizardManager />, { capability: ORG_ADMIN })} />
        </Route>

        {/* ------------------------------------------------------------------ */}
        {/* PLATFORM CONTROL CENTER — internal platform operators only.        */}
        {/* Authorization = platform_users / platform_role_assignments,        */}
        {/* NOT the tenant app_role list. RLS is the real boundary.            */}
        {/* ------------------------------------------------------------------ */}
        <Route
            path="/platform"
            element={
                <PlatformRoute>
                    <AppLayout>
                        <PlatformControlCenter />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/organizations"
            element={
                <PlatformRoute requiredPermission="tenant.read">
                    <AppLayout>
                        <OrganizationsHub />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/organizations/:id"
            element={
                <PlatformRoute requiredPermission="tenant.read">
                    <AppLayout>
                        <OrganizationProfile />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/users"
            element={
                <PlatformRoute requiredPermission="operator.manage">
                    <AppLayout>
                        <PlatformUserDirectory />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/master-library"
            element={
                <PlatformRoute requiredPermission="master_content.manage">
                    <AppLayout>
                        <MasterContentLibrary />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/operations"
            element={
                <PlatformRoute requiredPermission="ops.manage">
                    <AppLayout>
                        <PlatformOperationsHub />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/settings"
            element={
                <PlatformRoute requiredPermission="config.manage">
                    <AppLayout>
                        <PlatformSettings />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/analytics"
            element={
                <PlatformRoute requiredPermission="tenant.read">
                    <AppLayout>
                        <PlatformAnalytics />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/audit"
            element={
                <PlatformRoute requiredPermission="tenant.read">
                    <AppLayout>
                        <PlatformAuditLogs />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/ai-settings"
            element={
                <PlatformRoute requiredPermission="config.manage">
                    <AppLayout>
                        <AICourseGeneratorSettings />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/email-templates"
            element={
                <PlatformRoute requiredPermission="config.manage">
                    <AppLayout>
                        <EmailTemplateEditor />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/email-analytics"
            element={
                <PlatformRoute requiredPermission="ops.manage">
                    <AppLayout>
                        <EmailAnalytics />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/email-inbound"
            element={
                <PlatformRoute requiredPermission="ops.manage">
                    <AppLayout>
                        <InboundEmails />
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/retention-policies"
            element={
                <PlatformRoute requiredPermission="config.manage">
                    <AppLayout>
                        <MotionWrapper>
                            <AuditRetentionPolicies />
                        </MotionWrapper>
                    </AppLayout>
                </PlatformRoute>
            }
        />
        <Route
            path="/platform/wizards"
            element={
                <PlatformRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <WizardManager />
                        </MotionWrapper>
                    </AppLayout>
                </PlatformRoute>
            }
        />
    </>
)
