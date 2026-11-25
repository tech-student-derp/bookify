import { type FC } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../../../types/auth';

interface OverviewTabProps {
  user: User;
  onNavigateTab: (tab: 'orders' | 'wishlist' | 'settings') => void;
}

export const OverviewTab: FC<OverviewTabProps> = ({ user, onNavigateTab }) => {
  const isVerified = user.is_verified;
  const isElevatedRole = user.role === 'admin' || user.role === 'staff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          padding: '28px',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          background: 'linear-gradient(135deg, color-mix(in oklch, var(--surface) 95%, var(--green-500) 5%), var(--surface))',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '680px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              Buyer Portal
            </span>

            {isElevatedRole ? (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'oklch(60% 0.17 240 / 0.15)',
                  color: 'var(--blue-500)',
                  border: '1px solid oklch(60% 0.17 240 / 0.3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {user.role} View
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'oklch(65% 0.15 155 / 0.12)',
                  color: 'var(--accent)',
                  border: '1px solid oklch(65% 0.15 155 / 0.3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Customer
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-heading)',
              margin: '0 0 8px',
              lineHeight: 1.25,
            }}
          >
            Welcome back, {user.first_name}!
          </h1>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Here is a summary of your Bookify marketplace orders, saved wishlist items, and personal book preferences.
          </p>
        </div>

        {/* Unverified notice */}
        {!isVerified && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid oklch(65% 0.18 60 / 0.35)',
              background: 'oklch(65% 0.18 60 / 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(65% 0.18 60)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                Your email address is unverified. Please verify your email to unlock all marketplace privileges.
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('settings')}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'oklch(65% 0.18 60)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Verify Now &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {[
          {
            label: 'Total Orders',
            value: '0',
            subtext: 'All-time purchases',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            ),
            action: () => onNavigateTab('orders'),
          },
          {
            label: 'Pending Orders',
            value: '0',
            subtext: 'Awaiting delivery',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            ),
            action: () => onNavigateTab('orders'),
          },
          {
            label: 'Completed Orders',
            value: '0',
            subtext: 'Delivered successfully',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ),
            action: () => onNavigateTab('orders'),
          },
          {
            label: 'Wishlist Items',
            value: '0',
            subtext: 'Saved for later',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            ),
            action: () => onNavigateTab('wishlist'),
          },
        ].map((card) => (
          <div
            key={card.label}
            onClick={card.action}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {card.label}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'color-mix(in oklch, var(--surface) 85%, var(--accent) 15%)',
                  color: 'var(--accent)',
                }}
              >
                {card.icon}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {card.value}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                {card.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Shortcuts */}
      <div
        style={{
          padding: '22px 24px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '16px' }}>
          Quick Shortcuts
        </span>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href="/#explore"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              fontSize: '0.84rem',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.01em',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Browse Books
          </a>

          <button
            onClick={() => onNavigateTab('orders')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Geist Mono', monospace",
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
            </svg>
            View Orders
          </button>

          <button
            onClick={() => onNavigateTab('wishlist')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Geist Mono', monospace",
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Wishlist
          </button>

          <button
            onClick={() => onNavigateTab('settings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Geist Mono', monospace",
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Account Settings
          </button>
        </div>
      </div>

      {/* Recent Order Activity */}
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
              Recent Order Activity
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Latest purchases made through your account
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            style={{
              fontSize: '0.8rem',
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            View all &rarr;
          </button>
        </div>

        {/* Empty state: No fake orders */}
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
            No recent orders
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, maxWidth: '400px', lineHeight: 1.6 }}>
            You haven't placed any book orders yet. Browse our curated bookshelf and find pre-loved books at affordable prices.
          </p>
          <a
            href="/#explore"
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.82rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Explore Bookshelf
          </a>
        </div>
      </div>

      {/* Seller Application teaser for customer accounts */}
      {user.role === 'customer' && (
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>
              Have Books to Sell?
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px' }}>
              Become a Bookify Seller
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              List your used books, manage your inventory, and reach eager readers nationwide.
            </p>
          </div>
          <Link
            to="/seller-application"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'border-color 0.2s, color 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
          >
            Learn More &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};
