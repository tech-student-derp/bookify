import { type FC, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentSellerApplication, submitSellerApplication, type SellerApplication } from '../../services/sellerApplicationApi';

const SellerApplicationPage: FC = () => {
  const { user, refreshAuth } = useAuth();
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.contact_number ?? '');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [documentError, setDocumentError] = useState('');

  const refreshApplication = useCallback(async () => {
    const result = await getCurrentSellerApplication();
    setApplication(result.application);
    if (result.application?.status === 'approved' && user?.role !== 'seller') {
      await refreshAuth();
    }
  }, [refreshAuth, user?.role]);

  useEffect(() => {
    let active = true;
    const loadApplication = async () => {
      try {
        const result = await getCurrentSellerApplication();
        if (!active) return;
        setApplication(result.application);
        if (result.application?.status === 'approved' && user?.role !== 'seller') {
          await refreshAuth();
        }
      } catch (reason: unknown) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your application.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadApplication();
    return () => { active = false; };
  }, [refreshAuth, user?.role]);

  const apply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = phoneNumber.trim();
    const validPhone = /^(?:\+?63|0)9\d{9}$/.test(normalizedPhone);
    const extension = idDocument?.name.split('.').pop()?.toLowerCase();
    const validDocument = !!idDocument
      && ['jpg', 'jpeg', 'png'].includes(extension ?? '')
      && idDocument.size > 0
      && idDocument.size <= 5 * 1024 * 1024;
    setPhoneError(validPhone ? '' : 'Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567).');
    setDocumentError(validDocument ? '' : 'Choose a valid JPG, JPEG, or PNG image up to 5 MB.');
    if (!validPhone || !idDocument || !validDocument) return;

    setSubmitting(true);
    setError('');
    try {
      await submitSellerApplication(normalizedPhone, idDocument);
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
          {!loading && user?.role === 'customer' && user.is_verified && application?.status !== 'pending' && application?.status !== 'approved' && <form onSubmit={apply} noValidate style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label htmlFor="seller-phone-number" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Phone number <span aria-hidden="true">*</span></label>
              <input id="seller-phone-number" name="phone_number" type="tel" autoComplete="tel" maxLength={20} required value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value); setPhoneError(''); }} placeholder="09171234567 or +639171234567" aria-invalid={!!phoneError} aria-describedby="seller-phone-help" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${phoneError ? 'oklch(55% 0.2 25)' : 'var(--border)'}`, borderRadius: '8px', background: 'var(--bg)', color: 'var(--text)', font: 'inherit', fontSize: '0.84rem', boxSizing: 'border-box' }} />
              <small id="seller-phone-help" style={{ display: 'block', marginTop: '5px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Use a Philippine mobile number.</small>
              {phoneError && <small id="seller-phone-error" role="alert" style={{ display: 'block', marginTop: '5px', color: 'oklch(55% 0.2 25)', fontSize: '0.75rem' }}>{phoneError}</small>}
            </div>
            <div>
              <label htmlFor="seller-id-document" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>Government-issued ID <span aria-hidden="true">*</span></label>
              <input id="seller-id-document" name="id_document" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" required onChange={(event) => { setIdDocument(event.target.files?.[0] ?? null); setDocumentError(''); }} aria-invalid={!!documentError} aria-describedby="seller-id-help" style={{ display: 'block', width: '100%', padding: '8px', border: `1px solid ${documentError ? 'oklch(55% 0.2 25)' : 'var(--border)'}`, borderRadius: '8px', background: 'var(--bg)', color: 'var(--text)', font: 'inherit', fontSize: '0.78rem', boxSizing: 'border-box' }} />
              <small id="seller-id-help" style={{ display: 'block', marginTop: '5px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>JPG, JPEG, or PNG up to 5 MB. A National ID is recommended. Use a fictional/sample ID for presentation testing.</small>
              {documentError && <small id="seller-id-error" role="alert" style={{ display: 'block', marginTop: '5px', color: 'oklch(55% 0.2 25)', fontSize: '0.75rem' }}>{documentError}</small>}
            </div>
            <button type="submit" disabled={submitting} style={{ alignSelf: 'flex-start', padding: '10px 16px', border: 0, borderRadius: '8px', color: 'white', background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))', font: 'inherit', fontSize: '.82rem', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}>{submitting ? 'Submitting…' : application?.status === 'rejected' ? 'Apply again' : 'Submit seller application'}</button>
          </form>}
          {user && !user.is_verified && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '14px 0 0' }}>Verify your email before applying. <Link to="/resend-verification" style={{ color: 'var(--accent)' }}>Verify your account</Link></p>}
          {application?.status === 'approved' && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '14px 0 0' }}>Your account is approved as a seller. <Link to="/seller/overview" style={{ color: 'var(--accent)', fontWeight: 600 }}>Open your Seller Dashboard</Link></p>}
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
