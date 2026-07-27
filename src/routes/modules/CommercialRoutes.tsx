import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const AccountsList = lazy(() => import('@/pages/commercial/AccountsList'))
const LeadsPipeline = lazy(() => import('@/pages/commercial/LeadsPipeline'))
const ContractsList = lazy(() => import('@/pages/commercial/ContractsList'))

export const CommercialRoutes = () => (
    <>
        <Route
            path="/commercial/accounts"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AccountsList />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/commercial/leads"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <LeadsPipeline />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/commercial/contracts"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <ContractsList />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
