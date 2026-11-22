<?php
/** Back-office order, delivery and refund operations. */
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
    error_log('Operations API error: ' . $e->getMessage());
    errorResponse('The requested operational data could not be loaded.', 500);
});

requireAuth();
$db = getDB();
$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : '';
$actions = ['orders', 'order', 'order-status', 'cancellation-review', 'deliveries', 'delivery-update', 'refunds', 'refund-review'];
if (!in_array($action, $actions, true)) errorResponse('Unknown operations action.', 404);
requireDatabaseRole($db, 'admin', 'staff');
requireOperationsSchema($db);
requireAuditSchema($db);

match ($action) {
    'orders' => listOrders($db),
    'order' => getOrder($db),
    'order-status' => updateOrderStatus($db),
    'cancellation-review' => reviewCancellation($db),
    'deliveries' => listDeliveries($db),
    'delivery-update' => updateDelivery($db),
    'refunds' => listRefunds($db),
    'refund-review' => reviewRefund($db),
};

function requireOperationsSchema(PDO $db): void {
    $stmt = $db->query(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('orders','order_items','deliveries','refund_requests','book_listings')"
    );
    if ((int) $stmt->fetchColumn() !== 5) {
        errorResponse('Apply the Phase 2 listing migration, then database/migrations/2026_11_22_phase3_operations.sql.', 503);
    }
}

function opsActor(PDO $db): int {
    requireDatabaseRole($db, 'admin', 'staff');
    return (int) $_SESSION['user_id'];
}

function opsBody(): array {
    if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);
    return getJsonBody();
}

function opsId(mixed $value, string $field): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) errorResponse("A valid {$field} is required.", 422);
    return (int) $id;
}

function opsText(mixed $value, string $field, int $max = 1000, bool $required = false): ?string {
    if ($value === null && !$required) return null;
    if (!is_string($value)) errorResponse("Invalid {$field}.", 422);
    $text = trim(strip_tags($value));
    if (($required && $text === '') || strlen($text) > $max) errorResponse("Enter a valid {$field}.", 422);
    return $text === '' ? null : $text;
}

