import { Navigate, useLocation } from 'react-router-dom';

/**
 * PreserveQueryNavigate
 * A navigation component that preserves query parameters during redirects.
 * 
 * @example
 * // Redirect /home to /dashboard while preserving ?redirect=... params
 * <Route path="/home" element={<PreserveQueryNavigate to="/dashboard" />} />
 * 
 * @example
 * // Redirect with existing query params
 * // From: /old-path?foo=bar
 * // To: /new-path?foo=bar
 * <Route path="/old-path" element={<PreserveQueryNavigate to="/new-path" />} />
 */
export const PreserveQueryNavigate = ({ to }: { to: string }) => {
  const location = useLocation();
  const hasQueryParams = to.includes('?');
  const preservedSearch = location.search 
    ? (hasQueryParams ? location.search.replace('?', '&') : location.search) 
    : '';
  return <Navigate to={`${to}${preservedSearch}`} replace />;
};
