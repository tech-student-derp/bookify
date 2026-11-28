<?php
/** Account-scoped notifications for customers and sellers. */
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../middleware/auth.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('User notifications error: ' . $e->getMessage());
    errorResponse('Notifications are temporarily unavailable.', 503);
});

requireAuth();
$db = getDB();
requireDatabaseRole($db, 'customer', 'seller');
$actorId = (int) $_SESSION['user_id'];
$role = (string) $_SESSION['role'];
$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : 'notifications';

if (!in_array($action, ['notifications', 'notification-read'], true)) {
    errorResponse('Unknown notification action.', 404);
}

requireNotificationReadTable($db);

if ($action === 'notification-read') {
    requireMethod('POST');
    if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);
    $body = getJsonBody();
    $key = $body['notification_key'] ?? null;
    if (!is_string($key) || strlen($key) > 191) errorResponse('Invalid notification key.', 422);

    $notifications = buildAccountNotifications($db, $role, $actorId);
    $belongsToActor = false;
    foreach ($notifications as $item) {
        if (hash_equals($item['notification_key'], $key)) {
            $belongsToActor = true;
            break;
        }
    }
    if (!$belongsToActor) errorResponse('Notification not found.', 404);

    $stmt = $db->prepare(
        'INSERT INTO backoffice_notification_reads (user_id, notification_key)
         VALUES (?, ?) ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)'
    );
    $stmt->execute([$actorId, $key]);
    successResponse(['message' => 'Notification marked as read.']);
}

requireMethod('GET');
$notifications = buildAccountNotifications($db, $role, $actorId);
$read = $db->prepare('SELECT notification_key FROM backoffice_notification_reads WHERE user_id = ? AND notification_key LIKE ?');
$read->execute([$actorId, $role . ':%']);
$readKeys = array_fill_keys(array_column($read->fetchAll(PDO::FETCH_ASSOC), 'notification_key'), true);
foreach ($notifications as &$item) $item['is_read'] = isset($readKeys[$item['notification_key']]);
unset($item);
$unreadCount = count(array_filter($notifications, static fn(array $item): bool => !$item['is_read']));

successResponse([
    'notifications' => array_slice($notifications, 0, 50),
    'unread_count' => $unreadCount,
]);

function requireNotificationReadTable(PDO $db): void {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute(['backoffice_notification_reads']);
    if ((int) $stmt->fetchColumn() !== 1) {
        errorResponse('Apply database/migrations/2026_11_22_phase4_accountability.sql to enable notification read state.', 503);
    }
}

