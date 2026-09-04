import { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

const ContentReviewQueue = lazy(() => import('@/pages/manage/ContentReviewQueue'))

/**
 * "Manage" section -- shared governance surfaces that span courses, articles
 * and assessments. Kept deliberately small; the nav wiring lives in
 * src/config/navigation.ts (churned elsewhere).
 */
export const ManageRoutes = () => (
    <>
        <Route
            path="/manage/review"
            element={
                <ProtectedRoute
                    allowedRoles={[
                        'administrator',
                        'super_admin',
                        'corporate_admin',
                        'regional_admin',
                        'regional_hr',
                        'property_manager',
                        'property_hr',
                    ]}
                >
                    <AppLayout>
                        <ContentReviewQueue />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/manage/review-queue"
            element={<Navigate to="/manage/review" replace />}
        />
    </>
)
