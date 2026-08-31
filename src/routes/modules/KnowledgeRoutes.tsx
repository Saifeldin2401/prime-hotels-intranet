import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { lazy } from 'react'
import { Navigate, Route, useLocation, useParams } from 'react-router-dom'

// Knowledge Base consolidated surfaces: Browse, Read, Author.
const KnowledgeBrowse = lazy(() => import('@/pages/knowledge/KnowledgeBrowse'))
const KnowledgeRead = lazy(() => import('@/pages/knowledge/KnowledgeRead'))
const KnowledgeAuthor = lazy(() => import('@/pages/knowledge/KnowledgeAuthor'))
const KnowledgeReview = lazy(() => import('@/pages/knowledge/KnowledgeReview'))
const QuestionEditor = lazy(() => import('@/pages/questions/QuestionEditor'))
const QuestionReview = lazy(() => import('@/pages/questions/QuestionReview'))
// Consolidated assessment surface: one browse/manage page (questions + assessments).
const QuestionBank = lazy(() => import('@/pages/assessments/QuestionBank'))
const QuestionGeneratorPage = lazy(() => import('@/pages/questions/QuestionGeneratorPage'))

const SOPViewerRedirect = () => {
    const { id } = useParams()
    const location = useLocation()
    return <Navigate to={id ? `/knowledge/${id}${location.search}${location.hash}` : `/knowledge${location.search}${location.hash}`} replace />
}

export const KnowledgeRoutes = () => (
    <>
        <Route
            path="/sops"
            element={<PreserveQueryNavigate to="/knowledge" />}
        />
        <Route
            path="/sops/:id"
            element={<SOPViewerRedirect />}
        />
        <Route
            path="/operations/sops"
            element={<PreserveQueryNavigate to="/knowledge" />}
        />
        <Route
            path="/operations/sops/:id"
            element={<SOPViewerRedirect />}
        />
        {/* Legacy wiki route now folds into the unified browse surface */}
        <Route
            path="/knowledge/wiki"
            element={<PreserveQueryNavigate to="/knowledge" />}
        />
        <Route
            path="/knowledge"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeBrowse />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        {/* Legacy aliases kept so existing links (KnowledgeSidebar, dashboards) keep working */}
        <Route
            path="/knowledge/search"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeBrowse />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/browse"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeBrowse />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/create"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeAuthor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/:id/edit"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeAuthor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/review"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <KnowledgeReview />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/knowledge/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <KnowledgeRead />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions"
            element={<PreserveQueryNavigate to="/assessments" />}
        />
        <Route
            path="/assessments"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <QuestionBank />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/assessments/questions/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/assessments/generate"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionGeneratorPage />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/assessments/questions/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <QuestionReview />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/assessments/questions/:id/edit"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/new"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/generate"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionGeneratorPage />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/:id"
            element={
                <ProtectedRoute>
                    <AppLayout>
                        <QuestionReview />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/questions/:id/edit"
            element={
                <ProtectedRoute allowedRoles={['regional_admin', 'regional_hr', 'property_hr']}>
                    <AppLayout>
                        <QuestionEditor />
                    </AppLayout>
                </ProtectedRoute>
            }
        />
    </>
)
