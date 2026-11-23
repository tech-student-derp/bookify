// Bookify — Seller Store Profile API Service
// Endpoints hit /backend/controllers/SellerProfileController.php

import { getCsrfToken } from './authApi';

const API_BASE = '/backend/controllers/SellerProfileController.php';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SellerProfile {
  user_id: number;
  store_name: string;
  bio: string | null;
  logo_path: string | null;
  banner_path: string | null;
  pickup_address_line: string | null;
  pickup_barangay: string | null;
  pickup_city: string | null;
  pickup_province: string | null;
  pickup_region: string | null;
  pickup_postal_code: string | null;
  pickup_contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerProfileUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string | null;
  is_verified: boolean;
}

export interface GetProfileResponse {
  success: boolean;
  has_profile: boolean;
  profile: SellerProfile | null;
  user: SellerProfileUser;
}

export interface SaveProfilePayload {
  store_name: string;
  bio?: string | null;
  pickup_address_line?: string | null;
  pickup_barangay?: string | null;
  pickup_city?: string | null;
  pickup_province?: string | null;
  pickup_region?: string | null;
  pickup_postal_code?: string | null;
  pickup_contact?: string | null;
}

export interface SaveProfileResponse {
  success: boolean;
  message: string;
  profile: SellerProfile;
}

export interface UploadImageResponse {
  success: boolean;
  message: string;
  logo_path?: string;
  banner_path?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

// ── Helper ───────────────────────────────────────────────────────────────────

function clearCsrfOnForbidden(status: number): void {
  // If a CSRF mismatch occurs, the authApi cache should be invalidated.
  // The getCsrfToken function will re-fetch on the next call after import-time cache is stale.
  // We handle this by simply re-throwing so callers retry.
  if (status === 403) {
    // The authApi module's internal csrfToken cache will be cleared by authApi's own 403 handler
    // when it next makes a request. For seller profile calls we just propagate the error.
  }
}

// ── API Functions ────────────────────────────────────────────────────────────

/**
 * Get the authenticated seller's store profile.
 */
export async function getSellerProfile(): Promise<GetProfileResponse> {
  const res = await fetch(`${API_BASE}?action=get`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    clearCsrfOnForbidden(res.status);
    throw data as ApiErrorResponse;
  }

  return data as GetProfileResponse;
}

/**
 * Create or update the seller's store profile (text fields only, not images).
 */
export async function saveSellerProfile(payload: SaveProfilePayload): Promise<SaveProfileResponse> {
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_BASE}?action=save`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    clearCsrfOnForbidden(res.status);
    throw data as ApiErrorResponse;
  }

  return data as SaveProfileResponse;
}

/**
 * Upload a store logo image.
 */
export async function uploadSellerLogo(file: File): Promise<UploadImageResponse> {
  const csrfToken = await getCsrfToken();

  const formData = new FormData();
  formData.append('logo', file);

  const res = await fetch(`${API_BASE}?action=upload-logo`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrfToken,
      // Do NOT set Content-Type — the browser sets multipart/form-data with boundary
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    clearCsrfOnForbidden(res.status);
    throw data as ApiErrorResponse;
  }

  return data as UploadImageResponse;
}

/**
 * Upload a store banner image.
 */
export async function uploadSellerBanner(file: File): Promise<UploadImageResponse> {
  const csrfToken = await getCsrfToken();

  const formData = new FormData();
  formData.append('banner', file);

  const res = await fetch(`${API_BASE}?action=upload-banner`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    clearCsrfOnForbidden(res.status);
    throw data as ApiErrorResponse;
  }

  return data as UploadImageResponse;
}

/**
 * Remove the store logo.
 */
export async function removeSellerLogo(): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_BASE}?action=remove-logo`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    clearCsrfOnForbidden(res.status);
    throw data as ApiErrorResponse;
  }

  return data;
}

/**
 * Remove the store banner.
 */
export async function removeSellerBanner(): Promise<{ success: boolean; message: string }> {
  const csrfToken = await getCsrfToken();

  const res = await fetch(`${API_BASE}?action=remove-banner`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    clearCsrfOnForbidden(res.status);
    throw data as ApiErrorResponse;
  }

  return data;
}
