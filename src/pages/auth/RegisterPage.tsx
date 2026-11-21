import {
  useState,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authApi';
import type { RegisterPayload } from '../../types/auth';

// ── Eye icons for password visibility toggle ───────────────────────────────
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

// ── Shared input style ─────────────────────────────────────────────────────
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

type FormData = Omit<RegisterPayload, 'confirm_password'> & { confirm_password: string };
type FieldErrors = Partial<Record<keyof FormData, string>>;

const RegisterPage: FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    contact_number: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setFieldErrors({});
    setLoading(true);

    try {
      await register(form);
      navigate('/register/success', { state: { email: form.email } });
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: FieldErrors };
      setGlobalError(apiErr.message ?? 'Registration failed. Please try again.');
      if (apiErr.errors) setFieldErrors(apiErr.errors);
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

  const errorTextStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'oklch(55% 0.2 25)',
    marginTop: '5px',
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
      <div style={{ width: '100%', maxWidth: '480px' }}>
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
            Create Account
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
            Join Bookify
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Global error */}
        {globalError && (
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
            {globalError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* First + Last name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div>
              <label htmlFor="first_name" style={labelStyle}>First Name</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                value={form.first_name}
                onChange={handleChange}
                style={inputStyle(!!fieldErrors.first_name)}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.first_name ? 'oklch(55% 0.2 25)' : 'var(--border)'; }}
              />
              {fieldErrors.first_name && <p style={errorTextStyle}>{fieldErrors.first_name}</p>}
            </div>
            <div>
              <label htmlFor="last_name" style={labelStyle}>Last Name</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                value={form.last_name}
                onChange={handleChange}
                style={inputStyle(!!fieldErrors.last_name)}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.last_name ? 'oklch(55% 0.2 25)' : 'var(--border)'; }}
              />
              {fieldErrors.last_name && <p style={errorTextStyle}>{fieldErrors.last_name}</p>}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              style={inputStyle(!!fieldErrors.email)}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.email ? 'oklch(55% 0.2 25)' : 'var(--border)'; }}
            />
            {fieldErrors.email && <p style={errorTextStyle}>{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                style={{ ...inputStyle(!!fieldErrors.password), paddingRight: '44px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.password ? 'oklch(55% 0.2 25)' : 'var(--border)'; }}
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
            {fieldErrors.password
              ? <p style={errorTextStyle}>{fieldErrors.password}</p>
              : <p style={{ ...errorTextStyle, color: 'var(--text-muted)', marginTop: '5px' }}>
                  Min. 8 chars with uppercase, lowercase, number, and symbol.
                </p>
            }
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="confirm_password" style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm_password"
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={handleChange}
                style={{ ...inputStyle(!!fieldErrors.confirm_password), paddingRight: '44px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.confirm_password ? 'oklch(55% 0.2 25)' : 'var(--border)'; }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {fieldErrors.confirm_password && <p style={errorTextStyle}>{fieldErrors.confirm_password}</p>}
          </div>

          {/* Contact Number (optional) */}
          <div style={{ marginBottom: '28px' }}>
            <label htmlFor="contact_number" style={labelStyle}>
              Contact Number{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', opacity: 0.7 }}>(optional)</span>
            </label>
            <input
              id="contact_number"
              name="contact_number"
              type="tel"
              autoComplete="tel"
              placeholder="09XXXXXXXXX"
              value={form.contact_number}
              onChange={handleChange}
              style={inputStyle(!!fieldErrors.contact_number)}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = fieldErrors.contact_number ? 'oklch(55% 0.2 25)' : 'var(--border)'; }}
            />
            {fieldErrors.contact_number && <p style={errorTextStyle}>{fieldErrors.contact_number}</p>}
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
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '24px', lineHeight: 1.6, textAlign: 'center' }}>
          By registering, you agree to Bookify's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
