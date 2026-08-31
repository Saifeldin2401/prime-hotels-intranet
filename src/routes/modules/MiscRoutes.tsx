import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const MyProfile = lazy(() => import('@/pages/profile/MyProfile'))
const UserProfile = lazy(() => import('@/pages/profile/UserProfile'))
const Settings = lazy(() => import('@/pages/settings/Settings'))
const GlobalSearch = lazy(() => import('@/pages/search/GlobalSearch'))
const Notifications = lazy(() => import('@/pages/notifications/Notifications'))
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'))
const DocumentDetail = lazy(() => import('@/pages/documents/DocumentDetail'))
const DocumentLibrary = lazy(() => import('@/pages/documents/DocumentLibrary'))

export const MiscRoutes = () => (
    <>
        <Route
            path="/profile"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <MyProfile />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/profile/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <UserProfile />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/settings"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <Settings />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/search"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <GlobalSearch />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route path="/help" element={<PreserveQueryNavigate to="/knowledge" />} />
        <Route
            path="/notifications"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <Notifications />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/reports"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <ReportsDashboard />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/documents"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MotionWrapper>
                            <DocumentLibrary />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/documents/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <DocumentDetail />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
