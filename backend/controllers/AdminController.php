<?php
/** Role-protected back-office API for users, staff, seller applications and listings. */
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/validation.php';
require_once __DIR__ . '/../utils/audit.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/seller_id_documents.php';
require_once __DIR__ . '/../utils/listing_media.php';
require_once __DIR__ . '/../utils/private_listing_files.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Back-office API error: ' . $e->getMessage());
    errorResponse('The requested back-office data could not be loaded.', 500);
});

requireAuth();
$db = getDB();
$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : 'overview';

$roleRequirements = [
    'overview' => ['admin', 'staff'],
    'users' => ['admin'],
    'user' => ['admin'],
    'account-status' => ['admin'],
    'staff' => ['admin'],
    'staff-update' => ['admin'],
    'seller-applications' => ['admin', 'staff'],
    'seller-id-document' => ['admin'],
    // Seller approval changes account privileges and is reserved for admins.
    'review-seller' => ['admin'],
    'listings' => ['admin', 'staff'],
    'listing-details' => ['admin', 'staff'],
    'listing-create' => ['admin', 'staff'],
    'review-listing' => ['admin', 'staff'],
];
if (!isset($roleRequirements[$action])) errorResponse('Unknown back-office action.', 404);
requireDatabaseRole($db, ...$roleRequirements[$action]);
if ($action !== 'overview') {
    requirePhase2Schema($db);
}
if (in_array($action, ['listings', 'listing-details', 'listing-create', 'review-listing'], true)) {
    requirePhase7ListingSchema($db);
}

match ($action) {
    'overview' => handleOverview($db),
    'users' => handleUsers($db),
    'user' => handleUserDetails($db),
    'account-status' => handleAccountStatus($db),
    'staff' => handleStaff($db),
    'staff-update' => handleStaffUpdate($db),
    'seller-applications' => handleSellerApplications($db),
    'seller-id-document' => handleSellerIdDocument($db),
    'review-seller' => handleSellerReview($db),
    'listings' => handleListings($db),
    'listing-details' => handleListingDetails($db),
    'listing-create' => handleListingCreate($db),
    'review-listing' => handleListingReview($db),
    default => errorResponse('Unknown back-office action.', 404),
};

function requirePhase7ListingSchema(PDO $db): void {
    $columns = $db->query(
        "SELECT COUNT(DISTINCT COLUMN_NAME) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listings'
           AND COLUMN_NAME IN ('publisher', 'language', 'ebook_file_format', 'ebook_authorized_at', 'submitted_at')"
    );
    $media = $db->query(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listing_media'"
    );
    if ((int) $columns->fetchColumn() !== 5 || (int) $media->fetchColumn() !== 1) {
        errorResponse('Apply database/migrations/2026_11_28_phase7_seller_listing_moderation.sql before listing moderation.', 503);
    }
}

function requirePhase2Schema(PDO $db): void {
    if (!hasAccountStatusColumn($db)) {
        errorResponse('Apply database/migrations/2026_11_22_phase2_backoffice.sql before using Phase 2 management.', 503);
    }
    $stmt = $db->query(
        "SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('book_listings', 'admin_audit_logs')"
    );
    if ((int) $stmt->fetchColumn() !== 2) {
        errorResponse('Apply database/migrations/2026_11_22_phase2_backoffice.sql before using Phase 2 management.', 503);
    }
}

function actor(PDO $db, string ...$roles): int {
    requireDatabaseRole($db, ...$roles);
    return (int) $_SESSION['user_id'];
}

function requestBody(): array {
    if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);
    return getJsonBody();
}

function bodyText(array $body, string $key, int $maxLength = 255): string {
    $value = $body[$key] ?? '';
    if (!is_string($value)) errorResponse('Invalid request data.', 422);
    $value = trim(strip_tags($value));
    if (strlen($value) > $maxLength) errorResponse('One or more fields are too long.', 422);
    return $value;
}

function positiveId(mixed $value, string $field): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) errorResponse("A valid {$field} is required.", 422);
    return (int) $id;
}

