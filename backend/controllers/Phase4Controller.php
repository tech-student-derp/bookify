<?php
/** Reporting, audit history, live operational notifications and user preferences. */
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/audit.php';
require_once __DIR__ . '/../middleware/auth.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Phase 4 API error: ' . $e->getMessage());
    errorResponse('The requested reporting or accountability data could not be loaded.', 500);
});

requireAuth();
$db = getDB();
$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : '';
$adminOnly = in_array($action, ['reports', 'audit'], true);
$allowed = ['reports', 'audit', 'activity', 'notifications', 'notification-read', 'preferences', 'preference-update'];
if (!in_array($action, $allowed, true)) errorResponse('Unknown Phase 4 action.', 404);
requireDatabaseRole($db, ...($adminOnly ? ['admin'] : ['admin', 'staff']));

match ($action) {
    'reports' => handleReports($db),
    'audit' => handleAudit($db),
    'activity' => handleActivity($db),
    'notifications' => handleNotifications($db),
    'notification-read' => markNotificationRead($db),
    'preferences' => getPreferences($db),
    'preference-update' => updatePreference($db),
};

function p4Tables(PDO $db, array $tables): bool {
    $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    foreach ($tables as $table) { $stmt->execute([$table]); if ((int) $stmt->fetchColumn() !== 1) return false; }
    return true;
}

function p4ColumnExists(PDO $db, string $table, string $column): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    return (int) $stmt->fetchColumn() === 1;
}

function requireP4Tables(PDO $db, array $tables, string $message): void {
    if (!p4Tables($db, $tables)) errorResponse($message, 503);
}

function p4Actor(): int { return (int) $_SESSION['user_id']; }

function p4Body(): array {
    if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);
    return getJsonBody();
}

function p4Pagination(): array {
    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $size = filter_var($_GET['per_page'] ?? 25, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
    if ($page === false || $size === false) errorResponse('Invalid pagination parameters.', 422);
    return [(int) $page, (int) $size, ((int) $page - 1) * (int) $size];
}

function p4Search(): string {
    $q = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($q) > 100) errorResponse('Search text is too long.', 422);
    return $q;
}

function reportRange(): array {
    $start = is_string($_GET['start'] ?? null) ? $_GET['start'] : '';
    $end = is_string($_GET['end'] ?? null) ? $_GET['end'] : '';
    $date = static function (string $value): bool { $parsed = DateTime::createFromFormat('!Y-m-d', $value); return $parsed !== false && $parsed->format('Y-m-d') === $value; };
    if (($start !== '' && !$date($start)) || ($end !== '' && !$date($end))) errorResponse('Dates must use YYYY-MM-DD format.', 422);
    if ($start === '' && $end !== '') errorResponse('Provide both dates for a custom report range.', 422);
    if ($start !== '' && $end === '') errorResponse('Provide both dates for a custom report range.', 422);
    if ($start === '') { $end = date('Y-m-d'); $start = date('Y-m-d', strtotime('-11 months', strtotime(date('Y-m-01')))); }
    if ($start > $end) errorResponse('The start date must be before the end date.', 422);
    if (strtotime($end) - strtotime($start) > 60 * 31 * 86400) errorResponse('Report ranges are limited to five years.', 422);
    return [$start . ' 00:00:00', date('Y-m-d 00:00:00', strtotime($end . ' +1 day')), $start, $end];
}

function reportSeries(PDO $db, string $sql, string $start, string $end, array $extra = []): array {
    $stmt = $db->prepare($sql);
    $stmt->execute(array_merge([':start' => $start, ':end' => $end], $extra));
    return $stmt->fetchAll();
}

