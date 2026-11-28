import { getCsrfToken } from './authApi';

export type CartItem = {
  id: number;
  listing_id: number;
  quantity: number;
  title: string | null;
  author: string | null;
  seller_name: string | null;
  seller_id: number | null;
  format: string | null;
  price: number | null;
  cover_url: string | null;
  eligible: boolean;
  can_increase: boolean;
  reason: string | null;
  subtotal: number | null;
};

export type CartPayload = { items: CartItem[]; item_count: number; subtotal: number };
export const CART_UPDATED_EVENT = 'bookify:cart-updated';
const API_BASE = '/backend/controllers/CartController.php';

async function requestCart(action: string, method: 'GET' | 'POST', body?: Record<string, number>): Promise<CartPayload> {
  const headers: Record<string, string> = {};
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrfToken();
  }
  const response = await fetch(`${API_BASE}?action=${action}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json() as { success?: boolean; message?: string } & Partial<CartPayload>;
  if (!response.ok) throw new Error(data.message || 'The shopping cart could not be loaded.');
  const cart = { items: data.items ?? [], item_count: data.item_count ?? 0, subtotal: data.subtotal ?? 0 };
  if (method === 'POST') window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: cart }));
  return cart;
}

export const getCart = (): Promise<CartPayload> => requestCart('get', 'GET');
export const addCartItem = (listingId: number, quantity = 1): Promise<CartPayload> => requestCart('add', 'POST', { listing_id: listingId, quantity });
export const updateCartItem = (cartItemId: number, quantity: number): Promise<CartPayload> => requestCart('update', 'POST', { cart_item_id: cartItemId, quantity });
export const removeCartItem = (cartItemId: number): Promise<CartPayload> => requestCart('remove', 'POST', { cart_item_id: cartItemId });