function opsPage(): array {
    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $size = filter_var($_GET['per_page'] ?? 20, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
    if ($page === false || $size === false) errorResponse('Invalid pagination parameters.', 422);
    return [(int) $page, (int) $size, ((int) $page - 1) * (int) $size];
}

function opsSearch(): string {
    $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
    return $search;
}

function listOrders(PDO $db): never {
    requireMethod('GET');
    [$page, $size, $offset] = opsPage();
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
    $allowed = ['all','pending','awaiting_seller_confirmation','confirmed','processing','ready_for_dispatch','out_for_delivery','delivered','cancelled'];
    if (!in_array($status, $allowed, true)) errorResponse('Invalid order status filter.', 422);
    $search = opsSearch();
    $where = [];
    $params = [];
    if ($status !== 'all') { $where[] = 'o.status = :status'; $params[':status'] = $status; }
    if ($search !== '') {
        $where[] = "(CAST(o.id AS CHAR) = :id OR CONCAT(u.first_name, ' ', u.last_name) LIKE :customer)";
        $params[':id'] = ltrim($search, '#BK-');
        $params[':customer'] = '%' . $search . '%';
    }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $from = ' FROM orders o INNER JOIN users u ON u.id = o.customer_id';
    $count = $db->prepare('SELECT COUNT(*)' . $from . $whereSql);
    foreach ($params as $key => $value) $count->bindValue($key, $value, PDO::PARAM_STR);
    $count->execute(); $total = (int) $count->fetchColumn();
    $stmt = $db->prepare(
        'SELECT o.id, o.customer_id, CONCAT(u.first_name, \' \', u.last_name) AS customer_name, o.status,
                o.subtotal, o.delivery_fee, o.total, o.cancellation_status, o.created_at,
                (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count' .
        $from . $whereSql . ' ORDER BY o.created_at DESC, o.id DESC LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $size, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    successResponse(['orders' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'per_page' => $size]);
}

function getOrder(PDO $db): never {
    requireMethod('GET');
    $id = opsId($_GET['id'] ?? null, 'order id');
    $stmt = $db->prepare(
        'SELECT o.id, o.customer_id, CONCAT(u.first_name, \' \', u.last_name) AS customer_name,
                o.status, o.subtotal, o.delivery_fee, o.total, o.recipient_name, o.recipient_phone,
                o.address_line, o.barangay, o.city, o.province, o.region, o.postal_code,
                o.cancellation_status, o.cancellation_reason, o.cancellation_requested_at,
                o.created_at, o.updated_at
         FROM orders o INNER JOIN users u ON u.id = o.customer_id WHERE o.id = ? LIMIT 1'
    );
    $stmt->execute([$id]); $order = $stmt->fetch();
    if (!$order) errorResponse('Order not found.', 404);
    $items = $db->prepare(
        'SELECT i.id, i.book_listing_id, i.seller_id, i.listing_source, i.title_snapshot, i.author_snapshot,
                i.quantity, i.unit_price, s.first_name AS seller_first_name, s.last_name AS seller_last_name
         FROM order_items i LEFT JOIN users s ON s.id = i.seller_id WHERE i.order_id = ? ORDER BY i.id'
    );
    $items->execute([$id]);
    $delivery = $db->prepare(
        'SELECT d.id, d.status, d.assigned_staff_id, d.notes, d.assigned_at, d.updated_at,
                CONCAT(s.first_name, \' \', s.last_name) AS assigned_staff_name
         FROM deliveries d LEFT JOIN users s ON s.id = d.assigned_staff_id WHERE d.order_id = ? LIMIT 1'
    );
    $delivery->execute([$id]);
    successResponse(['order' => $order, 'items' => $items->fetchAll(), 'delivery' => $delivery->fetch() ?: null]);
}

function updateOrderStatus(PDO $db): never {
    requireMethod('POST');
    $actor = opsActor($db); $body = opsBody();
    $id = opsId($body['order_id'] ?? null, 'order id');
    $next = $body['status'] ?? '';
    $reason = opsText($body['reason'] ?? null, 'reason', 1000);
    $transitions = [
        'pending' => ['awaiting_seller_confirmation'],
        'awaiting_seller_confirmation' => ['confirmed'],
        'confirmed' => ['processing'],
        'processing' => ['ready_for_dispatch'],
    ];
    if (!is_string($next) || !in_array($next, ['awaiting_seller_confirmation','confirmed','processing','ready_for_dispatch'], true)) {
        errorResponse('Choose a valid operational status. Cancellation and delivery statuses have dedicated workflows.', 422);
    }
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT status FROM orders WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]); $order = $stmt->fetch();
        if (!$order) { $db->rollBack(); errorResponse('Order not found.', 404); }
        if (!in_array($next, $transitions[$order['status']] ?? [], true)) { $db->rollBack(); errorResponse('This order status transition is not permitted.', 409); }
        $update = $db->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $update->execute([$next, $id]);
        if ($next === 'ready_for_dispatch') {
            $delivery = $db->prepare("INSERT IGNORE INTO deliveries (order_id, status) VALUES (?, 'pending')");
            $delivery->execute([$id]);
        }
        recordAdminAudit($db, $actor, 'order.status_change', 'order', $id, ['from' => $order['status'], 'to' => $next, 'reason' => $reason]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
    successResponse(['message' => 'Order status updated.']);
}

function reviewCancellation(PDO $db): never {
    requireMethod('POST');
    $actor = opsActor($db); $body = opsBody();
    $id = opsId($body['order_id'] ?? null, 'order id');
    $decision = $body['decision'] ?? '';
    $reason = opsText($body['reason'] ?? null, 'decision reason', 1000, true);
    if (!in_array($decision, ['approved','rejected'], true)) errorResponse('Invalid cancellation decision.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT status, cancellation_status FROM orders WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]); $order = $stmt->fetch();
        if (!$order) { $db->rollBack(); errorResponse('Order not found.', 404); }
        if ($order['cancellation_status'] !== 'pending') { $db->rollBack(); errorResponse('There is no pending cancellation request for this order.', 409); }
        if ($decision === 'approved' && in_array($order['status'], ['delivered','cancelled'], true)) { $db->rollBack(); errorResponse('This order can no longer be cancelled.', 409); }
        $update = $db->prepare(
            "UPDATE orders SET cancellation_status = ?, cancellation_reviewed_by = ?, cancellation_reviewed_at = NOW(),
             status = CASE WHEN ? = 'approved' THEN 'cancelled' ELSE status END WHERE id = ?"
        );
        $update->execute([$decision, $actor, $decision, $id]);
        if ($decision === 'approved') $db->prepare("UPDATE deliveries SET status = 'cancelled' WHERE order_id = ? AND status NOT IN ('delivered','failed','cancelled')")->execute([$id]);
        recordAdminAudit($db, $actor, 'order.cancellation_' . $decision, 'order', $id, ['decision_reason' => $reason]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
    successResponse(['message' => 'Cancellation request ' . $decision . '.']);
}

function listDeliveries(PDO $db): never {
    requireMethod('GET');
    [$page, $size, $offset] = opsPage();
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
    $allowed = ['all','pending','assigned','picked_up','out_for_delivery','delivered','failed','cancelled'];
    if (!in_array($status, $allowed, true)) errorResponse('Invalid delivery status filter.', 422);
    $search = opsSearch(); $where = []; $params = [];
    if ($status !== 'all') { $where[] = 'd.status = :status'; $params[':status'] = $status; }
    if ($search !== '') { $where[] = "(CAST(o.id AS CHAR) = :id OR CONCAT(c.first_name, ' ', c.last_name) LIKE :customer OR CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,'')) LIKE :staff)"; $params[':id'] = ltrim($search, '#BK-'); $params[':customer'] = '%' . $search . '%'; $params[':staff'] = '%' . $search . '%'; }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $from = ' FROM deliveries d INNER JOIN orders o ON o.id = d.order_id INNER JOIN users c ON c.id = o.customer_id LEFT JOIN users s ON s.id = d.assigned_staff_id';
    $count = $db->prepare('SELECT COUNT(*)' . $from . $whereSql);
    foreach ($params as $key => $value) $count->bindValue($key, $value, PDO::PARAM_STR);
    $count->execute(); $total = (int) $count->fetchColumn();
    $stmt = $db->prepare(
        "SELECT d.id, d.order_id, d.status, d.assigned_staff_id, d.assigned_at, d.updated_at,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                CONCAT(COALESCE(s.first_name,''), CASE WHEN s.id IS NULL THEN '' ELSE CONCAT(' ',s.last_name) END) AS assigned_staff_name,
                o.status AS order_status, d.notes, o.recipient_name, o.recipient_phone, o.address_line, o.barangay,
                o.city, o.province, o.region, o.postal_code" . $from . $whereSql .
        ' ORDER BY d.created_at DESC, d.id DESC LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $size, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    $staff = $db->query("SELECT id, first_name, last_name FROM users WHERE role = 'staff' AND account_status = 'active' ORDER BY first_name, last_name")->fetchAll();
    successResponse(['deliveries' => $stmt->fetchAll(), 'staff' => $staff, 'total' => $total, 'page' => $page, 'per_page' => $size]);
}

function updateDelivery(PDO $db): never {
    requireMethod('POST');
    $actor = opsActor($db); $body = opsBody();
    $id = opsId($body['delivery_id'] ?? null, 'delivery id');
    $next = $body['status'] ?? null;
    $staffRaw = $body['assigned_staff_id'] ?? null;
    $staffId = $staffRaw === null || $staffRaw === '' ? null : opsId($staffRaw, 'staff id');
    $notes = opsText($body['notes'] ?? null, 'delivery notes', 2000);
    $allowedStatuses = ['pending','assigned','picked_up','out_for_delivery','delivered','failed','cancelled'];
    if (!is_string($next) || !in_array($next, $allowedStatuses, true)) errorResponse('Invalid delivery status.', 422);
    if ($staffId !== null) {
        $staffCheck = $db->prepare("SELECT COUNT(*) FROM users WHERE id = ? AND role = 'staff' AND account_status = 'active'");
        $staffCheck->execute([$staffId]);
        if ((int) $staffCheck->fetchColumn() !== 1) errorResponse('Choose an active staff account for delivery assignment.', 422);
    }
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT d.order_id, d.status, o.status AS order_status FROM deliveries d INNER JOIN orders o ON o.id = d.order_id WHERE d.id = ? FOR UPDATE');
        $stmt->execute([$id]); $delivery = $stmt->fetch();
        if (!$delivery) { $db->rollBack(); errorResponse('Delivery not found.', 404); }
        $transitions = [
            'pending' => ['pending','assigned','cancelled'],
            'assigned' => ['pending','assigned','picked_up','cancelled'],
            'picked_up' => ['picked_up','out_for_delivery','cancelled'],
            'out_for_delivery' => ['out_for_delivery','delivered','failed','cancelled'],
            'failed' => ['failed','assigned','cancelled'],
            'delivered' => ['delivered'], 'cancelled' => ['cancelled'],
        ];
        if (!in_array($next, $transitions[$delivery['status']] ?? [], true)) { $db->rollBack(); errorResponse('This delivery status transition is not permitted.', 409); }
        if (in_array($next, ['assigned','picked_up','out_for_delivery'], true) && $staffId === null) {
            $db->rollBack(); errorResponse('Assign an active staff member before progressing delivery.', 422);
        }
        if ($next === 'out_for_delivery' && $delivery['order_status'] !== 'ready_for_dispatch') { $db->rollBack(); errorResponse('The order must be ready for dispatch before delivery starts.', 409); }
        if ($next === 'delivered' && $delivery['order_status'] !== 'out_for_delivery') { $db->rollBack(); errorResponse('The order must be out for delivery before it can be marked delivered.', 409); }
        $update = $db->prepare("UPDATE deliveries SET status = ?, assigned_staff_id = ?, notes = ?, assigned_at = CASE WHEN ? IS NOT NULL AND assigned_at IS NULL THEN NOW() ELSE assigned_at END, delivered_at = CASE WHEN ? = 'delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END WHERE id = ?");
        $update->execute([$next, $staffId, $notes, $staffId, $next, $id]);
        if ($next === 'out_for_delivery' || $next === 'delivered') $db->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$next, (int) $delivery['order_id']]);
        recordAdminAudit($db, $actor, 'delivery.update', 'delivery', $id, ['status' => $next, 'assigned_staff_id' => $staffId, 'notes' => $notes]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
    successResponse(['message' => 'Delivery updated.']);
}

function listRefunds(PDO $db): never {
    requireMethod('GET');
    [$page, $size, $offset] = opsPage();
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
    if (!in_array($status, ['all','pending','approved','rejected'], true)) errorResponse('Invalid refund status filter.', 422);
    $search = opsSearch(); $where = []; $params = [];
    if ($status !== 'all') { $where[] = 'r.status = :status'; $params[':status'] = $status; }
    if ($search !== '') { $where[] = "(CAST(r.order_id AS CHAR) = :id OR CONCAT(u.first_name, ' ', u.last_name) LIKE :customer)"; $params[':id'] = ltrim($search, '#BK-'); $params[':customer'] = '%' . $search . '%'; }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $from = ' FROM refund_requests r INNER JOIN orders o ON o.id = r.order_id INNER JOIN users u ON u.id = r.customer_id';
    $count = $db->prepare('SELECT COUNT(*)' . $from . $whereSql);
    foreach ($params as $key => $value) $count->bindValue($key, $value, PDO::PARAM_STR);
    $count->execute(); $total = (int) $count->fetchColumn();
    $stmt = $db->prepare(
        'SELECT r.id, r.order_id, r.customer_id, CONCAT(u.first_name, \' \', u.last_name) AS customer_name,
                r.reason, r.status, r.decision_reason, r.reviewed_by, r.reviewed_at, r.requested_at,
                o.status AS order_status, o.total' . $from . $whereSql .
        ' ORDER BY r.requested_at DESC, r.id DESC LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $size, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    successResponse(['refunds' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'per_page' => $size, 'payment_processing_available' => false]);
}

function reviewRefund(PDO $db): never {
    requireMethod('POST');
    $actor = opsActor($db); $body = opsBody();
    $id = opsId($body['refund_id'] ?? null, 'refund request id');
    $decision = $body['decision'] ?? '';
    $reason = opsText($body['decision_reason'] ?? null, 'decision explanation', 1000, true);
    if (!in_array($decision, ['approved','rejected'], true)) errorResponse('Invalid refund decision.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT status, order_id FROM refund_requests WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]); $refund = $stmt->fetch();
        if (!$refund) { $db->rollBack(); errorResponse('Refund request not found.', 404); }
        if ($refund['status'] !== 'pending') { $db->rollBack(); errorResponse('This refund request has already been reviewed.', 409); }
        $update = $db->prepare('UPDATE refund_requests SET status = ?, decision_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?');
        $update->execute([$decision, $reason, $actor, $id]);
        recordAdminAudit($db, $actor, 'refund.' . $decision, 'refund_request', $id, ['order_id' => (int) $refund['order_id'], 'decision_reason' => $reason]);
        $db->commit();
    } catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
    successResponse(['message' => 'Refund decision recorded. No money was transferred.']);
}
