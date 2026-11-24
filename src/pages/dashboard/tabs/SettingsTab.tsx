import { useState, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../../../types/auth';
import { updateProfile, changePassword, resendVerification } from '../../../services/authApi';
import { useAuth } from '../../../contexts/AuthContext';

interface SettingsTabProps {
  user: User;
}

export const SettingsTab: FC<SettingsTabProps> = ({ user }) => {
  const { refreshAuth } = useAuth();

  // Profile form state
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [contactNumber, setContactNumber] = useState(user.contact_number ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});

  // Email verification resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const isVerified = user.is_verified;

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileFieldErrors({});
    setProfileLoading(true);

    try {
      const res = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        contact_number: contactNumber.trim(),
      });
      setProfileSuccess(res.message ?? 'Profile updated successfully.');
      await refreshAuth();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Record<string, string> };
      setProfileError(apiErr.message ?? 'Failed to update profile.');
      if (apiErr.errors) setProfileFieldErrors(apiErr.errors);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    setPasswordFieldErrors({});

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordFieldErrors({ confirm_password: 'Passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordSuccess(res.message ?? 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Record<string, string> };
      setPasswordError(apiErr.message ?? 'Failed to change password.');
      if (apiErr.errors) setPasswordFieldErrors(apiErr.errors);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      const res = await resendVerification(user.email);
      setResendMessage(res.message ?? 'If eligible, a verification code will be sent to your email.');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setResendMessage(apiErr.message ?? 'Could not request a verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  const inputStyle = (hasError = false): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1.5px solid ${hasError ? 'oklch(55% 0.2 25)' : 'var(--border)'}`,
    background: 'var(--surface)',
    color: 'var(--text)',
    fontFamily: "'Geist Mono', monospace",
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    letterSpacing: '0.02em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Preferences & Credentials
        </span>
        <h1
          style={{
            fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-heading)',
            margin: '0 0 6px',
          }}
        >
          Account Settings
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Manage your personal information, security credentials, and verification status.
        </p>
      </div>

      {/* Email Verification Status Card */}
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: isVerified
                ? 'oklch(55% 0.17 155 / 0.15)'
                : 'oklch(65% 0.18 60 / 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isVerified ? 'oklch(55% 0.17 155)' : 'oklch(65% 0.18 60)',
              flexShrink: 0,
            }}
          >
            {isVerified ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                Email Verification
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: isVerified
                    ? 'oklch(55% 0.17 155 / 0.15)'
                    : 'oklch(65% 0.18 60 / 0.15)',
                  color: isVerified ? 'oklch(55% 0.17 155)' : 'oklch(65% 0.18 60)',
                  border: `1px solid ${isVerified ? 'oklch(55% 0.17 155 / 0.3)' : 'oklch(65% 0.18 60 / 0.3)'}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              {isVerified
                ? `Your account email (${user.email}) is confirmed.`
                : `We sent a link to ${user.email}. Verification is required to unlock full seller and order features.`}
            </p>
            {resendMessage && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent)', margin: '6px 0 0', fontWeight: 500 }}>
                {resendMessage}
              </p>
            )}
          </div>
        </div>

        {!isVerified && (
          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: resendLoading ? 'not-allowed' : 'pointer',
              fontFamily: "'Geist Mono', monospace",
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {resendLoading ? 'Sending…' : 'Resend Verification Code'}
          </button>
        )}
      </div>

      {/* Profile Information Card */}
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px' }}>
            Profile Details
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Update your public name and primary contact telephone number.
          </p>
        </div>

        {profileSuccess && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'oklch(55% 0.17 155 / 0.12)',
              border: '1px solid oklch(55% 0.17 155 / 0.3)',
              color: 'oklch(55% 0.17 155)',
              fontSize: '0.84rem',
              marginBottom: '18px',
            }}
          >
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'oklch(55% 0.2 25 / 0.12)',
              border: '1px solid oklch(55% 0.2 25 / 0.3)',
              color: 'oklch(55% 0.2 25)',
              fontSize: '0.84rem',
              marginBottom: '18px',
            }}
          >
            {profileError}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle(!!profileFieldErrors.first_name)}
                required
              />
              {profileFieldErrors.first_name && (
                <span style={{ fontSize: '0.75rem', color: 'oklch(55% 0.2 25)', marginTop: '4px', display: 'block' }}>
                  {profileFieldErrors.first_name}
                </span>
              )}
            </div>

            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle(!!profileFieldErrors.last_name)}
                required
              />
              {profileFieldErrors.last_name && (
                <span style={{ fontSize: '0.75rem', color: 'oklch(55% 0.2 25)', marginTop: '4px', display: 'block' }}>
                  {profileFieldErrors.last_name}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Contact Number</label>
              <input
                type="tel"
                placeholder="09XXXXXXXXX"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                style={inputStyle(!!profileFieldErrors.contact_number)}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Philippine mobile number (e.g. 09171234567)
              </span>
              {profileFieldErrors.contact_number && (
                <span style={{ fontSize: '0.75rem', color: 'oklch(55% 0.2 25)', marginTop: '4px', display: 'block' }}>
                  {profileFieldErrors.contact_number}
                </span>
              )}
            </div>

            <div>
              <label style={labelStyle}>Email Address (Read-only)</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  ...inputStyle(),
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed',
                }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Primary login credential. Contact support to change.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Account Role: <strong>{user.role.toUpperCase()}</strong>
              {user.created_at ? ` • Member since ${new Date(user.created_at).toLocaleDateString()}` : ''}
            </span>

            <button
              type="submit"
              disabled={profileLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                color: 'white',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 600,
                fontFamily: "'Geist Mono', monospace",
                cursor: profileLoading ? 'not-allowed' : 'pointer',
                opacity: profileLoading ? 0.7 : 1,
              }}
            >
              {profileLoading ? 'Saving Changes…' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Card */}
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px' }}>
            Security & Password
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Keep your account secure by using a strong, unique password.
          </p>
        </div>

        {passwordSuccess && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'oklch(55% 0.17 155 / 0.12)',
              border: '1px solid oklch(55% 0.17 155 / 0.3)',
              color: 'oklch(55% 0.17 155)',
              fontSize: '0.84rem',
              marginBottom: '18px',
            }}
          >
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'oklch(55% 0.2 25 / 0.12)',
              border: '1px solid oklch(55% 0.2 25 / 0.3)',
              color: 'oklch(55% 0.2 25)',
              fontSize: '0.84rem',
              marginBottom: '18px',
            }}
          >
            {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={inputStyle(!!passwordFieldErrors.current_password)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}
              >
                {showCurrentPass ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordFieldErrors.current_password && (
              <span style={{ fontSize: '0.75rem', color: 'oklch(55% 0.2 25)', marginTop: '4px', display: 'block' }}>
                {passwordFieldErrors.current_password}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={inputStyle(!!passwordFieldErrors.new_password)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                  }}
                >
                  {showNewPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', lineHeight: 1.4 }}>
                At least 8 characters with uppercase, lowercase, number, and symbol.
              </span>
              {passwordFieldErrors.new_password && (
                <span style={{ fontSize: '0.75rem', color: 'oklch(55% 0.2 25)', marginTop: '4px', display: 'block' }}>
                  {passwordFieldErrors.new_password}
                </span>
              )}
            </div>

            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle(!!passwordFieldErrors.confirm_password)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                  }}
                >
                  {showConfirmPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordFieldErrors.confirm_password && (
                <span style={{ fontSize: '0.75rem', color: 'oklch(55% 0.2 25)', marginTop: '4px', display: 'block' }}>
                  {passwordFieldErrors.confirm_password}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--border)',
                fontSize: '0.84rem',
                fontWeight: 600,
                fontFamily: "'Geist Mono', monospace",
                cursor: passwordLoading ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {passwordLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Seller Application Section */}
      {user.role === 'customer' && (
        <div
          style={{
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>
              Bookify Seller Network
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px' }}>
              Want to sell books on Bookify?
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Approved sellers can manage catalogs, list pre-loved titles, and track revenue.
            </p>
          </div>
          <Link
            to="/seller-application"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Apply as Seller
          </Link>
        </div>
      )}
    </div>
  );
};
