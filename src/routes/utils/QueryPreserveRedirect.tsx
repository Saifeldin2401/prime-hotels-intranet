import { Navigate, useLocation } from 'react-router-dom';

/**
 * PreserveQueryNavigate
 * A navigation component that preserves query parameters and hash fragments during redirects.
 * 
 * @example
 * // Redirect /home to /dashboard while preserving ?redirect=... params and #hash
 * <Route path="/home" element={<PreserveQueryNavigate to="/dashboard" />} />
 */
export const PreserveQueryNavigate = ({ to }: { to: string }) => {
  const location = useLocation();

  // Split destination path, search, and hash
  const hashIndex = to.indexOf('#');
  const pathAndSearch = hashIndex !== -1 ? to.slice(0, hashIndex) : to;
  const explicitHash = hashIndex !== -1 ? to.slice(hashIndex) : '';

  const qIndex = pathAndSearch.indexOf('?');
  const targetPath = qIndex !== -1 ? pathAndSearch.slice(0, qIndex) : pathAndSearch;
  const targetSearch = qIndex !== -1 ? pathAndSearch.slice(qIndex + 1) : '';

  const targetParams = new URLSearchParams(targetSearch);
  const currentParams = new URLSearchParams(location.search);

  // Current location params take precedence or merge with target params
  currentParams.forEach((value, key) => {
    targetParams.set(key, value);
  });

  const mergedQuery = targetParams.toString();
  const searchString = mergedQuery ? `?${mergedQuery}` : '';
  const hashString = explicitHash || location.hash || '';

  return <Navigate to={`${targetPath}${searchString}${hashString}`} replace />;
};

