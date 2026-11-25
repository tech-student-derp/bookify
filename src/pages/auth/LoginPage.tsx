import {
  useState,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authApi';
import { useAuth } from '../../contexts/AuthContext';

const EyeIcon: FC<{ open: boolean }> = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: `1.5px solid ${hasError ? 'oklch(55% 0.2 25)' : 'var(--border)'}`,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: "'Geist Mono', monospace",
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
});

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const session = await login({ email: email.trim(), password });
      const refreshedUser = await refreshAuth();
      const role = refreshedUser?.role ?? session.user.role;
      navigate(role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : role === 'seller' ? '/seller/overview' : '/dashboard');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    letterSpacing: '0.03em',
    fontFamily: "'Geist Mono', monospace",
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
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '10px',
            }}
          >
            Welcome back
          </span>
          <h1
            style={{
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-heading)',
              margin: '0 0 8px',
              lineHeight: 1.2,
            }}
          >
            Sign in to Bookify
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid oklch(55% 0.2 25 / 0.4)',
              background: 'oklch(55% 0.2 25 / 0.08)',
              color: 'oklch(55% 0.2 25)',
              fontSize: '0.85rem',
              marginBottom: '24px',
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              style={inputStyle(false)}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '28px' }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                style={{ ...inputStyle(false), paddingRight: '44px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: loading
                ? 'var(--border)'
                : 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              fontFamily: "'Geist Mono', monospace",
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '24px', textAlign: 'center', lineHeight: 1.6 }}>
          Email not verified?{' '}
          <Link
            to="/resend-verification"
            state={{ email }}
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Resend verification code
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