function handleReports(PDO $db): never {
    requireMethod('GET');
    requireP4Tables($db, ['orders','order_items','deliveries','refund_requests','book_listings'], 'Apply the Phase 2 and Phase 3 migrations before viewing operational reports.');
    [$start, $end, $startDate, $endDate] = reportRange();
    $monthBase = static function (string $from, string $to): array {
        $months = [];
        $cursor = new DateTime(substr($from, 0, 7) . '-01');
        $last = new DateTime(substr($to, 0, 7) . '-01');
        while ($cursor <= $last) { $months[$cursor->format('Y-m')] = ['month' => $cursor->format('Y-m'), 'customers' => 0, 'sellers' => 0, 'listings' => 0, 'orders' => 0]; $cursor->modify('+1 month'); }
        return $months;
    };
    $months = $monthBase($startDate, $endDate);
    foreach (reportSeries($db, "SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS total FROM users WHERE role IN ('customer','seller') AND created_at >= :start AND created_at < :end GROUP BY month", $start, $end) as $row) if (isset($months[$row['month']])) $months[$row['month']]['customers'] = (int) $row['total'];
    foreach (reportSeries($db, "SELECT DATE_FORMAT(reviewed_at,'%Y-%m') AS month, COUNT(*) AS total FROM seller_applications WHERE status = 'approved' AND reviewed_at >= :start AND reviewed_at < :end GROUP BY month", $start, $end) as $row) if (isset($months[$row['month']])) $months[$row['month']]['sellers'] = (int) $row['total'];
    foreach (reportSeries($db, "SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS total FROM book_listings WHERE created_at >= :start AND created_at < :end GROUP BY month", $start, $end) as $row) if (isset($months[$row['month']])) $months[$row['month']]['listings'] = (int) $row['total'];
    foreach (reportSeries($db, "SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS total FROM orders WHERE created_at >= :start AND created_at < :end GROUP BY month", $start, $end) as $row) if (isset($months[$row['month']])) $months[$row['month']]['orders'] = (int) $row['total'];

    $orderStatuses = $db->prepare('SELECT status, COUNT(*) AS total FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY status ORDER BY status');
    $orderStatuses->execute([$start, $end]);
    $listingStatuses = $db->query('SELECT listing_status AS status, COUNT(*) AS total FROM book_listings GROUP BY listing_status ORDER BY listing_status')->fetchAll();
    $refundStatuses = $db->prepare('SELECT status, COUNT(*) AS total FROM refund_requests WHERE requested_at >= ? AND requested_at < ? GROUP BY status ORDER BY status');
    $refundStatuses->execute([$start, $end]);
    $financial = $db->prepare(
        "SELECT COALESCE(SUM(i.unit_price * i.quantity),0) AS gross_book_sales,
                COALESCE(SUM(CASE WHEN i.listing_source = 'seller' THEN i.unit_price * i.quantity ELSE 0 END),0) AS seller_book_sales,
                COALESCE(SUM(CASE WHEN i.listing_source = 'bookify' THEN i.unit_price * i.quantity ELSE 0 END),0) AS bookify_book_sales
         FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
         WHERE o.status = 'delivered' AND o.created_at >= ? AND o.created_at < ?"
    );
    $financial->execute([$start, $end]); $sales = $financial->fetch();
    // Delivery fee belongs to the order, so aggregate it separately to avoid item-join duplication.
    $fees = $db->prepare("SELECT COALESCE(SUM(delivery_fee),0) FROM orders WHERE status = 'delivered' AND created_at >= ? AND created_at < ?");
    $fees->execute([$start, $end]); $sales['delivery_charges'] = (float) $fees->fetchColumn();
    $sellerGross = (float) $sales['seller_book_sales'];
    $commissionRate = 0.15;
    $sales['bookify_commission_estimate'] = round($sellerGross * $commissionRate, 2);
    $sales['seller_proceeds_estimate'] = round($sellerGross - $sales['bookify_commission_estimate'], 2);
    foreach (['gross_book_sales','seller_book_sales','bookify_book_sales'] as $field) $sales[$field] = (float) $sales[$field];
    $delivery = $db->prepare("SELECT COUNT(*) AS total, SUM(status = 'delivered') AS delivered, SUM(status = 'failed') AS failed, AVG(CASE WHEN status = 'delivered' AND assigned_at IS NOT NULL AND delivered_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, assigned_at, delivered_at) / 60 END) AS average_delivery_hours FROM deliveries WHERE created_at >= ? AND created_at < ?");
    $delivery->execute([$start, $end]); $deliveryStats = $delivery->fetch();
    $deliveryStats = ['total' => (int) $deliveryStats['total'], 'delivered' => (int) $deliveryStats['delivered'], 'failed' => (int) $deliveryStats['failed'], 'average_delivery_hours' => $deliveryStats['average_delivery_hours'] === null ? null : (float) $deliveryStats['average_delivery_hours']];
    successResponse([
        'range' => ['start' => $startDate, 'end' => $endDate],
        'monthly_activity' => array_values($months),
        'order_statuses' => $orderStatuses->fetchAll(), 'listing_statuses' => $listingStatuses, 'refund_statuses' => $refundStatuses->fetchAll(),
        'sales' => $sales, 'delivery_performance' => $deliveryStats,
        'commission_rate' => $commissionRate,
        'commission_note' => 'Estimated at the proposed 15% seller-listing rate on delivered book lines. Historical rate snapshots and payment settlements are not stored. Refund decisions are not money transfers and are not deducted from these gross figures; delivery charges are separate.',
    ]);
}

