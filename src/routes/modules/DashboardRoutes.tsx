import { RouteErrorBoundary } from '@/components/common'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { Route } from 'react-router-dom'

export function DashboardRoutes() {
  return (
    <>
      {/* Main Dashboard - All roles use same integrated dashboard */}
      <Route
        path="/dashboard"
        element={<PreserveQueryNavigate to="/learning/my" />}
        errorElement={<RouteErrorBoundary section="Dashboard" />}
      />
      
      {/* Legacy redirects - preserve query params (e.g., ?redirect=...) */}
      <Route
        path="/home"
        element={<PreserveQueryNavigate to="/learning/my" />}
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
