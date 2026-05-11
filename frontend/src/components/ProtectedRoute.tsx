import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const ADMIN_ROLES = ['super_admin', 'moderator', 'support_admin', 'analytics_admin', 'admin'];
const COMPANY_ROLES = ['company_owner', 'hr_manager', 'recruiter', 'viewer'];

function defaultPortalFor(role: string): string {
  if (ADMIN_ROLES.includes(role)) return '/admin/dashboard';
  if (COMPANY_ROLES.includes(role)) return '/company/dashboard';
  if (role === 'employment_official') return '/official/dashboard';
  return '/seeker/dashboard';
}

interface ProtectedRouteProps {
  allowedRoles: string[];
  /** Where to send unauthenticated visitors. Defaults to /login. */
  loginPath?: string;
}

/**
 * Renders child routes only when the user is authenticated and has an allowed role.
 * - Not logged in  → redirects to loginPath
 * - Wrong role     → redirects to the user's own portal
 */
export default function ProtectedRoute({ allowedRoles, loginPath = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={loginPath} replace state={{ from }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={defaultPortalFor(user.role)} replace />;
  }

  return <Outlet />;
}
