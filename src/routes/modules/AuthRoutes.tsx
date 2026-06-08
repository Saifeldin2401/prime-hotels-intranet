import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy, Suspense } from 'react'
import { Outlet, Route } from 'react-router-dom'

const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const CompleteInvite = lazy(() => import('@/pages/auth/CompleteInvite'))
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))
const MFASetupPage = lazy(() => import('@/pages/auth/MFASetupPage'))
const MFAVerifyPage = lazy(() => import('@/pages/auth/MFAVerifyPage'))

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function StandaloneAuthLayout() {
  return (
    <Suspense fallback={<FullscreenLoader />}>
      <Outlet />
    </Suspense>
  )
}

export const StandaloneAuthRoutes = () => {
  return (
    <Route element={<StandaloneAuthLayout />}>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/complete-invite" element={<CompleteInvite />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/mfa/setup"
        element={
          <ProtectedRoute>
            <MFASetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mfa/verify"
        element={
          <ProtectedRoute>
            <MFAVerifyPage />
          </ProtectedRoute>
        }
      />
    </Route>
  )
}

export const AuthRoutes = () => {
  return (
    <>
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="flex min-h-[80vh] items-center justify-center">
                <ChangePassword />
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </>
  )
}
