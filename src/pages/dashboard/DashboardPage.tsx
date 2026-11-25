import { useState, type FC } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { DashboardSidebar, type DashboardTab } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { OverviewTab } from './tabs/OverviewTab';
import { OrdersTab } from './tabs/OrdersTab';
import { WishlistTab } from './tabs/WishlistTab';
import { SettingsTab } from './tabs/SettingsTab';

interface DashboardPageProps {
  initialTab?: DashboardTab;
}

const DashboardPage: FC<DashboardPageProps> = ({ initialTab = 'overview' }) => {
  const { user, logout } = useAuth();
  const { resolvedScheme, toggle } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active tab state: query param ?tab=... overrides default
  const requestedTab = searchParams.get('tab');
  const paramTab = requestedTab as DashboardTab | null;
  const validTabs: DashboardTab[] = ['overview', 'orders', 'wishlist', 'settings'];
  const activeTab = paramTab && validTabs.includes(paramTab) ? paramTab : initialTab;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelectTab = (tab: DashboardTab) => {
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  if (requestedTab === 'seller') {
    const destination = user.role === 'seller'
      ? '/seller/overview'
      : user.role === 'customer'
        ? '/seller-application'
        : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "'Geist Mono', monospace",
        display: 'flex',
      }}
    >
      {/* Sidebar */}
      <DashboardSidebar
        user={user}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
        className="lg:ml-[260px]"
      >
        {/* Top Navigation Bar */}
        <DashboardHeader
          user={user}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          resolvedScheme={resolvedScheme}
          onToggleTheme={toggle}
        />

        {/* Dashboard Content Container */}
        <main
          style={{
            flex: 1,
            padding: '28px 24px 64px',
            maxWidth: '1160px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {activeTab === 'overview' && (
            <OverviewTab user={user} onNavigateTab={handleSelectTab} />
          )}

          {activeTab === 'orders' && <OrdersTab />}

          {activeTab === 'wishlist' && <WishlistTab />}

          {activeTab === 'settings' && <SettingsTab user={user} />}

        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
