import { Navigate, useLocation, useParams } from 'react-router-dom';

/**
 * PreserveQueryNavigate
 * A navigation component that preserves query parameters, hash fragments and
 * navigation state during redirects. `:param` segments in `to` are filled from
 * the matched route's params, so `/training/hub/:id` can redirect to
 * `/studio/courses/:id`.
 *
 * @example
 * <Route path="/home" element={<PreserveQueryNavigate to="/dashboard" />} />
 * <Route path="/courses/:id" element={<PreserveQueryNavigate to="/learn/courses/:id" />} />
 */
export const PreserveQueryNavigate = ({ to }: { to: string }) => {
  const location = useLocation();
  const params = useParams();

  // Split destination path, search, and hash
  const hashIndex = to.indexOf('#');
  const pathAndSearch = hashIndex !== -1 ? to.slice(0, hashIndex) : to;
  const explicitHash = hashIndex !== -1 ? to.slice(hashIndex) : '';

  const qIndex = pathAndSearch.indexOf('?');
  const rawTargetPath = qIndex !== -1 ? pathAndSearch.slice(0, qIndex) : pathAndSearch;
  const targetSearch = qIndex !== -1 ? pathAndSearch.slice(qIndex + 1) : '';
  const targetPath = rawTargetPath.replace(/:(\w+)/g, (_, key: string) =>
    encodeURIComponent(params[key] ?? '')
  );

  const targetParams = new URLSearchParams(targetSearch);
  const currentParams = new URLSearchParams(location.search);

  // Current location params take precedence or merge with target params
  currentParams.forEach((value, key) => {
    targetParams.set(key, value);
  });

  const mergedQuery = targetParams.toString();
  const searchString = mergedQuery ? `?${mergedQuery}` : '';
  const hashString = explicitHash || location.hash || '';

  return <Navigate to={`${targetPath}${searchString}${hashString}`} state={location.state} replace />;
};