function pagination(): array {
    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $pageSize = filter_var($_GET['per_page'] ?? 20, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
    if ($page === false || $pageSize === false) errorResponse('Invalid pagination parameters.', 422);
    return [(int) $page, (int) $pageSize, ((int) $page - 1) * (int) $pageSize];
}

function handleOverview(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin', 'staff');
    $isAdmin = ($_SESSION['role'] ?? '') === 'admin';
    $count = static function (PDO $db, string $sql): int {
        $stmt = $db->prepare($sql);
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    };
    $stats = [
        'customers' => $isAdmin ? $count($db, "SELECT COUNT(*) FROM users WHERE role = 'customer'") : null,
        'approved_sellers' => $count($db, "SELECT COUNT(DISTINCT a.user_id) FROM seller_applications a INNER JOIN users u ON u.id = a.user_id WHERE a.status = 'approved' AND u.role = 'seller'"),
        'pending_seller_applications' => $count($db, "SELECT COUNT(*) FROM seller_applications WHERE status = 'pending'"),
        'staff_accounts' => $isAdmin ? $count($db, "SELECT COUNT(*) FROM users WHERE role = 'staff'") : null,
        'active_listings' => null,
        'pending_listing_reviews' => null,
        'total_orders' => null,
        'pending_orders' => null,
        'active_deliveries' => null,
        'pending_refunds' => null,
    ];
    $listingCheck = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
    $listingCheck->execute(['book_listings']);
    $hasListings = (int) $listingCheck->fetchColumn() === 1;
    if ($hasListings && hasAccountStatusColumn($db)) {
        $stats['active_listings'] = $count($db, "SELECT COUNT(*) FROM book_listings b WHERE b.listing_status = 'approved' AND b.publication_status = 'published' AND b.availability = 'available' AND b.archived_at IS NULL AND ((b.`source` = 'bookify' AND EXISTS (SELECT 1 FROM users creator WHERE creator.id = b.created_by AND creator.role IN ('staff','admin'))) OR (b.`source` = 'seller' AND EXISTS (SELECT 1 FROM users seller JOIN seller_applications a ON a.user_id = seller.id WHERE seller.id = b.seller_id AND seller.role = 'seller' AND seller.account_status = 'active' AND seller.is_verified = 1 AND a.status = 'approved'))) ");
        $stats['pending_listing_reviews'] = $count($db, "SELECT COUNT(*) FROM book_listings WHERE listing_status IN ('pending_review', 'pending') AND archived_at IS NULL");
    }
    $phase3Check = $db->query(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('orders','deliveries','refund_requests')"
    );
    $hasOperations = (int) $phase3Check->fetchColumn() === 3;
    if ($hasOperations) {
        $stats['total_orders'] = $count($db, 'SELECT COUNT(*) FROM orders');
        $stats['pending_orders'] = $count($db, "SELECT COUNT(*) FROM orders WHERE status IN ('pending','awaiting_seller_confirmation')");
        $stats['active_deliveries'] = $count($db, "SELECT COUNT(*) FROM deliveries WHERE status IN ('pending','assigned','picked_up','out_for_delivery')");
        $stats['pending_refunds'] = $count($db, "SELECT COUNT(*) FROM refund_requests WHERE status = 'pending'");
    }
    successResponse([
        'stats' => $stats,
        'available_modules' => array_values(array_filter(['users', 'staff', 'seller_applications', $hasListings ? 'listings' : null, $hasOperations ? 'orders' : null, $hasOperations ? 'deliveries' : null, $hasOperations ? 'refunds' : null])),
        'unavailable_modules' => array_values(array_filter([$hasOperations ? null : 'orders', $hasOperations ? null : 'deliveries', $hasOperations ? null : 'refunds', 'notifications'])),
    ]);
}

function handleUsers(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin');
    [$page, $perPage, $offset] = pagination();
    $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
    $role = is_string($_GET['role'] ?? null) ? $_GET['role'] : '';
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : '';
    $allowedRoles = ['customer', 'seller', 'staff', 'admin'];
    if ($role !== '' && !in_array($role, $allowedRoles, true)) errorResponse('Invalid role filter.', 422);
    if ($status !== '' && !in_array($status, ['active', 'suspended'], true)) errorResponse('Invalid status filter.', 422);

    $where = [];
    $params = [];
    if ($role !== '') { $where[] = 'role = :role'; $params[':role'] = $role; }
    if ($status !== '') { $where[] = 'account_status = :status'; $params[':status'] = $status; }
    if ($search !== '') {
        $where[] = "(CONCAT(first_name, ' ', last_name) LIKE :name OR email LIKE :email)";
        $params[':name'] = '%' . $search . '%';
        $params[':email'] = '%' . $search . '%';
    }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $countStmt = $db->prepare('SELECT COUNT(*) FROM users' . $whereSql);
    foreach ($params as $key => $value) $countStmt->bindValue($key, $value, PDO::PARAM_STR);
    $countStmt->execute();
    $total = (int) $countStmt->fetchColumn();

    $sql = 'SELECT id, first_name, last_name, email, role, is_verified, account_status, created_at FROM users'
        . $whereSql . ' ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset';
    $stmt = $db->prepare($sql);
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    successResponse(['users' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
}

function handleUserDetails(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin');
    $id = positiveId($_GET['id'] ?? null, 'user id');
    $stmt = $db->prepare(
        'SELECT id, first_name, last_name, email, contact_number, role, is_verified, account_status, created_at
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) errorResponse('User not found.', 404);
    $applications = $db->prepare('SELECT id, status, applied_at, reviewed_at, notes FROM seller_applications WHERE user_id = ? ORDER BY applied_at DESC');
    $applications->execute([$id]);
    $ordersAvailable = (int) $db->query(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'"
    )->fetchColumn() === 1;
    $orders = [];
    if ($ordersAvailable) {
        $orderStmt = $db->prepare('SELECT id, status, total, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC, id DESC LIMIT 20');
        $orderStmt->execute([$id]);
        $orders = $orderStmt->fetchAll();
    }
    successResponse(['user' => $user, 'seller_applications' => $applications->fetchAll(), 'order_history_available' => $ordersAvailable, 'order_history' => $orders]);
}

function handleAccountStatus(PDO $db): never {
    requireMethod('POST');
    $adminId = actor($db, 'admin');
    $body = requestBody();
    $id = positiveId($body['user_id'] ?? null, 'user id');
    $status = $body['status'] ?? '';
    $reason = bodyText($body, 'reason', 500);
    if (!in_array($status, ['active', 'suspended'], true)) errorResponse('Invalid account status.', 422);
    if ($status === 'suspended' && $reason === '') errorResponse('A reason is required to suspend an account.', 422);
    if ($id === $adminId) errorResponse('You cannot suspend your own account.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT role, account_status FROM users WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]);
        $target = $stmt->fetch();
        if (!$target) { $db->rollBack(); errorResponse('User not found.', 404); }
        if (!in_array($target['role'], ['customer', 'seller'], true)) { $db->rollBack(); errorResponse('Only customer and seller accounts can be changed here.', 422); }
        if ($target['account_status'] === $status) { $db->rollBack(); errorResponse('The account already has this status.', 409); }
        $update = $db->prepare('UPDATE users SET account_status = ? WHERE id = ?');
        $update->execute([$status, $id]);
        recordAdminAudit($db, $adminId, $status === 'suspended' ? 'user.suspend' : 'user.reactivate', 'user', $id, ['reason' => $reason]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => $status === 'suspended' ? 'Account suspended.' : 'Account reactivated.']);
}

function handleStaff(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin');
    [$page, $perPage, $offset] = pagination();
    $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
    $sql = "SELECT id, first_name, last_name, email, contact_number, is_verified, account_status, created_at
            FROM users WHERE role = 'staff'";
    $countSql = "SELECT COUNT(*) FROM users WHERE role = 'staff'";
    $searchSql = '';
    if ($search !== '') { $searchSql = " AND (CONCAT(first_name, ' ', last_name) LIKE :name OR email LIKE :email)"; $sql .= $searchSql; $countSql .= $searchSql; }
    $countStmt = $db->prepare($countSql);
    $stmt = $db->prepare($sql . ' ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset');
    if ($search !== '') {
        $needle = '%' . $search . '%';
        $countStmt->bindValue(':name', $needle, PDO::PARAM_STR); $countStmt->bindValue(':email', $needle, PDO::PARAM_STR);
        $stmt->bindValue(':name', $needle, PDO::PARAM_STR); $stmt->bindValue(':email', $needle, PDO::PARAM_STR);
    }
    $countStmt->execute(); $total = (int) $countStmt->fetchColumn();
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    successResponse(['staff' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
}

function handleStaffUpdate(PDO $db): never {
    requireMethod('POST');
    $adminId = actor($db, 'admin');
    $body = requestBody();
    $id = positiveId($body['staff_id'] ?? null, 'staff id');
    $first = bodyText($body, 'first_name');
    $last = bodyText($body, 'last_name');
    $email = bodyText($body, 'email', 254);
    $phone = bodyText($body, 'contact_number', 20);
    $status = $body['status'] ?? '';
    if ($first === '' || $last === '' || !isValidEmail($email)) errorResponse('Enter a valid name and email address.', 422);
    if ($phone !== '' && !isValidPhoneNumber($phone)) errorResponse('Enter a valid Philippine mobile number.', 422);
    if (!in_array($status, ['active', 'suspended'], true)) errorResponse('Invalid account status.', 422);
    if ($id === $adminId && $status === 'suspended') errorResponse('You cannot suspend your own account.', 422);

    $db->beginTransaction();
    try {
        $targetStmt = $db->prepare("SELECT id, account_status FROM users WHERE id = ? AND role = 'staff' FOR UPDATE");
        $targetStmt->execute([$id]);
        $target = $targetStmt->fetch();
        if (!$target) { $db->rollBack(); errorResponse('Staff account not found.', 404); }
        $update = $db->prepare('UPDATE users SET first_name = ?, last_name = ?, email = ?, contact_number = ?, account_status = ? WHERE id = ?');
        $update->execute([$first, $last, $email, $phone !== '' ? $phone : null, $status, $id]);
        recordAdminAudit($db, $adminId, 'staff.update', 'user', $id, ['status' => $status]);
        $db->commit();
    } catch (PDOException $e) {
        if ($db->inTransaction()) $db->rollBack();
        if ($e->getCode() === '23000') errorResponse('That email address is already in use.', 409);
        throw $e;
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Staff account updated.']);
}

function handleSellerApplications(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin', 'staff');
    [$page, $perPage, $offset] = pagination();
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'pending';
    if (!in_array($status, ['all', 'pending', 'approved', 'rejected'], true)) errorResponse('Invalid application status.', 422);
    $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
    $where = [];
    $params = [];
    if ($status !== 'all') { $where[] = 'a.status = :status'; $params[':status'] = $status; }
    if ($search !== '') {
        $where[] = "(CONCAT(u.first_name, ' ', u.last_name) LIKE :name OR u.email LIKE :email)";
        $params[':name'] = '%' . $search . '%'; $params[':email'] = '%' . $search . '%';
    }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $base = ' FROM seller_applications a INNER JOIN users u ON u.id = a.user_id';
    $countStmt = $db->prepare('SELECT COUNT(*)' . $base . $whereSql);
    foreach ($params as $key => $value) $countStmt->bindValue($key, $value, PDO::PARAM_STR);
    $countStmt->execute(); $total = (int) $countStmt->fetchColumn();
    $applicationFields = hasSellerApplicationVerificationColumns($db)
        ? 'COALESCE(a.phone_number, u.contact_number) AS contact_number, (a.id_document_key IS NOT NULL) AS has_id_document'
        : 'u.contact_number, 0 AS has_id_document';
    $stmt = $db->prepare(
        'SELECT a.id, a.user_id, a.status, a.applied_at, a.reviewed_at, a.reviewed_by, a.notes,
                u.first_name, u.last_name, u.email, ' . $applicationFields . ', u.is_verified, u.account_status, u.role'
        . $base . $whereSql . ' ORDER BY a.applied_at DESC, a.id DESC LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    $applications = $stmt->fetchAll();
    foreach ($applications as &$application) $application['has_id_document'] = (bool) $application['has_id_document'];
    unset($application);
    successResponse(['applications' => $applications, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
}

function handleSellerIdDocument(PDO $db): never {
    requireMethod('GET');
    if (!hasSellerApplicationVerificationColumns($db)) {
        errorResponse('Apply the seller application verification migration before viewing ID documents.', 503);
    }
    $applicationId = positiveId($_GET['application_id'] ?? null, 'application id');
    $stmt = $db->prepare('SELECT id_document_key FROM seller_applications WHERE id = ? LIMIT 1');
    $stmt->execute([$applicationId]);
    $key = $stmt->fetchColumn();
    if (!is_string($key) || !preg_match('/^[a-f0-9]{32}\.(jpg|png)$/D', $key)) {
        errorResponse('ID document not found.', 404);
    }

    try {
        $path = sellerIdStorageDirectory() . DIRECTORY_SEPARATOR . $key;
    } catch (Throwable) {
        errorResponse('ID document storage is unavailable.', 503);
    }
    if (!is_file($path) || !is_readable($path)) errorResponse('ID document not found.', 404);

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($path);
    $image = @getimagesize($path);
    if (!in_array($mime, ['image/jpeg', 'image/png'], true) || !$image || ($image['mime'] ?? null) !== $mime) {
        errorResponse('ID document not found.', 404);
    }

    // Audit access by actor and application only. Never log document contents or paths.
    recordAdminAudit($db, actor($db, 'admin'), 'seller_application.id_document_viewed', 'seller_application', $applicationId);
    while (ob_get_level() > 0) ob_end_clean();
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) filesize($path));
    header('Content-Disposition: inline; filename="seller-id-' . $applicationId . '.' . ($mime === 'image/jpeg' ? 'jpg' : 'png') . '"');
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    $stream = fopen($path, 'rb');
    if ($stream === false) errorResponse('ID document could not be read.', 500);
    fpassthru($stream);
    fclose($stream);
    exit;
}

function handleSellerReview(PDO $db): never {
    requireMethod('POST');
    $actorId = actor($db, 'admin');
    $body = requestBody();
    $id = positiveId($body['application_id'] ?? null, 'application id');
    $decision = $body['decision'] ?? '';
    $reason = bodyText($body, 'reason', 1000);
    if (!in_array($decision, ['approved', 'rejected'], true)) errorResponse('Invalid seller application decision.', 422);
    if ($decision === 'rejected' && $reason === '') errorResponse('A reason is required when rejecting an application.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT user_id, status FROM seller_applications WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]); $application = $stmt->fetch();
        if (!$application) { $db->rollBack(); errorResponse('Seller application not found.', 404); }
        if ($application['status'] !== 'pending') { $db->rollBack(); errorResponse('This application has already been reviewed.', 409); }
        $userStmt = $db->prepare('SELECT role, is_verified, account_status FROM users WHERE id = ? FOR UPDATE');
        $userStmt->execute([(int) $application['user_id']]); $applicant = $userStmt->fetch();
        if (!$applicant) { $db->rollBack(); errorResponse('Applicant account not found.', 404); }
        if ($decision === 'approved' && ($applicant['role'] !== 'customer' || !(bool) $applicant['is_verified'] || $applicant['account_status'] !== 'active')) {
            $db->rollBack(); errorResponse('Only active, verified customer accounts can be approved as sellers.', 422);
        }
        $updateApp = $db->prepare('UPDATE seller_applications SET status = ?, reviewed_at = NOW(), reviewed_by = ?, notes = ? WHERE id = ?');
        $updateApp->execute([$decision, $actorId, $reason !== '' ? $reason : null, $id]);
        if ($decision === 'approved') {
            $updateUser = $db->prepare("UPDATE users SET role = 'seller' WHERE id = ? AND role = 'customer' AND account_status = 'active'");
            $updateUser->execute([(int) $application['user_id']]);
            if ($updateUser->rowCount() !== 1) { $db->rollBack(); errorResponse('Seller approval could not update the applicant role.', 409); }
        }
        recordAdminAudit($db, $actorId, 'seller_application.' . $decision, 'seller_application', $id, ['reason' => $reason]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => $decision === 'approved' ? 'Seller application approved.' : 'Seller application rejected.']);
}

function handleListings(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin', 'staff');
    [$page, $perPage, $offset] = pagination();
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'pending';
    if (!in_array($status, ['all', 'pending', 'pending_review', 'approved', 'rejected', 'needs_revision', 'suspended'], true)) errorResponse('Invalid listing status.', 422);
    $source = is_string($_GET['source'] ?? null) ? $_GET['source'] : '';
    if ($source !== '' && !in_array($source, ['seller', 'bookify'], true)) errorResponse('Invalid listing source.', 422);
    $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
    $where = ["b.listing_status <> 'draft'", 'b.archived_at IS NULL'];
    $params = [];
    if (in_array($status, ['pending', 'pending_review'], true)) $where[] = "b.listing_status IN ('pending_review', 'pending')";
    elseif ($status !== 'all') { $where[] = 'b.listing_status = :status'; $params[':status'] = $status; }
    if ($source !== '') { $where[] = 'b.`source` = :source'; $params[':source'] = $source; }
    if ($search !== '') { $where[] = '(b.title LIKE :title OR b.author LIKE :author)'; $params[':title'] = '%' . $search . '%'; $params[':author'] = '%' . $search . '%'; }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $base = ' FROM book_listings b LEFT JOIN users seller ON seller.id = b.seller_id LEFT JOIN users creator ON creator.id = b.created_by';
    $countStmt = $db->prepare('SELECT COUNT(*)' . $base . $whereSql);
    foreach ($params as $key => $value) $countStmt->bindValue($key, $value, PDO::PARAM_STR);
    $countStmt->execute(); $total = (int) $countStmt->fetchColumn();
    $stmt = $db->prepare(
        'SELECT b.id, b.title, b.author, b.publisher, b.description, b.cover_image_path, b.category, b.language, b.isbn, b.price, b.stock_quantity,
                b.`condition`, b.`format`, b.`source`, b.seller_id, b.created_by, b.listing_status,
                b.publication_status, b.availability, b.moderation_reason, b.reviewed_at, b.created_at, b.submitted_at,
                b.ebook_file_path,
                b.ebook_file_format, (b.ebook_authorized_at IS NOT NULL) AS ebook_rights_confirmed,
                seller.first_name AS seller_first_name, seller.last_name AS seller_last_name,
                creator.first_name AS creator_first_name, creator.last_name AS creator_last_name'
        . $base . $whereSql . ' ORDER BY b.created_at DESC, b.id DESC LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT); $stmt->bindValue(':offset', $offset, PDO::PARAM_INT); $stmt->execute();
    $listings = $stmt->fetchAll();
    foreach ($listings as &$listing) {
        $listing['cover_image_path'] = listingImageUrl((int) $listing['id'], $listing['cover_image_path']);
        $listing['has_ebook_file'] = privateListingEbookExists($listing['ebook_file_path']);
        unset($listing['ebook_file_path']);
        $listing['ebook_rights_confirmed'] = (bool) $listing['ebook_rights_confirmed'];
    }
    unset($listing);
    successResponse(['listings' => $listings, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
}

function handleListingDetails(PDO $db): never {
    requireMethod('GET');
    actor($db, 'admin', 'staff');
    $id = positiveId($_GET['listing_id'] ?? null, 'listing id');
    $stmt = $db->prepare(
        'SELECT b.id, b.title, b.author, b.publisher, b.description, b.cover_image_path, b.category, b.language, b.isbn, b.stock_quantity,
                b.price, b.`condition`, b.`format`, b.`source`, b.seller_id, b.created_by, b.listing_status,
                b.publication_status, b.availability, b.moderation_reason, b.reviewed_at, b.created_at, b.submitted_at,
                b.ebook_file_path,
                b.ebook_file_format, (b.ebook_authorized_at IS NOT NULL) AS ebook_rights_confirmed,
                seller.first_name AS seller_first_name, seller.last_name AS seller_last_name, seller.email AS seller_email,
                creator.first_name AS creator_first_name, creator.last_name AS creator_last_name
         FROM book_listings b LEFT JOIN users seller ON seller.id = b.seller_id
         LEFT JOIN users creator ON creator.id = b.created_by WHERE b.id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $listing = $stmt->fetch();
    if (!$listing) errorResponse('Listing not found.', 404);
    $listing['cover_image_path'] = listingImageUrl($id, $listing['cover_image_path']);
    $listing['has_ebook_file'] = privateListingEbookExists($listing['ebook_file_path']);
    unset($listing['ebook_file_path']);
    $listing['ebook_rights_confirmed'] = (bool) $listing['ebook_rights_confirmed'];

    $media = $db->prepare('SELECT id, media_type, file_path, sort_order FROM book_listing_media WHERE listing_id = ? ORDER BY media_type, sort_order, id');
    $media->execute([$id]);
    $listing['media'] = $media->fetchAll();
    foreach ($listing['media'] as &$image) $image['file_path'] = listingImageUrl($id, $image['file_path'], (int) $image['id']);
    unset($image);

    $historyStmt = $db->prepare(
        "SELECT log.actor_id, log.action, log.details_json, log.created_at,
                actor.first_name AS actor_first_name, actor.last_name AS actor_last_name
         FROM admin_audit_logs log LEFT JOIN users actor ON actor.id = log.actor_id
         WHERE log.target_type = 'book_listing' AND log.target_id = ?
           AND log.action IN (
             'listing.create', 'listing.submit', 'listing.save_draft', 'listing.unarchive_submit_review',
             'listing.approve', 'listing.reject', 'listing.request_revision', 'listing.suspend',
             'listing.restore', 'listing.publish', 'listing.unpublish', 'listing.archive', 'listing.inventory_update'
           )
         ORDER BY log.created_at DESC, log.id DESC LIMIT 50"
    );
    $historyStmt->execute([$id]);
    $history = [];
    foreach ($historyStmt->fetchAll() as $entry) {
        $details = is_string($entry['details_json'] ?? null) ? json_decode($entry['details_json'], true) : null;
        $history[] = [
            'actor_id' => $entry['actor_id'] === null ? null : (int) $entry['actor_id'],
            'actor_name' => trim(($entry['actor_first_name'] ?? '') . ' ' . ($entry['actor_last_name'] ?? '')) ?: 'Former account',
            'action' => $entry['action'],
            'comments' => is_array($details) && is_string($details['reason'] ?? null) ? $details['reason'] : null,
            'created_at' => $entry['created_at'],
        ];
    }
    successResponse(['listing' => $listing, 'history' => $history]);
}

function handleListingCreate(PDO $db): never {
    requireMethod('POST');
    $actorId = actor($db, 'admin', 'staff');
    $body = requestBody();
    $title = bodyText($body, 'title'); $author = bodyText($body, 'author');
    $category = bodyText($body, 'category', 100); $description = bodyText($body, 'description', 10000);
    $condition = $body['condition'] ?? ''; $format = $body['format'] ?? '';
    $price = $body['price'] ?? null;
    $cover = bodyText($body, 'cover_image_path', 500);
    if ($title === '' || $author === '' || $category === '') errorResponse('Title, author, and category are required.', 422);
    if (!in_array($condition, ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Pre-owned'], true)) errorResponse('Choose a valid book condition.', 422);
    if (!in_array($format, ['Physical', 'E-book'], true)) errorResponse('Choose a valid book format.', 422);
    if ($format === 'E-book') errorResponse('This form cannot accept private digital files. Submit e-books through the seller listing workflow.', 422);
    if (!is_numeric($price) || (float) $price <= 0 || (float) $price > 99999999.99) errorResponse('Enter a valid book price.', 422);
    if ($cover !== '' && !isLegacyListingImagePath($cover)) {
        errorResponse('Cover image must be a local path under uploads/books.', 422);
    }
    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            "INSERT INTO book_listings
             (title, author, description, cover_image_path, category, price, `condition`, `format`, `source`,
              seller_id, created_by, listing_status, publication_status, availability, reviewed_by, reviewed_at, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bookify', NULL, ?, 'pending_review', 'draft', 'available', NULL, NULL, NOW())"
        );
        $stmt->execute([$title, $author, $description !== '' ? $description : null, $cover !== '' ? $cover : null, $category, number_format((float) $price, 2, '.', ''), $condition, $format, $actorId, $actorId]);
        $id = (int) $db->lastInsertId();
        recordAdminAudit($db, $actorId, 'listing.submit', 'book_listing', $id, ['source' => 'bookify']);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Bookify listing submitted for review.', 'listing_id' => $id], 201);
}

function handleListingReview(PDO $db): never {
    requireMethod('POST');
    $actorId = actor($db, 'admin', 'staff');
    $body = requestBody();
    $id = positiveId($body['listing_id'] ?? null, 'listing id');
    $decision = $body['decision'] ?? '';
    $reason = bodyText($body, 'reason', 1000);
    $allowed = ['approve', 'reject', 'request_revision', 'suspend', 'restore', 'publish', 'unpublish'];
    if (!in_array($decision, $allowed, true)) errorResponse('Invalid listing action.', 422);
    if (in_array($decision, ['reject', 'request_revision', 'suspend'], true) && $reason === '') errorResponse('A reason is required for this listing action.', 422);

    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            'SELECT `source`, seller_id, listing_status, archived_at, title, author, category, price, `format`, stock_quantity,
                    ebook_file_path, ebook_authorized_at FROM book_listings WHERE id = ? FOR UPDATE'
        );
        $stmt->execute([$id]); $listing = $stmt->fetch();
        if (!$listing) { $db->rollBack(); errorResponse('Listing not found.', 404); }
        if ($listing['archived_at'] !== null) { $db->rollBack(); errorResponse('Archived listings cannot be moderated or published.', 409); }
        $isSubmission = in_array($listing['listing_status'], ['pending_review', 'pending'], true);
        $updates = match ($decision) {
            'approve' => $isSubmission ? ['approved', 'published'] : null,
            'reject' => $isSubmission ? ['rejected', 'unpublished'] : null,
            'request_revision' => $isSubmission && $listing['source'] === 'seller' ? ['needs_revision', 'unpublished'] : null,
            'suspend' => $listing['listing_status'] === 'approved' ? ['suspended', 'unpublished'] : null,
            'restore' => $listing['listing_status'] === 'suspended' ? ['approved', 'unpublished'] : null,
            'publish' => $listing['listing_status'] === 'approved' ? ['approved', 'published'] : null,
            'unpublish' => $listing['listing_status'] === 'approved' ? ['approved', 'unpublished'] : null,
        };
        if ($updates === null) { $db->rollBack(); errorResponse('This action is not valid for the listing’s current status.', 409); }
        if ($decision === 'approve') {
            $hasRequiredBookInfo = trim((string) $listing['title']) !== ''
                && trim((string) $listing['author']) !== ''
                && trim((string) $listing['category']) !== ''
                && (float) $listing['price'] > 0;
            $hasPhysicalInventory = $listing['format'] === 'Physical' && (int) $listing['stock_quantity'] > 0;
            $ebookKey = $listing['ebook_file_path'];
            $hasPrivateEbook = $listing['format'] === 'E-book'
                && is_string($ebookKey)
                && preg_match('/^[a-f0-9]{48}\.(pdf|epub)$/D', $ebookKey)
                && is_file(privateListingEbookDirectory() . DIRECTORY_SEPARATOR . $ebookKey)
                && $listing['ebook_authorized_at'] !== null;
            if (!$hasRequiredBookInfo || (!$hasPhysicalInventory && !$hasPrivateEbook)) {
                $db->rollBack();
                errorResponse('This submission is missing required book details, inventory, or a privately stored e-book file.', 422);
            }
        }
        if ($decision === 'approve' && $listing['source'] === 'seller') {
            $sellerCheck = $db->prepare(
                "SELECT COUNT(*) FROM users u INNER JOIN seller_applications a ON a.user_id = u.id
                 WHERE u.id = ? AND u.role = 'seller' AND u.account_status = 'active' AND u.is_verified = 1 AND a.status = 'approved'"
            );
            $sellerCheck->execute([(int) $listing['seller_id']]);
            if ((int) $sellerCheck->fetchColumn() < 1) { $db->rollBack(); errorResponse('Only active, approved sellers can have listings approved.', 422); }
        }
        $update = $db->prepare(
            'UPDATE book_listings SET listing_status = ?, publication_status = ?, moderation_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?'
        );
        $update->execute([$updates[0], $updates[1], $reason !== '' ? $reason : null, $actorId, $id]);
        recordAdminAudit($db, $actorId, 'listing.' . $decision, 'book_listing', $id, $reason !== '' ? ['reason' => $reason] : []);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Listing updated.']);
}
