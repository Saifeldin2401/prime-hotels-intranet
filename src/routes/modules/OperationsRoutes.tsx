import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const OperationsDashboard = lazy(() => import('@/pages/operations/OperationsDashboard'))
const DataImport = lazy(() => import('@/pages/operations/DataImport'))
const OperationsAnalytics = lazy(() => import('@/pages/operations/OperationsAnalytics'))
const DailyFlashReport = lazy(() => import('@/pages/operations/DailyFlashReport'))

export const OperationsRoutes = () => (
    <>
        <Route
            path="/operations"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <OperationsDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/import"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <DataImport />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/analytics"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <OperationsAnalytics />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/flash-report"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <DailyFlashReport />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
