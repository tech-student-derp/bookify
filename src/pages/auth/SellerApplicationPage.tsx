import { type FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentSellerApplication, submitSellerApplication, type SellerApplication } from '../../services/sellerApplicationApi';

const SellerApplicationPage: FC = () => {
  const { user } = useAuth();
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refreshApplication = async () => {
    const result = await getCurrentSellerApplication();
    setApplication(result.application);
  };

  useEffect(() => {
    let active = true;
    getCurrentSellerApplication()
      .then((result) => { if (active) setApplication(result.application); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load your application.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const apply = async () => {
    setSubmitting(true);
    setError('');
    try {
      await submitSellerApplication();
      await refreshApplication();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your application.');
    } finally {
      setSubmitting(false);
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
        padding: '88px 24px 64px',
        fontFamily: "'Geist Mono', monospace",
      }}
    >
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>
            Seller Program
          </span>
          <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-heading)', margin: '0 0 12px', lineHeight: 1.2 }}>
            Become a Seller
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.75 }}>
            Join Bookify's seller program and start listing your books. Applications are reviewed by our team.
          </p>
        </div>

        {/* Application status and submission */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Application status
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
              {loading ? 'Loading' : application?.status ?? 'Not applied'}
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.7 }}>
            Applications use your existing Bookify account details and are reviewed by Bookify staff.
          </p>
          {application && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '10px 0 0' }}>Submitted {new Date(application.applied_at).toLocaleDateString('en-PH')}{application.reviewed_at ? ` · reviewed ${new Date(application.reviewed_at).toLocaleDateString('en-PH')}` : ''}</p>}
          {application?.status === 'rejected' && application.notes && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '10px 0 0' }}>Review note: {application.notes}</p>}
          {error && <p role="alert" style={{ fontSize: '0.82rem', color: 'oklch(55% 0.2 25)', margin: '12px 0 0' }}>{error}</p>}
          {!loading && user?.role === 'customer' && user.is_verified && application?.status !== 'pending' && application?.status !== 'approved' && <button type="button" onClick={apply} disabled={submitting} style={{ marginTop: '16px', padding: '10px 16px', border: 0, borderRadius: '8px', color: 'white', background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))', font: 'inherit', fontSize: '.82rem', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}>{submitting ? 'Submitting…' : application?.status === 'rejected' ? 'Apply again' : 'Submit seller application'}</button>}
          {user && !user.is_verified && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '14px 0 0' }}>Verify your email before applying. <Link to="/resend-verification" style={{ color: 'var(--accent)' }}>Verify your account</Link></p>}
          {application?.status === 'approved' && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '14px 0 0' }}>Your account is approved as a seller. Seller listing tools are still being built.</p>}
        </div>

        {/* What to expect */}
        <div style={{ marginBottom: '36px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 16px' }}>
            What to expect
          </p>
          {[
            { step: '01', text: 'Submit a seller application with basic information.' },
            { step: '02', text: 'Our team reviews your application, typically within a few business days.' },
            { step: '03', text: 'Approved sellers can start listing books immediately.' },
            { step: '04', text: 'Rejected applicants retain their customer account with no changes.' },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em', flexShrink: 0, marginTop: '2px' }}>
                {item.step}
              </span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.65 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {user && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Logged in as <strong style={{ color: 'var(--text)' }}>{user.email}</strong>. You'll be notified when applications open.
          </p>
        )}

        <Link
          to="/account"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)';
          }}
        >
          Back to Account
        </Link>
      </div>
    </div>
  );
};

export default SellerApplicationPage;
