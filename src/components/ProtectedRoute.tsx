import { type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps any route that requires authentication.
 * Redirects unauthenticated users to /login.
 * Optionally redirects unverified users to /verify-email.
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requireVerified?: boolean;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, requireVerified = false }) => {
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

  if (requireVerified && user && !user.is_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
