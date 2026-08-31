import { Route } from 'react-router-dom'
import { PreserveQueryNavigate } from './utils/QueryPreserveRedirect'

/**
 * Legacy redirects for non-learning domains that were removed when the app was
 * cut down to a Training + Knowledge Base + Quiz platform. Any old deep link
 * lands the user back on the home page.
 */
export const REMOVED_DOMAIN_PREFIXES = [
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

export const LegacyDomainRedirects = () => (
    <>
        {REMOVED_DOMAIN_PREFIXES.map((prefix) => (
            <Route key={prefix} path={`/${prefix}/*`} element={<PreserveQueryNavigate to="/" />} />
        ))}
        {REMOVED_DOMAIN_PREFIXES.map((prefix) => (
            <Route key={`${prefix}-root`} path={`/${prefix}`} element={<PreserveQueryNavigate to="/" />} />
        ))}
        <Route path="/social" element={<PreserveQueryNavigate to="/" />} />
        <Route path="/messages" element={<PreserveQueryNavigate to="/" />} />
    </>
)
