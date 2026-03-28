import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const GuestReviews = lazy(() => import('@/pages/reviews/GuestReviews'))
const GuestReviewSettings = lazy(() => import('@/pages/reviews/GuestReviewSettings'))

export const GuestReviewRoutes = () => (
  <>
    <Route
      path="/reviews"
      element={
        <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
          <AppLayout>
            <GuestReviews />
          </AppLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/reviews/settings"
      element={
        <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
          <AppLayout>
            <GuestReviewSettings />
          </AppLayout>
        </ProtectedRoute>
      }
    />
  </>
)
