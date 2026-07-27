import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const UserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const BulkUserProvisioning = lazy(() => import('@/pages/admin/BulkUserProvisioning'))
const OrganizationalControlCenter = lazy(() => import('@/pages/admin/OrganizationalControlCenter'))
const JobTitles = lazy(() => import('@/pages/admin/JobTitles'))
const PropertyManagement = lazy(() => import('@/pages/admin/PropertyManagement'))
const CompanyManagement = lazy(() => import('@/pages/admin/CompanyManagement'))
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))
const PIIAuditViewer = lazy(() => import('@/pages/admin/PIIIAuditViewer').then(m => ({ default: m.PIIAuditViewer })))
const EscalationRules = lazy(() => import('@/pages/admin/EscalationRules'))
const WorkflowDashboard = lazy(() => import('@/pages/admin/workflows/WorkflowDashboard'))
const NotificationBatches = lazy(() => import('@/pages/admin/notifications/NotificationBatches'))
const AdminAnalyticsDashboard = lazy(() => import('@/pages/admin/AdminAnalyticsDashboard'))
const OnboardingTemplates = lazy(() => import('@/pages/onboarding/OnboardingTemplates'))
const TemplateEditor = lazy(() => import('@/pages/onboarding/TemplateEditor'))
const RoutingHealth = lazy(() => import('@/pages/admin/RoutingHealth'))
const DelegationSettings = lazy(() => import('@/pages/admin/DelegationSettings'))
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'))
const SLASettings = lazy(() => import('@/pages/admin/SLASettings'))
const ManualCertificateGenerator = lazy(() => import('@/pages/admin/ManualCertificateGenerator'))
const EmailWriter = lazy(() => import('@/pages/admin/EmailWriter'))
const InboundEmails = lazy(() => import('@/pages/admin/InboundEmails'))
const NewsPublisher = lazy(() => import('@/pages/admin/NewsPublisher'))
const AuditRetentionPolicies = lazy(() => import('@/pages/admin/AuditRetentionPolicies'))
const ReportBuilder = lazy(() => import('@/pages/admin/ReportBuilder'))
const UserInvitations = lazy(() => import('@/pages/admin/UserInvitations'))
const AuditsControlCenter = lazy(() => import('@/components/audits/AuditsControlCenter').then(m => ({ default: m.AuditsControlCenter })))
const ComplianceDashboard = lazy(() => import('@/pages/compliance/ComplianceDashboard'))

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
            path="/admin/job-titles"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <JobTitles />
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
            path="/admin/companies"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin']}>
                    <AppLayout>
                        <CompanyManagement />
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
            path="/admin/workflows"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'property_manager']}>
                    <AppLayout>
                        <WorkflowDashboard />
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
            path="/admin/email-writer"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <EmailWriter />
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
            path="/admin/onboarding/templates"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <OnboardingTemplates />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/onboarding/templates/new"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <TemplateEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/onboarding/templates/:id"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <TemplateEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/delegations"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <DelegationSettings />
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
            path="/admin/quality-audits"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AuditsControlCenter />
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
        <Route
            path="/admin/compliance"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <ComplianceDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/compliance"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <ComplianceDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
