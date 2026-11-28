import { getCsrfToken } from './authApi';
import type { NotificationRecord } from './phase4Api';

async function userNotificationRequest<T>(action: string, body?: Record<string, unknown>): Promise<T> {
  const method = body ? 'POST' : 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body) {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrfToken();
  }
  const response = await fetch(`/backend/controllers/UserNotificationController.php?action=${encodeURIComponent(action)}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json() as { success: boolean; message?: string } & Record<string, unknown>;
  if (!response.ok || !data.success) throw new Error(data.message || 'Notifications are unavailable.');
  return data as T;
}

export function getUserNotifications() {
  return userNotificationRequest<{ notifications: NotificationRecord[]; unread_count: number }>('notifications');
}

export function markUserNotificationRead(notification_key: string) {
  return userNotificationRequest<{ message: string }>('notification-read', { notification_key });
}
