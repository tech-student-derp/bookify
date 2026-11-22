import { useState, useEffect, type FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { DashboardSidebar, type DashboardTab } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { OverviewTab } from './tabs/OverviewTab';
import { OrdersTab } from './tabs/OrdersTab';
import { WishlistTab } from './tabs/WishlistTab';
import { SettingsTab } from './tabs/SettingsTab';
import { SellerTab } from './tabs/SellerTab';

interface DashboardPageProps {
  initialTab?: DashboardTab;
}

const DashboardPage: FC<DashboardPageProps> = ({ initialTab = 'overview' }) => {
  const { user, logout } = useAuth();
  const { resolvedScheme, toggle } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active tab state: query param ?tab=... overrides default
  const paramTab = searchParams.get('tab') as DashboardTab | null;
  const validTabs: DashboardTab[] = ['overview', 'orders', 'wishlist', 'settings', 'seller'];
  const defaultTab = paramTab && validTabs.includes(paramTab) ? paramTab : initialTab;

  const [activeTab, setActiveTab] = useState<DashboardTab>(defaultTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (paramTab && validTabs.includes(paramTab)) {
      setActiveTab(paramTab);
    }
  }, [paramTab]);

  const handleSelectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

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

          {activeTab === 'seller' && <SellerTab user={user} />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
