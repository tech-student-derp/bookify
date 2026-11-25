import { getCsrfToken } from './authApi';

export interface SellerApplication {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at: string | null;
  notes: string | null;
}

async function request<T>(action: 'current' | 'apply', method: 'GET' | 'POST' = 'GET', body?: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method === 'POST') {
    headers['X-CSRF-Token'] = await getCsrfToken();
  }
  const response = await fetch(`/backend/controllers/SellerApplicationController.php?action=${action}`, {
    method, credentials: 'include', headers, body,
  });
  const data = await response.json() as { success: boolean; message?: string } & Record<string, unknown>;
  if (!response.ok || !data.success) throw new Error(data.message || 'Seller application request failed.');
  return data as T;
}

export function getCurrentSellerApplication() {
  return request<{ application: SellerApplication | null }>('current');
}

export function submitSellerApplication(phoneNumber: string, idDocument: File) {
  const body = new FormData();
  body.set('phone_number', phoneNumber);
  body.set('id_document', idDocument);
  return request<{ message: string; application_id: number }>('apply', 'POST', body);
}
