import { getCsrfToken } from './authApi';

export interface SellerApplication {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

async function request<T>(action: 'current' | 'apply', method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrfToken();
  }
  const response = await fetch(`/backend/controllers/SellerApplicationController.php?action=${action}`, {
    method, credentials: 'include', headers, body: method === 'POST' ? '{}' : undefined,
  });
  const data = await response.json() as { success: boolean; message?: string } & Record<string, unknown>;
  if (!response.ok || !data.success) throw new Error(data.message || 'Seller application request failed.');
  return data as T;
}

export function getCurrentSellerApplication() {
  return request<{ application: SellerApplication | null }>('current');
}

export function submitSellerApplication() {
  return request<{ message: string; application_id: number }>('apply', 'POST');
}
