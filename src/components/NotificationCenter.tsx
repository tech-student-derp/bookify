import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markNotificationRead, type NotificationRecord } from '../services/phase4Api';
import { getUserNotifications, markUserNotificationRead } from '../services/userNotificationApi';

type Role = 'customer' | 'seller' | 'staff' | 'admin';

const NotificationCenter: FC = () => {
  const { user, authenticated } = useAuth();
  const role = authenticated ? user?.role ?? null : null;
  const accountKey = role && user ? `${role}:${user.id}` : '';
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestIdRef = useRef(0);
  const [openAccountKey, setOpenAccountKey] = useState<string | null>(null);
  const [data, setData] = useState<{ accountKey: string; items: NotificationRecord[]; unread: number; error: string; loading: boolean }>({
    accountKey: '', items: [], unread: 0, error: '', loading: true,
  });
  const current = data.accountKey === accountKey
    ? data
    : { accountKey, items: [], unread: 0, error: '', loading: true };
  const { items, unread, error, loading } = current;
  const open = Boolean(role && openAccountKey === accountKey);

  const refresh = useCallback(async () => {
    if (!role) return;
    const requestId = ++requestIdRef.current;
    setData((previous) => ({
      accountKey,
      items: previous.accountKey === accountKey ? previous.items : [],
      unread: previous.accountKey === accountKey ? previous.unread : 0,
      error: '',
      loading: true,
    }));
    try {
      const result = role === 'admin' || role === 'staff'
        ? await getNotifications()
        : await getUserNotifications();
      if (requestId !== requestIdRef.current) return;
      setData({ accountKey, items: result.notifications, unread: result.unread_count, error: '', loading: false });
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setData((previous) => ({
        accountKey,
        items: previous.accountKey === accountKey ? previous.items : [],
        unread: previous.accountKey === accountKey ? previous.unread : 0,
        error: cause instanceof Error ? cause.message : 'Notifications are unavailable.',
        loading: false,
      }));
    } finally {
      if (requestId === requestIdRef.current) {
        setData((previous) => previous.accountKey === accountKey ? { ...previous, loading: false } : previous);
      }
    }
  }, [accountKey, role]);

  useEffect(() => {
    if (!role) {
      requestIdRef.current += 1;
      return;
    }
    void refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
    return () => window.clearInterval(poll);
  }, [role, user?.id, refresh]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenAccountKey(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenAccountKey(null);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!role) return null;

  const openNotification = async (item: NotificationRecord) => {
    if (!item.is_read) {
      try {
        if (role === 'admin' || role === 'staff') await markNotificationRead(item.notification_key);
        else await markUserNotificationRead(item.notification_key);
        setData((previous) => previous.accountKey === accountKey ? {
          ...previous,
          items: previous.items.map((entry) => entry.notification_key === item.notification_key ? { ...entry, is_read: true } : entry),
          unread: Math.max(0, previous.unread - 1),
        } : previous);
      } catch (cause) {
        setData((previous) => previous.accountKey === accountKey ? {
          ...previous, error: cause instanceof Error ? cause.message : 'Could not mark this notification as read.',
        } : previous);
        return;
      }
    }
    setOpenAccountKey(null);
    navigate(notificationRoute(role, item.section));
  };

  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  const emptyText = role === 'customer'
    ? 'Order and refund updates will appear here.'
    : role === 'seller'
      ? 'Application, listing, and order updates will appear here.'
      : 'There are no current operational notifications.';

  return (
    <div className="user-notification-center" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-notification-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls="user-notification-popover"
        onClick={() => {
          if (open) setOpenAccountKey(null);
          else {
            setOpenAccountKey(accountKey);
            void refresh();
          }
        }}
      >
        <BellIcon />
        {unread > 0 && <span className="user-notification-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <section id="user-notification-popover" className="user-notification-popover" aria-label="Notifications">
          <header>
            <div><strong>Notifications</strong><small>{unread ? `${unread} unread` : 'Your latest account updates'}</small></div>
            <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh notifications"><RefreshIcon /></button>
          </header>
          {error ? <div className="user-notification-state" role="alert">{error}</div>
            : loading && !items.length ? <div className="user-notification-state" role="status">Loading notifications…</div>
              : items.length ? (
                <div className="user-notification-list" role="list">
                  {items.slice(0, 12).map((item) => (
                    <button
                      type="button"
                      role="listitem"
                      key={item.notification_key}
                      className={`user-notification-item${item.is_read ? '' : ' is-unread'}`}
                      onClick={() => void openNotification(item)}
                    >
                      <span className="user-notification-dot" aria-hidden="true" />
                      <span className="user-notification-copy">
                        <strong>{item.title}</strong>
                        <small>{item.message}</small>
                        <time dateTime={normalizedDate(item.occurred_at)}>{formatDate(item.occurred_at)}</time>
                      </span>
                    </button>
                  ))}
                </div>
              ) : <div className="user-notification-state">{emptyText}</div>}
          {(role === 'admin' || role === 'staff') && (
            <footer><button type="button" onClick={() => { setOpenAccountKey(null); navigate(role === 'admin' ? '/admin/settings' : '/staff/settings'); }}>Notification preferences</button></footer>
          )}
        </section>
      )}
    </div>
  );
};

function notificationRoute(role: Role, section: string): string {
  if (role === 'customer') return '/dashboard?tab=orders';
  if (role === 'seller') {
    if (section === 'listings') return '/seller/listings';
    if (section === 'orders') return '/seller/orders';
    return '/seller/overview';
  }
  const basePath = role === 'admin' ? '/admin' : '/staff';
  if (role === 'staff' && ['users', 'staff'].includes(section)) return basePath;
  return section ? `${basePath}/${section}` : basePath;
}

function normalizedDate(value: string): string {
  const date = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  return Number.isNaN(Date.parse(date)) ? '' : date;
}

function formatDate(value: string): string {
  const normalized = normalizedDate(value);
  return normalized ? new Date(normalized).toLocaleString('en-PH') : value;
}

const BellIcon: FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
  </svg>
);

const RefreshIcon: FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3" />
  </svg>
);

export default NotificationCenter;
