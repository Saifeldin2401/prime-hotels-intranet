import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'

// Helper component to preserve query params during redirect
const PreserveQueryNavigate = ({ to }: { to: string }) => {
  const location = useLocation()
  // Handle merging query params if 'to' already has some
  const hasQueryParams = to.includes('?')
  const preservedSearch = location.search ? (hasQueryParams ? location.search.replace('?', '&') : location.search) : ''
  return <Navigate to={`${to}${preservedSearch}`} replace />
}

const MyProfile = lazy(() => import('@/pages/profile/MyProfile'))
const UserProfile = lazy(() => import('@/pages/profile/UserProfile'))
const Settings = lazy(() => import('@/pages/settings/Settings'))
const ApprovalsDashboard = lazy(() => import('@/pages/approvals/ApprovalsDashboard'))
const EmployeeDirectory = lazy(() => import('@/pages/directory/EmployeeDirectory'))
const GlobalSearch = lazy(() => import('@/pages/search/GlobalSearch'))
const TasksDashboard = lazy(() => import('@/pages/tasks/TasksDashboard'))
const TaskDetail = lazy(() => import('@/pages/tasks/TaskDetail'))
const MessagingDashboard = lazy(() => import('@/pages/messaging/MessagingDashboard'))
const MessageDetail = lazy(() => import('@/pages/messaging/MessageDetail'))
const AnnouncementFeed = lazy(() => import('@/pages/announcements/AnnouncementFeed'))
const AnnouncementDetail = lazy(() => import('@/pages/announcements/AnnouncementDetail'))
const AnnouncementAnalytics = lazy(() => import('@/pages/announcements/AnnouncementAnalytics'))
const MaintenanceDashboard = lazy(() => import('@/pages/maintenance/MaintenanceDashboard'))
const PreventiveMaintenance = lazy(() => import('@/pages/maintenance/PreventiveMaintenance'))
const SubmitTicket = lazy(() => import('@/pages/maintenance/SubmitTicket'))
const MaintenanceTicketDetail = lazy(() => import('@/pages/maintenance/MaintenanceTicketDetail'))
const OnboardingDashboard = lazy(() => import('@/pages/onboarding/OnboardingDashboard'))
const Notifications = lazy(() => import('@/pages/notifications/Notifications'))
const JobPostings = lazy(() => import('@/pages/jobs/JobPostings'))
const CreateJobPosting = lazy(() => import('@/pages/jobs/CreateJobPosting'))
const JobPostingDetail = lazy(() => import('@/pages/jobs/JobPostingDetail'))
const EditJobPosting = lazy(() => import('@/pages/jobs/EditJobPosting'))
const EmployeeReferrals = lazy(() => import('@/pages/hr/EmployeeReferrals'))
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'))
const DocumentDetail = lazy(() => import('@/pages/documents/DocumentDetail'))
const DocumentLibrary = lazy(() => import('@/pages/documents/DocumentLibrary'))

export const MiscRoutes = () => (
    <>
        <Route
            path="/profile"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <MyProfile />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/profile/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <UserProfile />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/settings"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <Settings />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/approvals"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <ApprovalsDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/directory"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <EmployeeDirectory />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/search"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <GlobalSearch />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/messages"
            element={<PreserveQueryNavigate to="/messaging" />}
        />
        <Route
            path="/tasks"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <TasksDashboard />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/tasks/:taskId"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <TaskDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/messaging"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MessagingDashboard />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/messaging/:messageId"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MessageDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/announcements"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <AnnouncementFeed />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/announcements/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <AnnouncementDetail />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/announcements/:id/analytics"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AnnouncementAnalytics />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/help"
            element={<PreserveQueryNavigate to="/knowledge" />}
        />
        <Route
            path="/maintenance"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <MaintenanceDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/maintenance/preventive"
            element={
                <ProtectedRoute allowedRoles={['department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <PreventiveMaintenance />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/maintenance/submit"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <SubmitTicket />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/maintenance/tickets/:id"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MaintenanceTicketDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/onboarding"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <OnboardingDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/notifications"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <Notifications />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/jobs"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <JobPostings />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/jobs/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'property_manager']}>
                    <AppLayout>
                        <CreateJobPosting />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/jobs/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <JobPostingDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/jobs/:id/edit"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'property_manager']}>
                    <AppLayout>
                        <EditJobPosting />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/jobs/referrals"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <EmployeeReferrals />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/reports"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <ReportsDashboard />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/documents"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <DocumentLibrary />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/documents/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <DocumentDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
