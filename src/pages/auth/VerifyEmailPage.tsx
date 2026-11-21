import { useState, useEffect, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../../services/authApi';

type Status = 'loading' | 'success' | 'expired' | 'invalid' | 'already_verified';

const VerifyEmailPage: FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('invalid');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmail(token, email)
      .then((data) => {
        const msg = data.message ?? '';
        if (msg.toLowerCase().includes('already')) {
          setStatus('already_verified');
        } else {
          setStatus('success');
        }
        setMessage(msg);
      })
      .catch((err: { message?: string }) => {
        const msg = err.message ?? 'Verification failed.';
        if (msg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('invalid');
        }
        setMessage(msg);
      });
  }, [token, email]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const data = await resendVerification(email);
      setResendMessage(data.message ?? 'Verification email sent.');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setResendMessage(apiErr.message ?? 'Could not resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const isSuccess = status === 'success' || status === 'already_verified';
  const accentColor = isSuccess ? 'oklch(55% 0.17 155)' : 'oklch(55% 0.2 25)';

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
      <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
        {status === 'loading' ? (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>Verifying your email…</div>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <>
            {/* Status icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: isSuccess
                  ? 'linear-gradient(135deg, var(--green-500), var(--blue-500))'
                  : `oklch(55% 0.2 25 / 0.15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
                border: isSuccess ? 'none' : `1.5px solid oklch(55% 0.2 25 / 0.4)`,
              }}
            >
              {isSuccess ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 12 2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(55% 0.2 25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <span
              style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: accentColor,
                marginBottom: '10px',
              }}
            >
              {isSuccess ? 'Verified' : status === 'expired' ? 'Link Expired' : 'Invalid Link'}
            </span>

            <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-heading)', margin: '0 0 14px', lineHeight: 1.2 }}>
              {isSuccess ? 'Email verified' : status === 'expired' ? 'Link has expired' : 'Verification failed'}
            </h1>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 32px', lineHeight: 1.7 }}>
              {message}
            </p>

            {isSuccess ? (
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
                Sign In
              </Link>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                {email && (
                  <>
                    <button
                      onClick={handleResend}
                      disabled={resendLoading}
                      style={{
                        padding: '11px 28px',
                        borderRadius: '10px',
                        border: 'none',
                        background: resendLoading ? 'var(--border)' : 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        fontFamily: "'Geist Mono', monospace",
                        cursor: resendLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {resendLoading ? 'Sending…' : 'Resend Verification Email'}
                    </button>
                    {resendMessage && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{resendMessage}</p>
                    )}
                  </>
                )}
                <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
                >Back to Sign In</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
