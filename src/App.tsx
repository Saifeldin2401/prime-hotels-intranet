import { useEffect } from 'react'
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
import { RoleBasedRedirect } from '@/components/auth/RoleBasedRedirect'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import Login from '@/pages/Login'
import Unauthorized from '@/pages/Unauthorized'
import { StaffDashboard } from '@/pages/dashboard/StaffDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import PropertyManagement from '@/pages/admin/PropertyManagement'
import DocumentLibrary from '@/pages/documents/DocumentLibrary'
import DocumentDetail from '@/pages/documents/DocumentDetail'
import TrainingModules from '@/pages/training/TrainingModules'

import MyCertificates from '@/pages/training/MyCertificates'

import TrainingBuilder from '@/pages/training/TrainingBuilder'
import TrainingAssignments from '@/pages/training/TrainingAssignments'
import TrainingCertificates from '@/pages/training/TrainingCertificates'
import TrainingPaths from '@/pages/training/TrainingPaths'
import AnnouncementFeed from '@/pages/announcements/AnnouncementFeed'

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
import RequestDetail from '@/pages/hr/RequestDetail'
import RequestsInbox from '@/pages/hr/RequestsInbox'
import HROperationsCenter from '@/pages/hr/HROperationsCenter'

import KnowledgeHome from '@/pages/knowledge/KnowledgeHome'
import KnowledgeViewer from '@/pages/knowledge/KnowledgeViewer'
import KnowledgeSearch from '@/pages/knowledge/KnowledgeSearch'
import KnowledgeBrowse from '@/pages/knowledge/KnowledgeBrowse'
import KnowledgeEditor from '@/pages/knowledge/KnowledgeEditor'
import KnowledgeAnalytics from '@/pages/knowledge/KnowledgeAnalytics'
import KnowledgeReview from '@/pages/knowledge/KnowledgeReview'
import QuestionEditor from '@/pages/questions/QuestionEditor'
import QuestionReview from '@/pages/questions/QuestionReview'
import QuestionLibrary from '@/pages/questions/QuestionLibrary'
import QuestionGeneratorPage from '@/pages/questions/QuestionGeneratorPage'
import QuizBuilder from '@/pages/learning/QuizBuilder'
import QuizList from '@/pages/learning/QuizList'
import MyLearning from '@/pages/learning/MyLearning'
import AssignmentManager from '@/pages/learning/AssignmentManager'
import QuizPlayer from '@/pages/learning/QuizPlayer'
import MicrolearningViewer from '@/pages/learning/MicrolearningViewer'
import TrainingPlayer from '@/pages/training/TrainingPlayer'
import TrainingAnalytics from '@/pages/training/TrainingAnalytics'
import PublicHome from '@/pages/public/PublicHome'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'

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
  const { t, i18n } = useTranslation('common')

  // Sync document direction and language with i18n
  useEffect(() => {
    document.documentElement.dir = i18n.dir()
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Home - Default route for non-authenticated users */}
      <Route
        path="/"
        element={user ? <Navigate to="/home" replace /> : <PublicHome />}
      />
      {/* Authenticated Home - Redirects based on role */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/home" replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route path="/unauthorized" element={<Unauthorized />} />
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
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
            <AppLayout>
              <AnalyticsDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff-dashboard"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
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
          <ProtectedRoute>
            <AppLayout>
              <MyApprovals />
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
        element={<Navigate to="/learning/my" replace />}
      />
      <Route
        path="/training/certificates"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyCertificates />
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
      {/* Knowledge Base Routes */}
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeHome />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeViewer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/search"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeSearch />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/browse"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeBrowse />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/create"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeEditor />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/:id/edit"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeEditor />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/analytics"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KnowledgeAnalytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/review"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <KnowledgeReview />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuestionLibrary />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions/new"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <QuestionEditor />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions/generate"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <QuestionGeneratorPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuestionReview />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <QuestionEditor />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Learning Management Routes */}
      <Route
        path="/learning/quizzes"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
            <AppLayout>
              <QuizList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/quizzes/new"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
            <AppLayout>
              <QuizBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/quizzes/:id"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
            <AppLayout>
              <QuizBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Legacy SOP Routes - Redirected */}
      <Route path="/sop/quiz/builder" element={<Navigate to="/learning/quizzes/new" replace />} />
      <Route path="/sop/quiz/:id" element={<Navigate to="/learning/quizzes/:id/take" replace />} />
      <Route
        path="/learning/quizzes/:id/take"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuizPlayer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/assignments"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
            <AppLayout>
              <AssignmentManager />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/my"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyLearning />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/microlearning/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MicrolearningViewer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/training/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingPlayer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning/analytics"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingAnalytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* Training Routes */}
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingModules />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingAnalytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/modules"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingModules />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/builder"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/builder/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrainingBuilder />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/assignments"
        element={
          <ProtectedRoute>
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
      <Route path="/sop" element={<Navigate to="/knowledge" replace />} />
      <Route path="/sop/:id" element={<Navigate to="/knowledge/:id" replace />} />
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
        path="/hr/request/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RequestDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/inbox"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'department_head']}>
            <AppLayout>
              <RequestsInbox />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/operations"
        element={
          <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
            <AppLayout>
              <HROperationsCenter />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/referrals"
        element={
          <ProtectedRoute>
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
