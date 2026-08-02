import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const OperationsDashboard = lazy(() => import('@/pages/operations/OperationsDashboard'))
const DataImport = lazy(() => import('@/pages/operations/DataImport'))

const GuestRequests = lazy(() => import('@/pages/operations/GuestRequests'))
const Incidents = lazy(() => import('@/pages/operations/Incidents'))
const DailyLogbook = lazy(() => import('@/pages/operations/DailyLogbook'))
const VipGuests = lazy(() => import('@/pages/operations/VipGuests'))
const LostAndFound = lazy(() => import('@/pages/operations/LostAndFound'))
const CapexProjectsDashboard = lazy(() => import('@/pages/operations/CapexProjectsDashboard'))

export const OperationsRoutes = () => (
    <>
        <Route
            path="/operations/projects"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'department_head', 'manager', 'staff']}>
                    <AppLayout>
                        <MotionWrapper>
                            <CapexProjectsDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/capex"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'department_head', 'manager', 'staff']}>
                    <AppLayout>
                        <MotionWrapper>
                            <CapexProjectsDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
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
            path="/operations/guest-requests"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <GuestRequests />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/incidents"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <Incidents />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/logbook"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <DailyLogbook />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/vip-guests"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <VipGuests />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/operations/lost-found"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <LostAndFound />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