function handleAudit(PDO $db): never {
    requireMethod('GET');
    requireAuditSchema($db);
    [$page, $size, $offset] = p4Pagination(); $q = p4Search();
    $where = ''; $params = [];
    if ($q !== '') { $where = " WHERE (a.action LIKE :action OR a.target_type LIKE :target OR CAST(a.target_id AS CHAR) LIKE :id OR CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) LIKE :actor)"; $needle = '%' . $q . '%'; $params = [':action' => $needle, ':target' => $needle, ':id' => $needle, ':actor' => $needle]; }
    $from = ' FROM admin_audit_logs a LEFT JOIN users u ON u.id = a.actor_id';
    $count = $db->prepare('SELECT COUNT(*)' . $from . $where); foreach ($params as $key => $value) $count->bindValue($key, $value, PDO::PARAM_STR); $count->execute(); $total = (int) $count->fetchColumn();
    $stmt = $db->prepare('SELECT a.id, a.action, a.target_type, a.target_id, a.details_json, a.created_at, a.actor_id, CONCAT(COALESCE(u.first_name,\'Deleted\'), \' \', COALESCE(u.last_name, \'actor\')) AS actor_name FROM admin_audit_logs a LEFT JOIN users u ON u.id = a.actor_id' . $where . ' ORDER BY a.created_at DESC, a.id DESC LIMIT :limit OFFSET :offset');
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR); $stmt->bindValue(':limit', $size, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    $events = $stmt->fetchAll(); foreach ($events as &$event) { $event['details'] = $event['details_json'] ? json_decode($event['details_json'], true) : null; unset($event['details_json']); } unset($event);
    successResponse(['events' => $events, 'total' => $total, 'page' => $page, 'per_page' => $size]);
}

function handleActivity(PDO $db): never {
    requireMethod('GET');
    $available = p4Tables($db, ['users','seller_applications','admin_audit_logs']);
    if (!$available) errorResponse('Apply the Phase 2 back-office migration before loading activity history.', 503);
    $feeds = [];
    $feeds[] = $db->query("SELECT CONCAT('user:',id) AS event_key, 'Customer registered' AS title, CONCAT(first_name,' ',last_name) AS description, created_at AS occurred_at, '/admin/users' AS route FROM users WHERE role IN ('customer','seller') ORDER BY created_at DESC LIMIT 10")->fetchAll();
    $feeds[] = $db->query("SELECT CONCAT('seller-application:',a.id) AS event_key, 'Seller application submitted' AS title, CONCAT(u.first_name,' ',u.last_name, ' · ', a.status) AS description, a.applied_at AS occurred_at, '/admin/sellers' AS route FROM seller_applications a JOIN users u ON u.id = a.user_id ORDER BY a.applied_at DESC LIMIT 10")->fetchAll();
    if (p4Tables($db, ['book_listings'])) $feeds[] = $db->query("SELECT CONCAT('listing:',id) AS event_key, 'Book listing submitted' AS title, CONCAT(title, ' · ', listing_status) AS description, created_at AS occurred_at, '/admin/listings' AS route FROM book_listings ORDER BY created_at DESC LIMIT 10")->fetchAll();
    if (p4Tables($db, ['orders'])) $feeds[] = $db->query("SELECT CONCAT('order:',id) AS event_key, 'Order placed' AS title, CONCAT('Order #',id, ' · ',status) AS description, created_at AS occurred_at, '/admin/orders' AS route FROM orders ORDER BY created_at DESC LIMIT 10")->fetchAll();
    if (p4Tables($db, ['refund_requests'])) $feeds[] = $db->query("SELECT CONCAT('refund:',id) AS event_key, 'Refund request submitted' AS title, CONCAT('Order #',order_id, ' · ',status) AS description, requested_at AS occurred_at, '/admin/refunds' AS route FROM refund_requests ORDER BY requested_at DESC LIMIT 10")->fetchAll();
    $audit = $db->query("SELECT CONCAT('audit:',a.id) AS event_key, CASE a.action WHEN 'user.suspend' THEN 'Account suspended' WHEN 'user.reactivate' THEN 'Account reactivated' WHEN 'seller_application.approved' THEN 'Seller approved' WHEN 'seller_application.rejected' THEN 'Seller application rejected' WHEN 'listing.approve' THEN 'Listing approved' WHEN 'listing.reject' THEN 'Listing rejected' WHEN 'listing.request_revision' THEN 'Listing revision requested' WHEN 'listing.suspend' THEN 'Listing suspended' WHEN 'listing.restore' THEN 'Listing restored' WHEN 'listing.publish' THEN 'Listing published' WHEN 'listing.unpublish' THEN 'Listing unpublished' WHEN 'listing.archive' THEN 'Listing archived' WHEN 'listing.unarchive_submit_review' THEN 'Listing restored for review' WHEN 'listing.submit' THEN 'Listing submitted for review' WHEN 'listing.save_draft' THEN 'Listing draft saved' WHEN 'listing.inventory_update' THEN 'Listing inventory updated' WHEN 'listing.create' THEN 'Bookify listing created' WHEN 'order.status_change' THEN 'Order status changed' WHEN 'delivery.update' THEN 'Delivery updated' WHEN 'refund.approved' THEN 'Refund decision approved' WHEN 'refund.rejected' THEN 'Refund decision rejected' ELSE 'Back-office action recorded' END AS title, CONCAT('Record #',COALESCE(a.target_id,0),' · ',COALESCE(u.first_name,'Former user'),' ',COALESCE(u.last_name,'')) AS description, a.created_at AS occurred_at, CASE a.target_type WHEN 'seller_application' THEN '/admin/sellers' WHEN 'book_listing' THEN '/admin/listings' WHEN 'order' THEN '/admin/orders' WHEN 'delivery' THEN '/admin/deliveries' WHEN 'refund_request' THEN '/admin/refunds' ELSE '/admin' END AS route FROM admin_audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 20")->fetchAll();
    $feeds[] = $audit;
    $events = []; foreach ($feeds as $feed) foreach ($feed as $event) $events[$event['event_key']] = $event;
    usort($events, static fn(array $a, array $b): int => strcmp((string) $b['occurred_at'], (string) $a['occurred_at']));
    successResponse(['events' => array_slice(array_values($events), 0, 12)]);
}

