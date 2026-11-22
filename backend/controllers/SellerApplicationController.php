<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../middleware/auth.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Seller application error: ' . $e->getMessage());
    errorResponse('The seller application could not be processed.', 500);
});

$action = $_GET['action'] ?? 'current';
$db = getDB();
requireAuth();
$userId = (int) $_SESSION['user_id'];

if ($action === 'current') {
    requireMethod('GET');
    requireDatabaseRole($db, 'customer', 'seller');
    $stmt = $db->prepare(
        'SELECT id, status, applied_at, reviewed_at, notes
         FROM seller_applications WHERE user_id = ? ORDER BY applied_at DESC, id DESC LIMIT 1'
    );
    $stmt->execute([$userId]);
    successResponse(['application' => $stmt->fetch() ?: null]);
}

if ($action === 'apply') {
    requireMethod('POST');
    requireDatabaseRole($db, 'customer');
    if (!hasAccountStatusColumn($db)) errorResponse('Apply the Phase 2 database migration before submitting seller applications.', 503);
    if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);
    $verified = $db->prepare('SELECT is_verified FROM users WHERE id = ? LIMIT 1');
    $verified->execute([$userId]);
    if (!(bool) $verified->fetchColumn()) errorResponse('Verify your email before applying to become a seller.', 403);

    $db->beginTransaction();
    try {
        $lock = $db->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
        $lock->execute([$userId]);
        $existing = $db->prepare(
            'SELECT status FROM seller_applications WHERE user_id = ? ORDER BY applied_at DESC, id DESC LIMIT 1'
        );
        $existing->execute([$userId]);
        $latestStatus = $existing->fetchColumn();
        if (in_array($latestStatus, ['pending', 'approved'], true)) {
            $db->rollBack();
            errorResponse($latestStatus === 'pending' ? 'Your seller application is already awaiting review.' : 'Your seller application has already been approved.', 409);
        }
        $insert = $db->prepare('INSERT INTO seller_applications (user_id, status, applied_at) VALUES (?, \'pending\', NOW())');
        $insert->execute([$userId]);
        $applicationId = (int) $db->lastInsertId();
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Seller application submitted.', 'application_id' => $applicationId], 201);
}

errorResponse('Unknown seller application action.', 404);
