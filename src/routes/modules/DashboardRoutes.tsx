import React, { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { RoleBasedRedirect } from '@/components/auth/RoleBasedRedirect'

const StaffDashboard = lazy(() => import('@/pages/dashboard/StaffDashboard').then(m => ({ default: m.StaffDashboard })))
const PropertyManagerDashboard = lazy(() => import('@/pages/dashboard/PropertyManagerDashboard').then(m => ({ default: m.PropertyManagerDashboard })))
const PropertyHRDashboard = lazy(() => import('@/pages/dashboard/PropertyHRDashboard').then(m => ({ default: m.PropertyHRDashboard })))
const DepartmentHeadDashboard = lazy(() => import('@/pages/dashboard/DepartmentHeadDashboard').then(m => ({ default: m.DepartmentHeadDashboard })))
const AreaManagerDashboard = lazy(() => import('@/pages/dashboard/AreaManagerDashboard').then(m => ({ default: m.AreaManagerDashboard })))
const CorporateAdminDashboard = lazy(() => import('@/pages/dashboard/CorporateAdminDashboard').then(m => ({ default: m.CorporateAdminDashboard })))
const AnalyticsDashboard = lazy(() => import('@/pages/dashboard/AnalyticsDashboard'))
const PropertyDetails = lazy(() => import('@/pages/dashboard/PropertyDetails'))
const DepartmentDetails = lazy(() => import('@/pages/dashboard/DepartmentDetails'))
const MyTeam = lazy(() => import('@/pages/dashboard/MyTeam'))

export const DashboardRoutes = () => (
    <>
        <Route
            path="/home"
            element={
                <ProtectedRoute>
                    <RoleBasedRedirect />
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AnalyticsDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/staff-dashboard"
            element={
                <ProtectedRoute allowedRoles={['staff']}>
                    <AppLayout>
                        <MotionWrapper>
                            <StaffDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard/property-manager"
            element={
                <ProtectedRoute allowedRoles={['property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <PropertyManagerDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard/property-hr"
            element={
                <ProtectedRoute allowedRoles={['property_hr']}>
                    <AppLayout>
                        <MotionWrapper>
                            <PropertyHRDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard/department-head"
            element={
                <ProtectedRoute allowedRoles={['department_head']}>
                    <AppLayout>
                        <MotionWrapper>
                            <DepartmentHeadDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard/regional-hr"
            element={
                <ProtectedRoute allowedRoles={['regional_hr']}>
                    <AppLayout>
                        <MotionWrapper>
                            <AreaManagerDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard/corporate-admin"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'corporate_admin']}>
                    <AppLayout>
                        <MotionWrapper>
                            <CorporateAdminDashboard />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/dashboard/my-team"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <MotionWrapper>
                            <MyTeam />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/properties/:id"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr']}>
                    <AppLayout>
                        <PropertyDetails />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/departments/:id"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <DepartmentDetails />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
