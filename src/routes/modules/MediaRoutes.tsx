import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const MediaLibrary = lazy(() => import('@/pages/media/MediaLibrary'))

export const MediaRoutes = () => (
  <>
    <Route
      path="/media"
      element={
        <ProtectedRoute>
          <AppLayout>
            <MediaLibrary />
          </AppLayout>
        </ProtectedRoute>
      }
    />
  </>
)
