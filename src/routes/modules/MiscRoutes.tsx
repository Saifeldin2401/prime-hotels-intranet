import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const MyProfile = lazy(() => import('@/pages/profile/MyProfile'))
const UserProfile = lazy(() => import('@/pages/profile/UserProfile'))
const Settings = lazy(() => import('@/pages/settings/Settings'))
const GlobalSearch = lazy(() => import('@/pages/search/GlobalSearch'))
const Notifications = lazy(() => import('@/pages/notifications/Notifications'))

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
    </>
)
