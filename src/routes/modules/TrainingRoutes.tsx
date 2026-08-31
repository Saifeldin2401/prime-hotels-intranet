import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteErrorBoundary } from '@/components/common'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { lazy } from 'react'
import { Navigate, Route, useLocation, useParams } from 'react-router-dom'

const TrainingHub = lazy(() => import('@/pages/training/TrainingHub'))
const MyCertificates = lazy(() => import('@/pages/training/MyCertificates'))
const TrainingAssignmentRules = lazy(() => import('@/pages/training/TrainingAssignmentRules'))
const TrainingPaths = lazy(() => import('@/pages/training/TrainingPaths'))
const TrainingPlayer = lazy(() => import('@/pages/training/TrainingPlayer'))
const TrainingAnalytics = lazy(() => import('@/pages/training/TrainingAnalytics'))
const LearningAnalyticsHub = lazy(() => import('@/pages/analytics/LearningAnalyticsHub'))
const SkillsMatrix = lazy(() => import('@/pages/training/SkillsMatrix'))
const CompetencyMatrix = lazy(() => import('@/pages/training/CompetencyMatrix'))
const InstructorWorkspace = lazy(() => import('@/pages/training/InstructorWorkspace'))
const MyLearning = lazy(() => import('@/pages/learning/MyLearning'))
// Consolidated assessment surfaces (see src/pages/assessments/). The QuestionBank
// browse page is routed from KnowledgeRoutes at /assessments.
const AssessmentBuilder = lazy(() => import('@/pages/assessments/AssessmentBuilder'))
const AssessmentPlayer = lazy(() => import('@/pages/assessments/AssessmentPlayer'))
const AssignmentManager = lazy(() => import('@/pages/learning/AssignmentManager'))
const MicrolearningViewer = lazy(() => import('@/pages/learning/MicrolearningViewer'))

const LegacyQuizTakeRedirect = () => {
    const { id } = useParams()
    const location = useLocation()
    return <Navigate to={`/assessments/${id}/take${location.search}${location.hash}`} replace />
}

const LegacyQuizEditRedirect = () => {
    const { id } = useParams()
    const location = useLocation()
    return <Navigate to={`/assessments/builder/${id}${location.search}${location.hash}`} replace />
}

const TrainingBuilderRedirect = () => {
    const { id } = useParams()
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    params.set('view', 'builder')
    return <Navigate to={`/training/hub/${id}?${params.toString()}${location.hash}`} replace />
}

export const TrainingRoutes = () => (
    <>
        <Route
            path="/training"
            element={<PreserveQueryNavigate to="/training/hub" />}
            errorElement={<RouteErrorBoundary section="Training" />}
        />
        <Route
            path="/training/modules"
            element={<PreserveQueryNavigate to="/training/hub?view=list" />}
            errorElement={<RouteErrorBoundary section="Training" />}
        />
        <Route
            path="/training/hub"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <MotionWrapper>
                            <TrainingHub />
                        </MotionWrapper>
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Training Hub" />}
        />
        <Route
            path="/training/hub/:id"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <TrainingHub />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Training Hub" />}
        />
        <Route
            path="/training/my"
            element={<PreserveQueryNavigate to="/learning/my" />}
            errorElement={<RouteErrorBoundary section="Training" />}
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
            errorElement={<RouteErrorBoundary section="Certificates" />}
        />
        <Route
            path="/training/builder"
            element={<PreserveQueryNavigate to="/training/hub?view=builder" />}
            errorElement={<RouteErrorBoundary section="Training Builder" />}
        />
        <Route
            path="/training/builder/:id"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager']}>
                    <TrainingBuilderRedirect />
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Training Builder" />}
        />
        <Route
            path="/training/assignments"
            element={<PreserveQueryNavigate to="/training/hub?view=assignments" />}
            errorElement={<RouteErrorBoundary section="Training Assignments" />}
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
            errorElement={<RouteErrorBoundary section="Training Rules" />}
        />
        <Route
            path="/training/skills"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <SkillsMatrix />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Skills Matrix" />}
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
            errorElement={<RouteErrorBoundary section="Training Paths" />}
        />
        <Route
            path="/training/competencies"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'training_manager', 'administrator']}>
                    <AppLayout>
                        <CompetencyMatrix />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Competency Matrix" />}
        />
        <Route
            path="/training/instructor"
            element={
                <ProtectedRoute allowedRoles={['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'training_manager', 'administrator']}>
                    <AppLayout>
                        <InstructorWorkspace />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Instructor Workspace" />}
        />
        {/* Consolidated assessment routes. Legacy /learning/quizzes* paths are kept
            as redirects so existing links, assignments and bookmarks keep working. */}
        <Route path="/learning/quizzes" element={<PreserveQueryNavigate to="/assessments?section=assessments" />} />
        <Route path="/learning/quizzes/new" element={<PreserveQueryNavigate to="/assessments/builder/new" />} />
        <Route
            path="/assessments/builder/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <AssessmentBuilder />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Assessment Builder" />}
        />
        <Route
            path="/assessments/builder/:id"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr', 'department_head']}>
                    <AppLayout>
                        <AssessmentBuilder />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Assessment Builder" />}
        />
        <Route path="/learning/quizzes/:id/take" element={<LegacyQuizTakeRedirect />} />
        <Route
            path="/assessments/:id/take"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <AssessmentPlayer />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Assessment Player" />}
        />
        <Route
            path="/learning/quizzes/:id"
            element={<LegacyQuizEditRedirect />}
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
            errorElement={<RouteErrorBoundary section="Learning Assignments" />}
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
            errorElement={<RouteErrorBoundary section="My Learning" />}
        />
        <Route
            path="/learning"
            element={<PreserveQueryNavigate to="/learning/my" />}
            errorElement={<RouteErrorBoundary section="Learning" />}
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
            errorElement={<RouteErrorBoundary section="Microlearning" />}
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
            errorElement={<RouteErrorBoundary section="Training Player" />}
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
            errorElement={<RouteErrorBoundary section="Learning Analytics" />}
        />
        <Route
            path="/analytics/learning"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <LearningAnalyticsHub />
                    </AppLayout>
                </ProtectedRoute>
            }
            errorElement={<RouteErrorBoundary section="Learning Analytics" />}
        />
    </>
)
