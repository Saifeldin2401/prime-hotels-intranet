import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import Dashboard from '@/pages/dashboard/Dashboard'
import { Navigate, Route } from 'react-router-dom'

export function DashboardRoutes() {
  return (
    <>
      {/* Main Dashboard - All roles use same integrated dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MotionWrapper>
                <Dashboard />
              </MotionWrapper>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Legacy redirects */}
      <Route
        path="/home"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/staff-dashboard"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/property-manager"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/property-hr"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/department-head"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/regional-hr"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/corporate-admin"
        element={<Navigate to="/dashboard" replace />}
      />
    </>
  )
}

export default DashboardRoutes
