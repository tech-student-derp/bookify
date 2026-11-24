import { type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/auth';

/**
 * Wraps any route that requires authentication.
 * Redirects unauthenticated users to /login.
 * Optionally redirects unverified users to /verify-email.
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requireVerified?: boolean;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, requireVerified = true, allowedRoles }) => {
  const { authenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text-muted)',
          fontFamily: "'Geist Mono', monospace",
          fontSize: '0.9rem',
        }}
      >
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireVerified && user && !user.is_verified) {
    const query = new URLSearchParams({ required: '1', email: user.email });
    return <Navigate to={`/verify-email?${query.toString()}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
