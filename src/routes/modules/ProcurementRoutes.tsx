import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import type { AppRole } from '@/lib/constants'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const Suppliers = lazy(() => import('@/pages/procurement/Suppliers'))
const PurchaseRequests = lazy(() => import('@/pages/procurement/PurchaseRequests'))
const PurchaseOrders = lazy(() => import('@/pages/procurement/PurchaseOrders'))
const Inventory = lazy(() => import('@/pages/procurement/Inventory'))

const ALLOWED_ROLES: AppRole[] = ['staff', 'department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin', 'corporate_admin']

export const ProcurementRoutes = () => (
    <>
        <Route
            path="/procurement/suppliers"
            element={
                <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
                    <AppLayout>
                        <MotionWrapper>
                            <Suppliers />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/procurement/requests"
            element={
                <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
                    <AppLayout>
                        <MotionWrapper>
                            <PurchaseRequests />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/procurement/orders"
            element={
                <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
                    <AppLayout>
                        <MotionWrapper>
                            <PurchaseOrders />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/procurement/inventory"
            element={
                <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
                    <AppLayout>
                        <MotionWrapper>
                            <Inventory />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
