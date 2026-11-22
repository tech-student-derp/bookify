import { getCsrfToken } from './authApi';

async function phase4Request<T>(action: string, options: { method?: 'GET' | 'POST'; params?: Record<string, string>; body?: Record<string, unknown> } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const query = new URLSearchParams({ action, ...options.params });
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method === 'POST') { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = await getCsrfToken(); }
  const response = await fetch(`/backend/controllers/Phase4Controller.php?${query}`, { method, credentials: 'include', headers, body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined });
  const data = await response.json() as { success: boolean; message?: string } & Record<string, unknown>;
  if (!response.ok || !data.success) throw new Error(data.message || 'The Phase 4 request failed.');
  return data as T;
}

export interface ActivityEvent { event_key: string; title: string; description: string; occurred_at: string; route: string }
export interface NotificationRecord { type: string; notification_key: string; title: string; message: string; occurred_at: string; section: string; is_read: boolean }
export interface NotificationPreference { type: string; label: string; enabled: boolean }
export interface AuditRecord { id: number; action: string; target_type: string; target_id: number | null; details: Record<string, unknown> | null; created_at: string; actor_id: number | null; actor_name: string }
export interface ReportData {
  range: { start: string; end: string };
  monthly_activity: { month: string; customers: number; sellers: number; listings: number; orders: number }[];
  order_statuses: { status: string; total: number }[]; listing_statuses: { status: string; total: number }[]; refund_statuses: { status: string; total: number }[];
  sales: { gross_book_sales: number; seller_book_sales: number; bookify_book_sales: number; delivery_charges: number; bookify_commission_estimate: number; seller_proceeds_estimate: number };
  delivery_performance: { total: number; delivered: number; failed: number; average_delivery_hours: number | null };
  commission_rate: number; commission_note: string;
}
export interface PageResult { total: number; page: number; per_page: number }

export function getActivity() { return phase4Request<{ events: ActivityEvent[] }>('activity'); }
export function getNotifications() { return phase4Request<{ notifications: NotificationRecord[]; unread_count: number }>('notifications'); }
export function markNotificationRead(notification_key: string) { return phase4Request<{ message: string }>('notification-read', { method: 'POST', body: { notification_key } }); }
export function getPreferences() { return phase4Request<{ preferences: NotificationPreference[] }>('preferences'); }
export function updatePreference(type: string, enabled: boolean) { return phase4Request<{ message: string }>('preference-update', { method: 'POST', body: { type, enabled } }); }
export function getReports(params: Record<string, string>) { return phase4Request<ReportData>('reports', { params }); }
export function listAudit(params: Record<string, string>) { return phase4Request<{ events: AuditRecord[] } & PageResult>('audit', { params }); }
