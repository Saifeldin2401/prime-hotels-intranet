import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const RoomStatusBoard = lazy(() => import('@/pages/housekeeping/RoomStatusBoard'))
const HousekeepingTasks = lazy(() => import('@/pages/housekeeping/HousekeepingTasks'))

export const HousekeepingRoutes = () => (
    <>
        <Route
            path="/housekeeping/rooms"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <RoomStatusBoard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/housekeeping/tasks"
            element={
                <ProtectedRoute allowedRoles={['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <HousekeepingTasks />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
