import { useState, type FC, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resendVerification } from '../../services/authApi';

const ResendVerificationPage: FC = () => {
  const location = useLocation();
  const prefill = (location.state as { email?: string })?.email ?? '';

  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const data = await resendVerification(email.trim());
      setMessage(data.message ?? 'If this email is registered and unverified, a new verification link has been sent.');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setIsError(true);
      setMessage(apiErr.message ?? 'Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ marginBottom: '32px' }}>
          <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>
            Verify Email
          </span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-heading)', margin: '0 0 8px', lineHeight: 1.2 }}>
            Resend verification
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Enter the email address you registered with to receive a new verification link.
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1px solid ${isError ? 'oklch(55% 0.2 25 / 0.4)' : 'oklch(55% 0.17 155 / 0.4)'}`,
              background: isError ? 'oklch(55% 0.2 25 / 0.08)' : 'oklch(55% 0.17 155 / 0.08)',
              color: isError ? 'oklch(55% 0.2 25)' : 'oklch(55% 0.17 155)',
              fontSize: '0.85rem',
              marginBottom: '24px',
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.03em' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: "'Geist Mono', monospace",
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              fontFamily: "'Geist Mono', monospace",
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending…' : 'Send Verification Email'}
          </button>
        </form>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '24px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResendVerificationPage;
