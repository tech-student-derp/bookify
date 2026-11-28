import { useState, useRef, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../../types/auth';
import type { DashboardTab } from './DashboardSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import NotificationCenter from '../../components/NotificationCenter';

interface DashboardHeaderProps {
  user: User;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenSidebar: () => void;
  onLogout: () => void;
  resolvedScheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const DashboardHeader: FC<DashboardHeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenSidebar,
  onLogout,
  resolvedScheme,
  onToggleTheme,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U';

  const tabLabels: Record<DashboardTab, string> = {
    overview: 'Overview',
    orders: 'My Orders',
    wishlist: 'Saved Books',
    settings: 'Account Settings',
  };

  useEffect(() => {
    if (dropdownOpen) {
      const focusFrame = window.requestAnimationFrame(() => dropdownRef.current?.querySelector<HTMLElement>('#dashboard-account-menu button, #dashboard-account-menu a')?.focus());
      return () => window.cancelAnimationFrame(focusFrame);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        dropdownTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header
      className="customer-dashboard-header"
      style={{
        height: '64px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        fontFamily: "'Inter', Arial, sans-serif",
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left side: Hamburger (mobile) + Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Brand link on mobile when sidebar is closed */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-heading)',
            fontWeight: 700,
            fontSize: '1rem',
          }}
          className="lg:hidden"
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          Bookify
        </Link>

        {/* Desktop breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }} className="hidden sm:flex">
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Bookify
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-muted)' }}>Dashboard</span>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>
            {tabLabels[activeTab]}
          </span>
        </div>
      </div>

      {/* Right side: Browse books, Theme toggle, User account menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a
          href="/#explore"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'color 0.2s',
          }}
          className="hidden md:inline-flex"
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Browse Books
        </a>

        <NotificationCenter />

        {/* Account Menu Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            ref={dropdownTriggerRef}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-controls="dashboard-account-menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: "'Inter', Arial, sans-serif",
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <div
              id="dashboard-account-menu"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }} className="hidden sm:inline">
              {user.first_name}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                color: 'var(--text-muted)',
                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown Menu Overlay */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px 0',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* User details header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                  {user.first_name} {user.last_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all', marginTop: '2px' }}>
                  {user.email}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {user.role}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: user.is_verified ? 'oklch(55% 0.17 155 / 0.15)' : 'oklch(65% 0.18 60 / 0.15)',
                      color: user.is_verified ? 'oklch(55% 0.17 155)' : 'oklch(65% 0.18 60)',
                    }}
                  >
                    {user.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>

              {/* Navigation Items */}
              <div style={{ padding: '6px 0' }}>
                <button
                  onClick={() => { onSelectTab('overview'); setDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Geist Mono', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Overview
                </button>

                <button
                  onClick={() => { onSelectTab('orders'); setDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Geist Mono', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  My Orders
                </button>

                <button
                  onClick={() => { onSelectTab('wishlist'); setDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Geist Mono', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Saved Wishlist
                </button>

                <button
                  onClick={() => { onSelectTab('settings'); setDropdownOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Geist Mono', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Account Settings
                </button>

              </div>

              <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500 }}>Appearance · {resolvedScheme === 'dark' ? 'Dark' : 'Light'}</span>
                <ThemeToggle resolvedScheme={resolvedScheme} onToggle={onToggleTheme} />
              </div>

              <div style={{ borderTop: '0', padding: '6px 0' }}>
                <a
                  href="/#explore"
                  style={{
                    display: 'block',
                    padding: '8px 16px',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Explore Marketplace
                </a>

                <button
                  onClick={() => { setDropdownOpen(false); onLogout(); }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'oklch(55% 0.2 25)',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Geist Mono', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
