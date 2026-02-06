import React, { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'

const UserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const OrganizationalControlCenter = lazy(() => import('@/pages/admin/OrganizationalControlCenter'))
const JobTitles = lazy(() => import('@/pages/admin/JobTitles'))
const PropertyManagement = lazy(() => import('@/pages/admin/PropertyManagement'))
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))
const PIIAuditViewer = lazy(() => import('@/pages/admin/PIIIAuditViewer').then(m => ({ default: m.PIIAuditViewer })))
const EscalationRules = lazy(() => import('@/pages/admin/EscalationRules'))
const WorkflowDashboard = lazy(() => import('@/pages/admin/workflows/WorkflowDashboard'))
const NotificationBatches = lazy(() => import('@/pages/admin/notifications/NotificationBatches'))
const AIToolsPage = lazy(() => import('@/pages/admin/AIToolsPage'))
const AdminAnalyticsDashboard = lazy(() => import('@/pages/admin/AdminAnalyticsDashboard'))
const OnboardingTemplates = lazy(() => import('@/pages/onboarding/OnboardingTemplates'))
const TemplateEditor = lazy(() => import('@/pages/onboarding/TemplateEditor'))

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
            path="/admin/ai-tools"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AIToolsPage />
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
    </>
)
