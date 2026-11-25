import { getCsrfToken } from './authApi';

const API_BASE = '/backend/controllers/ListingController.php';

export type BookCondition = 'New' | 'Like New' | 'Very Good' | 'Good' | 'Acceptable' | 'Pre-owned';
export type BookFormat = 'Physical' | 'E-book';
export type ListingStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'suspended' | 'archived' | 'unpublished';

export interface SellerListing {
  id: number;
  title: string;
  author: string;
  description: string | null;
  cover_image_path: string | null;
  category: string;
  isbn: string | null;
  price: string;
  condition: BookCondition;
  format: BookFormat;
  stock_quantity: number;
  availability: 'available' | 'unavailable';
  listing_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  publication_status: 'draft' | 'published' | 'unpublished';
  moderation_reason: string | null;
  archived_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ListingInput {
  title: string;
  author: string;
  description: string;
  category: string;
  isbn: string;
  price: string;
  condition: BookCondition;
  format: BookFormat;
  stock_quantity: string;
  cover_image?: File | null;
}

interface ApiResult { success: boolean; message?: string; errors?: Record<string, string>; }

async function request<T extends ApiResult>(action: string, options: { method?: 'GET' | 'POST'; params?: Record<string, string>; body?: Record<string, unknown> | FormData } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const query = new URLSearchParams({ action, ...options.params });
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (method === 'POST') {
    headers['X-CSRF-Token'] = await getCsrfToken();
    if (options.body instanceof FormData) body = options.body;
    else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body ?? {});
    }
  }
  const response = await fetch(`${API_BASE}?${query}`, { method, credentials: 'include', headers, body });
  const data = await response.json() as T;
  if (!response.ok || !data.success) throw data;
  return data;
}

function listingFormData(input: ListingInput, id?: number): FormData {
  const form = new FormData();
  if (id !== undefined) form.append('id', String(id));
  form.append('title', input.title.trim());
  form.append('author', input.author.trim());
  form.append('description', input.description.trim());
  form.append('category', input.category.trim());
  form.append('isbn', input.isbn.trim());
  form.append('price', input.price);
  form.append('condition', input.condition);
  form.append('format', input.format);
  form.append('stock_quantity', input.stock_quantity);
  if (input.cover_image) form.append('cover_image', input.cover_image);
  return form;
}

export function listSellerListings(params: Record<string, string>) {
  return request<{ success: true; listings: SellerListing[]; total: number; page: number; per_page: number }>('list', { params });
}

export function getSellerListing(id: number) {
  return request<{ success: true; listing: SellerListing }>('details', { params: { id: String(id) } });
}

export function createSellerListing(input: ListingInput) {
  return request<{ success: true; message: string; listing_id: number }>('create', { method: 'POST', body: listingFormData(input) });
}

export function updateSellerListing(id: number, input: ListingInput) {
  return request<{ success: true; message: string }>('update', { method: 'POST', body: listingFormData(input, id) });
}

export function updateSellerInventory(id: number, stock_quantity: number) {
  return request<{ success: true; message: string; stock_quantity: number }>('inventory', { method: 'POST', body: { id, stock_quantity } });
}

export function archiveSellerListing(id: number) {
  return request<{ success: true; message: string }>('archive', { method: 'POST', body: { id } });
}

export function unarchiveSellerListing(id: number) {
  return request<{ success: true; message: string }>('unarchive', { method: 'POST', body: { id } });
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (error && typeof error === 'object' && 'errors' in error && error.errors && typeof error.errors === 'object') {
    return error.errors as Record<string, string>;
  }
  return {};
}

export function displayListingStatus(listing: SellerListing): ListingStatus {
  if (listing.archived_at) return 'archived';
  if (listing.listing_status === 'pending') return listing.publication_status === 'draft' ? 'pending' : 'draft';
  if (listing.listing_status === 'approved') return listing.publication_status === 'published' ? 'published' : 'unpublished';
  return listing.listing_status;
}
