import { type FC, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SellerSidebar } from './SellerSidebar';
import { SellerHeader } from './SellerHeader';

interface SellerLayoutProps {
  resolvedScheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const SellerLayout: FC<SellerLayoutProps> = ({
  resolvedScheme,
  onToggleTheme,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fallback safety if auth is resolving (handled primarily by ProtectedRoute)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      {/* Dedicated Seller Sidebar (Desktop fixed 260px, Mobile drawer) */}
      <SellerSidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />

      {/* Main Content Area — offset by 260px on desktop */}
      <div className="lg:pl-[260px] min-h-screen flex flex-col">
        {/* Sticky Top Header */}
        <SellerHeader
          user={user}
          onOpenSidebar={() => setSidebarOpen(true)}
          resolvedScheme={resolvedScheme}
          onToggleTheme={onToggleTheme}
        />

        {/* Dynamic Nested Route Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 md:px-8 border-t border-[var(--border)] text-xs font-mono text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Bookify Seller Workspace • Phase 2 Foundation</span>
          <span className="text-[11px] text-[var(--text-muted)]/70">
            Academic Information Management Project
          </span>
        </footer>
      </div>
    </div>
  );
};

export default SellerLayout;
