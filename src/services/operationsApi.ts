import { getCsrfToken } from './authApi';

export type PageResult = { total: number; page: number; per_page: number };
export type OrderStatus = 'pending' | 'awaiting_seller_confirmation' | 'confirmed' | 'processing' | 'ready_for_dispatch' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export const nextOrderStages: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'awaiting_seller_confirmation', awaiting_seller_confirmation: 'confirmed', confirmed: 'processing', processing: 'ready_for_dispatch',
};
export const allowedDeliveryStages: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['pending','assigned','cancelled'], assigned: ['pending','assigned','picked_up','cancelled'],
  picked_up: ['picked_up','out_for_delivery','cancelled'], out_for_delivery: ['out_for_delivery','delivered','failed','cancelled'],
  delivered: ['delivered'], failed: ['failed','assigned','cancelled'], cancelled: ['cancelled'],
};

export interface OrderRecord {
  id: number; customer_id: number; customer_name: string; status: OrderStatus; subtotal: string; delivery_fee: string; total: string;
  cancellation_status: 'none' | 'pending' | 'approved' | 'rejected'; created_at: string; item_count: number;
}
export interface OrderDetails extends OrderRecord {
  recipient_name: string; recipient_phone: string; address_line: string; barangay: string; city: string; province: string;
  region: string; postal_code: string | null; cancellation_reason: string | null; cancellation_requested_at: string | null;
  updated_at: string;
}
export interface OrderItemRecord {
  id: number; book_listing_id: number | null; seller_id: number | null; listing_source: 'seller' | 'bookify';
  title_snapshot: string; author_snapshot: string; quantity: number; unit_price: string;
  seller_first_name: string | null; seller_last_name: string | null;
}
export interface DeliveryRecord {
  id: number; order_id: number; status: DeliveryStatus; assigned_staff_id: number | null; assigned_at: string | null;
  updated_at: string; customer_name: string; assigned_staff_name: string | null; order_status: OrderStatus; notes: string | null;
  recipient_name: string; recipient_phone: string; address_line: string; barangay: string; city: string;
  province: string; region: string; postal_code: string | null;
}
export interface StaffOption { id: number; first_name: string; last_name: string }
export interface RefundRecord {
  id: number; order_id: number; customer_id: number; customer_name: string; reason: string; status: ReviewStatus;
  decision_reason: string | null; reviewed_by: number | null; reviewed_at: string | null; requested_at: string;
  order_status: OrderStatus; total: string;
}

async function operationsRequest<T>(action: string, options: { method?: 'GET' | 'POST'; params?: Record<string, string>; body?: Record<string, unknown> } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const query = new URLSearchParams({ action, ...options.params });
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrfToken();
  }
  const response = await fetch(`/backend/controllers/OperationsController.php?${query}`, {
    method, credentials: 'include', headers,
    body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
  });
  const result = await response.json() as { success: boolean; message?: string } & Record<string, unknown>;
  if (!response.ok || !result.success) throw new Error(result.message || 'The operations request failed.');
  return result as T;
}

export function listOrders(params: Record<string, string>) { return operationsRequest<{ orders: OrderRecord[] } & PageResult>('orders', { params }); }
export function getOrder(id: number) { return operationsRequest<{ order: OrderDetails; items: OrderItemRecord[]; delivery: Pick<DeliveryRecord, 'id' | 'status' | 'assigned_staff_id' | 'notes' | 'assigned_at' | 'updated_at' | 'assigned_staff_name'> | null }>('order', { params: { id: String(id) } }); }
export function updateOrderStatus(body: { order_id: number; status: OrderStatus; reason: string }) { return operationsRequest<{ message: string }>('order-status', { method: 'POST', body }); }
export function reviewCancellation(body: { order_id: number; decision: 'approved' | 'rejected'; reason: string }) { return operationsRequest<{ message: string }>('cancellation-review', { method: 'POST', body }); }
export function listDeliveries(params: Record<string, string>) { return operationsRequest<{ deliveries: DeliveryRecord[]; staff: StaffOption[] } & PageResult>('deliveries', { params }); }
export function updateDelivery(body: { delivery_id: number; status: DeliveryStatus; assigned_staff_id: number | null; notes: string }) { return operationsRequest<{ message: string }>('delivery-update', { method: 'POST', body }); }
export function listRefunds(params: Record<string, string>) { return operationsRequest<{ refunds: RefundRecord[]; payment_processing_available: false } & PageResult>('refunds', { params }); }
export function reviewRefund(body: { refund_id: number; decision: 'approved' | 'rejected'; decision_reason: string }) { return operationsRequest<{ message: string }>('refund-review', { method: 'POST', body }); }
