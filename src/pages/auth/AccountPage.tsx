import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AccountPage: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isVerified = user.is_verified;

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg)',
        padding: '88px 24px 64px',
        fontFamily: "'Geist Mono', monospace",
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>
            My Account
          </span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-heading)', margin: '0 0 6px', lineHeight: 1.2 }}>
            {user.first_name} {user.last_name}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>{user.email}</p>
        </div>

        {/* Email verification notice */}
        {!isVerified && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid oklch(65% 0.18 60 / 0.4)',
              background: 'oklch(65% 0.18 60 / 0.07)',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(65% 0.18 60)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 600, color: 'oklch(65% 0.18 60)' }}>
                Email not verified
              </p>
              <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your email address has not been verified yet. Some marketplace features are unavailable until you verify.
              </p>
              <Link
                to="/resend-verification"
                state={{ email: user.email }}
                style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
              >
                Resend verification email
              </Link>
            </div>
          </div>
        )}

        {/* Account details card */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '12px',
            background: 'var(--surface)',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Account Details</span>
          </div>

          {[
            { label: 'Name', value: `${user.first_name} ${user.last_name}` },
            { label: 'Email', value: user.email },
            { label: 'Role', value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
            {
              label: 'Email Status',
              value: isVerified ? 'Verified' : 'Unverified',
              valueColor: isVerified ? 'oklch(55% 0.17 155)' : 'oklch(55% 0.2 25)',
            },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: '0.84rem', color: row.valueColor ?? 'var(--text)', fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Seller Application entry point */}
        {user.role === 'customer' && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '12px',
              background: 'var(--surface)',
              overflow: 'hidden',
              marginBottom: '20px',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Become a Seller</span>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 18px', lineHeight: 1.7 }}>
                Apply to become a seller on Bookify. List your books, set your own prices, and connect with readers across the country.
              </p>
              <Link
                to="/seller-application"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                Apply as Seller
              </Link>
            </div>
          </div>
        )}

        {/* Logout */}
        <div style={{ paddingTop: '8px' }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: "'Geist Mono', monospace",
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'oklch(55% 0.2 25)';
              (e.currentTarget as HTMLButtonElement).style.color = 'oklch(55% 0.2 25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
