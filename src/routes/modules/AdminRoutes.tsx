import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const UserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const BulkUserProvisioning = lazy(() => import('@/pages/admin/BulkUserProvisioning'))
const OrganizationalControlCenter = lazy(() => import('@/pages/admin/OrganizationalControlCenter'))
const PropertyManagement = lazy(() => import('@/pages/admin/PropertyManagement'))
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))
const PIIAuditViewer = lazy(() => import('@/pages/admin/PIIIAuditViewer').then(m => ({ default: m.PIIAuditViewer })))
const EscalationRules = lazy(() => import('@/pages/admin/EscalationRules'))
const NotificationBatches = lazy(() => import('@/pages/admin/notifications/NotificationBatches'))
const AdminAnalyticsDashboard = lazy(() => import('@/pages/admin/AdminAnalyticsDashboard'))
const RoutingHealth = lazy(() => import('@/pages/admin/RoutingHealth'))
const AICourseGeneratorSettings = lazy(() => import('@/pages/admin/AICourseGeneratorSettings'))
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'))
const SLASettings = lazy(() => import('@/pages/admin/SLASettings'))
const ManualCertificateGenerator = lazy(() => import('@/pages/admin/ManualCertificateGenerator'))
const TrainingCertificates = lazy(() => import('@/pages/training/TrainingCertificates'))
const EmailAnalytics = lazy(() => import('@/pages/admin/EmailAnalytics'))
const InboundEmails = lazy(() => import('@/pages/admin/InboundEmails'))
const EmailTemplateEditor = lazy(() => import('@/pages/admin/EmailTemplateEditor'))
const NewsPublisher = lazy(() => import('@/pages/admin/NewsPublisher'))
const AuditRetentionPolicies = lazy(() => import('@/pages/admin/AuditRetentionPolicies'))
const ReportBuilder = lazy(() => import('@/pages/admin/ReportBuilder'))
const UserInvitations = lazy(() => import('@/pages/admin/UserInvitations'))

// Platform Owner Super Admin Pages
const OrganizationsHub = lazy(() => import('@/pages/platform/OrganizationsHub'))
const MasterContentLibrary = lazy(() => import('@/pages/platform/MasterContentLibrary'))
const PlatformAnalytics = lazy(() => import('@/pages/platform/PlatformAnalytics'))
const PlatformAuditLogs = lazy(() => import('@/pages/platform/PlatformAuditLogs'))

export const AdminRoutes = () => (
    <>
        <Route
            path="/admin/users"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <UserManagement />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/users/bulk"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <BulkUserProvisioning />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/properties"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <PropertyManagement />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/analytics"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <AdminAnalyticsDashboard />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/audit"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <AuditLogs />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/pii-access"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <PIIAuditViewer />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/escalation"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <EscalationRules />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/routing-health"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <RoutingHealth />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/ai-course-generator"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin']}>
                    <AppLayout>
                        <AICourseGeneratorSettings />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/notifications"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <NotificationBatches />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/email-analytics"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <EmailAnalytics />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/email-templates"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <EmailTemplateEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/inbound-emails"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <InboundEmails />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/organization"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <MotionWrapper>
                            <OrganizationalControlCenter />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/sla"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <SLASettings />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/settings"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <SystemSettings />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/certificates"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <TrainingCertificates />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/certificates/generate"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <ManualCertificateGenerator />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/news-publisher"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <NewsPublisher />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/retention-policies"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AuditRetentionPolicies />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/report-builder"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <ReportBuilder />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/invitations"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <UserInvitations />
                    </AppLayout>
                </ProtectedRoute>
            }
        />

        {/* ------------------------------------------------------------------ */}
        {/* PLATFORM OWNER SUPER ADMIN ROUTES                                  */}
        {/* ------------------------------------------------------------------ */}
        <Route
            path="/platform/organizations"
            element={
                <ProtectedRoute allowedRoles={['super_admin', 'corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <OrganizationsHub />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/platform/master-library"
            element={
                <ProtectedRoute allowedRoles={['super_admin', 'corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <MasterContentLibrary />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/platform/analytics"
            element={
                <ProtectedRoute allowedRoles={['super_admin', 'corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <PlatformAnalytics />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/platform/audit"
            element={
                <ProtectedRoute allowedRoles={['super_admin', 'corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <PlatformAuditLogs />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
