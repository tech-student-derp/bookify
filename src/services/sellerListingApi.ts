import { getCsrfToken } from './authApi';
import { appendListingTaxonomyFields } from '../data/listingTaxonomy';

const API_BASE = '/backend/controllers/ListingController.php';

export type BookCondition = 'New' | 'Like New' | 'Very Good' | 'Good' | 'Acceptable' | 'Pre-owned';
export type BookFormat = 'Physical' | 'E-book';
export type ListingStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'suspended' | 'archived';

export interface ListingMedia { id: number; media_type: 'back_cover' | 'additional' | 'interior_preview'; file_path: string; sort_order: number; }

export interface SellerListing {
  id: number;
  title: string;
  author: string;
  publisher: string | null;
  description: string | null;
  cover_image_path: string | null;
  category: string;
  language: string | null;
  isbn: string | null;
  price: string;
  condition: BookCondition;
  format: BookFormat;
  stock_quantity: number;
  availability: 'available' | 'unavailable';
  listing_status: 'draft' | 'pending_review' | 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'suspended';
  publication_status: 'draft' | 'published' | 'unpublished';
  moderation_reason: string | null;
  archived_at: string | null;
  submitted_at?: string | null;
  has_ebook_file?: boolean | number;
  ebook_file_format?: 'PDF' | 'EPUB' | null;
  ebook_rights_confirmed?: boolean | number;
  media?: ListingMedia[];
  created_at?: string;
  updated_at?: string;
}

export interface ListingInput {
  title: string;
  author: string;
  publisher: string;
  description: string;
  category: string;
  category_is_custom: boolean;
  language: string;
  language_is_custom: boolean;
  isbn: string;
  price: string;
  condition: BookCondition;
  format: BookFormat;
  stock_quantity: string;
  cover_image?: File | null;
  back_cover?: File | null;
  additional_images?: File[];
  interior_previews?: File[];
  ebook_file?: File | null;
  ebook_rights_confirmed: boolean;
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

export function listingFormData(input: ListingInput, intent: 'draft' | 'submit', id?: number): FormData {
  const form = new FormData();
  if (id !== undefined) form.append('id', String(id));
  form.append('intent', intent);
  form.append('title', input.title.trim());
  form.append('author', input.author.trim());
  form.append('publisher', input.publisher.trim());
  form.append('description', input.description.trim());
  appendListingTaxonomyFields(form, input);
  form.append('isbn', input.isbn.trim());
  form.append('price', input.price);
  form.append('condition', input.condition);
  form.append('format', input.format);
  form.append('stock_quantity', input.stock_quantity);
  form.append('ebook_rights_confirmed', input.ebook_rights_confirmed ? '1' : '0');
  if (input.cover_image) form.append('cover_image', input.cover_image);
  if (input.back_cover) form.append('back_cover', input.back_cover);
  for (const file of input.additional_images ?? []) form.append('additional_images[]', file);
  for (const file of input.interior_previews ?? []) form.append('interior_previews[]', file);
  if (input.ebook_file) form.append('ebook_file', input.ebook_file);
  return form;
}

export function listSellerListings(params: Record<string, string>) {
  return request<{ success: true; listings: SellerListing[]; total: number; page: number; per_page: number }>('list', { params });
}

export function getSellerListing(id: number) {
  return request<{ success: true; listing: SellerListing }>('details', { params: { id: String(id) } });
}

export function createSellerListing(input: ListingInput, intent: 'draft' | 'submit') {
  return request<{ success: true; message: string; listing_id: number }>('create', { method: 'POST', body: listingFormData(input, intent) });
}

export function updateSellerListing(id: number, input: ListingInput, intent: 'draft' | 'submit') {
  return request<{ success: true; message: string }>('update', { method: 'POST', body: listingFormData(input, intent, id) });
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
  if (listing.listing_status === 'pending') return 'pending_review';
  return listing.listing_status;
}
