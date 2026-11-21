import { type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';

const RegisterSuccessPage: FC = () => {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? 'your email address';

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '88px 24px 48px',
        fontFamily: "'Geist Mono', monospace",
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        {/* Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>
          Account Created
        </span>

        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-heading)', margin: '0 0 16px', lineHeight: 1.2 }}>
          Check your inbox
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.7 }}>
          We sent a verification link to:
        </p>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 28px', wordBreak: 'break-all' }}>
          {email}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 36px', lineHeight: 1.7 }}>
          Click the link in the email to verify your account. The link expires in 24 hours.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '11px 28px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            Go to Sign In
          </Link>
          <Link
            to="/resend-verification"
            state={{ email }}
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
          >
            Didn't receive it? Resend verification email
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterSuccessPage;
