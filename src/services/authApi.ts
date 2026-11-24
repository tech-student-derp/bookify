// Bookify — API service layer
// All requests go to the PHP backend at /backend/controllers/AuthController.php

import type { User, RegisterPayload, LoginPayload, UpdateProfilePayload, ChangePasswordPayload } from '../types/auth';

const API_BASE = '/backend/controllers/AuthController.php';

// ── CSRF token cache ──────────────────────────────────────────────────────────
let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_BASE}?action=csrf`, {
    credentials: 'include',
  });
  const data = await res.json();
  csrfToken = data.csrf_token as string;
  return csrfToken;
}

export function getCsrfToken(): Promise<string> {
  return fetchCsrfToken();
}

function clearCsrfCache() {
  csrfToken = null;
}

// ── Generic request helper ────────────────────────────────────────────────────
async function apiRequest<T>(
  action: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${API_BASE}?action=${action}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (method === 'POST') {
    headers['X-CSRF-Token'] = await fetchCsrfToken();
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    // On 403 (CSRF mismatch) clear the cache so it's refreshed next time
    if (res.status === 403) clearCsrfCache();
    throw data; // throw the full error object so callers can read .errors
  }

  return data as T;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export async function getMe(): Promise<{ authenticated: boolean; user: User | null }> {
  return apiRequest('me', 'GET');
}

export interface RegistrationWithCaptchaPayload extends RegisterPayload {
  turnstile_token: string;
}

export async function register(payload: RegistrationWithCaptchaPayload): Promise<{ message: string; user_id: number }> {
  return apiRequest('register', 'POST', payload as unknown as Record<string, unknown>);
}

export async function login(payload: LoginPayload): Promise<{ message: string; user: User }> {
  return apiRequest('login', 'POST', payload as unknown as Record<string, unknown>);
}

export async function logout(): Promise<{ message: string }> {
  const result = await apiRequest<{ message: string }>('logout', 'POST');
  clearCsrfCache();
  return result;
}

export async function verifyEmail(otp: string, email: string): Promise<{ message: string }> {
  return apiRequest('verify', 'POST', { otp, email });
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  return apiRequest('resend-verification', 'POST', { email });
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<{ message: string; user: User }> {
  return apiRequest('update-profile', 'POST', payload as unknown as Record<string, unknown>);
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return apiRequest('change-password', 'POST', payload as unknown as Record<string, unknown>);
}

export interface StaffAccount {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'staff';
  is_verified: boolean;
  account_status?: 'active' | 'suspended';
  contact_number: string | null;
  created_at: string;
}

export async function listStaffAccounts(): Promise<{ staff: StaffAccount[] }> {
  return apiRequest('list-staff', 'GET');
}

export async function createStaffAccount(payload: RegisterPayload): Promise<{ message: string; user_id: number }> {
  return apiRequest('create-staff', 'POST', payload as unknown as Record<string, unknown>);
}
