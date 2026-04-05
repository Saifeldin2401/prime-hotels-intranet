import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))

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
      
      {/* Legacy redirects - preserve query params (e.g., ?redirect=...) */}
      <Route
        path="/home"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
      <Route
        path="/staff-dashboard"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
      <Route
        path="/dashboard/property-manager"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
      <Route
        path="/dashboard/property-hr"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
      <Route
        path="/dashboard/department-head"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
      <Route
        path="/dashboard/regional-hr"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
      <Route
        path="/dashboard/corporate-admin"
        element={<PreserveQueryNavigate to="/dashboard" />}
      />
    </>
  )
}

export default DashboardRoutes
