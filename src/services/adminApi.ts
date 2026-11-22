import { getCsrfToken } from './authApi';

export interface AdminOverview {
  stats: {
    customers: number | null;
    approved_sellers: number;
    pending_seller_applications: number;
    staff_accounts: number | null;
    active_listings: number | null;
    pending_listing_reviews: number | null;
    total_orders: number | null;
    pending_orders: number | null;
    active_deliveries: number | null;
    pending_refunds: number | null;
  };
  unavailable_modules: string[];
  available_modules?: string[];
}

async function adminRequest<T>(action: string, options: { method?: 'GET' | 'POST'; params?: Record<string, string>; body?: Record<string, unknown> } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const query = new URLSearchParams({ action, ...options.params });
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrfToken();
  }
  const response = await fetch(`/backend/controllers/AdminController.php?${query}`, {
    method, credentials: 'include', headers,
    body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
  });
  const data = await response.json() as { success: boolean; message?: string } & Record<string, unknown>;
  if (!response.ok || !data.success) throw new Error(data.message || 'The back-office request failed.');
  return data as T;
}

export function getAdminOverview() { return adminRequest<AdminOverview>('overview'); }

export interface ManagedUser {
  id: number; first_name: string; last_name: string; email: string; role: 'customer' | 'seller' | 'staff' | 'admin';
  is_verified: boolean; account_status: 'active' | 'suspended'; created_at: string;
}
export interface ManagedStaff extends ManagedUser { role: 'staff'; contact_number: string | null; }
export interface SellerApplicationRecord {
  id: number; user_id: number; status: 'pending' | 'approved' | 'rejected'; applied_at: string; reviewed_at: string | null;
  reviewed_by: number | null; notes: string | null; first_name: string; last_name: string; email: string;
  contact_number: string | null; is_verified: boolean; account_status: 'active' | 'suspended'; role: string;
}
export interface ManagedListing {
  id: number; title: string; author: string; description: string | null; cover_image_path: string | null; category: string;
  price: string; condition: 'New' | 'Pre-owned'; format: 'Physical' | 'E-book'; source: 'seller' | 'bookify';
  seller_id: number | null; created_by: number; listing_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  publication_status: 'draft' | 'published' | 'unpublished'; availability: 'available' | 'unavailable';
  moderation_reason: string | null; reviewed_at: string | null; created_at: string;
  seller_first_name: string | null; seller_last_name: string | null; creator_first_name: string; creator_last_name: string;
}
export interface PageResult { total: number; page: number; per_page: number; }

export function listUsers(params: Record<string, string>) { return adminRequest<{ users: ManagedUser[] } & PageResult>('users', { params }); }
export function getUserDetails(id: number) { return adminRequest<{ user: ManagedUser & { contact_number: string | null }; seller_applications: SellerApplicationRecord[]; order_history_available: boolean; order_history: { id: number; status: string; total: string; created_at: string }[] }>('user', { params: { id: String(id) } }); }
export function setUserStatus(body: { user_id: number; status: 'active' | 'suspended'; reason: string }) { return adminRequest<{ message: string }>('account-status', { method: 'POST', body }); }
export function listStaff(params: Record<string, string>) { return adminRequest<{ staff: ManagedStaff[] } & PageResult>('staff', { params }); }
export function updateStaff(body: { staff_id: number; first_name: string; last_name: string; email: string; contact_number: string; status: 'active' | 'suspended' }) { return adminRequest<{ message: string }>('staff-update', { method: 'POST', body }); }
export function listSellerApplications(params: Record<string, string>) { return adminRequest<{ applications: SellerApplicationRecord[] } & PageResult>('seller-applications', { params }); }
export function reviewSellerApplication(body: { application_id: number; decision: 'approved' | 'rejected'; reason: string }) { return adminRequest<{ message: string }>('review-seller', { method: 'POST', body }); }
export function listListings(params: Record<string, string>) { return adminRequest<{ listings: ManagedListing[] } & PageResult>('listings', { params }); }
export function createBookifyListing(body: Record<string, unknown>) { return adminRequest<{ message: string; listing_id: number }>('listing-create', { method: 'POST', body }); }
export function reviewListing(body: { listing_id: number; decision: 'approve' | 'reject' | 'suspend' | 'restore' | 'publish' | 'unpublish'; reason: string }) { return adminRequest<{ message: string }>('review-listing', { method: 'POST', body }); }
