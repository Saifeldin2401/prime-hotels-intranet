import { Route } from 'react-router-dom'
import { PreserveQueryNavigate } from './utils/QueryPreserveRedirect'

/**
 * Every retired URL and where it now lives. Old paths stay reachable for
 * bookmarks, emailed links and notification deep links, but nothing in the
 * product links to them and none of them render a page of their own - each
 * workspace owns exactly one canonical URL per job (see ROUTE_OWNERSHIP in
 * src/config/navigation.ts).
 *
 * `:param` segments carry over; query string, hash and navigation state are
 * preserved by PreserveQueryNavigate.
 */
export const LEGACY_REDIRECTS: ReadonlyArray<readonly [from: string, to: string]> = [
    // Home and generic dashboards -> the member's workspace home
    ['/home', '/dashboard'],
    ['/home/learner', '/learn'],
    ['/staff-dashboard', '/dashboard'],
    ['/dashboard/property-manager', '/dashboard'],
    ['/dashboard/property-hr', '/dashboard'],
    ['/dashboard/department-head', '/dashboard'],
    ['/dashboard/regional-hr', '/dashboard'],
    ['/dashboard/corporate-admin', '/dashboard'],
    ['/dashboard/executive', '/manage/team'],

    // Learn
    ['/training', '/learn/my'],
    ['/training/my', '/learn/my'],
    ['/learning', '/learn/my'],
    ['/learning/my', '/learn/my'],
    ['/learning/catalog', '/learn/courses'],
    ['/courses', '/learn/courses'],
    ['/courses/:id', '/learn/courses/:id'],
    ['/training/paths', '/learn/paths'],
    ['/training/certificates', '/learn/certificates'],
    ['/training/player/:id', '/learn/player/:id'],
    ['/learning/training/:id', '/learn/player/:id'],
    ['/learn/lessons/:id', '/learn/player/:id'],
    ['/learning/microlearning/:id', '/learn/my'],
    ['/assessments/:id/take', '/learn/quizzes/:id'],
    ['/learning/quizzes/:id/take', '/learn/quizzes/:id'],

    // Knowledge (reading stays in Learn)
    ['/knowledge/wiki', '/knowledge'],
    ['/knowledge/search', '/knowledge'],
    ['/knowledge/browse', '/knowledge'],
    ['/sops', '/knowledge'],
    ['/sops/:id', '/knowledge/:id'],
    ['/operations/sops', '/knowledge'],
    ['/operations/sops/:id', '/knowledge/:id'],
    ['/help', '/knowledge'],
    ['/support', '/knowledge'],

    // Studio
    ['/training/hub', '/studio/courses'],
    ['/training/modules', '/studio/courses'],
    ['/training/hub/:id', '/studio/courses/:id'],
    ['/training/builder', '/studio/courses/new'],
    ['/training/builder/:id', '/studio/courses/:id'],
    ['/learning/training/create', '/studio/courses/new'],
    ['/studio/builder/:id', '/studio/courses/:id'],
    ['/studio/assessments', '/studio/quizzes'],
    ['/assessments', '/studio/quizzes'],
    ['/learning/quizzes', '/studio/quizzes'],
    ['/questions', '/studio/quizzes'],
    ['/assessments/builder/new', '/studio/quizzes/new'],
    ['/learning/quizzes/new', '/studio/quizzes/new'],
    ['/assessments/builder/:id', '/studio/quizzes/:id'],
    ['/learning/quizzes/:id', '/studio/quizzes/:id'],
    ['/assessments/generate', '/studio/quizzes/generate'],
    ['/learning/quizzes/generate', '/studio/quizzes/generate'],
    ['/questions/generate', '/studio/quizzes/generate'],
    ['/assessments/questions/new', '/studio/questions/new'],
    ['/questions/new', '/studio/questions/new'],
    ['/assessments/questions/:id', '/studio/questions/:id'],
    ['/questions/:id', '/studio/questions/:id'],
    ['/assessments/questions/:id/edit', '/studio/questions/:id/edit'],
    ['/questions/:id/edit', '/studio/questions/:id/edit'],
    ['/knowledge/create', '/studio/articles/new'],
    ['/knowledge/:id/edit', '/studio/articles/:id/edit'],
    ['/knowledge/review', '/studio/review/articles'],
    ['/manage/review', '/studio/review'],
    ['/manage/review-queue', '/studio/review'],
    ['/media', '/studio/media'],

    // Manage
    ['/learning/assignments', '/manage/assignments'],
    ['/training/assignments', '/manage/assignments'],
    ['/training/assignments/rules', '/manage/assignments/rules'],
    ['/learning/analytics', '/manage/compliance'],
    ['/learning/reports', '/manage/reports'],
    ['/learning/team', '/manage/team'],
    ['/analytics/learning', '/manage/compliance'],
    ['/admin/analytics', '/manage/compliance'],
    ['/reports', '/manage/reports'],
    ['/training/reports', '/manage/reports'],
    ['/admin/report-builder', '/manage/reports/builder'],
    ['/admin/certificates', '/manage/certificates'],
    ['/admin/certificates/generate', '/manage/certificates/issue'],
    ['/training/skills', '/manage/skills'],
    // Instructor-led training and competencies are deferred (product definition).
    ['/training/competencies', '/manage'],
    ['/training/instructor', '/manage'],

    // Organization
    ['/admin', '/admin/organization'],
    ['/org', '/admin/organization'],
    ['/org/users', '/admin/users'],
    ['/org/members', '/admin/users'],
    ['/org/properties', '/admin/structure'],
    ['/admin/properties', '/admin/structure'],
    ['/org/structure', '/admin/organization'],
    ['/org/departments', '/admin/organization'],
    ['/org/settings', '/admin/settings'],

    // Platform-owned configuration that used to live under /admin
    ['/admin/ai-course-generator', '/platform/ai-settings'],
    ['/admin/email-analytics', '/platform/email-analytics'],
    ['/admin/email-templates', '/platform/email-templates'],
    ['/admin/inbound-emails', '/platform/email-inbound'],
    ['/admin/retention-policies', '/platform/retention-policies'],
    ['/platform/tenants', '/platform/organizations'],
    ['/platform/tenants/:id', '/platform/organizations/:id'],
]

/**
 * Domains removed when the product became a learning & knowledge platform. Any
 * old deep link lands on the member's home.
 */
const REMOVED_DOMAIN_PREFIXES = [
    'hr',
    'finance',
    'operations',
    'housekeeping',
    'maintenance',
    'procurement',
    'commercial',
    'jobs',
    'messaging',
    'announcements',
    'approvals',
    'tasks',
    'directory',
    'onboarding',
] as const

export const LegacyRedirects = () => (
    <>
        {LEGACY_REDIRECTS.map(([from, to]) => (
            <Route key={from} path={from} element={<PreserveQueryNavigate to={to} />} />
        ))}
        {REMOVED_DOMAIN_PREFIXES.flatMap((prefix) => [
            <Route key={prefix} path={`/${prefix}/*`} element={<PreserveQueryNavigate to="/" />} />,
            <Route key={`${prefix}-root`} path={`/${prefix}`} element={<PreserveQueryNavigate to="/" />} />,
        ])}
        <Route path="/social" element={<PreserveQueryNavigate to="/" />} />
        <Route path="/messages" element={<PreserveQueryNavigate to="/" />} />
    </>
)
