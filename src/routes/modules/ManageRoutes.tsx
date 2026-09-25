import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { RouteErrorBoundary } from '@/components/common'
import type { Capability } from '@/hooks/useCapabilities'
import { PreserveQueryNavigate } from '@/routes/utils/QueryPreserveRedirect'
import { page } from '@/routes/utils/page'
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const TrainingAnalytics = lazy(() => import('@/pages/training/TrainingAnalytics'))
const ManageAssignments = lazy(() => import('@/pages/manage/ManageAssignments'))
const AssignmentManager = lazy(() => import('@/pages/learning/AssignmentManager'))
const CourseTracking = lazy(() => import('@/pages/manage/CourseTracking'))
const TrainingAssignmentRules = lazy(() => import('@/pages/training/TrainingAssignmentRules'))
const TeamProgress = lazy(() => import('@/pages/manage/TeamProgress'))
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'))
const ReportBuilder = lazy(() => import('@/pages/admin/ReportBuilder'))
const TrainingCertificates = lazy(() => import('@/pages/training/TrainingCertificates'))
const ManualCertificateGenerator = lazy(() => import('@/pages/admin/ManualCertificateGenerator'))
const SkillsMatrix = lazy(() => import('@/pages/training/SkillsMatrix'))

const OVERSIGHT: Capability[] = ['reports.view', 'assignment.manage']

/**
 * WORKSPACE: MANAGE - proving compliance: where are we at risk, who is
 * assigned what, team progress, certificates and evidence exports.
 */
export const ManageRoutes = () => (
    <Route element={<TenantContextGuard resourceName="Manage" />} errorElement={<RouteErrorBoundary section="Manage" />}>
        <Route path="/manage" element={<PreserveQueryNavigate to="/manage/compliance" />} />
        <Route path="/manage/compliance" element={page(<TrainingAnalytics />, { capability: OVERSIGHT })} />
        <Route path="/manage/assignments" element={page(<ManageAssignments />, { capability: 'assignment.manage' })} />
        {/* Quiz assignments (the course assignment centre handles courses only) */}
        <Route path="/manage/assignments/quizzes" element={page(<AssignmentManager />, { capability: 'assignment.manage' })} />
        <Route path="/manage/tracking" element={page(<CourseTracking />, { capability: OVERSIGHT })} />
        <Route path="/manage/assignments/rules" element={page(<TrainingAssignmentRules />, { capability: 'assignment.manage' })} />
        <Route path="/manage/team" element={page(<TeamProgress />, { capability: OVERSIGHT })} />
        <Route path="/manage/reports" element={page(<ReportsDashboard />, { capability: 'reports.view' })} />
        <Route path="/manage/reports/builder" element={page(<ReportBuilder />, { capability: 'reports.view' })} />
        <Route path="/manage/certificates" element={page(<TrainingCertificates />, { capability: 'certificate.issue' })} />
        <Route path="/manage/certificates/issue" element={page(<ManualCertificateGenerator />, { capability: 'certificate.issue' })} />
        <Route path="/manage/skills" element={page(<SkillsMatrix />, { capability: OVERSIGHT })} />
    </Route>
)
