import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { PropertyProvider } from '@/contexts/PropertyContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import Login from '@/pages/Login'
import Unauthorized from '@/pages/Unauthorized'
import { StaffDashboard } from '@/pages/dashboard/StaffDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import PropertyManagement from '@/pages/admin/PropertyManagement'
import DocumentLibrary from '@/pages/documents/DocumentLibrary'
import DocumentDetail from '@/pages/documents/DocumentDetail'
import TrainingModules from '@/pages/training/TrainingModules'
import MyTraining from '@/pages/training/MyTraining'
import TrainingDashboard from '@/pages/training/TrainingDashboard'
import TrainingBuilder from '@/pages/training/TrainingBuilder'
import TrainingAssignments from '@/pages/training/TrainingAssignments'
import TrainingCertificates from '@/pages/training/TrainingCertificates'
import TrainingPaths from '@/pages/training/TrainingPaths'
import AnnouncementFeed from '@/pages/announcements/AnnouncementFeed'
import SOPLibrary from '@/pages/sop/SOPLibrary'
import SubmitTicket from '@/pages/maintenance/SubmitTicket'
import MaintenanceDashboard from '@/pages/maintenance/MaintenanceDashboard'
import MaintenanceTicketDetail from '@/pages/maintenance/MaintenanceTicketDetail'
import ReportsDashboard from '@/pages/reports/ReportsDashboard'
import EmployeeReferrals from '@/pages/hr/EmployeeReferrals'
import MyLeaveRequests from '@/pages/hr/MyLeaveRequests'
import AuditLogs from '@/pages/admin/AuditLogs'
import EscalationRules from '@/pages/admin/EscalationRules'
import { PIIAuditViewer } from '@/pages/admin/PIIIAuditViewer'
import AnalyticsDashboard from '@/pages/dashboard/AnalyticsDashboard'
import MyApprovals from '@/pages/approvals/MyApprovals'
import TasksDashboard from '@/pages/tasks/TasksDashboard'
import TaskDetail from '@/pages/tasks/TaskDetail'
import MessagingDashboard from '@/pages/messaging/MessagingDashboard'
import MessageDetail from '@/pages/messaging/MessageDetail'
import MyProfile from '@/pages/profile/MyProfile'
import Settings from '@/pages/settings/Settings'
import ApprovalsDashboard from '@/pages/approvals/ApprovalsDashboard'
import EmployeeDirectory from '@/pages/directory/EmployeeDirectory'
import GlobalSearch from '@/pages/search/GlobalSearch'
import JobPostings from '@/pages/jobs/JobPostings'
import JobPostingDetail from '@/pages/jobs/JobPostingDetail'
import CreateJobPosting from '@/pages/jobs/CreateJobPosting'
import EditJobPosting from '@/pages/jobs/EditJobPosting'
import PromotionWorkflow from '@/pages/hr/PromotionWorkflow'
import TransferWorkflow from '@/pages/hr/TransferWorkflow'
import PromotionTransferHistory from '@/pages/hr/PromotionTransferHistory'
import SOPQuizBuilder from '@/pages/sop/SOPQuizBuilder'
import SOPQuizTaker from '@/pages/sop/SOPQuizTaker'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AnalyticsDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyProfile />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ApprovalsDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/directory"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EmployeeDirectory />
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
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StaffDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff-dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StaffDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr']}>
            <AppLayout>
              <UserManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/properties"
        element={
          <ProtectedRoute allowedRoles={['regional_admin']}>
            <AppLayout>
              <PropertyManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={['regional_admin']}>
            <AppLayout>
              <AuditLogs />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/escalation"
        element={
          <ProtectedRoute allowedRoles={['regional_admin']}>
            <AppLayout>
              <EscalationRules />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pii-audit"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr']}>
            <AppLayout>
              <PIIAuditViewer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DocumentLibrary />
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
      <Route
        path="/approvals"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
            <AppLayout>
              <MyApprovals />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/modules"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
            <AppLayout>
              <TrainingModules />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/my"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyTraining />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/builder"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
            <AppLayout>
              <TrainingBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/assignments"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'department_head']}>
            <AppLayout>
              <TrainingAssignments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/paths"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingPaths />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/certificates"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingCertificates />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AnnouncementFeed />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sop"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SOPLibrary />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
            <AppLayout>
              <MaintenanceDashboard />
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
        path="/hr"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EmployeeReferrals />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/leave"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyLeaveRequests />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/referrals"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <EmployeeReferrals />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/promotions/new"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <PromotionWorkflow />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/transfers/new"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr']}>
            <AppLayout>
              <TransferWorkflow />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/promotions/history"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <PromotionTransferHistory />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/transfers/history"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <PromotionTransferHistory />
            </AppLayout>
          </ProtectedRoute>
        }
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AuthProvider>
              <PropertyProvider>
                <AppRoutes />
              </PropertyProvider>
            </AuthProvider>
          </BrowserRouter>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
