import { useState, type FC, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resendVerification, verifyEmail } from '../../services/authApi';

type Status = 'form' | 'success';

const VerifyEmailPage: FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<Status>('form');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState(searchParams.get('required') === '1'
    ? 'Verify your email address before using this protected Bookify feature. Your account stays signed out until verification is complete.'
    : 'Enter the six-digit code we sent to your email address.');
  const [resendMessage, setResendMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setIsError(false);
    setMessage('Checking your code…');
    try {
      const result = await verifyEmail(otp, email.trim());
      setStatus('success');
      setMessage(result.message);
    } catch (error) {
      const apiError = error as { message?: string };
      setIsError(true);
      setMessage(apiError.message ?? 'We could not verify that code. Check it and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const result = await resendVerification(email.trim());
      setResendMessage(result.message ?? 'If an account exists for this address, a new code will be sent.');
    } catch (error) {
      setResendMessage((error as { message?: string }).message ?? 'Could not request a new code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '88px 24px 48px', fontFamily: "'Geist Mono', monospace" }}>
      <section style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Email verification</span>
          <h1 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.8rem)', fontWeight: 700, color: 'var(--text-heading)', margin: '12px 0 10px' }}>
            {status === 'success' ? 'Email verified' : 'Enter your code'}
          </h1>
          <p role="status" aria-live="polite" style={{ color: isError ? 'oklch(55% 0.2 25)' : 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>{message}</p>
        </div>

        {status === 'success' ? (
          <Link to="/login" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))', color: 'white', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <label htmlFor="verify-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Email address</label>
              <input id="verify-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
              <label htmlFor="verification-otp" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', margin: '18px 0 6px' }}>Six-digit code</label>
              <input id="verification-otp" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required minLength={6} maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-describedby="otp-help" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.45em', fontSize: '1.2rem' }} />
              <p id="otp-help" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '6px 0 20px' }}>The code expires 30 minutes after it is sent.</p>
              <button type="submit" disabled={loading || otp.length !== 6 || !email.trim()} style={buttonStyle(loading || otp.length !== 6 || !email.trim())}>{loading ? 'Verifying…' : 'Verify email'}</button>
            </form>
            <button type="button" onClick={handleResend} disabled={resendLoading || !email.trim()} style={{ ...buttonStyle(resendLoading || !email.trim()), marginTop: '12px', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--border)' }}>{resendLoading ? 'Requesting…' : 'Resend verification code'}</button>
            {resendMessage && <p role="status" aria-live="polite" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.6, textAlign: 'center' }}>{resendMessage}</p>}
            <p style={{ textAlign: 'center', marginTop: '24px' }}><Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>Back to Sign In</Link></p>
          </>
        )}
      </section>
    </main>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: "'Geist Mono', monospace", fontSize: '0.9rem', outline: 'none' };
const buttonStyle = (disabled: boolean): React.CSSProperties => ({ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: disabled ? 'var(--border)' : 'linear-gradient(135deg, var(--green-500), var(--blue-500))', color: disabled ? 'var(--text-muted)' : 'white', fontSize: '0.9rem', fontWeight: 600, fontFamily: "'Geist Mono', monospace", cursor: disabled ? 'not-allowed' : 'pointer' });

export default VerifyEmailPage;
