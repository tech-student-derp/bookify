import { type FC, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getSellerProfile,
  saveSellerProfile,
  uploadSellerLogo,
  uploadSellerBanner,
  removeSellerLogo,
  removeSellerBanner,
  type SellerProfile,
  type SaveProfilePayload,
  type ApiErrorResponse,
} from '../../services/sellerProfileApi';

// ── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  store_name: string;
  bio: string;
  pickup_address_line: string;
  pickup_barangay: string;
  pickup_city: string;
  pickup_province: string;
  pickup_region: string;
  pickup_postal_code: string;
  pickup_contact: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

const emptyForm: FormData = {
  store_name: '',
  bio: '',
  pickup_address_line: '',
  pickup_barangay: '',
  pickup_city: '',
  pickup_province: '',
  pickup_region: '',
  pickup_postal_code: '',
  pickup_contact: '',
};

function profileToForm(profile: SellerProfile | null): FormData {
  if (!profile) return { ...emptyForm };
  return {
    store_name: profile.store_name ?? '',
    bio: profile.bio ?? '',
    pickup_address_line: profile.pickup_address_line ?? '',
    pickup_barangay: profile.pickup_barangay ?? '',
    pickup_city: profile.pickup_city ?? '',
    pickup_province: profile.pickup_province ?? '',
    pickup_region: profile.pickup_region ?? '',
    pickup_postal_code: profile.pickup_postal_code ?? '',
    pickup_contact: profile.pickup_contact ?? '',
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export const SellerSettingsPage: FC = () => {
  // Loading & state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Profile data
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [errors, setErrors] = useState<FormErrors>({});

  // Image uploads
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // ── Load profile ─────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getSellerProfile();
      setHasProfile(data.has_profile);
      setProfile(data.profile);
      setForm(profileToForm(data.profile));
      setLogoPath(data.profile?.logo_path ?? null);
      setBannerPath(data.profile?.banner_path ?? null);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setLoadError(apiErr?.message ?? 'Failed to load store profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    // Clear success/general messages on edit
    setSuccessMsg(null);
    setGeneralError(null);
  };

  const validateForm = (): FormErrors => {
    const e: FormErrors = {};
    const name = form.store_name.trim();
    if (!name) {
      e.store_name = 'Store name is required.';
    } else if (name.length < 2) {
      e.store_name = 'Store name must be at least 2 characters.';
    } else if (name.length > 150) {
      e.store_name = 'Store name cannot exceed 150 characters.';
    }
    if (form.bio.length > 5000) {
      e.bio = 'Biography cannot exceed 5,000 characters.';
    }
    if (form.pickup_address_line.length > 255) {
      e.pickup_address_line = 'Address line cannot exceed 255 characters.';
    }
    if (form.pickup_barangay.length > 120) {
      e.pickup_barangay = 'Barangay cannot exceed 120 characters.';
    }
    if (form.pickup_city.length > 120) {
      e.pickup_city = 'City cannot exceed 120 characters.';
    }
    if (form.pickup_province.length > 120) {
      e.pickup_province = 'Province cannot exceed 120 characters.';
    }
    if (form.pickup_region.length > 120) {
      e.pickup_region = 'Region cannot exceed 120 characters.';
    }
    if (form.pickup_postal_code && form.pickup_postal_code.length > 12) {
      e.pickup_postal_code = 'Postal code cannot exceed 12 characters.';
    }
    if (form.pickup_contact && form.pickup_contact.length > 20) {
      e.pickup_contact = 'Contact number cannot exceed 20 characters.';
    }
    if (form.pickup_contact && !/^(\+?63|0)9\d{9}$/.test(form.pickup_contact.trim())) {
      if (form.pickup_contact.trim() !== '') {
        e.pickup_contact = 'Enter a valid Philippine mobile number (e.g. 09171234567).';
      }
    }
    return e;
  };

  // ── Save profile ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSuccessMsg(null);
    setGeneralError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const payload: SaveProfilePayload = {
      store_name: form.store_name.trim(),
      bio: form.bio.trim() || null,
      pickup_address_line: form.pickup_address_line.trim() || null,
      pickup_barangay: form.pickup_barangay.trim() || null,
      pickup_city: form.pickup_city.trim() || null,
      pickup_province: form.pickup_province.trim() || null,
      pickup_region: form.pickup_region.trim() || null,
      pickup_postal_code: form.pickup_postal_code.trim() || null,
      pickup_contact: form.pickup_contact.trim() || null,
    };

    try {
      setSaving(true);
      const data = await saveSellerProfile(payload);
      setProfile(data.profile);
      setHasProfile(true);
      setForm(profileToForm(data.profile));
      setSuccessMsg(data.message ?? 'Store profile saved successfully.');
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      if (apiErr?.errors) {
        setErrors(apiErr.errors as FormErrors);
      }
      setGeneralError(apiErr?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Image uploads ────────────────────────────────────────────────────────

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    if (logoInputRef.current) logoInputRef.current.value = '';

    setLogoError(null);
    setUploadingLogo(true);
    try {
      const data = await uploadSellerLogo(file);
      setLogoPath(data.logo_path ?? null);
      setSuccessMsg(data.message ?? 'Logo uploaded.');
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setLogoError(apiErr?.message ?? 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (bannerInputRef.current) bannerInputRef.current.value = '';

    setBannerError(null);
    setUploadingBanner(true);
    try {
      const data = await uploadSellerBanner(file);
      setBannerPath(data.banner_path ?? null);
      setSuccessMsg(data.message ?? 'Banner uploaded.');
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setBannerError(apiErr?.message ?? 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoError(null);
    setUploadingLogo(true);
    try {
      await removeSellerLogo();
      setLogoPath(null);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setLogoError(apiErr?.message ?? 'Failed to remove logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveBanner = async () => {
    setBannerError(null);
    setUploadingBanner(true);
    try {
      await removeSellerBanner();
      setBannerPath(null);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setBannerError(apiErr?.message ?? 'Failed to remove banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
        <span className="text-sm text-[var(--text-muted)] font-mono">Loading store profile…</span>
      </div>
    );
  }

  // Load error
  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <h2 className="text-lg font-bold text-[var(--text)]">Unable to Load Store Profile</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{loadError}</p>
          <button
            onClick={loadProfile}
            className="mt-4 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>{hasProfile ? 'Profile Active' : 'New Profile'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Store Profile & Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {hasProfile
              ? 'Manage your storefront identity, pickup address, and merchant branding.'
              : 'Set up your storefront identity before listing books on the marketplace.'}
          </p>
        </div>
        <Link
          to="/seller/overview"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors self-start sm:self-auto"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm">
          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 shrink-0">✓</span>
          <span className="text-emerald-700 dark:text-emerald-400">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-500 hover:text-emerald-700 font-bold text-xs">✕</button>
        </div>
      )}
      {generalError && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/5 text-sm">
          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20 text-red-600 shrink-0">!</span>
          <span className="text-red-700 dark:text-red-400">{generalError}</span>
          <button onClick={() => setGeneralError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold text-xs">✕</button>
        </div>
      )}

      {/* ═══ SECTION: Store Identity ══════════════════════════════════════ */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
          <h2 className="text-base font-semibold text-[var(--text)]">Store Identity</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">Your public bookstore name and description</p>
        </div>
        <div className="p-5 md:p-6 space-y-5">
          {/* Store Name */}
          <FieldGroup label="Store Name" required error={errors.store_name} hint="Visible on your public storefront and in marketplace listings.">
            <input
              type="text"
              value={form.store_name}
              onChange={(e) => updateField('store_name', e.target.value)}
              placeholder="e.g. Juan's Rare Book Shop"
              maxLength={150}
              className={inputClasses(errors.store_name)}
            />
            <CharCount current={form.store_name.length} max={150} />
          </FieldGroup>

          {/* Bio */}
          <FieldGroup label="Store Biography" error={errors.bio} hint="Describe your bookstore, specialties, and what buyers can expect.">
            <textarea
              value={form.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Tell buyers about your bookstore…"
              rows={4}
              maxLength={5000}
              className={inputClasses(errors.bio) + ' resize-y min-h-[100px]'}
            />
            <CharCount current={form.bio.length} max={5000} />
          </FieldGroup>
        </div>
      </section>

      {/* ═══ SECTION: Store Branding (Logo & Banner) ════════════════════ */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
          <h2 className="text-base font-semibold text-[var(--text)]">Store Branding</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">Logo and banner images for your storefront</p>
        </div>
        <div className="p-5 md:p-6 space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Store Logo
              <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-[var(--text-muted)]">
                — JPEG, PNG, or WebP · Max 2 MB · Min 50×50 px
              </span>
            </label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center overflow-hidden shrink-0">
                {logoPath ? (
                  <img src={logoPath} alt="Store logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-2xl text-[var(--text-muted)]">📷</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading…' : logoPath ? 'Replace Logo' : 'Upload Logo'}
                  </button>
                  {logoPath && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-mono font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {logoError && <p className="text-xs text-red-600 dark:text-red-400">{logoError}</p>}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Banner Upload */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Store Banner
              <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-[var(--text-muted)]">
                — JPEG, PNG, or WebP · Max 5 MB · Min 200×60 px
              </span>
            </label>
            <div className="space-y-3">
              {/* Banner Preview */}
              <div className="w-full h-32 md:h-40 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center overflow-hidden">
                {bannerPath ? (
                  <img src={bannerPath} alt="Store banner" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="text-center">
                    <span className="text-3xl text-[var(--text-muted)]">🖼️</span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">No banner uploaded</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
                >
                  {uploadingBanner ? 'Uploading…' : bannerPath ? 'Replace Banner' : 'Upload Banner'}
                </button>
                {bannerPath && (
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    disabled={uploadingBanner}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-mono font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              {bannerError && <p className="text-xs text-red-600 dark:text-red-400">{bannerError}</p>}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBannerSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: Pickup Information ════════════════════════════════ */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
          <h2 className="text-base font-semibold text-[var(--text)]">Pickup Information</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">Courier dispatch address for physical book orders · Optional for digital-only sellers</p>
        </div>
        <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Address Line */}
            <div className="md:col-span-2">
              <FieldGroup label="Address Line" error={errors.pickup_address_line} hint="Street address, unit, building, or landmark.">
                <input
                  type="text"
                  value={form.pickup_address_line}
                  onChange={(e) => updateField('pickup_address_line', e.target.value)}
                  placeholder="e.g. 123 Rizal St., Brgy. Poblacion"
                  maxLength={255}
                  className={inputClasses(errors.pickup_address_line)}
                />
              </FieldGroup>
            </div>

            <FieldGroup label="Barangay" error={errors.pickup_barangay}>
              <input
                type="text"
                value={form.pickup_barangay}
                onChange={(e) => updateField('pickup_barangay', e.target.value)}
                placeholder="Barangay"
                maxLength={120}
                className={inputClasses(errors.pickup_barangay)}
              />
            </FieldGroup>

            <FieldGroup label="City / Municipality" error={errors.pickup_city}>
              <input
                type="text"
                value={form.pickup_city}
                onChange={(e) => updateField('pickup_city', e.target.value)}
                placeholder="City or Municipality"
                maxLength={120}
                className={inputClasses(errors.pickup_city)}
              />
            </FieldGroup>

            <FieldGroup label="Province" error={errors.pickup_province}>
              <input
                type="text"
                value={form.pickup_province}
                onChange={(e) => updateField('pickup_province', e.target.value)}
                placeholder="Province"
                maxLength={120}
                className={inputClasses(errors.pickup_province)}
              />
            </FieldGroup>

            <FieldGroup label="Region" error={errors.pickup_region}>
              <input
                type="text"
                value={form.pickup_region}
                onChange={(e) => updateField('pickup_region', e.target.value)}
                placeholder="e.g. NCR, Region IV-A"
                maxLength={120}
                className={inputClasses(errors.pickup_region)}
              />
            </FieldGroup>

            <FieldGroup label="Postal Code" error={errors.pickup_postal_code}>
              <input
                type="text"
                value={form.pickup_postal_code}
                onChange={(e) => updateField('pickup_postal_code', e.target.value)}
                placeholder="e.g. 1000"
                maxLength={12}
                className={inputClasses(errors.pickup_postal_code)}
              />
            </FieldGroup>

            <FieldGroup label="Pickup Contact Number" error={errors.pickup_contact} hint="Philippine mobile: 09XXXXXXXXX or +639XXXXXXXXX">
              <input
                type="tel"
                value={form.pickup_contact}
                onChange={(e) => updateField('pickup_contact', e.target.value)}
                placeholder="09171234567"
                maxLength={20}
                className={inputClasses(errors.pickup_contact)}
              />
            </FieldGroup>
          </div>
        </div>
      </section>

      {/* ═══ Save Button ═════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 pt-2 pb-4">
        <p className="text-xs text-[var(--text-muted)] font-mono">
          {hasProfile
            ? `Profile last updated: ${profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : '—'}`
            : 'No store profile created yet.'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono font-semibold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : hasProfile ? 'Save Changes' : 'Create Store Profile'}
        </button>
      </div>
    </div>
  );
};

// ── Reusable sub-components ──────────────────────────────────────────────────

interface FieldGroupProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

const FieldGroup: FC<FieldGroupProps> = ({ label, required, error, hint, children }) => (
  <div>
    <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && (
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>
    )}
    {error && (
      <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>
    )}
  </div>
);

function inputClasses(error?: string): string {
  const base =
    'w-full px-3 py-2 rounded-lg border bg-[var(--bg)] text-sm font-mono text-[var(--text)] placeholder:text-[var(--text-muted)]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]';
  return error
    ? `${base} border-red-500/60 focus:ring-red-500/30 focus:border-red-500`
    : `${base} border-[var(--border)] hover:border-[var(--accent)]/50`;
}

const CharCount: FC<{ current: number; max: number }> = ({ current, max }) => (
  <div className="mt-1 text-right">
    <span className={`text-[10px] font-mono ${current > max * 0.9 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
      {current.toLocaleString()}/{max.toLocaleString()}
    </span>
  </div>
);

export default SellerSettingsPage;
