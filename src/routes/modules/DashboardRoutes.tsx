import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))

// Helper component to preserve query params during redirect
const PreserveQueryNavigate = ({ to }: { to: string }) => {
  const location = useLocation()
  // Handle merging query params if 'to' already has some
  const hasQueryParams = to.includes('?')
  const preservedSearch = location.search ? (hasQueryParams ? location.search.replace('?', '&') : location.search) : ''
  return <Navigate to={`${to}${preservedSearch}`} replace />
}

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
