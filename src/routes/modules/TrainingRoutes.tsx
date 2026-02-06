import { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { MotionWrapper } from '@/components/ui/MotionWrapper'

const TrainingModules = lazy(() => import('@/pages/training/TrainingModules'))
const MyCertificates = lazy(() => import('@/pages/training/MyCertificates'))
const TrainingBuilder = lazy(() => import('@/pages/training/TrainingBuilder'))
const TrainingAssignments = lazy(() => import('@/pages/training/TrainingAssignments'))
const TrainingAssignmentRules = lazy(() => import('@/pages/training/TrainingAssignmentRules'))
const TrainingPaths = lazy(() => import('@/pages/training/TrainingPaths'))
const TrainingPlayer = lazy(() => import('@/pages/training/TrainingPlayer'))
const TrainingAnalytics = lazy(() => import('@/pages/training/TrainingAnalytics'))
const MyLearning = lazy(() => import('@/pages/learning/MyLearning'))
const QuizList = lazy(() => import('@/pages/learning/QuizList'))
const QuizBuilder = lazy(() => import('@/pages/learning/QuizBuilder'))
const QuizPlayer = lazy(() => import('@/pages/learning/QuizPlayer'))
const AssignmentManager = lazy(() => import('@/pages/learning/AssignmentManager'))
const MicrolearningViewer = lazy(() => import('@/pages/learning/MicrolearningViewer'))

export const TrainingRoutes = () => (
    <>
        <Route
            path="/training/modules"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <MotionWrapper>
                            <TrainingModules />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/training/my"
            element={<Navigate to="/learning/my" replace />}
        />
        <Route
            path="/training/certificates"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyCertificates />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/training/builder"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <TrainingBuilder />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/training/builder/:id"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager']}>
                    <AppLayout>
                        <TrainingBuilder />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/training/assignments"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_manager', 'department_head']}>
                    <AppLayout>
                        <TrainingAssignments />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/training/assignments/rules"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'department_head']}>
                    <AppLayout>
                        <TrainingAssignmentRules />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/training/paths"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <TrainingPaths />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/quizzes"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <QuizList />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/quizzes/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <QuizBuilder />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/quizzes/:id"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <QuizBuilder />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/quizzes/:id/take"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <QuizPlayer />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/assignments"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <AssignmentManager />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/my"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MyLearning />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/microlearning/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <MicrolearningViewer />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/training/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <TrainingPlayer />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/learning/analytics"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <TrainingAnalytics />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