function notificationTypes(): array {
    return [
        'seller_application' => 'Seller applications awaiting review', 'listing_review' => 'Listings awaiting review',
        'order_pending' => 'Orders awaiting confirmation', 'cancellation_request' => 'Cancellation requests',
        'delivery_unassigned' => 'Deliveries awaiting staff assignment', 'refund_request' => 'Refund requests awaiting review',
    ];
}

function requireNotificationSchema(PDO $db): void {
    requireP4Tables($db, ['backoffice_notification_reads','backoffice_notification_preferences'], 'Apply database/migrations/2026_11_22_phase4_accountability.sql to enable notification preferences.');
}

function buildNotifications(PDO $db): array {
    requireNotificationSchema($db);
    requireP4Tables($db, ['seller_applications','book_listings','orders','deliveries','refund_requests'], 'Apply the Phase 2 and Phase 3 migrations before loading operational notifications.');
    $actor = p4Actor(); $preferences = $db->prepare('SELECT notification_type, enabled FROM backoffice_notification_preferences WHERE user_id = ?'); $preferences->execute([$actor]);
    $enabled = []; foreach ($preferences->fetchAll() as $pref) $enabled[$pref['notification_type']] = (bool) $pref['enabled'];
    $rows = [];
    $listingOccurredAt = p4ColumnExists($db, 'book_listings', 'submitted_at') ? 'COALESCE(b.submitted_at, b.created_at)' : 'b.created_at';
    $listingNotificationKey = p4ColumnExists($db, 'book_listings', 'submitted_at')
        ? "CONCAT('listing_review:',b.id,':',DATE_FORMAT(COALESCE(b.submitted_at,b.created_at),'%Y%m%d%H%i%s'))"
        : "CONCAT('listing_review:',b.id)";
    $listingArchiveClause = p4ColumnExists($db, 'book_listings', 'archived_at') ? ' AND b.archived_at IS NULL' : '';
    $queries = [
        "SELECT 'seller_application' AS type, CONCAT('seller_application:',a.id) AS notification_key, 'Seller application to review' AS title, CONCAT('Application #',a.id,' is awaiting review.') AS message, a.applied_at AS occurred_at, 'sellers' AS section FROM seller_applications a WHERE a.status='pending'",
        "SELECT 'listing_review' AS type, " . $listingNotificationKey . " AS notification_key, 'Book listing to review' AS title, CONCAT(b.title,' is awaiting moderation.') AS message, " . $listingOccurredAt . " AS occurred_at, 'listings' AS section FROM book_listings b WHERE b.listing_status IN ('pending_review','pending')" . $listingArchiveClause,
        "SELECT 'order_pending' AS type, CONCAT('order:',o.id) AS notification_key, 'Order awaiting confirmation' AS title, CONCAT('Order #',o.id,' needs an operational update.') AS message, o.created_at AS occurred_at, 'orders' AS section FROM orders o WHERE o.status IN ('pending','awaiting_seller_confirmation')",
        "SELECT 'cancellation_request' AS type, CONCAT('cancellation:',o.id) AS notification_key, 'Cancellation request to review' AS title, CONCAT('Order #',o.id,' has a cancellation request.') AS message, o.cancellation_requested_at AS occurred_at, 'orders' AS section FROM orders o WHERE o.cancellation_status='pending'",
        "SELECT 'delivery_unassigned' AS type, CONCAT('delivery:',d.id) AS notification_key, 'Delivery needs assignment' AS title, CONCAT('Order #',d.order_id,' has no assigned staff member.') AS message, d.created_at AS occurred_at, 'deliveries' AS section FROM deliveries d WHERE d.status='pending' AND d.assigned_staff_id IS NULL",
        "SELECT 'refund_request' AS type, CONCAT('refund:',r.id) AS notification_key, 'Refund request to review' AS title, CONCAT('Request #',r.id,' for order #',r.order_id,' is awaiting review.') AS message, r.requested_at AS occurred_at, 'refunds' AS section FROM refund_requests r WHERE r.status='pending'",
    ];
    foreach ($queries as $sql) { $stmt = $db->query($sql); foreach ($stmt->fetchAll() as $row) if (!array_key_exists($row['type'], $enabled) || $enabled[$row['type']]) $rows[] = $row; }
    usort($rows, static fn(array $a, array $b): int => strcmp((string) $b['occurred_at'], (string) $a['occurred_at']));
    $rows = array_slice($rows, 0, 50);
    $read = $db->prepare('SELECT notification_key FROM backoffice_notification_reads WHERE user_id = ?'); $read->execute([$actor]);
    $readKeys = array_fill_keys(array_column($read->fetchAll(), 'notification_key'), true);
    foreach ($rows as &$row) $row['is_read'] = isset($readKeys[$row['notification_key']]); unset($row);
    return $rows;
}

