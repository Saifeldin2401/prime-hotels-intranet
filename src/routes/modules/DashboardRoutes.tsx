import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteErrorBoundary } from '@/components/common'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const ExecutiveGMDashboard = lazy(() => import('@/pages/dashboard/ExecutiveGMDashboard'))

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
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />

      {/* General Manager / Operations executive scorecard */}
      <Route
        path="/dashboard/executive"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'corporate_admin', 'regional_admin', 'property_manager', 'training_manager', 'administrator']}>
            <AppLayout>
              <MotionWrapper>
                <ExecutiveGMDashboard />
              </MotionWrapper>
            </AppLayout>
          </ProtectedRoute>
        }
        errorElement={<RouteErrorBoundary section="Executive Dashboard" />}
      />
      
      {/* Legacy redirects - preserve query params (e.g., ?redirect=...) */}
      <Route
        path="/home"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Home" />}
      />
      <Route
        path="/staff-dashboard"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
      <Route
        path="/dashboard/property-manager"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
      <Route
        path="/dashboard/property-hr"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
      <Route
        path="/dashboard/department-head"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
      <Route
        path="/dashboard/regional-hr"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
      <Route
        path="/dashboard/corporate-admin"
        element={<PreserveQueryNavigate to="/dashboard" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
    </>
  )
}

export default DashboardRoutes
