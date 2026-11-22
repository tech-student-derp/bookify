import { type FC } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../../types/auth';

export type DashboardTab = 'overview' | 'orders' | 'wishlist' | 'settings' | 'seller';

interface DashboardSidebarProps {
  user: User;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const DashboardSidebar: FC<DashboardSidebarProps> = ({
  user,
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onLogout,
}) => {
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U';

  const buyerNav = [
    {
      id: 'overview' as DashboardTab,
      label: 'Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: 'orders' as DashboardTab,
      label: 'My Orders',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      id: 'wishlist' as DashboardTab,
      label: 'Wishlist',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: 'settings' as DashboardTab,
      label: 'Account Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const sellerNav = [
    { label: 'Seller Overview' },
    { label: 'My Listings' },
    { label: 'Add a Book' },
    { label: 'Sales & Orders' },
    { label: 'Earnings' },
    { label: 'Seller Settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 140,
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: '260px',
          height: '100svh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 150,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Geist Mono', monospace",
          transition: 'transform 0.25s ease-in-out',
          transform: isOpen ? 'translateX(0)' : undefined,
        }}
        className={`${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          style={{
            height: '64px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              color: 'var(--text-heading)',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                color: 'white',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            Bookify
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User Mini Card */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.first_name} {user.last_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: user.role === 'customer' ? 'color-mix(in oklch, var(--surface) 80%, var(--accent) 20%)' : 'oklch(60% 0.17 240 / 0.15)',
                  color: user.role === 'customer' ? 'var(--accent)' : 'var(--blue-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {user.role}
              </span>
              <span style={{ fontSize: '0.72rem', color: user.is_verified ? 'oklch(55% 0.17 155)' : 'oklch(65% 0.18 60)' }}>
                {user.is_verified ? '• Verified' : '• Unverified'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menus (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Buyer Navigation Section */}
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '0 8px 8px',
              }}
            >
              Buyer Menu
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {buyerNav.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? 'var(--surface-hover)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.84rem',
                      fontFamily: "'Geist Mono', monospace",
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, color 0.15s',
                      outline: isActive ? '1px solid var(--border)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', display: 'flex' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}

              {/* Browse Books Link */}
              <a
                href="/#explore"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-hover)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <span style={{ display: 'flex', color: 'inherit' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                Browse Marketplace
              </a>
            </div>
          </div>

          {/* Seller Navigation Section (Disabled / Placeholder) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px 8px',
              }}
            >
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Seller Hub
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'oklch(65% 0.18 60 / 0.12)',
                  color: 'oklch(65% 0.18 60)',
                  border: '1px solid oklch(65% 0.18 60 / 0.3)',
                  textTransform: 'uppercase',
                }}
              >
                Coming Soon
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {sellerNav.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    onSelectTab('seller');
                    onClose();
                  }}
                  title="Seller features are currently disabled. Click to view preview."
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'seller' ? 'var(--surface-hover)' : 'transparent',
                    color: 'var(--text-muted)',
                    opacity: 0.65,
                    fontSize: '0.82rem',
                    fontFamily: "'Geist Mono', monospace",
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'opacity 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.background = 'var(--surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.65';
                    if (activeTab !== 'seller') e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Lock
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          {user.role === 'customer' && (
            <Link
              to="/seller-application"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                color: 'white',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Apply as Seller
            </Link>
          )}

          <button
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: "'Geist Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'oklch(55% 0.2 25)';
              e.currentTarget.style.color = 'oklch(55% 0.2 25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
};