function handleNotifications(PDO $db): never {
    requireMethod('GET');
    $notifications = buildNotifications($db); $unread = count(array_filter($notifications, static fn(array $item): bool => !$item['is_read']));
    successResponse(['notifications' => $notifications, 'unread_count' => $unread]);
}

function markNotificationRead(PDO $db): never {
    requireMethod('POST'); requireNotificationSchema($db); $body = p4Body();
    $key = $body['notification_key'] ?? null;
    $validKey = is_string($key) && strlen($key) <= 191
        && preg_match('/^(?:(?:seller_application|order|cancellation|delivery|refund):[1-9][0-9]*|listing_review:[1-9][0-9]*(?::[0-9]{14})?)$/D', $key) === 1;
    if (!$validKey) errorResponse('Invalid notification key.', 422);
    $stmt = $db->prepare('INSERT INTO backoffice_notification_reads (user_id, notification_key) VALUES (?, ?) ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)');
    $stmt->execute([p4Actor(), $key]);
    successResponse(['message' => 'Notification marked as read.']);
}

function getPreferences(PDO $db): never {
    requireMethod('GET'); requireNotificationSchema($db); $actor = p4Actor();
    $stmt = $db->prepare('SELECT notification_type, enabled FROM backoffice_notification_preferences WHERE user_id = ?'); $stmt->execute([$actor]);
    $saved = []; foreach ($stmt->fetchAll() as $row) $saved[$row['notification_type']] = (bool) $row['enabled'];
    $preferences = []; foreach (notificationTypes() as $type => $label) $preferences[] = ['type' => $type, 'label' => $label, 'enabled' => $saved[$type] ?? true];
    successResponse(['preferences' => $preferences]);
}

function updatePreference(PDO $db): never {
    requireMethod('POST'); requireNotificationSchema($db); $body = p4Body();
    $type = $body['type'] ?? null; $enabled = $body['enabled'] ?? null;
    if (!is_string($type) || !array_key_exists($type, notificationTypes())) errorResponse('Invalid notification preference.', 422);
    if (!is_bool($enabled)) errorResponse('Preference enabled must be true or false.', 422);
    $stmt = $db->prepare('INSERT INTO backoffice_notification_preferences (user_id, notification_type, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)');
    $stmt->execute([p4Actor(), $type, $enabled ? 1 : 0]);
    successResponse(['message' => 'Notification preference saved.']);
}
