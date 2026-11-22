import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../../../types/auth';

type SellerSection = 'overview' | 'listings' | 'add' | 'sales' | 'earnings' | 'settings';

interface SellerTabProps {
  user: User;
}

export const SellerTab: FC<SellerTabProps> = ({ user }) => {
  const [activeSub, setActiveSub] = useState<SellerSection>('overview');

  const subNav: { id: SellerSection; label: string; icon: string }[] = [
    { id: 'overview', label: 'Seller Overview', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'listings', label: 'My Listings', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
    { id: 'add', label: 'Add a Book', icon: 'M12 5v14M5 12h14' },
    { id: 'sales', label: 'Sales & Orders', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' },
    { id: 'earnings', label: 'Earnings', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { id: 'settings', label: 'Seller Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Seller Portal
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'oklch(65% 0.18 60 / 0.12)',
              color: 'oklch(65% 0.18 60)',
              border: '1px solid oklch(65% 0.18 60 / 0.3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Coming Soon
          </span>
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-heading)',
            margin: '0 0 6px',
          }}
        >
          Seller Hub (Interface Preview)
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Explore the upcoming seller interface. Seller operations are currently locked while the merchant system is under development.
        </p>
      </div>

      {/* Main Unavailable Banner */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: '12px',
          border: '1px solid oklch(65% 0.18 60 / 0.35)',
          background: 'oklch(65% 0.18 60 / 0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="oklch(65% 0.18 60)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'oklch(65% 0.18 60)', margin: '0 0 6px' }}>
            Seller Features Are Currently Unavailable
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.65 }}>
            Bookify is currently finalizing the book listing engine, payment escrows, and seller verification system.
            Your current account role is <strong>{user.role}</strong>. Only approved seller accounts will be permitted to create listings, manage inventory, and process store payouts once the seller platform launches.
          </p>
          <Link
            to="/seller-application"
            style={{
              fontSize: '0.82rem',
              color: 'var(--accent)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Learn more about the Seller Program &rarr;
          </Link>
        </div>
      </div>

      {/* Sub-Navigation for Seller Sections (Disabled Styling) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          overflowX: 'auto',
        }}
      >
        {subNav.map((s) => {
          const isActive = activeSub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSub(s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'var(--surface)' : 'transparent',
                color: isActive ? 'var(--text-heading)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: "'Geist Mono', monospace",
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                outline: isActive ? '1px solid var(--border)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={s.icon} />
              </svg>
              {s.label}
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  textTransform: 'uppercase',
                }}
              >
                Locked
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-Section Preview Areas */}
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '32px 24px',
          position: 'relative',
        }}
      >
        {/* Lock Overlay Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Locked Preview • Not accessible to customers
        </div>

        {/* 1. Seller Overview */}
        {activeSub === 'overview' && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 6px' }}>
              Store Overview
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
              High-level metrics for active listings, sales volume, and order fulfillment.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                opacity: 0.65,
                pointerEvents: 'none',
              }}
            >
              {[
                { label: 'Active Listings', value: '—' },
                { label: 'Total Books Sold', value: '—' },
                { label: 'Pending Shipments', value: '—' },
                { label: 'Total Store Earnings', value: '—' },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.label}</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '6px' }}>
                    {c.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. My Listings */}
        {activeSub === 'listings' && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 6px' }}>
              Book Inventory & Listings
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Manage your active inventory, edit book conditions, and adjust selling prices.
            </p>
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: '8px',
                border: '1px dashed var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              No active listings. Inventory creation is restricted to approved sellers.
            </div>
          </div>
        )}

        {/* 3. Add a Book */}
        {activeSub === 'add' && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 6px' }}>
              Add a Book to Marketplace
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Upload book photos, write descriptions, specify condition, and set your price.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                opacity: 0.6,
                pointerEvents: 'none',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Book Title</label>
                <input type="text" placeholder="e.g. To Kill a Mockingbird" disabled style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Author</label>
                <input type="text" placeholder="e.g. Harper Lee" disabled style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Price (PHP)</label>
                <input type="text" placeholder="₱ 0.00" disabled style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Condition</label>
                <input type="text" placeholder="e.g. Like New / Good" disabled style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }} />
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button disabled style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--border)', color: 'var(--text-muted)', border: 'none', cursor: 'not-allowed' }}>
                Publish Book (Disabled)
              </button>
            </div>
          </div>
        )}

        {/* 4. Sales & Orders */}
        {activeSub === 'sales' && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 6px' }}>
              Sales & Fulfillment
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Track customer orders placed for your books, generate shipping waybills, and mark items as sent.
            </p>
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: '8px',
                border: '1px dashed var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              Order queue is empty. Real-time fulfillment tools will activate upon seller approval.
            </div>
          </div>
        )}

        {/* 5. Earnings */}
        {activeSub === 'earnings' && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 6px' }}>
              Earnings & Payouts
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Review completed book transactions, net marketplace earnings, and payout transfer histories.
            </p>
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: '8px',
                border: '1px dashed var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              No financial records. Payout balance remains ₱0.00 until seller transactions begin.
            </div>
          </div>
        )}

        {/* 6. Seller Settings */}
        {activeSub === 'settings' && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 6px' }}>
              Seller Settings
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Store branding, pickup location, accepted courier options, and bank payout methods.
            </p>
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                borderRadius: '8px',
                border: '1px dashed var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              Seller store profile settings are locked.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
