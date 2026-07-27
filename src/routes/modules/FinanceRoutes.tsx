import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const Budgets = lazy(() => import('@/pages/finance/Budgets'))
const Invoices = lazy(() => import('@/pages/finance/Invoices'))

export const FinanceRoutes = () => (
    <>
        <Route
            path="/finance/budgets"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <Budgets />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/finance/invoices"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <Invoices />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
