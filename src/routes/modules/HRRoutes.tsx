import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'

const EmployeeReferrals = lazy(() => import('@/pages/hr/EmployeeReferrals'))
const MyLeaveRequests = lazy(() => import('@/pages/hr/MyLeaveRequests'))
const PromotionWorkflow = lazy(() => import('@/pages/hr/PromotionWorkflow'))
const TransferWorkflow = lazy(() => import('@/pages/hr/TransferWorkflow'))
const PromotionTransferHistory = lazy(() => import('@/pages/hr/PromotionTransferHistory'))
const RequestDetail = lazy(() => import('@/pages/hr/RequestDetail'))
const RequestsInbox = lazy(() => import('@/pages/hr/RequestsInbox'))
const HROperationsCenter = lazy(() => import('@/pages/hr/HROperationsCenter'))
const MyAttendance = lazy(() => import('@/pages/hr/MyAttendance'))
const MyPerformance = lazy(() => import('@/pages/hr/MyPerformance'))
const MyGoals = lazy(() => import('@/pages/hr/MyGoals'))
const MyPayslips = lazy(() => import('@/pages/hr/MyPayslips'))
const MyExpenseClaims = lazy(() => import('@/pages/hr/MyExpenseClaims'))
const ShiftScheduling = lazy(() => import('@/pages/hr/ShiftScheduling'))
const HRControlCenter = lazy(() => import('@/pages/hr/HRControlCenter'))
const PerformanceReviewsAdmin = lazy(() => import('@/pages/hr/PerformanceReviewsAdmin'))
const GoalsAdmin = lazy(() => import('@/pages/hr/GoalsAdmin'))
const PayslipsAdmin = lazy(() => import('@/pages/hr/PayslipsAdmin'))
const OnboardingTracker = lazy(() => import('@/pages/onboarding/OnboardingTracker'))
const EmployeeOfMonthManagement = lazy(() => import('@/pages/hr/EmployeeOfMonthManagement'))

// New routes
const MyTeam = lazy(() => import('@/pages/hr/MyTeam'))
const PropertyDepartments = lazy(() => import('@/pages/hr/PropertyDepartments'))

export const HRRoutes = () => (
    <>
        <Route
            path="/hr"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <HRControlCenter />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/control"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <HRControlCenter />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/performance-management"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <PerformanceReviewsAdmin />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/goals-management"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <GoalsAdmin />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/payslips-management"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <PayslipsAdmin />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/attendance"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyAttendance />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/performance"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyPerformance />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/goals"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyGoals />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/payslips"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyPayslips />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/expenses"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyExpenseClaims />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/scheduling"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <ShiftScheduling />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/leave"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyLeaveRequests />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/request/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <RequestDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/inbox"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'property_manager', 'department_head']}>
                    <AppLayout>
                        <RequestsInbox />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/operations"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <HROperationsCenter />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/referrals"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <EmployeeReferrals />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/promotions/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <PromotionWorkflow />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/transfers/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <TransferWorkflow />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/promotions/history"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <PromotionTransferHistory />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/transfers/history"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <PromotionTransferHistory />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/onboarding"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <MotionWrapper>
                            <OnboardingTracker />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/employee-of-the-month"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <EmployeeOfMonthManagement />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/team"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <MyTeam />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/hr/departments"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr']}>
                    <AppLayout>
                        <PropertyDepartments />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