/** Return only notifications whose source records belong to this account. */
function buildAccountNotifications(PDO $db, string $role, int $actorId): array {
    $items = [];
    if ($role === 'customer') {
        requireNotificationTables($db, ['orders', 'refund_requests']);
        $orders = $db->prepare(
            'SELECT id, status, cancellation_status, updated_at
             FROM orders WHERE customer_id = ? ORDER BY updated_at DESC, id DESC'
        );
        $orders->execute([$actorId]);
        foreach ($orders->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $status = (string) $row['status'];
            $cancellation = (string) $row['cancellation_status'];
            $message = 'Your order is ' . notificationLabel($status) . '.';
            if ($cancellation !== 'none') $message .= ' Cancellation request: ' . notificationLabel($cancellation) . '.';
            $items[] = accountNotification(
                'customer:order:' . $row['id'] . ':' . $status . ':' . $cancellation . ':' . notificationDateKey((string) $row['updated_at']),
                'Order #' . $row['id'] . ' update', $message, (string) $row['updated_at'], 'orders', 'order_update'
            );
        }

        $refunds = $db->prepare(
            'SELECT id, order_id, status, updated_at
             FROM refund_requests WHERE customer_id = ? ORDER BY updated_at DESC, id DESC'
        );
        $refunds->execute([$actorId]);
        foreach ($refunds->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $status = (string) $row['status'];
            $items[] = accountNotification(
                'customer:refund:' . $row['id'] . ':' . $status . ':' . notificationDateKey((string) $row['updated_at']),
                'Refund request update', 'Your refund request for Order #' . $row['order_id'] . ' is ' . notificationLabel($status) . '.',
                (string) $row['updated_at'], 'orders', 'refund_update'
            );
        }
    } elseif ($role === 'seller') {
        requireNotificationTables($db, ['seller_applications', 'book_listings', 'order_items']);
        $applications = $db->prepare(
            'SELECT id, status, applied_at, reviewed_at, notes
             FROM seller_applications WHERE user_id = ? ORDER BY COALESCE(reviewed_at, applied_at) DESC, id DESC'
        );
        $applications->execute([$actorId]);
        foreach ($applications->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $status = (string) $row['status'];
            $occurredAt = (string) ($row['reviewed_at'] ?: $row['applied_at']);
            $message = 'Your seller application is ' . notificationLabel($status) . '.';
            if ($status === 'rejected' && is_string($row['notes']) && trim($row['notes']) !== '') {
                $message .= ' ' . trim($row['notes']);
            }
            $items[] = accountNotification(
                'seller:application:' . $row['id'] . ':' . $status . ':' . notificationDateKey($occurredAt),
                'Seller application update', $message, $occurredAt, 'overview', 'seller_application'
            );
        }

        $listings = $db->prepare(
            "SELECT id, title, listing_status, moderation_reason, updated_at
             FROM book_listings
             WHERE seller_id = ? AND archived_at IS NULL
               AND listing_status IN ('pending_review','approved','rejected','needs_revision','suspended')
             ORDER BY updated_at DESC, id DESC"
        );
        $listings->execute([$actorId]);
        foreach ($listings->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $status = (string) $row['listing_status'];
            $label = notificationLabel($status);
            $message = '“' . $row['title'] . '” is ' . $label . '.';
            if (in_array($status, ['rejected', 'needs_revision', 'suspended'], true)
                && is_string($row['moderation_reason']) && trim($row['moderation_reason']) !== '') {
                $message .= ' ' . trim($row['moderation_reason']);
            }
            $items[] = accountNotification(
                'seller:listing:' . $row['id'] . ':' . $status . ':' . notificationDateKey((string) $row['updated_at']),
                'Book listing update', $message, (string) $row['updated_at'], 'listings', 'listing_update'
            );
        }

        $orders = $db->prepare(
            'SELECT id, order_id, title_snapshot, fulfillment_status, created_at
             FROM order_items WHERE seller_id = ? ORDER BY created_at DESC, id DESC'
        );
        $orders->execute([$actorId]);
        foreach ($orders->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $status = (string) $row['fulfillment_status'];
            $items[] = accountNotification(
                'seller:order-item:' . $row['id'] . ':' . $status,
                'Order #' . $row['order_id'] . ' fulfillment',
                '“' . $row['title_snapshot'] . '” is ' . notificationLabel($status) . '.',
                (string) $row['created_at'], 'orders', 'order_fulfillment'
            );
        }
    } else {
        errorResponse('Notifications are unavailable for this account role.', 403);
    }

    usort($items, static fn(array $a, array $b): int => strcmp($b['occurred_at'], $a['occurred_at']));
    return $items;
}

function requireNotificationTables(PDO $db, array $tables): void {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    foreach ($tables as $table) {
        $stmt->execute([$table]);
        if ((int) $stmt->fetchColumn() !== 1) errorResponse('Required marketplace records are not available for notifications.', 503);
    }
}

function notificationLabel(string $value): string {
    return ucfirst(str_replace('_', ' ', $value));
}

function notificationDateKey(string $value): string {
    return preg_replace('/[^0-9]/', '', $value) ?? '';
}

function accountNotification(string $key, string $title, string $message, string $occurredAt, string $section, string $type): array {
    return [
        'type' => $type,
        'notification_key' => $key,
        'title' => $title,
        'message' => $message,
        'occurred_at' => $occurredAt,
        'section' => $section,
        'is_read' => false,
    ];
}
