import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import Login from '@/pages/Login'
import Unauthorized from '@/pages/Unauthorized'
import { StaffDashboard } from '@/pages/dashboard/StaffDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import DocumentLibrary from '@/pages/documents/DocumentLibrary'
import TrainingModules from '@/pages/training/TrainingModules'
import MyTraining from '@/pages/training/MyTraining'
import TrainingDashboard from '@/pages/training/TrainingDashboard'
import TrainingBuilder from '@/pages/training/TrainingBuilder'
import TrainingAssignments from '@/pages/training/TrainingAssignments'
import TrainingCertificates from '@/pages/training/TrainingCertificates'
import TrainingPaths from '@/pages/training/TrainingPaths'
import AnnouncementFeed from '@/pages/announcements/AnnouncementFeed'
import SOPLibrary from '@/pages/sop/SOPLibrary'
import MaintenanceDashboard from '@/pages/maintenance/MaintenanceDashboard'
import EmployeeReferrals from '@/pages/hr/EmployeeReferrals'
import AuditLogs from '@/pages/admin/AuditLogs'
import EscalationRules from '@/pages/admin/EscalationRules'
import AnalyticsDashboard from '@/pages/dashboard/AnalyticsDashboard'

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

  // Convert auth user to our User type for StaffDashboard
  const staffUser = user ? {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: 'staff' as const,
    department: 'Front Desk',
    property: 'Riyadh Downtown',
    permissions: []
  } : {
    id: 'unknown',
    name: 'Unknown User',
    email: 'unknown@example.com',
    role: 'staff' as const,
    department: 'Front Desk',
    property: 'Riyadh Downtown',
    permissions: []
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
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StaffDashboard user={staffUser} />
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
          <ProtectedRoute>
            <AppLayout>
              <MaintenanceDashboard />
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
        path="/tasks"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="p-6">
                <h1 className="text-2xl font-bold">Tasks & Checklists</h1>
                <p className="text-gray-600">Task management system coming soon...</p>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="p-6">
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="text-gray-600">Internal messaging system coming soon...</p>
              </div>
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
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
